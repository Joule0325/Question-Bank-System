<template>
  <view class="export-modal-mask" v-if="visible" @click.self="close">
    <view class="export-modal-container">
      
      <view class="modal-header">
        <view class="modal-title">导出 Word (原生公式版)</view>
        <view class="header-actions">
          <button class="action-btn outline" @click="handleSave(false)" style="margin-right:10px; border:1px solid #2563eb; color:#2563eb; background:transparent;">💾 保存</button>
          
          <button class="action-btn primary" @click="handleExport" :disabled="isExporting">
            {{ isExporting ? '请求编译中...' : '生成 Word' }}
          </button>
          <button class="action-btn danger" @click="close">关闭</button>
        </view>
      </view>

      <view class="modal-body">
        
        <view class="col col-source">
          <view class="col-title">
            <view class="tab-item active">📄 导出内容预览</view>
          </view>

          <view class="word-preview-container">
             <view class="paper-page">
                <view class="paper-title-area">
                    <view class="main-title">{{ titles.main }}</view>
                    <view class="sub-title">{{ titles.sub }}</view>
                </view>
                
                <view class="paper-content">
                    <view v-for="(q, idx) in questions" :key="q.id" class="q-item">
                        <view class="q-txt">
                            <text class="q-idx">{{ idx + 1 }}.</text>
                            <text class="q-attr" v-if="metadata.year || metadata.source || metadata.difficulty">
                                ({{ [
                                    metadata.year ? q.year : '',
                                    metadata.source ? q.source : '',
                                    metadata.difficulty ? q.difficulty+'星' : ''
                                ].filter(x=>x).join(' ') }})
                            </text>
                            <LatexText :text="q.title" />
                        </view>
                        
                        <view v-if="q.options" class="q-opts">
                            <view v-for="(v, k) in q.options" :key="k" class="opt-i">
                                <text class="b">{{ k }}.</text><LatexText :text="v" />
                            </view>
                        </view>

                        <view v-if="q.subQuestions && q.subQuestions.length" class="sub-list">
                            <view v-for="(sub, sIdx) in q.subQuestions" :key="sIdx" class="sub-item">
                                <text class="sub-idx">({{ sIdx+1 }})</text>
                                <LatexText :text="sub.content" />
                            </view>
                        </view>
                    </view>
                </view>
             </view>
          </view>
        </view>

        <view class="col col-settings">
          <view class="col-title">导出设置</view>
          <scroll-view scroll-y class="settings-scroll">
            
            <view class="setting-group">
              <text class="group-label">试卷标题</text>
              <view class="input-row">
                <input class="custom-input" v-model="titles.main" placeholder="主标题" />
              </view>
              <view class="input-row" style="margin-top: 8px;">
                <input class="custom-input" v-model="titles.sub" placeholder="副标题" />
              </view>
            </view>

            <view class="setting-group">
              <text class="group-label">试题属性 (仅预览可见)</text>
              <view class="checkbox-list">
                <view 
                  class="cb-item" 
                  v-for="opt in metadataOpts" 
                  :key="opt.key"
                  @click="toggleMeta(opt.key)"
                >
                  <view class="cb-box" :class="{ checked: metadata[opt.key] }">
                    <text v-if="metadata[opt.key]" class="check-mark">✓</text>
                  </view>
                  <text class="cb-label">{{ opt.label }}</text>
                </view>
              </view>
            </view>

            <view class="setting-group">
              <text class="group-label">包含内容</text>
              <view class="checkbox-list">
                <view class="cb-item" @click="toggleContent('answer')">
                  <view class="cb-box" :class="{ checked: contentSettings.answer }"><text v-if="contentSettings.answer" class="check-mark">✓</text></view>
                  <text class="cb-label">答案</text>
                </view>
                <view class="cb-item" @click="toggleContent('analysis')">
                  <view class="cb-box" :class="{ checked: contentSettings.analysis }"><text v-if="contentSettings.analysis" class="check-mark">✓</text></view>
                  <text class="cb-label">解析</text>
                </view>
                <view class="cb-item" @click="toggleContent('detailed')">
                  <view class="cb-box" :class="{ checked: contentSettings.detailed }"><text v-if="contentSettings.detailed" class="check-mark">✓</text></view>
                  <text class="cb-label">详解</text>
                </view>
              </view>
            </view>
            
            <view class="setting-group">
              <text class="group-label">说明</text>
              <view class="info-box">
                此模式将生成标准 LaTeX 源码并发送至后端，由 Pandoc 引擎转换为 .docx 文件。
                <br/><br/>
                <b>优势：</b>公式将转换为 Word 原生 Office Math 对象，可直接编辑。
              </view>
            </view>

          </scroll-view>
        </view>

      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import LatexText from '@/components/LatexText.vue';

