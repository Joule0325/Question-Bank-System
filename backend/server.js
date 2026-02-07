import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { spawn } from 'child_process'; 
import axios from 'axios';
import AdmZip from 'adm-zip';
import { pipeline } from 'stream';
import { promisify } from 'util';
import os from 'os';
// 如果您需要 Jimp 处理图片，保留它；如果只用 MinerU/Python 也可以移除，这里保留以防万一
import { Jimp } from 'jimp'; 
import { exec } from 'child_process';

const app = express();
const PORT = 3001;
const SECRET_KEY = 'YOUR_SECRET_KEY_CHANGE_THIS_IN_PROD'; 

// ==========================================
// === 配置区域 ===
// ==========================================

// 1. Qwen 配置 (保留)
const DASHSCOPE_API_KEY = 'sk-8a2cd122b7e442969aad0f1516ee68b5'; 

// 2. DeepSeek 配置 (保留)
const DEEPSEEK_API_KEY = 'sk-3mmdOmu0ssmYBLdKA75112417853451c8dE38e4602C0246f';
const DEEPSEEK_BASE_URL = 'https://dpapi.cn/v1/chat/completions';
const DEEPSEEK_MODEL_NAME = 'deepseek-v3'; 

// 3. [新增] Gemini 配置
const GEMINI_API_KEY = 'sk-MUVHHC0GN2AbXxokvqftsIXhceneed4l5Wbno00pJIopJN6J';
// 假设您是在同一平台(dpapi)购买的 Key，如果不是，请更换此前缀
const GEMINI_BASE_URL = 'https://api.vectorengine.ai/v1/chat/completions';
const GEMINI_MODEL_NAME = 'gemini-2.5-pro';

// 4. MinerU 配置 (保留)
const MINERU_API_KEY = 'eyJ0eXBlIjoiSldUIiwiYWxnIjoiSFM1MTIifQ.eyJqdGkiOiI3NDcwMDYzNyIsInJvbCI6IlJPTEVfUkVHSVNURVIiLCJpc3MiOiJPcGVuWExhYiIsImlhdCI6MTc2OTYyMTE5MywiY2xpZW50SWQiOiJsa3pkeDU3bnZ5MjJqa3BxOXgydyIsInBob25lIjoiIiwib3BlbklkIjpudWxsLCJ1dWlkIjoiZDM1ZjNiMmItYjkxZS00ZmFlLWFmYjktM2Q0ZDkyYmFiNDM0IiwiZW1haWwiOiIiLCJleHAiOjE3NzA4MzA3OTN9.40ED1BasedSGBRIZnBNJKhXu739Rk35RSlK3GLQN61Cb1wb3FTur16Z0SmaW5r3SPSrtauPFLxP4_YRPIkvUUw';
const MINERU_BASE_URL = 'https://mineru.net/api/v4';

// ==========================================
// === 工具函数 ===
// ==========================================
// 生成6位随机大写字母+数字的ID
const generateRandomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// ==========================================
// === 数据库连接 ===
// ==========================================
const MONGO_URI = 'mongodb://127.0.0.1:27017/question-bank';
mongoose.connect(MONGO_URI)
  .then(async () => {
      console.log('✅ MongoDB 数据库连接成功');
      // [自动迁移] 将所有旧的 isPublic=true 题目标记为 isOfficial=true (官方题目)
      try {
          await Question.updateMany(
              { isPublic: true, isOfficial: { $exists: false } },
              { $set: { isOfficial: true } }
          );
          console.log('✅ 数据迁移完成：旧公共题目已标记为官方');
      } catch(e) { console.error('迁移跳过或失败', e); }
  })
  .catch(err => console.error('❌ MongoDB 连接失败:', err));

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// 路径定义
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }
const pdfImagesDir = path.join(process.cwd(), 'temp_pdf_images');
if (!fs.existsSync(pdfImagesDir)) { fs.mkdirSync(pdfImagesDir); }
const compileDir = path.join(process.cwd(), 'temp_compile');
if (!fs.existsSync(compileDir)) { fs.mkdirSync(compileDir); }

// 静态资源
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
app.use('/temp', express.static(compileDir)); 

// Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let ext = path.extname(file.originalname);
        if (!ext || ext === '.') {
            if (file.mimetype === 'application/pdf') ext = '.pdf';
            else if (file.mimetype.startsWith('image/')) ext = '.jpg';
        }
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

// 鉴权
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token && !req.query.mode) return res.status(401).json({ error: '未登录' });
    if (token) {
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (!err) req.user = user;
            next();
        });
    } else next();
};

