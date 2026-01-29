import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3001;

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
    const extensions = ['.jpg', '.png', '.jpeg'];
    for (const ext of extensions) {
        if (fs.existsSync(filePath + ext)) {
             res.setHeader('Content-Type', 'image/jpeg');
             return res.sendFile(filePath + ext);
        }
    }
    next();
});
app.use('/uploads', express.static(uploadDir));

// Multer 配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let ext = path.extname(file.originalname);
        if (!ext) ext = '.jpg';
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

// 2. Schema 定义
const SubjectSchema = new mongoose.Schema({ id: String, title: String, order: Number });
const CategorySchema = new mongoose.Schema({ id: String, subjectId: String, title: String, order: Number, parentId: String, color: String });
const QuestionSchema = new mongoose.Schema({ 
    subjectId: String, categoryIds: [String], title: String, image: String, 
    answer: String, analysis: String, detailed: String,
    type: String, difficulty: Number, year: String, 
    source: String, qNumber: String, addedTime: String, optionLayout: Number, 
    options: { A: String, B: String, C: String, D: String }, tags: [String], code: String,
    province: String 
});
QuestionSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; } });

const Subject = mongoose.model('Subject', SubjectSchema);
const Category = mongoose.model('Category', CategorySchema);
const Question = mongoose.model('Question', QuestionSchema);

// 辅助函数
const buildTree = (items) => {
    const map = {}; const roots = [];
    items.forEach(item => { map[item.id] = { ...item, children: [] }; });
    items.forEach(item => { if (item.parentId && map[item.parentId]) map[item.parentId].children.push(map[item.id]); else roots.push(map[item.id]); });
    const sortRecursive = (nodes) => { nodes.sort((a, b) => (a.order || 0) - (b.order || 0)); nodes.forEach(node => { if (node.children.length) sortRecursive(node.children); }); };
    sortRecursive(roots); return roots;
};

// 3. API 接口
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    res.json({ url: `http://localhost:3001/uploads/${req.file.filename}` });
});

app.post('/api/ocr', async (req, res) => {
    res.json({ success: true, data: { title: 'OCR Mock Result', type: '识别结果', difficulty: 1 } }); 
});

app.get('/api/subjects', async (req, res) => { 
    const subjects = await Subject.find({}).lean();
    subjects.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(subjects); 
});

