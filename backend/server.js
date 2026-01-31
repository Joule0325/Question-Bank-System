import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import axios from 'axios';
import AdmZip from 'adm-zip';
import FormData from 'form-data';
// 引入 Jimp
import { Jimp } from 'jimp'; 
import { pipeline } from 'stream';
import { promisify } from 'util';
// 引入 os 模块判断操作系统
import os from 'os';

const streamPipeline = promisify(pipeline);

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

// 编译临时目录定义与创建
const compileDir = path.join(process.cwd(), 'temp_compile');
if (!fs.existsSync(compileDir)) { fs.mkdirSync(compileDir); }

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

// 静态资源托管
app.use('/uploads', express.static(uploadDir));
app.use('/temp', express.static(compileDir)); 

// Multer 配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let ext = path.extname(file.originalname);
        
        // 如果没有扩展名，根据 mimetype 推断
        if (!ext || ext === '.') {
            switch (file.mimetype) {
                case 'application/pdf': ext = '.pdf'; break;
                case 'image/png': ext = '.png'; break;
                case 'image/jpeg': ext = '.jpg'; break;
                case 'image/webp': ext = '.webp'; break;
                case 'image/bmp': ext = '.bmp'; break;
                default: ext = '.jpg'; 
            }
        }
        cb(null, uniqueSuffix + ext);
    }
});const upload = multer({ storage: storage });

// --- MinerU 配置 ---
// 请确保这里是你最新的、有效的 API Key
const MINERU_API_KEY = 'eyJ0eXBlIjoiSldUIiwiYWxnIjoiSFM1MTIifQ.eyJqdGkiOiI3NDcwMDYzNyIsInJvbCI6IlJPTEVfUkVHSVNURVIiLCJpc3MiOiJPcGVuWExhYiIsImlhdCI6MTc2OTYyMTE5MywiY2xpZW50SWQiOiJsa3pkeDU3bnZ5MjJqa3BxOXgydyIsInBob25lIjoiIiwib3BlbklkIjpudWxsLCJ1dWlkIjoiZDM1ZjNiMmItYjkxZS00ZmFlLWFmYjktM2Q0ZDkyYmFiNDM0IiwiZW1haWwiOiIiLCJleHAiOjE3NzA4MzA3OTN9.40ED1BasedSGBRIZnBNJKhXu739Rk35RSlK3GLQN61Cb1wb3FTur16Z0SmaW5r3SPSrtauPFLxP4_YRPIkvUUw'; 
const MINERU_BASE_URL = 'https://mineru.net/api/v4';

// --- 2. Schema 定义 ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, 
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
        options: { type: Map, of: String }, optionLayout: Number,
        answer: String, analysis: String, detailed: String
    }]
});
QuestionSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; } });

const User = mongoose.model('User', UserSchema);
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

const deleteCategoryAndChildren = async (catId, query) => {
    const children = await Category.find({ parentId: catId, ...query });
    for (const child of children) { await deleteCategoryAndChildren(child.id, query); }
    await Category.deleteOne({ id: catId, ...query });
};

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
            const newCat = new Category({ id: new mongoose.Types.ObjectId().toString(), subjectId, parentId: parentId || null, title: node.title, order: i, creatorId: userId, isPublic: isPublicMode });
            await newCat.save(); currentId = newCat.id;
        }
        if (node.children && node.children.length > 0) { await syncCategoriesRecursive(node.children, currentId, subjectId, userId, isPublicMode); } 
        else { const orphanChildren = await Category.find({ parentId: currentId, ...baseQuery }); for (const orphan of orphanChildren) { await deleteCategoryAndChildren(orphan.id, baseQuery); } }
    }
    const toDelete = existingNodes.filter(ex => !usedIds.has(ex.id));
    for (const d of toDelete) { await deleteCategoryAndChildren(d.id, baseQuery); }
};

// 中间件：JWT 鉴权
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const mode = req.query.mode || (req.body && req.body.mode);
    if (mode === 'public' && req.method === 'GET') { return next(); }
    if (!token) return res.status(401).json({ error: '未登录' });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token 无效' });
        req.user = user; next();
    });
};