const props = defineProps({
  visible: Boolean,
  questions: { type: Array, default: () => [] },
  // [新增] 这一行，用于接收回显数据
  initData: { type: Object, default: null }
});

const emit = defineEmits(['update:visible', 'save']);

const isExporting = ref(false);

// --- 设置状态 ---
const titles = reactive({ main: '高中物理练习题', sub: '测试卷' });

const metadata = reactive({
  year: true,
  province: true,
  source: true,
  difficulty: true
});

const contentSettings = reactive({
  answer: false,
  analysis: false,
  detailed: false
});

const metadataOpts = [
  { key: 'year', label: '年份' },
  { key: 'province', label: '省份' },
  { key: 'source', label: '来源' },
  { key: 'difficulty', label: '难度' }
];

const close = () => { emit('update:visible', false); };

// [新增] 保存逻辑
const handleSave = (isDownload = false) => {
    const saveData = {
        id: props.initData?.id || Date.now().toString(), // 编辑则沿用ID，否则新建
        title: titles.main,
        subTitle: titles.sub,
        type: 'word',
        updateTime: new Date().toLocaleString(),
        status: isDownload ? '已下载' : '草稿',
        questions: props.questions,
        config: {
            titles: { ...titles },
            metadata: { ...metadata },
            contentSettings: { ...contentSettings }
        }
    };

    // 读取本地存储并更新
    let papers = uni.getStorageSync('USER_SAVED_PAPERS') || [];
    const idx = papers.findIndex(p => p.id === saveData.id);
    if (idx >= 0) papers[idx] = saveData; // 覆盖旧的
    else papers.unshift(saveData); // 插入新的
    
    uni.setStorageSync('USER_SAVED_PAPERS', papers);

    // 如果不是因为下载而触发的自动保存，则提示用户
    if (!isDownload) {
        uni.showToast({ title: '保存成功', icon: 'success' });
        emit('save'); // 通知父组件刷新列表
    }
};

const toggleMeta = (key) => { metadata[key] = !metadata[key]; };
const toggleContent = (key) => { contentSettings[key] = !contentSettings[key]; };

// --- 核心工具函数 ---

// 1. 标题清洗：去除换行符，防止 \section{...} 报错
const cleanTitle = (text) => {
    if (!text) return '';
    // 去除 HTML 标签
    let clean = text.replace(/<[^>]+>/g, '');
    // 将换行符替换为空格
    clean = clean.replace(/[\r\n]+/g, ' ').trim();
    return clean;
};

