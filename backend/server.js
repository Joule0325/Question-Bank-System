import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { spawn, exec } from 'child_process'; 
import axios from 'axios';
import AdmZip from 'adm-zip';
import os from 'os';
// 如果您需要 Jimp 处理图片，保留它；如果只用 MinerU/Python 也可以移除，这里保留以防万一
import { Jimp } from 'jimp'; 

const app = express();
const PORT = 3001;
const SECRET_KEY = 'YOUR_SECRET_KEY_CHANGE_THIS_IN_PROD'; 

// ==========================================
// === VIP 权益配置 ===
// ==========================================
const VIP_RIGHTS = {
    none: { 
        name: '普通用户',
        maxQuestions: 50,
        exportLimit: 3,
        ocrLimit: 0,
        answerViewLimit: 30,
        subjectLimit: 1,      
        basketCapacity: 10    // 试题栏总容量 10题
    },
    svip: { 
        name: '机构尊享(管理员)',
        maxQuestions: 999999, 
        exportLimit: 9999,
        ocrLimit: 9999,
        answerViewLimit: 999999, 
        subjectLimit: 999,
        basketCapacity: 9999  
    }
};

// ==========================================
// === 工具函数 ===
// ==========================================
// 生成 4 位纯数字 UID (范围 1000-9999)
const generateUid = () => Math.floor(1000 + Math.random() * 9000).toString();

// 生成 6 位纯大写字母邀请码 (无数字)
const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const getStrLen = (str) => {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 127) { 
            len += 2; 
        } else { 
            len++; 
        }
    }
    return len;
};

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

// ==========================================
// === 数据库 Schema 定义 ===
// ==========================================
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
    boundInviteCode: String,
    
    // --- 普通等级系统 (活跃度) ---
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    
    // --- 会员体系 ---
    vipType: { type: String, default: 'none' }, // none, diamond, blackgold, svip
    vipExpiry: { type: Date },
    
    // --- VIP 荣誉等级 (长期积累) ---
    vipLevel: { type: Number, default: 1 }, 
    vipXp: { type: Number, default: 0 },    

    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    settings: {
        questionVisibility: { type: String, default: 'all' },
        questionScope: { type: String, default: 'public' } 
    },

    lastLoginTime: { type: Number, default: 0 }, 
    
    dailyUsage: {
        date: String,          
        exportCount: { type: Number, default: 0 }, 
        ocrCount: { type: Number, default: 0 },    
        answerViewCount: { type: Number, default: 0 } 
    },
    
    dailyStats: {
        date: String,
        inputCount: { type: Number, default: 0 },
        totalXP: { type: Number, default: 0 }
    }
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
    isOfficial: { type: Boolean, default: false } 
});
QuestionSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; } });