// ============================================================
// === 智能 OCR 核心 (Prompt 深度优化版) ===
// ============================================================

const SYSTEM_PROMPT = `
你是一个专业的试题录入助手，负责将图片中的试题内容精准识别并转换为指定格式。
请严格遵守以下规则，直接输出结果，**禁止**输出任何解释性语言，**禁止**输出原图片没有的内容。

【核心规则】

1. **题型与结构**：
   - **选择题**：必须使用 "##选项 N" 标签。其中 **N** 代表一行显示的选项数量（如 1, 2, 4），请根据图片排版自动判断。
   - **解答/综合题**：若包含多个子问题（如 (1), (2)），必须为每个子问题前添加 "##小题" 标签，然后"##题干"标签用来放题干内容。
   - **嵌套选择题**：若小题内部为选择题，同样需使用 "##选项" 标签。
   - **严禁**将“选项”（A/B/C/D）识别为“小题”。

2. **分隔规范**：
   - 不同题目之间（即题号变化时），使用 "===" 进行分隔。

3. **排版与换行**：
   - **普通换行**：文本内部换行使用 <br> 标签，且 <br> 必须单独占一行。
   - **特殊排版**：
     - **大标题**：使用 "[居中] " 前缀。
     - **段落**：使用 "[缩进] " 前缀（用于语文、英语文章段落）。
     - **冲突规则**：如果一行以 "[居中]" 或 "[缩进]" 开头，则该行上方**不需要**再加 <br> 标签。
   - **公式间距**：若行内包含大型数学符号（如 \\dfrac, \\int, \\sum），请将整行包裹在 <div style="margin: 10px 0;">...</div> 中以增加行间距。

4. **数学公式规范**：
   - 分数默认使用 \\dfrac{}{}。
   - 仅在上下标（如指数、脚标）内部使用 \\tfrac{}{}。

5. **非文本元素**：
   - 图片/插图位置填写：[图片占位]。

6. **答案录入逻辑**：
   - 仅在明确识别到答案内容时才录入内容。
   - 若未识别到答案，保留 "##答案" 标签，但内容留空。
`;

// 1. Python 转图
function convertPdfToImages(pdfPath) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', ['pdf_converter.py', 'render', pdfPath, pdfImagesDir]);
        let dataString = '';
        pythonProcess.stdout.on('data', (data) => { dataString += data.toString(); });
        pythonProcess.on('close', (code) => {
            if (code !== 0) return reject(new Error(`Python exit code ${code}`));
            try {
                const result = JSON.parse(dataString);
                if (result.success) resolve(result.images);
                else reject(new Error(result.error));
            } catch (e) { reject(new Error('Python output parse error')); }
        });
    });
}

// 2. Qwen-VL 识别
async function callQwenVL(imagePath) {
    try {
        const base64Image = fs.readFileSync(imagePath).toString('base64');
        const response = await axios.post(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
            {
                model: 'qwen-vl-max',
                max_tokens: 81920,
                temperature: 0.1,
                input: {
                    messages: [
                        { role: 'user', content: [{ image: `data:image/jpeg;base64,${base64Image}` }, { text: SYSTEM_PROMPT }] }
                    ]
                },
                parameters: { result_format: 'message' }
            },
            {
                headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' },
                timeout: 180000 
            }
        );
        if (response.data.output?.choices) {
            let text = response.data.output.choices[0].message.content[0].text;
            return text.replace(/^```.*$/gm, '').replace(/```/g, '').trim();
        }
        return null;
    } catch (e) {
        console.error(`[Qwen] Error processing ${path.basename(imagePath)}:`, e.message);
        return null;
    }
}

