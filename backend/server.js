import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3001;
const SECRET_KEY = 'YOUR_SECRET_KEY_CHANGE_THIS_IN_PROD'; 

// 1. 连接 MongoDB
const MONGO_URI = 'mongodb://127.0.0.1:27017/question-bank';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB 数据库连接成功'))
  .catch(err => console.error('❌ MongoDB 连接失败:', err));

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// 路径定义
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

// 图片请求接管
app.get('/uploads/:filename', (req, res, next) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'image/jpeg');
        return res.sendFile(filePath);
    }
    next();
});
app.use('/uploads', express.static(uploadDir));

// Multer 配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let ext = path.extname(file.originalname) || '.jpg';
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

// --- 2. Schema 定义 ---

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, // 'user' | 'admin'
    createdAt: { type: Date, default: Date.now }
});

const baseFields = {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isPublic: { type: Boolean, default: false }
};

const SubjectSchema = new mongoose.Schema({ ...baseFields, id: String, title: String, order: Number });
const CategorySchema = new mongoose.Schema({ ...baseFields, id: String, subjectId: String, title: String, order: Number, parentId: String });

const QuestionSchema = new mongoose.Schema({ 
    ...baseFields,
    subjectId: String, categoryIds: [String], title: String, image: String, 
    answer: String, analysis: String, detailed: String,
    type: String, difficulty: Number, year: String, 
    source: String, qNumber: String, addedTime: String, optionLayout: Number, 
    options: { A: String, B: String, C: String, D: String }, tags: [String], code: String,
    province: String,
    subQuestions: [{
        content: String, tags: [String],
        options: { type: Map, of: String }, optionLayout: Number
    }]
});
QuestionSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; } });

const User = mongoose.model('User', UserSchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const Category = mongoose.model('Category', CategorySchema);
const Question = mongoose.model('Question', QuestionSchema);

// 辅助函数：构建树形结构
const buildTree = (items) => {
    const map = {}; const roots = [];
    items.forEach(item => { map[item.id] = { ...item, children: [] }; });
    items.forEach(item => { if (item.parentId && map[item.parentId]) map[item.parentId].children.push(map[item.id]); else roots.push(map[item.id]); });
    const sortRecursive = (nodes) => { nodes.sort((a, b) => (a.order || 0) - (b.order || 0)); nodes.forEach(node => { if (node.children.length) sortRecursive(node.children); }); };
    sortRecursive(roots); return roots;
};

// 递归删除分类
const deleteCategoryAndChildren = async (catId, query) => {
    const children = await Category.find({ parentId: catId, ...query });
    for (const child of children) { await deleteCategoryAndChildren(child.id, query); }
    await Category.deleteOne({ id: catId, ...query });
};

// 递归同步分类
const syncCategoriesRecursive = async (nodes, parentId, subjectId, userId, isPublicMode = false) => {
    const baseQuery = isPublicMode ? { isPublic: true } : { creatorId: userId };
    const query = parentId ? { parentId, ...baseQuery } : { subjectId, parentId: null, ...baseQuery };
    
    const existingNodes = await Category.find(query);
    const usedIds = new Set();

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        let currentId = null;
        const match = existingNodes.find(ex => ex.title === node.title && !usedIds.has(ex.id));

        if (match) {
            match.order = i; await match.save();
            currentId = match.id; usedIds.add(match.id);
        } else {
            const newCat = new Category({
                id: new mongoose.Types.ObjectId().toString(),
                subjectId, parentId: parentId || null, title: node.title, order: i,
                creatorId: userId, isPublic: isPublicMode
            });
            await newCat.save(); currentId = newCat.id;
        }
        if (node.children && node.children.length > 0) {
            await syncCategoriesRecursive(node.children, currentId, subjectId, userId, isPublicMode);
        } else {
            const orphanChildren = await Category.find({ parentId: currentId, ...baseQuery });
            for (const orphan of orphanChildren) { await deleteCategoryAndChildren(orphan.id, baseQuery); }
        }
    }
    const toDelete = existingNodes.filter(ex => !usedIds.has(ex.id));
    for (const d of toDelete) { await deleteCategoryAndChildren(d.id, baseQuery); }
};

// --- 3. 中间件：JWT 鉴权 ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const mode = req.query.mode || req.body.mode;

    // 公共模式下特定的 GET 请求放行
    if (mode === 'public' && req.method === 'GET') {
        return next(); 
    }

    if (!token) return res.status(401).json({ error: '未登录' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token 无效' });
        req.user = user;
        next();
    });
};