const User = mongoose.model('User', UserSchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const Category = mongoose.model('Category', CategorySchema);
const Question = mongoose.model('Question', QuestionSchema);

// === 学科计数器 Schema ===
const CounterSchema = new mongoose.Schema({
    subjectId: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', CounterSchema);

const getNextQuestionId = async (subjectId) => {
    if (!subjectId) return '0000000';
    const counter = await Counter.findOneAndUpdate(
        { subjectId: subjectId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return String(counter.seq - 1).padStart(7, '0');
};

// ==========================================
// === 经验与等级规则配置 ===
// ==========================================
const LEVEL_THRESHOLDS = [0, 5000, 20000, 80000, 200000, 400000, 600000];
const VIP_THRESHOLDS = [0, 300, 1000, 2500, 5000, 8500, 13000, 18000, 23500, 29500, 36000, 45000];

const XP_RULES = {
    LOGIN: 50,           
    LOGIN_DIAMOND: 100,  
    LOGIN_BLACKGOLD: 200,
    INPUT: 30,           
    FAV: 10,             
    DAILY_INPUT_MAX: 10, 
    DAILY_XP_CAP: 1000,
    VIP_LOGIN_DIAMOND: 5
};

const getCurrentRights = (user) => {
    let type = 'none';
    if (user.vipType && user.vipType !== 'none' && user.vipExpiry) {
        if (new Date(user.vipExpiry) > new Date()) {
            type = user.vipType;
        }
    }
    
    if (user.role === 'admin') type = 'svip';
    
    if (type === 'diamond') {
        const vLevel = user.vipLevel || 1; 
        return {
            name: `钻石会员 V${vLevel}`,
            maxQuestions: 1000 + (vLevel - 1) * 1000,
            exportLimit: 20 + (vLevel - 1) * 5,
            answerViewLimit: 100 + (vLevel - 1) * 50,
            subjectLimit: 3 + (vLevel - 1) * 1,
            basketCapacity: 100 + (vLevel - 1) * 20
        };
    }
    
    return VIP_RIGHTS[type] || VIP_RIGHTS['none'];
};

const checkDailyLimit = async (user, actionKey) => { 
    const today = new Date().toISOString().split('T')[0];
    
    if (!user.dailyUsage) user.dailyUsage = {};

    if (user.dailyUsage.date !== today) {
        user.dailyUsage.date = today;
        user.dailyUsage.exportCount = 0;
        user.dailyUsage.ocrCount = 0;
        user.dailyUsage.answerViewCount = 0;
    }
    
    const rights = getCurrentRights(user);
    const limit = rights[actionKey];
    
    let currentCount = 0;
    if (actionKey === 'exportLimit') currentCount = user.dailyUsage.exportCount;
    if (actionKey === 'ocrLimit') currentCount = user.dailyUsage.ocrCount;
    
    if (currentCount >= limit) {
        throw new Error(`今日${actionKey === 'exportLimit' ? '导出' : 'OCR识别'}次数已耗尽 (${currentCount}/${limit})，请升级会员`);
    }
    
    return user; 
};

const addExperience = async (userId, type) => {
    const user = await User.findById(userId);
    if (!user) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    
    if (!user.dailyStats || user.dailyStats.date !== todayStr) {
        user.dailyStats = { date: todayStr, inputCount: 0, totalXP: 0 };
    }

    if (user.dailyStats.totalXP >= XP_RULES.DAILY_XP_CAP) return user;

    let xpGain = 0;

    if (type === 'login') {
        if (user.dailyStats.totalXP === 0) {
            let loginXP = XP_RULES.LOGIN;
            let vipDailyGain = 0; 

            const now = new Date();
            if (user.vipType && user.vipType !== 'none' && user.vipExpiry) {
                if (new Date(user.vipExpiry) > now) {
                    if (user.vipType === 'diamond') { 
                        loginXP = XP_RULES.LOGIN_DIAMOND;
                        vipDailyGain = XP_RULES.VIP_LOGIN_DIAMOND;
                    }
                }
            }
            xpGain = loginXP;

            if (vipDailyGain > 0) {
                user.vipXp = (user.vipXp || 0) + vipDailyGain;
                let newVipLevel = 1;
                for (let i = VIP_THRESHOLDS.length - 1; i >= 0; i--) {
                    if (user.vipXp >= VIP_THRESHOLDS[i]) {
                        newVipLevel = i + 1;
                        break;
                    }
                }
                if (newVipLevel > (user.vipLevel || 1)) {
                    user.vipLevel = newVipLevel;
                }
            }
        }
    } 
    else if (type === 'input') {
        if (user.dailyStats.inputCount < XP_RULES.DAILY_INPUT_MAX) {
            xpGain = XP_RULES.INPUT;
            user.dailyStats.inputCount += 1;
        }
    } 
    else if (type === 'fav') {
        xpGain = XP_RULES.FAV;
    }

    if (xpGain > 0) {
        user.xp = (user.xp || 0) + xpGain;
        user.dailyStats.totalXP += xpGain;

        let newLevel = 1;
        for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
            if (user.xp >= LEVEL_THRESHOLDS[i]) {
                newLevel = i + 1;
                break;
            }
        }
        user.level = newLevel;
        await user.save();
    }
    return user;
};

// ==========================================
// === 辅助函数 ===
// ==========================================
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

// ==========================================
// === 鉴权中间件 ===
// ==========================================
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token && !req.query.mode) return res.status(401).json({ error: '未登录' });
    if (token) {
        jwt.verify(token, SECRET_KEY, async (err, decoded) => {
            if (err) return res.status(403).json({ error: 'Token 无效' });
            
            const user = await User.findById(decoded.userId);
            if (!user) return res.status(401).json({ error: '用户不存在' });

            if (decoded.loginTime && user.lastLoginTime && decoded.loginTime !== user.lastLoginTime) {
                return res.status(401).json({ error: '您的账号已在其他设备登录，请重新登录' });
            }

            req.user = user; 
            req.user.userId = user._id.toString(); 
            next();
        });
    } else next();
};

// ==========================================
// === 业务路由 ===
// ==========================================
app.post('/api/auth/register', async (req, res) => { 
    try { 
        if (!req.body.username || !req.body.password) return res.status(400).json({ error: '用户名和密码不能为空' });
        
        const existingUser = await User.findOne({ username: req.body.username });
        if (existingUser) return res.status(400).json({ error: '该用户名已被注册' });

        const hashedPassword = await bcrypt.hash(req.body.password, 10); 
        
        const user = new User({ 
            username: req.body.username, 
            password: hashedPassword,
            uid: generateUid(),           
            inviteCode: generateInviteCode() 
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
        await addExperience(user._id, 'login');
        
        const loginTimestamp = Date.now();
        user.lastLoginTime = loginTimestamp;
        await user.save();

        const token = jwt.sign({ 
            userId: user._id, 
            username: user.username,
            loginTime: loginTimestamp 
        }, SECRET_KEY); 
        
        const updatedUser = await User.findById(user._id);
        const inviteCount = await User.countDocuments({ boundInviteCode: updatedUser.inviteCode });

        res.json({ 
            token, 
            following: updatedUser.following, 
            followers: updatedUser.followers, 
            username: updatedUser.username, 
            role: updatedUser.role || 'user',
            uid: updatedUser.uid,
            inviteCode: updatedUser.inviteCode,
            inviteCount: inviteCount,
            level: updatedUser.level,
            xp: updatedUser.xp,
            vipType: updatedUser.vipType,
            vipExpiry: updatedUser.vipExpiry,
            vipLevel: updatedUser.vipLevel || 1,
            vipXp: updatedUser.vipXp || 0,
            nickname: user.nickname || '',
            avatar: user.avatar || '',
            signature: user.signature || '',
            gender: user.gender || 0,
            birthDate: user.birthDate || '',
            school: user.school || '',
            boundInviteCode: user.boundInviteCode || '',
            rights: getCurrentRights(updatedUser)
        }); 
    } else { 
        res.status(400).json({ error: '密码错误' }); 
    } 
});

app.post('/api/user/action/fav', authenticateToken, async (req, res) => {
    try {
        const user = await addExperience(req.user.userId, 'fav');
        res.json({ success: true, level: user.level, xp: user.xp });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/user/vip/recharge', authenticateToken, async (req, res) => {
    try {
        const { plan } = req.body;
        const user = await User.findById(req.user.userId);
        
        const now = new Date();
        let startTime = now;
        if (user.vipExpiry && new Date(user.vipExpiry) > now) {
            startTime = new Date(user.vipExpiry);
        }

        let durationDays = 30; 
        let newType = 'none';

        if (plan === 'diamond_month') {
            newType = 'diamond';
        } else {
            return res.status(400).json({ error: '无效的套餐' });
        }

        const newExpiry = new Date(startTime.getTime() + durationDays * 24 * 60 * 60 * 1000);

        user.vipType = newType;
        user.vipExpiry = newExpiry;
        
        await user.save();

        res.json({ success: true, vipType: user.vipType, vipExpiry: user.vipExpiry });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

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

        if (nickname) {
            const regex = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/;
            if (!regex.test(nickname)) return res.status(400).json({ error: '昵称不能包含特殊符号' });
            if (getStrLen(nickname) > 12) return res.status(400).json({ error: '昵称过长' });

            const existingUser = await User.findOne({ nickname: nickname, _id: { $ne: userId } });
            if (existingUser) return res.status(400).json({ error: '该昵称已被占用' });
            updateData.nickname = nickname;
        }

        if (boundInviteCode) {
            const currentUser = await User.findById(userId);
            
            if (currentUser.boundInviteCode) {
                if (currentUser.boundInviteCode !== boundInviteCode) {
                    return res.status(400).json({ error: '您已绑定过邀请码，不可更改' });
                }
            } else {
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

app.post('/api/upload', upload.single('file'), (req, res) => { 
    if (!req.file) return res.status(400).json({ error: '请选择文件' }); 
    res.json({ url: `http://localhost:3001/uploads/${req.file.filename}` }); 
});

app.get('/api/subjects', authenticateToken, async (req, res) => { 
    const { mode } = req.query; 
    const query = (mode === 'public' || mode === 'community') 
        ? { isPublic: true } 
        : { creatorId: req.user.userId }; 
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
    
    try { 
        if (action === 'update_list') { 
            if (!isPublicMode) {
                const rights = getCurrentRights(user);
                if (list.length > rights.subjectLimit) {
                    return res.status(403).json({ error: `您的会员等级最多只能创建 ${rights.subjectLimit} 个目录类型，请升级会员` });
                }
            }

            const existingSubjects = await Subject.find(userQuery); 
            const existingIds = existingSubjects.map(s => s.id); 
            const keepIds = list.filter(s => !s.id.startsWith('new_')).map(s => s.id); 
            const toDelete = existingIds.filter(eid => !keepIds.includes(eid)); 

            if (toDelete.length > 0) await Subject.deleteMany({ id: { $in: toDelete }, ...userQuery }); 
            
            for (let i = 0; i < list.length; i++) { 
                const item = list[i]; 
                if (item.id.startsWith('new_')) { 
                    await new Subject({ id: new mongoose.Types.ObjectId().toString(), title: item.title, order: i, creatorId: req.user.userId, isPublic: isPublicMode }).save(); 
                } else { 
                    await Subject.findOneAndUpdate({ id: item.id, ...userQuery }, { title: item.title, order: i }); 
                } 
            } 
            res.json({ success: true }); 
        } else { res.status(400).json({ error: 'Invalid action' }); } 
    } catch(e) { res.status(500).json({ error: e.message }); } 
});

app.get('/api/categories', authenticateToken, async (req, res) => { 
    const { mode, subjectId } = req.query; 
    const query = { subjectId }; 
    
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
    
    try { 
        if (action === 'add-root' || action === 'add-sub') { 
            await new Category({ id: new mongoose.Types.ObjectId().toString(), subjectId, title: data.title, parentId: action === 'add-sub' ? parentId : null, order: Date.now(), creatorId: userId, isPublic: isPublicMode }).save(); 
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

app.get('/api/filters', authenticateToken, async (req, res) => {
    try {
        const { subjectId, mode } = req.query;
        const query = { subjectId };

        if (mode === 'public') {
            query.isPublic = true;
            query.isOfficial = true; 
        } else if (mode === 'community') {
            query.isPublic = true;
            query.isOfficial = false; 
        } else {
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
    
    if (mode === 'public') {
        filter.isPublic = true;
        filter.isOfficial = true;
    } else if (mode === 'community') {
        filter.isPublic = true;
        filter.isOfficial = false; 
    } else {
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
        const questions = await Question.find(filter)
            .sort({ _id: -1 })
            .populate('creatorId', 'username nickname avatar signature level following followers fans coupons vipLevel uid'); 
            
        res.json({ total: questions.length, data: questions }); 
    } catch (e) { res.status(500).json({ error: e.message }); } 
});

// === [已修复语法] 题目发布接口 ===
app.post('/api/questions/publish', authenticateToken, async (req, res) => {
    const { questionId, targetSubjectId, targetCategoryIds } = req.body;
    try {
        const originalQ = await Question.findOne({ _id: questionId, creatorId: req.user.userId }).lean();
        if (!originalQ) return res.status(404).json({ error: '找不到原题或无权操作' });

        delete originalQ._id;
        delete originalQ.id;
        delete originalQ.createdAt;
        delete originalQ.updatedAt;

        const nextId = await getNextQuestionId(targetSubjectId);
        const newQ = new Question({
            ...originalQ,
            creatorId: req.user.userId,
            subjectId: targetSubjectId,
            categoryIds: targetCategoryIds,
            isPublic: true,
            isOfficial: false,
            addedTime: new Date().toISOString().split('T')[0],
            code: nextId
        });

        await newQ.save();
        res.json({ success: true, id: newQ.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/questions', authenticateToken, async (req, res) => { 
    try { 
        const rights = getCurrentRights(req.user);
        const currentCount = await Question.countDocuments({ creatorId: req.user.userId });
        
        if (currentCount >= rights.maxQuestions) {
            return res.status(403).json({ error: `您的自定义题目数量已达上限 (${currentCount}/${rights.maxQuestions})，请升级会员` });
        }

        let user = req.user;
        const isPublicBody = req.body.isPublic === true || req.body.isPublic === 'true';
        const isPublic = (user.role === 'admin' && isPublicBody); 
        
        const nextId = await getNextQuestionId(req.body.subjectId);
        const newQ = new Question({ 
            ...req.body, 
            code: nextId,        
            creatorId: req.user.userId, 
            isPublic: isPublic, 
            addedTime: new Date().toISOString().split('T')[0] 
        });

        await newQ.save();
        await addExperience(req.user.userId, 'input');
        res.json(newQ);
    } catch (e) { res.status(500).json({ error: '保存失败' }); } 
});

app.put('/api/questions/:id', authenticateToken, async (req, res) => { 
    try { 
        const user = await User.findById(req.user.userId); 
        const q = await Question.findById(req.params.id);
        
        if (!q) return res.status(404).json({error: '题目不存在'});

        let canEdit = false;
        if (user.role === 'admin') canEdit = true; 
        else if (!q.isPublic && q.creatorId.toString() === req.user.userId) canEdit = true; 

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

// === [已修复语法] 题目克隆(Fork)接口 ===
app.post('/api/questions/fork', authenticateToken, async (req, res) => { 
    const { questionId, targetSubjectId, targetCategoryIds } = req.body; 
    try { 
        const originalQ = await Question.findOne({ _id: questionId, isPublic: true }).lean(); 
        if (!originalQ) return res.status(404).json({ error: '未找到该公共题目' }); 
        
        delete originalQ._id; 
        delete originalQ.id; 
        
        const nextId = await getNextQuestionId(targetSubjectId);
        const newQ = new Question({ 
            ...originalQ, 
            creatorId: req.user.userId, 
            isPublic: false, 
            subjectId: targetSubjectId, 
            categoryIds: targetCategoryIds, 
            addedTime: new Date().toISOString().split('T')[0], 
            code: nextId
        }); 
        
        await newQ.save(); 
        res.json({ success: true, id: newQ.id }); 
    } catch (e) { res.status(500).json({ error: e.message }); } 
});

// 编译接口
app.post('/api/compile', authenticateToken, async (req, res) => {
    let { sourceCode, imageAssets } = req.body; 
    if (!sourceCode) return res.status(400).json({ error: '无 LaTeX 代码' });

    try {
        await checkDailyLimit(req.user, 'exportLimit');
        req.user.dailyUsage.exportCount += 1;
        await req.user.save();

        const timestamp = Date.now();
        const jobDir = path.join(compileDir, `job_${timestamp}`);
        if (!fs.existsSync(jobDir)) { fs.mkdirSync(jobDir, { recursive: true }); }
        const imagesDir = path.join(jobDir, 'images');
        if (!fs.existsSync(imagesDir)) { fs.mkdirSync(imagesDir, { recursive: true }); }

        const texFile = path.join(jobDir, `paper.tex`);
        const pdfFilename = `paper.pdf`;
    
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
                    if (!img) img = await Jimp.read(url);
                    if (img) {
                        await img.write(destPath); 
                        sourceCode = sourceCode.split(originalSaveFilename).join(safeFilename);
                    }
                } catch (err) {
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

app.post('/api/compile/word', authenticateToken, async (req, res) => {
    let { sourceCode, imageAssets } = req.body; 
    if (!sourceCode) return res.status(400).json({ error: '无 LaTeX 代码' });

    try {
        await checkDailyLimit(req.user, 'exportLimit');
        req.user.dailyUsage.exportCount += 1;
        await req.user.save();

        const timestamp = Date.now();
        const jobDir = path.join(compileDir, `word_job_${timestamp}`);
        if (!fs.existsSync(jobDir)) { fs.mkdirSync(jobDir, { recursive: true }); }
        const imagesDir = path.join(jobDir, 'images');
        if (!fs.existsSync(imagesDir)) { fs.mkdirSync(imagesDir, { recursive: true }); }

        const texFile = path.join(jobDir, `paper.tex`);
        const docxFilename = `paper.docx`;
    
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
                                if (fs.existsSync(srcPath)) img = await Jimp.read(srcPath);
                            }
                        } catch (localErr) {}
                    }
                    if (!img) img = await Jimp.read(url);
                    if (img) {
                        await img.write(destPath); 
                        sourceCode = sourceCode.split(originalSaveFilename).join(`images/${safeFilename}`);
                    }
                } catch (err) {
                    new Jimp({ width: 100, height: 100, color: 0xFFFFFFFF }).write(destPath);
                    sourceCode = sourceCode.split(originalSaveFilename).join(`images/${safeFilename}`);
                }
            }
        }

        fs.writeFileSync(texFile, sourceCode);

        const templatePath = path.join(process.cwd(), 'template.docx');
        let cmd = `pandoc "paper.tex" -f latex -t docx -o "${docxFilename}" --standalone`;
    
        if (fs.existsSync(templatePath)) {
            console.log('Using Word template:', templatePath);
            cmd += ` --reference-doc="${templatePath}"`;
        } else {
            console.warn('Warning: template.docx not found, using default styles.');
        }
        
        exec(cmd, { cwd: jobDir }, (error, stdout, stderr) => {
            if (error) {
                console.error('[Pandoc] Error:', stderr);
                return res.status(500).json({ error: 'Word 转换失败，请检查服务器是否安装了 Pandoc', details: stderr });
            }

            const protocol = req.protocol;
            const host = req.get('host');
            res.json({ url: `${protocol}://${host}/temp/word_job_${timestamp}/${docxFilename}` });
        });

    } catch (e) {
        console.error('[Compile Word] Server Error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/user/follow', authenticateToken, async (req, res) => {
    try {
        const targetUserId = req.body.targetId;
        const currentUserId = req.user.userId;

        if (targetUserId === currentUserId) {
            return res.status(400).json({ error: '不能关注自己' });
        }

        const targetUser = await User.findById(targetUserId);
        const currentUser = await User.findById(currentUserId);

        if (!targetUser) return res.status(404).json({ error: '用户不存在' });

        const isFollowing = currentUser.following.includes(targetUserId);
        let action = '';

        if (isFollowing) {
            await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } });
            await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } });
            action = 'unfollowed';
        } else {
            await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } });
            await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } });
            action = 'followed';
        }

        const newTarget = await User.findById(targetUserId);
        const newMe = await User.findById(currentUserId);
        const isFriend = newMe.following.includes(targetUserId) && newMe.followers.includes(targetUserId);

        res.json({ 
            success: true, 
            action,
            isFriend,
            targetFollowersCount: newTarget.followers.length,
            myFollowing: newMe.following 
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => console.log(`🚀 API Server running on port ${PORT}`));