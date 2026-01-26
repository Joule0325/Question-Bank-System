import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3001;

// --- 1. 连接 MongoDB ---
const MONGO_URI = 'mongodb://127.0.0.1:27017/question-bank';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB 数据库连接成功'))
  .catch(err => console.error('❌ MongoDB 连接失败:', err));

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- [关键修复] 路径定义 ---
// 确保 uploads 文件夹路径绝对正确
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

console.log('📂 图片存储路径:', uploadDir); // 启动时打印，让你确认路径对不对

// --- [核心大招] 手动接管图片下载请求 ---
// 把它放在 express.static 之前，优先拦截！
app.get('/uploads/:filename', (req, res, next) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    // 1. 先看看有没有这个“无后缀”的原始文件
    if (fs.existsSync(filePath)) {
        console.log(`✅ 找到文件(无后缀)，强制发送: ${filename}`);
        res.setHeader('Content-Type', 'image/jpeg'); // 欺骗浏览器说这是 JPG
        return res.sendFile(filePath);
    }
    
    // 2. 如果没找到，试试是不是硬盘上其实有后缀？(比如请求的是 123，硬盘上是 123.jpg)
    // 这是一个容错机制
    const extensions = ['.jpg', '.png', '.jpeg'];
    for (const ext of extensions) {
        if (fs.existsSync(filePath + ext)) {
             console.log(`✅ 找到文件(补全后缀 ${ext})，发送: ${filename + ext}`);
             res.setHeader('Content-Type', 'image/jpeg');
             return res.sendFile(filePath + ext);
        }
    }

    // 3. 还是找不到？打印错误日志，方便你排查
    console.error(`❌ 文件不存在: ${filePath}`);
    next(); // 交给后面的 static 处理（通常就是返回 404 了）
});

// 静态资源兜底 (兼容普通情况)
app.use('/uploads', express.static(uploadDir));

// --- Multer 配置 (新上传的文件会自动带后缀) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let ext = path.extname(file.originalname);
        if (!ext) {
            if (file.mimetype === 'image/png') ext = '.png';
            else ext = '.jpg';
        }
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

// --- 2. Schema 定义 ---
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

// --- 辅助函数 ---
const buildTree = (items) => {
    const map = {}; const roots = [];
    items.forEach(item => { map[item.id] = { ...item, children: [] }; });
    items.forEach(item => { if (item.parentId && map[item.parentId]) map[item.parentId].children.push(map[item.id]); else roots.push(map[item.id]); });
    const sortRecursive = (nodes) => { nodes.sort((a, b) => (a.order || 0) - (b.order || 0)); nodes.forEach(node => { if (node.children.length) sortRecursive(node.children); }); };
    sortRecursive(roots); return roots;
};

// --- 3. API 接口 ---
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

app.post('/api/categories/manage', async (req, res) => {
    const { action, subjectId, parentId, data, id, sourceId, targetId, position, title } = req.body;
    try {
        if (action === 'add-root' || action === 'add-sub') {
            const newCat = new Category({ id: new mongoose.Types.ObjectId().toString(), subjectId, title: data.title, parentId: action === 'add-sub' ? parentId : null, order: Date.now() });
            await newCat.save();
        } else if (action === 'reorder') {
            const source = await Category.findOne({ id: sourceId });
            const target = await Category.findOne({ id: targetId });
            if (source && target) { if (source.parentId !== target.parentId) source.parentId = target.parentId; source.order = position === 'top' ? (target.order || 0) - 0.1 : (target.order || 0) + 0.1; await source.save(); }
        } else if (action === 'rename') { await Category.findOneAndUpdate({ id: id }, { title: title });
        } else if (action === 'delete') {
            const deleteIds = [id];
            const findChildren = async (pid) => { const kids = await Category.find({ parentId: pid }); for (const k of kids) { deleteIds.push(k.id); await findChildren(k.id); } };
            await findChildren(id); await Category.deleteMany({ id: { $in: deleteIds } });
        } else if (action === 'update_list') { res.json({ success: true }); return; }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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