// --- 4. API 接口 ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({ username: req.body.username, password: hashedPassword });
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: '注册失败' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(400).json({ error: '用户不存在' });
    if (await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ userId: user._id, username: user.username }, SECRET_KEY);
        // 返回包含 role 的用户信息，确保前端可以识别管理员
        res.json({ 
            token, 
            username: user.username, 
            role: user.role || 'user' 
        });
    } else {
        res.status(400).json({ error: '密码错误' });
    }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    res.json({ url: `http://localhost:3001/uploads/${req.file.filename}` });
});

// --- 科目相关 ---
app.get('/api/subjects', authenticateToken, async (req, res) => { 
    const { mode } = req.query;
    const query = mode === 'public' ? { isPublic: true } : { creatorId: req.user.userId };
    if (mode === 'private') {
        const count = await Subject.countDocuments(query);
        if (count === 0) await new Subject({ id: new mongoose.Types.ObjectId().toString(), title: '默认科目', order: 0, creatorId: req.user.userId, isPublic: false }).save();
    }
    const subjects = await Subject.find(query).sort({ order: 1 }).lean();
    res.json(subjects); 
});

app.post('/api/subjects/manage', authenticateToken, async (req, res) => {
    const { action, list } = req.body;
    const mode = req.body.mode || req.query.mode;
    // Admin editing public subjects
    const isPublicMode = mode === 'public' && req.user.role === 'admin';
    const userQuery = isPublicMode ? { isPublic: true } : { creatorId: req.user.userId };
    
    try {
        if (action === 'update_list') {
            const existingSubjects = await Subject.find(userQuery);
            const existingIds = existingSubjects.map(s => s.id);
            const keepIds = list.filter(s => !s.id.startsWith('new_')).map(s => s.id);
            const toDelete = existingIds.filter(eid => !keepIds.includes(eid));
            
            if (toDelete.length > 0) await Subject.deleteMany({ id: { $in: toDelete }, ...userQuery });
            
            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                if (item.id.startsWith('new_')) { 
                    await new Subject({ 
                        id: new mongoose.Types.ObjectId().toString(), 
                        title: item.title, 
                        order: i, 
                        creatorId: req.user.userId, 
                        isPublic: isPublicMode 
                    }).save(); 
                } else { 
                    await Subject.findOneAndUpdate({ id: item.id, ...userQuery }, { title: item.title, order: i }); 
                }
            }
            res.json({ success: true });
        } else { res.status(400).json({ error: 'Invalid action' }); }
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- 目录相关 ---
app.get('/api/categories', authenticateToken, async (req, res) => {
    const { mode, subjectId } = req.query;
    const query = { subjectId };
    if (mode === 'public') query.isPublic = true;
    else query.creatorId = req.user.userId;
    const flatCats = await Category.find(query).lean();
    res.json(buildTree(flatCats));
});

app.post('/api/categories/manage', authenticateToken, async (req, res) => {
    const { action, subjectId, parentId, data, id, sourceId, targetId, position, title, children } = req.body;
    const mode = req.body.mode || req.query.mode;
    const userId = req.user.userId;
    
    const isPublicMode = mode === 'public' && req.user.role === 'admin';
    const query = isPublicMode ? { isPublic: true } : { creatorId: userId };

    try {
        if (action === 'add-root' || action === 'add-sub') {
            await new Category({ 
                id: new mongoose.Types.ObjectId().toString(), 
                subjectId, 
                title: data.title, 
                parentId: action === 'add-sub' ? parentId : null, 
                order: Date.now(), 
                creatorId: userId, 
                isPublic: isPublicMode 
            }).save();
        } else if (action === 'reorder') {
            const source = await Category.findOne({ id: sourceId, ...query });
            const target = await Category.findOne({ id: targetId, ...query });
            if (source && target) { 
                if (source.parentId !== target.parentId) source.parentId = target.parentId; 
                source.order = position === 'top' ? (target.order || 0) - 0.1 : (target.order || 0) + 0.1; 
                await source.save(); 
            }
        } else if (action === 'rename') { 
            await Category.findOneAndUpdate({ id: id, ...query }, { title: title });
        } else if (action === 'delete') {
            await deleteCategoryAndChildren(id, query);
        } else if (action === 'update_list') {
            if (children && Array.isArray(children)) await syncCategoriesRecursive(children, parentId, subjectId, userId, isPublicMode);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 题目 & 筛选相关 ---

app.get('/api/filters', authenticateToken, async (req, res) => {
    try {
        const { subjectId } = req.query;
        // 关键：筛选也要区分 mode
        const mode = req.query.mode;
        const query = { subjectId };
        
        if (mode === 'public') query.isPublic = true;
        else query.creatorId = req.user.userId;

        const types = await Question.find(query).distinct('type');
        const rawProvinces = await Question.find(query).distinct('province');
        const provinceSet = new Set();
        rawProvinces.forEach(p => { if (p) { const parts = p.split('/'); parts.forEach(part => { if(part.trim()) provinceSet.add(part.trim()); }); } });
        res.json({ types: types.filter(t => t), provinces: Array.from(provinceSet).sort() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/questions', authenticateToken, async (req, res) => {
    const { mode, categoryIds, subjectId, type, difficulty, province, year, source, qNumber, tags } = req.query;
    const filter = {};
    if (mode === 'public') filter.isPublic = true;
    else filter.creatorId = req.user.userId;

    if (subjectId) filter.subjectId = subjectId;
    if (type && type !== '全部') filter.type = type;
    if (difficulty && difficulty !== '全部') filter.difficulty = Number(difficulty);
    if (province && province !== '全部') filter.province = { $regex: province };
    if (year) filter.year = { $regex: year };
    if (source) filter.source = { $regex: source, $options: 'i' };
    if (qNumber) filter.qNumber = { $regex: qNumber };
    if (categoryIds) filter.categoryIds = { $in: categoryIds.split(',') };
    if (tags) {
        const tagList = tags.split(',');
        filter.tags = { $in: tagList };
    }

    try {
        const questions = await Question.find(filter).sort({ _id: -1 });
        res.json({ total: questions.length, data: questions });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/questions', authenticateToken, async (req, res) => { 
    try { 
        const isPublic = (req.user.role === 'admin' && req.body.isPublic === true);
        const newQ = new Question({ 
            ...req.body, 
            creatorId: req.user.userId, 
            isPublic: isPublic, 
            addedTime: new Date().toISOString().split('T')[0] 
        }); 
        res.json(await newQ.save()); 
    } catch (e) { res.status(500).json({ error: '保存失败' }); } 
});

// === 核心：管理员修改权限 ===
app.put('/api/questions/:id', authenticateToken, async (req, res) => { 
    try { 
        // 1. 获取当前操作用户
        const user = await User.findById(req.user.userId);
        
        // 2. 权限判断
        // 如果是 admin，允许修改任何 ID 匹配的题目
        // 如果是普通 user，要求题目必须是自己创建的
        const filter = (user && user.role === 'admin') 
            ? { _id: req.params.id } 
            : { _id: req.params.id, creatorId: req.user.userId };

        const updated = await Question.findOneAndUpdate(filter, req.body, { new: true }); 
        if(!updated) return res.status(403).json({error: '无权操作该题目或题目不存在'});
        res.json(updated); 
    } catch (e) { res.status(500).json({ error: '更新失败' }); } 
});

// === 核心：管理员删除权限 ===
app.delete('/api/questions/:id', authenticateToken, async (req, res) => { 
    try { 
        const user = await User.findById(req.user.userId);
        
        // 2. 权限判断 (同上)
        const filter = (user && user.role === 'admin') 
            ? { _id: req.params.id } 
            : { _id: req.params.id, creatorId: req.user.userId };

        const deleted = await Question.findOneAndDelete(filter);
        if(!deleted) return res.status(403).json({error: '未找到题目或无权限'});
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: '删除失败' }); } 
});

app.post('/api/questions/fork', authenticateToken, async (req, res) => {
    const { questionId, targetSubjectId, targetCategoryIds } = req.body;
    try {
        const originalQ = await Question.findOne({ _id: questionId, isPublic: true }).lean();
        if (!originalQ) return res.status(404).json({ error: '未找到该公共题目' });
        delete originalQ._id; delete originalQ.id;
        const newQ = new Question({
            ...originalQ,
            creatorId: req.user.userId,
            isPublic: false,
            subjectId: targetSubjectId,
            categoryIds: targetCategoryIds,
            addedTime: new Date().toISOString().split('T')[0],
            code: 'F' + Date.now().toString().slice(-6)
        });
        await newQ.save();
        res.json({ success: true, id: newQ.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`🚀 API Server running on port ${PORT}`));