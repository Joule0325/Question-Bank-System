import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process'; // 用于调用 Python 脚本

const app = express();
const PORT = 3001;

// --- 1. 连接 MongoDB ---
const MONGO_URI = 'mongodb://127.0.0.1:27017/question-bank';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB 数据库连接成功'))
  .catch(err => console.error('❌ MongoDB 连接失败:', err));

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // 允许大图片上传

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
    answer: String, type: String, difficulty: Number, year: String, 
    source: String, qNumber: String, addedTime: String, optionLayout: Number, 
    options: { A: String, B: String, C: String, D: String }, tags: [String], code: String 
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

// ★★★ OCR 识别接口 (调用本地 PaddleOCR Python 脚本) ★★★
app.post('/api/ocr', async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Image URL is required' });

    console.log('🤖 OCR Request (Local PaddleOCR) for:', imageUrl);

    try {
        // 1. 获取本地文件绝对路径
        let localFilePath = null;
        if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
            const parts = imageUrl.split('/uploads/');
            if (parts.length > 1) {
                const filename = parts[1];
                localFilePath = path.join(uploadDir, filename);
            }
        }

        if (!localFilePath || !fs.existsSync(localFilePath)) {
            return res.status(400).json({ error: 'Local file not found' });
        }

        // 2. 调用 Python 脚本
        // 注意：这里假设你在激活了 paddle_env 的终端运行 node，或者系统默认 python 已安装 paddleocr
        const pythonProcess = spawn('python', ['paddle_ocr.py', localFilePath]);

        let resultData = '';
        
        pythonProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            const msg = data.toString();
            // 过滤掉无关紧要的日志
            if (!msg.includes('UserWarning') && !msg.includes('cpp_extension')) {
                console.log('🐍 Python Log:', msg);
            }
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`PaddleOCR process exited with code ${code}`);
                return res.status(500).json({ error: 'OCR Process Failed' });
            }

            try {
                // 解析 Python 返回的 JSON
                const jsonResponse = JSON.parse(resultData.trim());
                if (jsonResponse.success) {
                    console.log('✅ OCR Success, text length:', jsonResponse.data.title.length);
                    res.json(jsonResponse);
                } else {
                    res.status(500).json({ error: jsonResponse.error });
                }
            } catch (e) {
                console.error('JSON Parse Error:', e);
                console.log('Raw Output:', resultData);
                // 容错返回
                res.json({ success: true, data: { title: resultData, type: '识别结果', difficulty: 1 } });
            }
        });

    } catch (error) {
        console.error('OCR Error:', error.message);
        res.status(500).json({ error: 'OCR 服务调用失败' });
    }
});

// 科目列表接口
app.get('/api/subjects', async (req, res) => { 
    const subjects = await Subject.find({}).lean();
    subjects.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(subjects); 
});