// --- API 接口 ---
app.post('/api/auth/register', async (req, res) => {
    try { const hashedPassword = await bcrypt.hash(req.body.password, 10); const user = new User({ username: req.body.username, password: hashedPassword }); await user.save(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: '注册失败' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(400).json({ error: '用户不存在' });
    if (await bcrypt.compare(req.body.password, user.password)) { const token = jwt.sign({ userId: user._id, username: user.username }, SECRET_KEY); res.json({ token, username: user.username, role: user.role || 'user' }); } else { res.status(400).json({ error: '密码错误' }); }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    res.json({ url: `http://localhost:3001/uploads/${req.file.filename}` });
});

// === MinerU OCR 接口 (最终修复版) ===
app.post('/api/smart-ocr', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });
    if (MINERU_API_KEY.includes('粘贴在这里')) return res.status(500).json({ error: '后端未配置 MinerU API Key' });
    
    const filePath = req.file.path; 
    const fileName = req.file.filename;
    
    try {
        console.log(`[OCR] 开始处理文件: ${fileName}`);
        const fileStat = fs.statSync(filePath);
        const fileBuffer = fs.readFileSync(filePath);
        
        // 1. 获取预签名 URL
        console.log('[OCR] 1. 获取上传链接...'); 
        const urlRes = await axios.post(`${MINERU_BASE_URL}/file-urls/batch`, { 
            files: [{ 
                name: fileName, 
                size: fileStat.size 
            }] 
        }, { 
            headers: { Authorization: `Bearer ${MINERU_API_KEY}` } 
        });

        if (!urlRes.data || !urlRes.data.data) { 
            throw new Error('获取上传链接失败: ' + JSON.stringify(urlRes.data)); 
        }
        
        const uploadInfo = urlRes.data.data.file_urls[0]; 
        const batchId = urlRes.data.data.batch_id;
        
        // 2. 上传文件到云端 (PUT)
        // [核心修复] 必须显式将 Content-Type 设置为空字符串 ''
        // 这与 Python 脚本中的 {'Content-Type': ''} 逻辑完全一致
        console.log(`[OCR] 2. 上传文件中 (${fileStat.size} bytes)...`); 
        
        try {
            await axios.put(uploadInfo, fileBuffer, {
                headers: { 
                    'Content-Type': '',  // <--- 关键点：必须为空字符串
                    'Content-Length': fileStat.size 
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });
        } catch (uploadErr) {
            console.error('❌ 上传被拒绝:', uploadErr.message);
            throw new Error('云端拒绝接收文件 (403)，请检查 Key 是否有效');
        }

        // 3. 提交任务
        console.log(`[OCR] 3. 提交任务 (BatchID: ${batchId})...`); 
        await axios.post(`${MINERU_BASE_URL}/extract/task/batch`, { 
            batch_id: batchId,
            is_ocr: true 
        }, { headers: { Authorization: `Bearer ${MINERU_API_KEY}` } });

        // 4. 轮询结果
        console.log('[OCR] 4. 等待解析...');
        let downloadUrl = null;
        
        // 轮询: 最多 100 次，每次 3 秒 (300s 超时)
        for (let i = 0; i < 100; i++) { 
            await new Promise(r => setTimeout(r, 3000));
            const statusRes = await axios.get(`${MINERU_BASE_URL}/extract-results/batch/${batchId}`, { 
                headers: { Authorization: `Bearer ${MINERU_API_KEY}` } 
            });
            
            const results = statusRes.data.data.extract_result; 
            if (!results || results.length === 0) continue;
            
            const item = results.find(r => r.file_name === fileName) || results[0];
            
            if (item.state === 'done') { 
                downloadUrl = item.full_zip_url; 
                console.log('[OCR] ✅ 解析完成');
                break; 
            }
            
            if (item.state === 'failed' || item.state === 'error') {
                console.error('[OCR] ❌ 服务端处理失败:', item);
                throw new Error(`MinerU 解析失败: ${item.err_msg} (可能是文件加密或格式不支持)`);
            }
        }
        
        if (!downloadUrl) throw new Error('解析超时，请稍后重试');
        
        // 5. 下载结果
        console.log('[OCR] 5. 下载结果并处理...'); 
        const zipRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' }); 
        const zip = new AdmZip(Buffer.from(zipRes.data));
        
        let markdown = ''; 
        const imgMap = {}; 
        const frontendImages = {}; 
        
        zip.getEntries().forEach(entry => {
            if (entry.entryName.endsWith('.md') && !entry.entryName.includes('__MACOSX')) { 
                markdown = zip.readAsText(entry); 
            } 
            else if (entry.entryName.match(/\.(jpg|jpeg|png)$/i) && !entry.isDirectory) {
                const newName = `ocr_${Date.now()}_${path.basename(entry.entryName)}`;
                fs.writeFileSync(path.join(uploadDir, newName), entry.getData());
                const serverUrl = `http://localhost:3001/uploads/${newName}`;
                const shortId = 'OCR_' + Math.random().toString(36).substr(2, 6).toUpperCase();
                imgMap[entry.entryName] = { url: serverUrl, id: shortId }; 
                frontendImages[shortId] = serverUrl;
            }
        });

        Object.keys(imgMap).forEach(originPath => {
            const safePath = originPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`!\\[.*?\\]\\(.*${safePath}\\)`, 'g');
            markdown = markdown.replace(regex, `[img:${imgMap[originPath].id}:m:80]`);
        });

        markdown = markdown.replace(/\\\[/g, '$').replace(/\\\]/g, '$').replace(/\\\(/g, '$').replace(/\\\)/g, '$');
        
        res.json({ success: true, content: markdown, images: frontendImages });
        
    } catch (e) { 
        console.error('[OCR] Exception:', e.message); 
        res.status(500).json({ error: e.message || '识别流程异常' }); 
    }
});