// 2. 内容处理：提取图片 URL 并清理 HTML 标签，保留 LaTeX 公式
// 2. 内容处理：稳健版，修复500错误并增强样式识别 (针对 Word 导出优化)
const processContent = (text, imageAssets) => {
    if (!text) return '';
    let processed = text;
    
    // 0. 预处理：反转义
    processed = processed.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

    // A. 图片处理
    processed = processed.replace(/!\[.*?\]\((.*?)\)/g, (match, url) => {
        let name = url.split('/').pop().split('?')[0];
        if(!name.includes('.')) name += '.jpg';
        try { name = decodeURIComponent(name); } catch(e){}
        imageAssets[name] = url; 
        return `\\includegraphics{${name}}`; 
    });
    processed = processed.replace(/\[img:(.*?):([lmr]):(\d+)\]/g, (match, url) => {
        let name = url.split('/').pop().split('?')[0];
        if(!name.includes('.')) name += '.jpg';
        try { name = decodeURIComponent(name); } catch(e){}
        imageAssets[name] = url;
        return `\\includegraphics{${name}}`;
    });

    // --- B. 核心修复：通用标签样式处理器 ---
    // 这个正则会捕获所有 div/p 标签及其 style 属性，然后根据属性内容决定生成什么 LaTeX
    processed = processed.replace(/<(div|p)[^>]*style=['"]([^'"]*)['"][^>]*>([\s\S]*?)<\/\1>/gi, (match, tag, style, content) => {
        let tex = content.trim();
        const styleLower = style.toLowerCase();

        // 1. 检测加粗 (font-weight: bold)
        if (styleLower.includes('font-weight: bold') || styleLower.includes('font-weight:bold')) {
            tex = `\\textbf{${tex}}`;
        }

        // 2. 检测居中 (text-align: center)
        // 【修改】改用 center 环境，Pandoc 对此支持更好，能正确转换为 Word 的居中对齐
        if (styleLower.includes('text-align: center') || styleLower.includes('text-align:center')) {
            return `\n\n\\begin{center}\n${tex}\n\\end{center}\n\n`;
        }

        // 3. 检测缩进 (text-indent: 2em)
        // 【修改】改用全角空格(　)，Pandoc 会忽略 \hspace 但会保留文字空格，从而实现 Word 缩进
        if (styleLower.includes('text-indent')) {
            return `\n\n　　${tex}\n\n`;
        }

        return `\n\n${tex}\n\n`;
    });

    // --- C. 兼容自定义标签 [居中][缩进] ---
    // 【修改】[居中] 标签改用 center 环境
    processed = processed.replace(/\[居中\]([\s\S]*?)(\[\/居中\]|$)/gi, (match, content) => {
         return `\n\n\\begin{center}\n${content.replace(/\[\/?居中\]/g, '').trim()}\n\\end{center}\n\n`;
    });
    
    // 【修改】[缩进] 标签改用两个全角空格
    processed = processed.replace(/\[缩进\]/gi, '　　');

    // --- D. 其他内联样式 ---
    processed = processed.replace(/<(?:b|strong)[^>]*>(.*?)<\/(?:b|strong)>/gi, '\\textbf{$1}');
    processed = processed.replace(/<(?:i|em)[^>]*>(.*?)<\/(?:i|em)>/gi, '\\textit{$1}');
    processed = processed.replace(/<u[^>]*>(.*?)<\/u>/gi, '\\underline{$1}');

    // --- E. 换行与清理 ---
    processed = processed.replace(/<br\s*\/?>/gi, '\n\n')
                         .replace(/<\/p>/gi, '\n\n')
                         .replace(/<\/div>/gi, '\n\n');
    processed = processed.replace(/<[^>]+>/g, ''); 
    processed = processed.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    
    // 强制把连续换行符转为 LaTeX 分段
    processed = processed.replace(/\n+/g, '\n\n');

    return processed.trim();
};