// 3. DeepSeek 流式输出
async function streamDeepSeek(imagePath, res) {
    try {
        const base64Image = fs.readFileSync(imagePath).toString('base64');
        const response = await axios.post(
            DEEPSEEK_BASE_URL,
            {
                model: DEEPSEEK_MODEL_NAME, 
                messages: [
                    { 
                        role: 'user', 
                        content: [
                            { type: 'text', text: SYSTEM_PROMPT },
                            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                        ] 
                    }
                ],
                stream: true
            },
            {
                headers: { 
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 
                    'Content-Type': 'application/json' 
                },
                responseType: 'stream',
                timeout: 180000
            }
        );

        return new Promise((resolve, reject) => {
            let buffer = '';
            response.data.on('data', (chunk) => {
                console.log('DeepSeek返回:', chunk.toString()); // Log修正为DeepSeek
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留未完整的行

                for (const line of lines) {
                    if (line.trim() === 'data: [DONE]') continue;
                    if (line.startsWith('data: ')) {
                        try {
                            const json = JSON.parse(line.slice(6));
                            const content = json.choices[0]?.delta?.content || '';
                            if (content) {
                                res.write(`data: ${JSON.stringify({ t: 'txt', c: content })}\n\n`);
                            }
                        } catch (e) {}
                    }
                }
            });
            response.data.on('end', () => resolve());
            response.data.on('error', (err) => reject(err));
        });
    } catch (e) {
        let errMsg = e.message;
        if (e.response) errMsg += ` (Status: ${e.response.status})`;
        console.error(`[DeepSeek] Stream Error:`, errMsg);
        res.write(`data: ${JSON.stringify({ t: 'err', c: 'DeepSeek Error: ' + errMsg })}\n\n`);
        return null; 
    }
}

// 4. [新增] Gemini 流式输出
async function streamGemini(imagePath, res) {
    try {
        const base64Image = fs.readFileSync(imagePath).toString('base64');
        const response = await axios.post(
            GEMINI_BASE_URL,
            {
                model: GEMINI_MODEL_NAME, 
                max_tokens: 81920,
                temperature: 0.1,
                messages: [
                    { 
                        role: 'user', 
                        content: [
                            { type: 'text', text: SYSTEM_PROMPT },
                            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                        ] 
                    }
                ],
                stream: true
            },
            {
                headers: { 
                    'Authorization': `Bearer ${GEMINI_API_KEY}`, 
                    'Content-Type': 'application/json' 
                },
                responseType: 'stream',
                timeout: 180000
            }
        );

        return new Promise((resolve, reject) => {
            let buffer = '';
            response.data.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop(); 

                for (const line of lines) {
                    if (line.trim() === 'data: [DONE]') continue;
                    if (line.startsWith('data: ')) {
                        try {
                            const json = JSON.parse(line.slice(6));
                            const content = json.choices[0]?.delta?.content || '';
                            if (content) {
                                res.write(`data: ${JSON.stringify({ t: 'txt', c: content })}\n\n`);
                            }
                        } catch (e) {}
                    }
                }
            });
            response.data.on('end', () => resolve());
            response.data.on('error', (err) => reject(err));
        });
    } catch (e) {
        let errMsg = e.message;
        if (e.response) errMsg += ` (Status: ${e.response.status})`;
        console.error(`[Gemini] Stream Error:`, errMsg);
        res.write(`data: ${JSON.stringify({ t: 'err', c: 'Gemini Error: ' + errMsg })}\n\n`);
        return null; 
    }
}

// 5. MinerU 批量提取
async function runMinerUBatch(imagePaths) {
    try {
        if (!imagePaths || imagePaths.length === 0) return {};
        console.log(`[MinerU] Batch processing ${imagePaths.length} images...`);

        const filesMeta = imagePaths.map(p => ({
            name: path.basename(p),
            size: fs.statSync(p).size
        }));

        const urlRes = await axios.post(`${MINERU_BASE_URL}/file-urls/batch`, { 
            language: 'ch', files: filesMeta
        }, { headers: { Authorization: `Bearer ${MINERU_API_KEY}` } });

        const { file_urls, batch_id } = urlRes.data.data;

        await Promise.all(file_urls.map((uploadUrl, i) => {
            const buffer = fs.readFileSync(imagePaths[i]);
            return axios.put(uploadUrl, buffer, { 
                headers: { 'Content-Type': '', 'Content-Length': filesMeta[i].size } 
            });
        }));

        await axios.post(`${MINERU_BASE_URL}/extract/task/batch`, { 
            language: 'ch', files: filesMeta.map(f => ({ name: f.name, is_ocr: true })) 
        }, { headers: { Authorization: `Bearer ${MINERU_API_KEY}` } });

        console.log(`[MinerU] Batch ID: ${batch_id}`);

        let finalImages = {};
        let completedFiles = new Set();

        for (let i = 0; i < 40; i++) { 
            await new Promise(r => setTimeout(r, 2500));
            const statusRes = await axios.get(`${MINERU_BASE_URL}/extract-results/batch/${batch_id}`, { 
                headers: { Authorization: `Bearer ${MINERU_API_KEY}` } 
            });
            const results = statusRes.data.data.extract_result;
            
            for (const item of results) {
                if (item.state === 'done' && !completedFiles.has(item.file_name)) {
                    completedFiles.add(item.file_name);
                    const zipRes = await axios.get(item.full_zip_url, { responseType: 'arraybuffer' });
                    const zip = new AdmZip(Buffer.from(zipRes.data));
                    
                    zip.getEntries().forEach(entry => {
                        if (entry.entryName.includes('images/') && entry.entryName.match(/\.(jpg|jpeg|png)$/i) && !entry.isDirectory) {
                            const newName = `mineru_${Date.now()}_${path.basename(entry.entryName)}`;
                            fs.writeFileSync(path.join(uploadDir, newName), entry.getData());
                            const imgId = 'IMG_' + Math.random().toString(36).substr(2, 5).toUpperCase();
                            finalImages[imgId] = `http://localhost:3001/uploads/${newName}`;
                        }
                    });
                }
            }
            if (completedFiles.size === imagePaths.length) break;
        }
        return finalImages;
    } catch (e) {
        console.error('[MinerU] Batch Error:', e.message);
        return {};
    }
}

