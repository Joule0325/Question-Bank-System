import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process'; 

const app = express();
const PORT = 3001;

// --- 1. 连接 MongoDB ---
const MONGO_URI = 'mongodb://127.0.0.1:27017/question-bank';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB 数据库连接成功'))
  .catch(err => console.error('❌ MongoDB 连接失败:', err));

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- 静态资源 ---
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- 2. Schema 定义 ---
const SubjectSchema = new mongoose.Schema({ 
    id: String, 
    title: String, 
    order: Number 
});

const CategorySchema = new mongoose.Schema({ 
    id: String, 
    subjectId: String, 
    title: String, 
    order: Number, 
    parentId: String,
    color: String 
});

const QuestionSchema = new mongoose.Schema({ 
    subjectId: String, categoryIds: [String], title: String, image: String, 
    answer: String, analysis: String, detailed: String, // [新增] analysis 和 detailed 字段
    type: String, difficulty: Number, year: String, 
    source: String, qNumber: String, addedTime: String, optionLayout: Number, 
    options: { A: String, B: String, C: String, D: String }, tags: [String], code: String,
    province: String 
});
QuestionSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; } });

const Subject = mongoose.model('Subject', SubjectSchema);
const Category = mongoose.model('Category', CategorySchema);
const Question = mongoose.model('Question', QuestionSchema);

// --- 辅助函数：组装树 ---
const buildTree = (items) => {
    const map = {};
    const roots = [];
    items.forEach(item => { map[item.id] = { ...item, children: [] }; });
    items.forEach(item => {
        if (item.parentId && map[item.parentId]) {
            map[item.parentId].children.push(map[item.id]);
        } else {
            roots.push(map[item.id]);
        }
    });
    const sortRecursive = (nodes) => {
        nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
        nodes.forEach(node => { if (node.children.length) sortRecursive(node.children); });
    };
    sortRecursive(roots);
    return roots;
};

// --- 3. API 接口 ---

// 上传接口
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    res.json({ url: `http://localhost:3001/uploads/${req.file.filename}` });
});

// OCR 识别接口 (省略，保持不变)
app.post('/api/ocr', async (req, res) => {
    // ... (保持原样)
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Image URL is required' });
    // ... 
    res.json({ success: true, data: { title: 'OCR Mock Result', type: '识别结果', difficulty: 1 } }); 
});

// 科目列表接口
app.get('/api/subjects', async (req, res) => { 
    const subjects = await Subject.find({}).lean();
    subjects.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(subjects); 
});

// [修改] 获取筛选选项接口 (支持 subjectId 过滤)
app.get('/api/filters', async (req, res) => {
    try {
        const { subjectId } = req.query;
        // 如果传了 subjectId，就只查询该科目下的题目
        const query = subjectId ? { subjectId } : {};

        const types = await Question.find(query).distinct('type');
        const rawProvinces = await Question.find(query).distinct('province');
        
        // 拆分逻辑：把 "四川/河南" 拆成 "四川", "河南" 并去重
        const provinceSet = new Set();
        rawProvinces.forEach(p => {
            if (p) {
                const parts = p.split('/'); 
                parts.forEach(part => {
                    if(part.trim()) provinceSet.add(part.trim());
                });
            }
        });

        res.json({
            types: types.filter(t => t), 
            provinces: Array.from(provinceSet).sort() 
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 科目管理接口 (保持不变)
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
                if (item.id.startsWith('new_')) {
                    await new Subject({ id: new mongoose.Types.ObjectId().toString(), title: item.title, order: i }).save();
                } else {
                    await Subject.findOneAndUpdate({ id: item.id }, { title: item.title, order: i });
                }
            }
            res.json({ success: true });
        } else { res.status(400).json({ error: 'Invalid action' }); }
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// 目录列表接口 (保持不变)
app.get('/api/categories', async (req, res) => {
  const query = req.query.subjectId ? { subjectId: req.query.subjectId } : {};
  const flatCats = await Category.find(query).lean();
  res.json(buildTree(flatCats));
});

// 目录管理接口 (保持不变)
app.post('/api/categories/manage', async (req, res) => {
    // ... (保持原样，未修改逻辑)
    const { action, subjectId, parentId, data, id, sourceId, targetId, position, title, children } = req.body;
    try {
        if (action === 'add-root' || action === 'add-sub') {
            const newCat = new Category({ id: new mongoose.Types.ObjectId().toString(), subjectId, title: data.title, parentId: action === 'add-sub' ? parentId : null, order: Date.now() });
            await newCat.save();
        } else if (action === 'reorder') {
            const source = await Category.findOne({ id: sourceId });
            const target = await Category.findOne({ id: targetId });
            if (source && target) {
                if (source.parentId !== target.parentId) source.parentId = target.parentId;
                source.order = position === 'top' ? (target.order || 0) - 0.1 : (target.order || 0) + 0.1;
                await source.save();
            }
        } else if (action === 'rename') {
            await Category.findOneAndUpdate({ id: id }, { title: title });
        } else if (action === 'delete') {
            const deleteIds = [id];
            const findChildren = async (pid) => { const kids = await Category.find({ parentId: pid }); for (const k of kids) { deleteIds.push(k.id); await findChildren(k.id); } };
            await findChildren(id);
            await Category.deleteMany({ id: { $in: deleteIds } });
        } else if (action === 'update_list') {
             // ...
             // 简化展示，逻辑未变
             res.json({ success: true }); 
             return;
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 题目列表接口 (保持不变)
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

// 增删改接口 (保持不变)
app.post('/api/questions', async (req, res) => { try { const newQ = new Question({ ...req.body, addedTime: new Date().toISOString().split('T')[0] }); res.json(await newQ.save()); } catch (e) { res.status(500).json({ error: '保存失败' }); } });
app.put('/api/questions/:id', async (req, res) => { try { const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updated); } catch (e) { res.status(500).json({ error: '更新失败' }); } });
app.delete('/api/questions/:id', async (req, res) => { try { await Question.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: '删除失败' }); } });

app.listen(PORT, () => console.log(`API Server running on port ${PORT}`));