// 3. 生成完整 LaTeX 源码 (修复了列表结构)
const generateLatexCode = () => {
    let imageAssets = {};
    
    // 基础文档结构
    let tex = `\\documentclass[12pt]{article} 
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{enumitem}

% 字体设置
\\usepackage{mathptmx}
\\usepackage{xeCJK}
\\setCJKmainfont{SimSun}

\\title{${cleanTitle(titles.main)}}
\\date{}
\\begin{document}
\\maketitle
\\begin{center}
${cleanTitle(titles.sub)}
\\end{center}

`;

    props.questions.forEach((q, idx) => {
        let safeTitle = processContent(q.title, imageAssets);
        
        // --- 【关键修改】 ---
        // 弃用 \section*，因为它不支持 \begin{center} 或 \n
        // 改用 \textbf 加粗序号，内容直接拼接，允许内容自带换行或居中
        tex += `\\par\\bigskip\\noindent\\textbf{${idx + 1}.} ${safeTitle}\\par\\medskip\n`;
        // ------------------
        
        // 选项处理
        if (q.options) {
            const keys = Object.keys(q.options).sort();
            if(keys.length > 0) {
                tex += `\\begin{enumerate}[label=\\Alph*.]\n`;
                keys.forEach(key => {
                    if(q.options[key]) {
                        tex += `\\item ${processContent(q.options[key], imageAssets)}\n`;
                    }
                });
                tex += `\\end{enumerate}\n`;
            }
        }

        // 子题处理
        if (q.subQuestions && q.subQuestions.length) {
            tex += `\\begin{enumerate}[label=(\\arabic*)]\n`;
            q.subQuestions.forEach((sub, sIdx) => {
                tex += `\\item ${processContent(sub.content, imageAssets)}\n`;
                
                if(sub.options) {
                     const subKeys = Object.keys(sub.options).sort();
                     if(subKeys.length > 0) {
                        tex += `\\begin{enumerate}[label=\\Alph*.]\n`;
                        subKeys.forEach(k => {
                            if(sub.options[k]) tex += `\\item ${processContent(sub.options[k], imageAssets)}\n`;
                        });
                        tex += `\\end{enumerate}\n`;
                     }
                }
            });
            tex += `\\end{enumerate}\n`;
        }

        // 答案与解析
        let ansBlock = [];
        if (q.subQuestions && q.subQuestions.length) {
             q.subQuestions.forEach((sub, sIdx) => {
                 if (contentSettings.answer && sub.answer) ansBlock.push(`(${sIdx+1}) 答案：${processContent(sub.answer, imageAssets)}`);
                 if (contentSettings.analysis && sub.analysis) ansBlock.push(`(${sIdx+1}) 解析：${processContent(sub.analysis, imageAssets)}`);
                 if (contentSettings.detailed && sub.detailed) ansBlock.push(`(${sIdx+1}) 详解：${processContent(sub.detailed, imageAssets)}`);
             });
        } else {
             if (contentSettings.answer && q.answer) ansBlock.push(`\\textbf{答案：} ${processContent(q.answer, imageAssets)}`);
             if (contentSettings.analysis && q.analysis) ansBlock.push(`\\textbf{解析：} ${processContent(q.analysis, imageAssets)}`);
             if (contentSettings.detailed && q.detailed) ansBlock.push(`\\textbf{详解：} ${processContent(q.detailed, imageAssets)}`);
        }
        
        if (ansBlock.length > 0) {
             tex += `\n\n${ansBlock.join('\n\n')}\n\n`;
        }
    });

    tex += `\\end{document}`;
    return { sourceCode: tex, imageAssets };
};

// --- 导出主逻辑 ---
const handleExport = async () => {
    isExporting.value = true;
	handleSave(true);
    try {
        const { sourceCode, imageAssets } = generateLatexCode();
        
        // --- 请添加下面这几行 console.log ---
        console.log('【调试】原始题目数据(第一题):', JSON.stringify(props.questions[0], null, 2));
        console.log('【调试】生成的LaTeX源码:', sourceCode);
        // -----------------------------------

        const res = await new Promise((resolve, reject) => {
            uni.request({
                url: 'http://localhost:3001/api/compile/word', 
                method: 'POST',
                data: { sourceCode, imageAssets },
                header: { 
                    'Authorization': 'Bearer ' + uni.getStorageSync('token'),
                    'Content-Type': 'application/json'
                },
                success: (r) => {
                    if(r.statusCode === 200 && r.data.url) resolve(r.data);
                    else reject(r.data.error || '后端编译失败');
                },
                fail: (e) => reject(e)
            });
        });

        // 下载文件
        uni.downloadFile({
            url: res.url,
            success: (downloadRes) => {
                if (downloadRes.statusCode === 200) {
                    // #ifdef H5
                    const a = document.createElement('a');
                    a.href = res.url;
                    a.download = `${titles.main || '试卷'}.docx`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    uni.showToast({ title: '已开始下载', icon: 'success' });
                    // #endif

                    // #ifndef H5
                    uni.saveFile({
                        tempFilePath: downloadRes.tempFilePath,
                        success: function (saveRes) {
                            uni.showToast({ title: '保存成功', icon: 'success' });
                        },
                        fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
                    });
                    // #endif
                }
            },
            fail: () => uni.showToast({ title: '下载失败', icon: 'none' })
        });

    } catch (e) {
        console.error(e);
        uni.showModal({ 
            title: '导出失败', 
            content: typeof e === 'string' ? e : (e.errMsg || '请检查后端日志或 Pandoc 安装'), 
            showCancel: false 
        });
    } finally {
        isExporting.value = false;
    }
};