app.get('/api/filters', async (req, res) => {
    try {
        const { subjectId } = req.query;
        const query = subjectId ? { subjectId } : {};
        const types = await Question.find(query).distinct('type');
        const rawProvinces = await Question.find(query).distinct('province');
        const provinceSet = new Set();
        rawProvinces.forEach(p => { if (p) { const parts = p.split('/'); parts.forEach(part => { if(part.trim()) provinceSet.add(part.trim()); }); } });
        res.json({ types: types.filter(t => t), provinces: Array.from(provinceSet).sort() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/subjects/manage', async (req, res) => {
    const { action, list } = req.body;
    try {
        if (action === 'update_list') {
            const existingSubjects = await Subject.find({});
            const existingIds = existingSubjects.map(s => s.id);
            const keepIds = list.filter(s => !s.id.startsWith('new_')).map(s => s.id);
            const toDelete = existingIds.filter(eid => !keepIds.includes(eid));
            if (toDelete.length > 0) await Subject.deleteMany({ id: { $in: toDelete } });
            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                if (item.id.startsWith('new_')) { await new Subject({ id: new mongoose.Types.ObjectId().toString(), title: item.title, order: i }).save(); } 
                else { await Subject.findOneAndUpdate({ id: item.id }, { title: item.title, order: i }); }
            }
            res.json({ success: true });
        } else { res.status(400).json({ error: 'Invalid action' }); }
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/categories', async (req, res) => {
  const query = req.query.subjectId ? { subjectId: req.query.subjectId } : {};
  const flatCats = await Category.find(query).lean();
  res.json(buildTree(flatCats));
});

// ==========================================
// [核心修改] 目录管理接口：支持 update_list 的递归同步
// ==========================================

// 辅助：递归删除某个分类及其所有子分类
const deleteCategoryAndChildren = async (catId) => {
    // 1. 找儿子
    const children = await Category.find({ parentId: catId });
    // 2. 递归杀儿子
    for (const child of children) {
        await deleteCategoryAndChildren(child.id);
    }
    // 3. 杀自己
    await Category.deleteOne({ id: catId });
};

// 辅助：递归保存（同步）
const syncCategoriesRecursive = async (nodes, parentId, subjectId) => {
    // 1. 获取该层级下数据库中已有的节点
    const query = parentId ? { parentId } : { subjectId, parentId: null };
    const existingNodes = await Category.find(query);
    
    // 用于记录哪些旧节点被“复用”了，剩下的就是该删除的
    const usedIds = new Set();

    // 2. 遍历前端传来的新列表
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        let currentId = null;

        // 尝试用【标题】去匹配现有的节点
        // (前端文本编辑会丢失ID，所以必须用标题找回，否则每次都会全删全建，导致题目关联丢失)
        const match = existingNodes.find(ex => ex.title === node.title && !usedIds.has(ex.id));

        if (match) {
            // [A] 找到了：复用旧节点，更新顺序
            match.order = i;
            await match.save();
            currentId = match.id;
            usedIds.add(match.id);
        } else {
            // [B] 没找到：创建新节点
            const newCat = new Category({
                id: new mongoose.Types.ObjectId().toString(),
                subjectId,
                parentId: parentId || null,
                title: node.title,
                order: i
            });
            await newCat.save();
            currentId = newCat.id;
        }

        // 3. 递归处理子节点
        if (node.children && node.children.length > 0) {
            await syncCategoriesRecursive(node.children, currentId, subjectId);
        } else {
            // 如果前端说这个节点没儿子，那我们也要确保数据库里没儿子
            // 查一下有没有残留的子节点，有就全删了
            const orphanChildren = await Category.find({ parentId: currentId });
            for (const orphan of orphanChildren) {
                await deleteCategoryAndChildren(orphan.id);
            }
        }
    }

    // 4. 清理当前层级中，未被使用的旧节点（即前端文本里删掉的那些行）
    const toDelete = existingNodes.filter(ex => !usedIds.has(ex.id));
    for (const d of toDelete) {
        await deleteCategoryAndChildren(d.id);
    }
};


app.post('/api/categories/manage', async (req, res) => {
    const { action, subjectId, parentId, data, id, sourceId, targetId, position, title, children } = req.body;
    
    try {
        if (action === 'add-root' || action === 'add-sub') {
            const newCat = new Category({ id: new mongoose.Types.ObjectId().toString(), subjectId, title: data.title, parentId: action === 'add-sub' ? parentId : null, order: Date.now() });
            await newCat.save();
        } else if (action === 'reorder') {
            const source = await Category.findOne({ id: sourceId });
            const target = await Category.findOne({ id: targetId });
            if (source && target) { if (source.parentId !== target.parentId) source.parentId = target.parentId; source.order = position === 'top' ? (target.order || 0) - 0.1 : (target.order || 0) + 0.1; await source.save(); }
        } else if (action === 'rename') { 
            await Category.findOneAndUpdate({ id: id }, { title: title });
        } else if (action === 'delete') {
            // 单个删除也使用递归删除逻辑
            await deleteCategoryAndChildren(id);
        } else if (action === 'update_list') {
            // [核心逻辑]：全量同步子目录
            if (children && Array.isArray(children)) {
                await syncCategoriesRecursive(children, parentId, subjectId);
            }
            res.json({ success: true });
            return;
        }
        res.json({ success: true });
    } catch (e) { 
        console.error('API Error:', e);
        res.status(500).json({ error: e.message }); 
    }
});
// ==========================================

app.get('/api/questions', async (req, res) => {
  const { categoryIds, subjectId, tags, type, difficulty, province, year, source, qNumber } = req.query;
  const filter = {};
  if (subjectId) filter.subjectId = subjectId;
  if (type && type !== '全部') filter.type = type;
  if (difficulty && difficulty !== '全部') filter.difficulty = Number(difficulty);
  if (province && province !== '全部') { const safeProv = province.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.province = { $regex: `(^|/)${safeProv}($|/)` }; }
  if (year) { const cleanYear = year.replace(/年/g, '').trim(); filter.year = { $regex: `(^|/)${cleanYear}($|/)` }; }
  if (qNumber) { const cleanQ = qNumber.trim(); filter.qNumber = { $regex: `(^|/)${cleanQ}($|/)` }; }
  if (source) filter.source = { $regex: source, $options: 'i' };
  if (categoryIds) filter.categoryIds = { $in: categoryIds.split(',') };
  if (tags) {
    const tagList = tags.split(',');
    const allCats = await Category.find({}).lean(); 
    let matchedCatIds = [];
    allCats.forEach(c => { if (tagList.includes(c.title)) matchedCatIds.push(c.id); });
    const tagQuery = { tags: { $in: tagList } };
    if (matchedCatIds.length > 0) filter.$or = [ tagQuery, { categoryIds: { $in: matchedCatIds } } ];
    else filter.tags = { $in: tagList };
  }
  try {
    const questions = await Question.find(filter).sort({ _id: -1 });
    res.json({ total: questions.length, data: questions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/questions', async (req, res) => { try { const newQ = new Question({ ...req.body, addedTime: new Date().toISOString().split('T')[0] }); res.json(await newQ.save()); } catch (e) { res.status(500).json({ error: '保存失败' }); } });
app.put('/api/questions/:id', async (req, res) => { try { const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updated); } catch (e) { res.status(500).json({ error: '更新失败' }); } });
app.delete('/api/questions/:id', async (req, res) => { try { await Question.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: '删除失败' }); } });

app.listen(PORT, () => console.log(`API Server running on port ${PORT}`));