// --- 常规业务接口 (Subject, Category, Question) ---
app.get('/api/subjects', authenticateToken, async (req, res) => { const { mode } = req.query; const query = mode === 'public' ? { isPublic: true } : { creatorId: req.user.userId }; if (mode === 'private') { const count = await Subject.countDocuments(query); if (count === 0) await new Subject({ id: new mongoose.Types.ObjectId().toString(), title: '默认科目', order: 0, creatorId: req.user.userId, isPublic: false }).save(); } const subjects = await Subject.find(query).sort({ order: 1 }).lean(); res.json(subjects); });
app.post('/api/subjects/manage', authenticateToken, async (req, res) => { const { action, list } = req.body; const mode = req.body.mode || req.query.mode; const isPublicMode = mode === 'public' && req.user.role === 'admin'; const userQuery = isPublicMode ? { isPublic: true } : { creatorId: req.user.userId }; try { if (action === 'update_list') { const existingSubjects = await Subject.find(userQuery); const existingIds = existingSubjects.map(s => s.id); const keepIds = list.filter(s => !s.id.startsWith('new_')).map(s => s.id); const toDelete = existingIds.filter(eid => !keepIds.includes(eid)); if (toDelete.length > 0) await Subject.deleteMany({ id: { $in: toDelete }, ...userQuery }); for (let i = 0; i < list.length; i++) { const item = list[i]; if (item.id.startsWith('new_')) { await new Subject({ id: new mongoose.Types.ObjectId().toString(), title: item.title, order: i, creatorId: req.user.userId, isPublic: isPublicMode }).save(); } else { await Subject.findOneAndUpdate({ id: item.id, ...userQuery }, { title: item.title, order: i }); } } res.json({ success: true }); } else { res.status(400).json({ error: 'Invalid action' }); } } catch(e) { res.status(500).json({ error: e.message }); } });
app.get('/api/categories', authenticateToken, async (req, res) => { const { mode, subjectId } = req.query; const query = { subjectId }; if (mode === 'public') query.isPublic = true; else query.creatorId = req.user.userId; const flatCats = await Category.find(query).lean(); res.json(buildTree(flatCats)); });
app.post('/api/categories/manage', authenticateToken, async (req, res) => { const { action, subjectId, parentId, data, id, sourceId, targetId, position, title, children } = req.body; const mode = req.body.mode || req.query.mode; const userId = req.user.userId; const isPublicMode = mode === 'public' && req.user.role === 'admin'; const query = isPublicMode ? { isPublic: true } : { creatorId: userId }; try { if (action === 'add-root' || action === 'add-sub') { await new Category({ id: new mongoose.Types.ObjectId().toString(), subjectId, title: data.title, parentId: action === 'add-sub' ? parentId : null, order: Date.now(), creatorId: userId, isPublic: isPublicMode }).save(); } else if (action === 'reorder') { const source = await Category.findOne({ id: sourceId, ...query }); const target = await Category.findOne({ id: targetId, ...query }); if (source && target) { if (source.parentId !== target.parentId) source.parentId = target.parentId; source.order = position === 'top' ? (target.order || 0) - 0.1 : (target.order || 0) + 0.1; await source.save(); } } else if (action === 'rename') { await Category.findOneAndUpdate({ id: id, ...query }, { title: title }); } else if (action === 'delete') { await deleteCategoryAndChildren(id, query); } else if (action === 'update_list') { if (children && Array.isArray(children)) await syncCategoriesRecursive(children, parentId, subjectId, userId, isPublicMode); } res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/filters', authenticateToken, async (req, res) => { try { const { subjectId } = req.query; const mode = req.query.mode; const query = { subjectId }; if (mode === 'public') query.isPublic = true; else query.creatorId = req.user.userId; const types = await Question.find(query).distinct('type'); const rawProvinces = await Question.find(query).distinct('province'); const provinceSet = new Set(); rawProvinces.forEach(p => { if (p) { const parts = p.split('/'); parts.forEach(part => { if(part.trim()) provinceSet.add(part.trim()); }); } }); res.json({ types: types.filter(t => t), provinces: Array.from(provinceSet).sort() }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/questions', authenticateToken, async (req, res) => { const { mode, categoryIds, subjectId, type, difficulty, province, year, source, qNumber, tags } = req.query; const filter = {}; if (mode === 'public') filter.isPublic = true; else filter.creatorId = req.user.userId; if (subjectId) filter.subjectId = subjectId; if (type && type !== '全部') filter.type = type; if (difficulty && difficulty !== '全部') filter.difficulty = Number(difficulty); if (province && province !== '全部') filter.province = { $regex: province }; if (year) filter.year = { $regex: year }; if (source) filter.source = { $regex: source, $options: 'i' }; if (qNumber) filter.qNumber = { $regex: qNumber }; if (categoryIds) filter.categoryIds = { $in: categoryIds.split(',') }; if (tags) { const tagList = tags.split(','); filter.tags = { $in: tagList }; } try { const questions = await Question.find(filter).sort({ _id: -1 }); res.json({ total: questions.length, data: questions }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/questions', authenticateToken, async (req, res) => { try { const isPublic = (req.user.role === 'admin' && req.body.isPublic === true); const newQ = new Question({ ...req.body, creatorId: req.user.userId, isPublic: isPublic, addedTime: new Date().toISOString().split('T')[0] }); res.json(await newQ.save()); } catch (e) { res.status(500).json({ error: '保存失败' }); } });
app.put('/api/questions/:id', authenticateToken, async (req, res) => { try { const user = await User.findById(req.user.userId); const filter = (user && user.role === 'admin') ? { _id: req.params.id } : { _id: req.params.id, creatorId: req.user.userId }; const updated = await Question.findOneAndUpdate(filter, req.body, { new: true }); if(!updated) return res.status(403).json({error: '无权操作该题目或题目不存在'}); res.json(updated); } catch (e) { res.status(500).json({ error: '更新失败' }); } });
app.delete('/api/questions/:id', authenticateToken, async (req, res) => { try { const user = await User.findById(req.user.userId); const filter = (user && user.role === 'admin') ? { _id: req.params.id } : { _id: req.params.id, creatorId: req.user.userId }; const deleted = await Question.findOneAndDelete(filter); if(!deleted) return res.status(403).json({error: '未找到题目或无权限'}); res.json({ success: true }); } catch (e) { res.status(500).json({ error: '删除失败' }); } });
app.post('/api/questions/fork', authenticateToken, async (req, res) => { const { questionId, targetSubjectId, targetCategoryIds } = req.body; try { const originalQ = await Question.findOne({ _id: questionId, isPublic: true }).lean(); if (!originalQ) return res.status(404).json({ error: '未找到该公共题目' }); delete originalQ._id; delete originalQ.id; const newQ = new Question({ ...originalQ, creatorId: req.user.userId, isPublic: false, subjectId: targetSubjectId, categoryIds: targetCategoryIds, addedTime: new Date().toISOString().split('T')[0], code: 'F' + Date.now().toString().slice(-6) }); await newQ.save(); res.json({ success: true, id: newQ.id }); } catch (e) { res.status(500).json({ error: e.message }); } });

// --- LaTeX 编译接口 (含 Mac 字体修复) ---
app.post('/api/compile', async (req, res) => {
    let { sourceCode, imageAssets } = req.body; 
    if (!sourceCode) return res.status(400).json({ error: '无 LaTeX 代码' });

    const timestamp = Date.now();
    const jobDir = path.join(compileDir, `job_${timestamp}`);
    if (!fs.existsSync(jobDir)) { fs.mkdirSync(jobDir, { recursive: true }); }
    const imagesDir = path.join(jobDir, 'images');
    if (!fs.existsSync(imagesDir)) { fs.mkdirSync(imagesDir, { recursive: true }); }

    const texFile = path.join(jobDir, `paper.tex`);
    const pdfFilename = `paper.pdf`;
    
    try {
        if (os.platform() === 'darwin') {
            if (sourceCode.includes('\\documentclass[UTF8]{ctexart}')) {
                sourceCode = sourceCode.replace('\\documentclass[UTF8]{ctexart}', '\\documentclass[UTF8,fontset=mac]{ctexart}');
                console.log('[Compile] 🍎 检测到 Mac 系统，已自动注入 fontset=mac');
            }
        }
        console.log(`[Compile] Job started: ${jobDir}`);

        if (imageAssets && typeof imageAssets === 'object') {
            let imgCounter = 0;
            const entries = Object.entries(imageAssets);
            for (const [originalSaveFilename, url] of entries) {
                const ext = path.extname(originalSaveFilename) || '.jpg';
                const safeFilename = `img_${imgCounter++}${ext}`;
                const destPath = path.join(imagesDir, safeFilename);
                let img = null;
                try {
                    if (url.includes('/uploads/')) {
                        try {
                            const urlPart = url.split('/uploads/')[1];
                            if (urlPart) {
                                const realFilename = decodeURIComponent(urlPart);
                                const srcPath = path.join(uploadDir, realFilename);
                                if (fs.existsSync(srcPath)) {
                                    img = await Jimp.read(srcPath);
                                    console.log(`[Compile] ✅ 本地读取: ${realFilename}`);
                                }
                            }
                        } catch (localErr) { console.warn(`[Compile] 本地读取失败: ${localErr.message}`); }
                    }
                    if (!img) { img = await Jimp.read(url); console.log(`[Compile] ✅ 网络读取: ${url}`); }
                    if (img) {
                        await img.write(destPath); 
                        console.log(`[Compile] 🎨 保存为安全文件名: ${safeFilename}`);
                        sourceCode = sourceCode.split(originalSaveFilename).join(safeFilename);
                    }
                } catch (err) {
                    console.error(`[Compile] ❌ 图片处理失败: ${url}`, err.message);
                    new Jimp({ width: 100, height: 100, color: 0xFFFFFFFF }).write(destPath);
                    sourceCode = sourceCode.split(originalSaveFilename).join(safeFilename);
                }
            }
        }

        fs.writeFileSync(texFile, sourceCode);
        const cmd = `xelatex -interaction=nonstopmode -output-directory="." "paper.tex"`;
        exec(cmd, { cwd: jobDir }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[Compile] ❌ xelatex 报错`);
                const logFile = path.join(jobDir, `paper.log`);
                let logContent = "无日志文件";
                if (fs.existsSync(logFile)) { logContent = fs.readFileSync(logFile, 'utf-8'); }
                return res.status(500).json({ error: '编译失败', log: logContent.slice(-3000) });
            }
            console.log(`[Compile] 🎉 编译成功`);
            const protocol = req.protocol;
            const host = req.get('host');
            res.json({ url: `${protocol}://${host}/temp/job_${timestamp}/${pdfFilename}` });
        });
    } catch (e) {
        console.error('[Compile] Server Error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => console.log(`🚀 API Server running on port ${PORT}`));