// === 主接口 ===
app.post('/api/smart-ocr', authenticateToken, upload.single('file'), async (req, res) => {
    req.setTimeout(0); 
    
    if (!req.file) return res.status(400).json({ error: 'No file' });
    
    // 设置 SSE 头部
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const filePath = req.file.path; 
    const isPdf = req.file.mimetype === 'application/pdf';
    // 前端如果传 'Gemini'，则使用 Gemini 模型
    const model = req.query.model || req.body.model || 'Qwen'; 
    
    try {
        res.write(`data: ${JSON.stringify({ t: 'status', c: 'Starting processing...' })}\n\n`);
        console.log(`[Smart-OCR] Start: ${req.file.filename} using ${model}`);
        
        let targetImages = [];
        if (isPdf) {
            res.write(`data: ${JSON.stringify({ t: 'status', c: 'Converting PDF to images...' })}\n\n`);
            targetImages = await convertPdfToImages(filePath);
        } else {
            targetImages = [filePath];
        }

        // MinerU 任务
        const mineruTask = runMinerUBatch(targetImages).then(imgs => {
            if (Object.keys(imgs).length > 0) {
                res.write(`data: ${JSON.stringify({ t: 'imgs', d: imgs })}\n\n`);
            }
        });

        // LLM 任务
        const llmTask = (async () => {
            for (let i = 0; i < targetImages.length; i++) {
                const imgPath = targetImages[i];
                if (targetImages.length > 1) {
                    res.write(`data: ${JSON.stringify({ t: 'txt', c: i > 0 ? '\n\n===\n\n' : '' })}\n\n`);
                    res.write(`data: ${JSON.stringify({ t: 'status', c: `Processing page ${i + 1}/${targetImages.length}...` })}\n\n`);
                }

                if (model === 'DeepSeek') {
                    await streamDeepSeek(imgPath, res);
                } else if (model === 'Gemini 2.5 Pro') {  
                    await streamGemini(imgPath, res);
                } else {
                    // 默认使用 Qwen
                    const txt = await callQwenVL(imgPath);
                    if (txt) res.write(`data: ${JSON.stringify({ t: 'txt', c: txt })}\n\n`);
                }
            }
        })();

        await Promise.all([llmTask, mineruTask]);

        if (isPdf) {
            targetImages.forEach(p => { try { fs.unlinkSync(p); } catch(e){} });
        }
        
        res.write(`data: ${JSON.stringify({ t: 'done' })}\n\n`);
        res.end();

    } catch (e) {
        console.error('[Smart-OCR] Fail:', e);
        res.write(`data: ${JSON.stringify({ t: 'err', c: e.message })}\n\n`);
        res.end();
    }
});

// ==========================================
// === 数据库 & 业务接口 ===
// ==========================================