// [新增] 监听回显：当弹窗打开且有初始数据时，恢复配置
watch(() => props.visible, (newVal) => {
    if (newVal && props.initData && props.initData.config) {
        const cfg = props.initData.config;
        if (cfg.titles) Object.assign(titles, cfg.titles);
        if (cfg.metadata) Object.assign(metadata, cfg.metadata);
        if (cfg.contentSettings) Object.assign(contentSettings, cfg.contentSettings);
    }
});

</script>

<style lang="scss" scoped>
.export-modal-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 9999;
  display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);
}

.export-modal-container {
  width: 1200px; max-width: 95vw; height: 85vh;
  background-color: #F3F4F6; border-radius: 12px;
  display: flex; flex-direction: column; padding: 16px; gap: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden;
}

.modal-header {
  height: 60px; background: #FFFFFF; border-radius: 8px;
  display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0;
}
.modal-title { font-size: 18px; font-weight: bold; color: #1e293b; }

.header-actions {
  display: flex; gap: 12px;
  .action-btn {
    padding: 8px 20px; border-radius: 6px; font-size: 14px; border: none; cursor: pointer; color: white;
    &.primary { background: #2563eb; &:hover { background: #1d4ed8; } &:disabled { opacity: 0.6; } }
    &.danger { background: #EF4444; &:hover { background: #DC2626; } }
  }
}

.modal-body { flex: 1; display: flex; gap: 16px; overflow: hidden; }

.col { background: #FFFFFF; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }

.col-title {
  height: 40px; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; font-size: 14px; font-weight: bold; color: #374151; padding: 0 20px; flex-shrink: 0;
  .tab-item { color: #3B82F6; font-weight: bold; }
}

.col-source { flex: 1; background: #525659; overflow: hidden; }
.word-preview-container {
    flex: 1; overflow-y: auto; padding: 20px; display: flex; justify-content: center;
}
.paper-page {
    width: 210mm; min-height: 297mm; background: white; padding: 20mm; box-sizing: border-box;
    box-shadow: 0 0 10px rgba(0,0,0,0.3); font-family: 'SimSun', serif;
}
.paper-title-area { text-align: center; margin-bottom: 30px; }
.main-title { font-size: 22px; font-weight: bold; margin-bottom: 10px; }
.sub-title { font-size: 16px; }

.q-item { margin-bottom: 20px; }
.q-txt { font-size: 14px; line-height: 1.6; margin-bottom: 8px; display: flex; }
.q-idx { font-weight: bold; margin-right: 5px; flex-shrink: 0; }
.q-attr { font-size: 12px; color: #666; margin-right: 5px; flex-shrink: 0; }
.q-opts { display: grid; gap: 8px; padding-left: 20px; font-size: 14px; }
.opt-i { display: flex; }
.b { font-weight: bold; margin-right: 5px; }
.sub-list { padding-left: 20px; margin-top: 10px; }
.sub-item { margin-bottom: 8px; display: flex; font-size: 14px; }
.sub-idx { margin-right: 5px; font-weight: bold; }

.col-settings {
  width: 300px;
  .settings-scroll { flex: 1; padding: 16px; box-sizing: border-box; }
  .setting-group { margin-bottom: 24px; }
  .group-label { font-size: 13px; font-weight: bold; color: #374151; margin-bottom: 12px; display: block; }
  .custom-input { width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
  .info-box { font-size: 12px; color: #4B5563; background: #EFF6FF; padding: 10px; border-radius: 4px; line-height: 1.5; border: 1px solid #DBEAFE; }
  
  .checkbox-list { display: flex; flex-direction: column; gap: 10px; }
  .cb-item {
    display: flex; align-items: center; gap: 8px; cursor: pointer;
    .cb-box {
      width: 16px; height: 16px; border: 1px solid #D1D5DB; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #fff;
      &.checked { background: #3B82F6; border-color: #3B82F6; .check-mark { font-size: 12px; color: white; } }
    }
    .cb-label { font-size: 14px; color: #4B5563; }
  }
}
</style>