// 科目管理接口
app.post('/api/subjects/manage', async (req, res) => {
    const { action, list } = req.body;
    try {
        if (action === 'update_list') {
            const existingSubjects = await Subject.find({});
            const existingIds = existingSubjects.map(s => s.id);
            const keepIds = list.filter(s => !s.id.startsWith('new_')).map(s => s.id);
            
            const toDelete = existingIds.filter(eid => !keepIds.includes(eid));
            if (toDelete.length > 0) {
                await Subject.deleteMany({ id: { $in: toDelete } });
            }

            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                if (item.id.startsWith('new_')) {
                    await new Subject({
                        id: new mongoose.Types.ObjectId().toString(),
                        title: item.title,
                        order: i
                    }).save();
                } else {
                    await Subject.findOneAndUpdate(
                        { id: item.id },
                        { title: item.title, order: i }
                    );
                }
            }
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Invalid action' });
        }
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// 目录列表接口
app.get('/api/categories', async (req, res) => {
  const query = req.query.subjectId ? { subjectId: req.query.subjectId } : {};
  const flatCats = await Category.find(query).lean();
  res.json(buildTree(flatCats));
});

// 目录管理接口
app.post('/api/categories/manage', async (req, res) => {
    const { action, subjectId, parentId, data, id, sourceId, targetId, position, title, children } = req.body;
    
    try {
        if (action === 'add-root' || action === 'add-sub') {
            const newCat = new Category({
                id: new mongoose.Types.ObjectId().toString(),
                subjectId,
                title: data.title,
                parentId: action === 'add-sub' ? parentId : null,
                order: Date.now()
            });
            await newCat.save();
        } else if (action === 'reorder') {
            const source = await Category.findOne({ id: sourceId });
            const target = await Category.findOne({ id: targetId });
            if (source && target) {
                if (source.parentId !== target.parentId) source.parentId = target.parentId;
                const newOrder = position === 'top' ? (target.order || 0) - 0.1 : (target.order || 0) + 0.1;
                source.order = newOrder;
                await source.save();
            }
        } else if (action === 'rename') {
            await Category.findOneAndUpdate({ id: id }, { title: title });
        } else if (action === 'delete') {
            const deleteIds = [id];
            const findChildren = async (pid) => {
                const kids = await Category.find({ parentId: pid });
                for (const k of kids) {
                    deleteIds.push(k.id);
                    await findChildren(k.id);
                }
            };
            await findChildren(id);
            await Category.deleteMany({ id: { $in: deleteIds } });
        } else if (action === 'update_list') {
            const query = parentId ? { parentId } : { subjectId, parentId: null };
            const existingChildren = await Category.find(query);
            const existingIds = existingChildren.map(c => c.id);
            const keepIds = children.filter(c => !c.id.toString().startsWith('new_')).map(c => c.id);
            
            const toDelete = existingIds.filter(eid => !keepIds.includes(eid));
            if (toDelete.length > 0) {
                await Category.deleteMany({ id: { $in: toDelete } });
            }

            for (let i = 0; i < children.length; i++) {
                const item = children[i];
                if (item.id.toString().startsWith('new_')) {
                    await new Category({
                        id: new mongoose.Types.ObjectId().toString(),
                        subjectId: subjectId,
                        title: item.title,
                        parentId: parentId || null,
                        color: item.color, 
                        order: i
                    }).save();
                } else {
                    await Category.findOneAndUpdate(
                        { id: item.id },
                        { 
                            title: item.title, 
                            order: i, 
                            parentId: parentId || null,
                            color: item.color 
                        }
                    );
                }
            }
        }
        res.json({ success: true });
    } catch (e) {
        console.error('Manage Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// 题目列表接口
app.get('/api/questions', async (req, res) => {
  const { categoryIds, subjectId, tags, type, difficulty } = req.query;
  const filter = {};
  if (subjectId) filter.subjectId = subjectId;
  if (type && type !== '全部') filter.type = type;
  if (difficulty && difficulty !== '全部') filter.difficulty = Number(difficulty);
  if (categoryIds) filter.categoryIds = { $in: categoryIds.split(',') };

  if (tags) {
    const tagList = tags.split(',');
    const allCats = await Category.find({}).lean(); 
    let matchedCatIds = [];
    allCats.forEach(c => { if (tagList.includes(c.title)) matchedCatIds.push(c.id); });
    const tagQuery = { tags: { $in: tagList } };
    if (matchedCatIds.length > 0) {
        filter.$or = [ tagQuery, { categoryIds: { $in: matchedCatIds } } ];
    } else {
        filter.tags = { $in: tagList };
    }
  }

  try {
    const questions = await Question.find(filter).sort({ _id: -1 });
    res.json({ total: questions.length, data: questions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 添加题目
app.post('/api/questions', async (req, res) => {
  try {
    const newQ = new Question({ ...req.body, addedTime: new Date().toISOString().split('T')[0] });
    res.json(await newQ.save());
  } catch (e) { res.status(500).json({ error: '保存失败' }); }
});

// 更新题目
app.put('/api/questions/:id', async (req, res) => {
    try { const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updated); } 
    catch (e) { res.status(500).json({ error: '更新失败' }); }
});

// 删除题目
app.delete('/api/questions/:id', async (req, res) => {
    try { await Question.findByIdAndDelete(req.params.id); res.json({ success: true }); } 
    catch (e) { res.status(500).json({ error: '删除失败' }); }
});

app.listen(PORT, () => console.log(`API Server running on port ${PORT}`));