// 【修改点】新增 uid 和 inviteCode 字段
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, 
    createdAt: { type: Date, default: Date.now },
    uid: { type: String, unique: true },
    inviteCode: { type: String, unique: true },
    nickname: { type: String, unique: true, sparse: true },
    avatar: String,
    signature: String,
    gender: { type: Number, default: 0 },
    birthDate: String,
    school: String,
    boundInviteCode: String 
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
    }],
    // === [新增] 是否为官方题目 ===
    // true=官方空间, false=公共空间(用户上传), undefined=旧数据
    isOfficial: { type: Boolean, default: false } 
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
    const query = parentId ? { parentId, ...baseQuery } : { subjectId, parentId: { $in: [null, '0', ''] }, ...baseQuery };
    const existingNodes = await Category.find(query);
    const usedIds = new Set();
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        let currentId = null;
        const match = existingNodes.find(ex => ex.title === node.title && !usedIds.has(ex.id));
        if (match) {
            match.order = i; 
            if (!parentId && match.parentId) match.parentId = null;
            await match.save();
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

// 业务路由
app.post('/api/auth/register', async (req, res) => { 
    try { 
        if (!req.body.username || !req.body.password) return res.status(400).json({ error: '用户名和密码不能为空' });
        
        const existingUser = await User.findOne({ username: req.body.username });
        if (existingUser) return res.status(400).json({ error: '该用户名已被注册' });

        const hashedPassword = await bcrypt.hash(req.body.password, 10); 
        
        // 【修改点】创建用户时自动生成 uid 和 inviteCode
        const user = new User({ 
            username: req.body.username, 
            password: hashedPassword,
            uid: generateRandomId(),
            inviteCode: generateRandomId()
        }); 
        
        await user.save(); 
        res.json({ success: true }); 
    } catch (e) { 
        if (e.code === 11000) return res.status(400).json({ error: '该用户名已被注册' });
        res.status(500).json({ error: '注册失败: ' + e.message }); 
    } 
});

app.post('/api/auth/login', async (req, res) => { 
    const user = await User.findOne({ username: req.body.username }); 
    if (!user) return res.status(400).json({ error: '用户不存在' }); 
    
    if (await bcrypt.compare(req.body.password, user.password)) { 
        const token = jwt.sign({ userId: user._id, username: user.username }, SECRET_KEY); 
        // 返回完整用户信息
        res.json({ 
            token, 
            username: user.username, 
            role: user.role || 'user',
            uid: user.uid,
            inviteCode: user.inviteCode,
            nickname: user.nickname || '',
            avatar: user.avatar || '',
            signature: user.signature || '',
            gender: user.gender || 0,
            birthDate: user.birthDate || '',
            school: user.school || '',
            boundInviteCode: user.boundInviteCode || '' 
        }); 
    } else { 
        res.status(400).json({ error: '密码错误' }); 
    } 
});
const getStrLen = (str) => {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
        // charCodeAt > 127 视为双字节字符(如汉字)
        if (str.charCodeAt(i) > 127) { 
            len += 2; 
        } else { 
            len++; 
        }
    }
    return len;
};

// === 新增：更新用户信息接口 ===
app.post('/api/user/update', authenticateToken, async (req, res) => {
    try {
        const { nickname, signature, gender, birthDate, school, avatar, boundInviteCode } = req.body;
        const userId = req.user.userId;

        const updateData = {};
        if (signature !== undefined) updateData.signature = signature;
        if (gender !== undefined) updateData.gender = gender;
        if (birthDate !== undefined) updateData.birthDate = birthDate;
        if (school !== undefined) updateData.school = school;
        if (avatar !== undefined) updateData.avatar = avatar;

        // --- 昵称处理 (保持不变) ---
        if (nickname) {
            const regex = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/;
            if (!regex.test(nickname)) return res.status(400).json({ error: '昵称不能包含特殊符号' });
            if (getStrLen(nickname) > 12) return res.status(400).json({ error: '昵称过长' });

            const existingUser = await User.findOne({ nickname: nickname, _id: { $ne: userId } });
            if (existingUser) return res.status(400).json({ error: '该昵称已被占用' });
            updateData.nickname = nickname;
        }

        // --- 核心：处理邀请码绑定 ---
        if (boundInviteCode) {
            const currentUser = await User.findById(userId);
            
            // 1. 如果之前已经绑定过了，禁止修改
            if (currentUser.boundInviteCode) {
                // 如果前端传的和存的不一样，报错；如果一样，忽略
                if (currentUser.boundInviteCode !== boundInviteCode) {
                    return res.status(400).json({ error: '您已绑定过邀请码，不可更改' });
                }
            } else {
                // 2. 还没绑定过，执行绑定校验
                if (boundInviteCode === currentUser.inviteCode) {
                    return res.status(400).json({ error: '不能绑定自己的邀请码' });
                }
                
                const targetUser = await User.findOne({ inviteCode: boundInviteCode });
                if (!targetUser) {
                    return res.status(400).json({ error: '邀请码不存在，请检查' });
                }

                updateData.boundInviteCode = boundInviteCode;
            }
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
        res.json({ success: true, user: updatedUser });

    } catch (e) {
        console.error(e);
        if (e.code === 11000) return res.status(400).json({ error: '数据冲突' });
        res.status(500).json({ error: '更新失败: ' + e.message });
    }
});
app.post('/api/upload', upload.single('file'), (req, res) => { if (!req.file) return res.status(400).json({ error: '请选择文件' }); res.json({ url: `http://localhost:3001/uploads/${req.file.filename}` }); });
app.get('/api/subjects', authenticateToken, async (req, res) => { 
    const { mode } = req.query; 
    // 【修改点】public 和 community 都读取 isPublic=true 的科目
    const query = (mode === 'public' || mode === 'community') 
        ? { isPublic: true } 
        : { creatorId: req.user.userId }; 
    
    if (mode === 'private') { /* ...原有初始化逻辑不变... */ } 
    
    const subjects = await Subject.find(query).sort({ order: 1 }).lean(); 
    res.json(subjects); 
});
app.post('/api/subjects/manage', authenticateToken, async (req, res) => { 
    const { action, list } = req.body; 
    const mode = req.body.mode || req.query.mode; 
    let user = req.user;
    try {
        const dbUser = await User.findById(req.user.userId);
        if (dbUser) user = dbUser;
    } catch(e) {}
    const isPublicMode = (mode === 'public' || mode === 'community') && user.role === 'admin';
    const userQuery = isPublicMode ? { isPublic: true } : { creatorId: req.user.userId }; 
    try { if (action === 'update_list') { const existingSubjects = await Subject.find(userQuery); const existingIds = existingSubjects.map(s => s.id); const keepIds = list.filter(s => !s.id.startsWith('new_')).map(s => s.id); const toDelete = existingIds.filter(eid => !keepIds.includes(eid)); if (toDelete.length > 0) await Subject.deleteMany({ id: { $in: toDelete }, ...userQuery }); for (let i = 0; i < list.length; i++) { const item = list[i]; if (item.id.startsWith('new_')) { await new Subject({ id: new mongoose.Types.ObjectId().toString(), title: item.title, order: i, creatorId: req.user.userId, isPublic: isPublicMode }).save(); } else { await Subject.findOneAndUpdate({ id: item.id, ...userQuery }, { title: item.title, order: i }); } } res.json({ success: true }); } else { res.status(400).json({ error: 'Invalid action' }); } } catch(e) { res.status(500).json({ error: e.message }); } });
app.get('/api/categories', authenticateToken, async (req, res) => { 
    const { mode, subjectId } = req.query; 
    const query = { subjectId }; 
    
    // 【修改点】public 和 community 都读取 isPublic=true 的目录
    if (mode === 'public' || mode === 'community') {
        query.isPublic = true;
    } else {
        query.creatorId = req.user.userId;
    }
    
    const flatCats = await Category.find(query).lean(); 
    res.json(buildTree(flatCats)); 
});
app.post('/api/categories/manage', authenticateToken, async (req, res) => { 
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { action, subjectId, parentId, data, id, sourceId, targetId, position, title, children } = req.body; 
    const mode = req.body.mode || req.query.mode; 
    const userId = req.user.userId; 
    let user = req.user;
    try {
        const dbUser = await User.findById(userId);
        if (dbUser) user = dbUser;
    } catch(e) {}
    const isPublicMode = (mode === 'public' || mode === 'community') && user.role === 'admin';
    const query = isPublicMode ? { isPublic: true } : { creatorId: userId }; 
    try { if (action === 'add-root' || action === 'add-sub') { await new Category({ id: new mongoose.Types.ObjectId().toString(), subjectId, title: data.title, parentId: action === 'add-sub' ? parentId : null, order: Date.now(), creatorId: userId, isPublic: isPublicMode }).save(); } else if (action === 'reorder') { const source = await Category.findOne({ id: sourceId, ...query }); const target = await Category.findOne({ id: targetId, ...query }); if (source && target) { if (source.parentId !== target.parentId) source.parentId = target.parentId; source.order = position === 'top' ? (target.order || 0) - 0.1 : (target.order || 0) + 0.1; await source.save(); } } else if (action === 'rename') { await Category.findOneAndUpdate({ id: id, ...query }, { title: title }); } else if (action === 'delete') { await deleteCategoryAndChildren(id, query); } else if (action === 'update_list') { if (children && Array.isArray(children)) await syncCategoriesRecursive(children, parentId, subjectId, userId, isPublicMode); } res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/filters', authenticateToken, async (req, res) => {
    try {
        const { subjectId, mode } = req.query;
        const query = { subjectId };

        // === 修改点：区分三种模式的筛选范围 ===
        if (mode === 'public') {
            // 官方空间：只筛选官方题目
            query.isPublic = true;
            query.isOfficial = true; 
        } else if (mode === 'community') {
            // 公共空间：只筛选用户上传的题目
            query.isPublic = true;
            query.isOfficial = false; 
        } else {
            // 私人空间：只筛选自己的题目
            query.creatorId = req.user.userId; 
        }

        const types = await Question.find(query).distinct('type');
        const rawProvinces = await Question.find(query).distinct('province');
        const provinceSet = new Set();
        
        rawProvinces.forEach(p => {
            if (p) {
                const parts = p.split('/');
                parts.forEach(part => {
                    if (part.trim()) provinceSet.add(part.trim());
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
app.get('/api/questions', authenticateToken, async (req, res) => { 
    const { mode, categoryIds, subjectId, type, difficulty, province, year, source, qNumber, tags } = req.query; 
    
    const filter = {}; 
    
    // === 模式判断 ===
    if (mode === 'public') {
        // 官方空间：公开 + 官方标记
        filter.isPublic = true;
        filter.isOfficial = true;
    } else if (mode === 'community') {
        // [新增] 公共空间：公开 + 非官方标记
        filter.isPublic = true;
        filter.isOfficial = false; // 用户上传的题目
    } else {
        // 私人空间
        filter.creatorId = req.user.userId;
    }

    if (subjectId) filter.subjectId = subjectId; 
    if (type && type !== '全部') filter.type = type; 
    if (difficulty && difficulty !== '全部') filter.difficulty = Number(difficulty); 
    if (province && province !== '全部') filter.province = { $regex: province }; 
    if (year) filter.year = { $regex: year }; 
    if (source) filter.source = { $regex: source, $options: 'i' }; 
    if (qNumber) filter.qNumber = { $regex: qNumber }; 
    if (categoryIds) filter.categoryIds = { $in: categoryIds.split(',') }; 
    if (tags) { const tagList = tags.split(','); filter.tags = { $in: tagList }; } 
    
    try { 
        // [关键] populate creatorId 获取上传者信息
        const questions = await Question.find(filter)
            .sort({ _id: -1 })
            .populate('creatorId', 'username nickname avatar signature level following fans coupons vipLevel uid'); 
            
        res.json({ total: questions.length, data: questions }); 
    } catch (e) { res.status(500).json({ error: e.message }); } 
});
app.post('/api/questions/publish', authenticateToken, async (req, res) => {
    const { questionId, targetSubjectId, targetCategoryIds } = req.body;
    try {
        // 1. 找到原题（必须是自己的）
        const originalQ = await Question.findOne({ _id: questionId, creatorId: req.user.userId }).lean();
        if (!originalQ) return res.status(404).json({ error: '找不到原题或无权操作' });

        // 2. 清理字段，准备克隆
        delete originalQ._id;
        delete originalQ.id;
        delete originalQ.createdAt;
        delete originalQ.updatedAt;

        // 3. 创建新题：强制设置为公开、非官方、当前用户为创建者
        const newQ = new Question({
            ...originalQ,
            creatorId: req.user.userId,
            subjectId: targetSubjectId,
            categoryIds: targetCategoryIds,
            isPublic: true,      // 公开
            isOfficial: false,   // 标记为公共空间（非官方）
            addedTime: new Date().toISOString().split('T')[0],
            code: 'P' + Date.now().toString().slice(-6) // 新编码 P开头
        });

        await newQ.save();
        res.json({ success: true, id: newQ.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/questions', authenticateToken, async (req, res) => { 
    try { 
        let user = req.user;
        try {
            const dbUser = await User.findById(req.user.userId);
            if (dbUser) user = dbUser;
        } catch(e) {}
        const isPublicBody = req.body.isPublic === true || req.body.isPublic === 'true';
        const isPublic = (user.role === 'admin' && isPublicBody); 
        const newQ = new Question({ ...req.body, creatorId: req.user.userId, isPublic: isPublic, addedTime: new Date().toISOString().split('T')[0] }); 
        res.json(await newQ.save()); 
    } catch (e) { res.status(500).json({ error: '保存失败' }); } 
});
app.put('/api/questions/:id', authenticateToken, async (req, res) => { 
    try { 
        const user = await User.findById(req.user.userId); 
        const q = await Question.findById(req.params.id);
        
        if (!q) return res.status(404).json({error: '题目不存在'});

        let canEdit = false;
        if (user.role === 'admin') canEdit = true; // 管理员通吃
        else if (!q.isPublic && q.creatorId.toString() === req.user.userId) canEdit = true; // 私有且是自己的

        if (!canEdit) return res.status(403).json({error: '无权操作该题目'});

        const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true }); 
        res.json(updated); 
    } catch (e) { res.status(500).json({ error: '更新失败' }); } 
});
app.delete('/api/questions/:id', authenticateToken, async (req, res) => { 
    try { 
        const user = await User.findById(req.user.userId); 
        const q = await Question.findById(req.params.id);
        
        if (!q) return res.status(404).json({error: '题目不存在'});

        let canDelete = false;
        if (user.role === 'admin') canDelete = true;
        else if (!q.isPublic && q.creatorId.toString() === req.user.userId) canDelete = true;

        if (!canDelete) return res.status(403).json({error: '无权删除'});

        await Question.findByIdAndDelete(req.params.id); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: '删除失败' }); } 
});
app.post('/api/questions/fork', authenticateToken, async (req, res) => { const { questionId, targetSubjectId, targetCategoryIds } = req.body; try { const originalQ = await Question.findOne({ _id: questionId, isPublic: true }).lean(); if (!originalQ) return res.status(404).json({ error: '未找到该公共题目' }); delete originalQ._id; delete originalQ.id; const newQ = new Question({ ...originalQ, creatorId: req.user.userId, isPublic: false, subjectId: targetSubjectId, categoryIds: targetCategoryIds, addedTime: new Date().toISOString().split('T')[0], code: 'F' + Date.now().toString().slice(-6) }); await newQ.save(); res.json({ success: true, id: newQ.id }); } catch (e) { res.status(500).json({ error: e.message }); } });

// 编译接口
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
            }
        }

        if (imageAssets && typeof imageAssets === 'object') {
            let imgCounter = 0;
            const entries = Object.entries(imageAssets);
            for (const [originalSaveFilename, url] of entries) {
                const ext = path.extname(originalSaveFilename) || '.jpg';
                const safeFilename = `img_${imgCounter++}${ext}`;
                const destPath = path.join(imagesDir, safeFilename);
                let img = null;
                try {
                    // 处理本地上传的图片路径
                    if (url.includes('/uploads/')) {
                        try {
                            const urlPart = url.split('/uploads/')[1];
                            if (urlPart) {
                                const realFilename = decodeURIComponent(urlPart);
                                const srcPath = path.join(uploadDir, realFilename);
                                if (fs.existsSync(srcPath)) img = await Jimp.read(srcPath);
                            }
                        } catch (localErr) {}
                    }
                    // 处理网络图片
                    if (!img) img = await Jimp.read(url);
                    
                    if (img) {
                        await img.write(destPath); 
                        // 替换源码中的图片路径
                        sourceCode = sourceCode.split(originalSaveFilename).join(safeFilename);
                    }
                } catch (err) {
                    // 图片加载失败兜底：生成一个空白占位图，防止编译报错
                    new Jimp({ width: 100, height: 100, color: 0xFFFFFFFF }).write(destPath);
                    sourceCode = sourceCode.split(originalSaveFilename).join(safeFilename);
                }
            }
        }

        fs.writeFileSync(texFile, sourceCode);
        const cmd = `xelatex -interaction=nonstopmode -output-directory="." "paper.tex"`;
        
        exec(cmd, { cwd: jobDir }, (error1, stdout, stderr) => {
            if (error1) {
                const logFile = path.join(jobDir, `paper.log`);
                let logContent = "无日志文件";
                if (fs.existsSync(logFile)) { logContent = fs.readFileSync(logFile, 'utf-8'); }
                return res.status(500).json({ error: '编译失败 (Pass 1)', log: logContent.slice(-3000) });
            }

            exec(cmd, { cwd: jobDir }, (error2, stdout, stderr) => {
                if (error2) {
                    const logFile = path.join(jobDir, `paper.log`);
                    let logContent = "无日志文件";
                    if (fs.existsSync(logFile)) { logContent = fs.readFileSync(logFile, 'utf-8'); }
                    return res.status(500).json({ error: '编译失败 (Pass 2)', log: logContent.slice(-3000) });
                }

                const protocol = req.protocol;
                const host = req.get('host');
                res.json({ url: `${protocol}://${host}/temp/job_${timestamp}/${pdfFilename}` });
            });
        });

    } catch (e) {
        console.error('[Compile] Server Error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => console.log(`🚀 API Server running on port ${PORT}`));