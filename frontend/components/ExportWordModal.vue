<template>
  <view class="export-modal-mask" v-if="visible" @click.self="close">
    <view class="export-modal-container">
      
      <view class="modal-header">
        <view class="modal-title">导出 Word (原生公式版)</view>
        <view class="header-actions">
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
import { ref, reactive } from 'vue';
import LatexText from '@/components/LatexText.vue';

const props = defineProps({
  visible: Boolean,
  questions: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:visible']);

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
const processContent = (text, imageAssets) => {
    if (!text) return '';
    let processed = text;
    
    // A. 提取 Markdown 图片 ![]()
    processed = processed.replace(/!\[.*?\]\((.*?)\)/g, (match, url) => {
        let name = url.split('/').pop().split('?')[0];
        if(!name.includes('.')) name += '.jpg';
        try { name = decodeURIComponent(name); } catch(e){}
        imageAssets[name] = url; 
        return `\\includegraphics{${name}}`; 
    });
    
    // B. 提取系统格式图片 [img:...]
    processed = processed.replace(/\[img:(.*?):([lmr]):(\d+)\]/g, (match, url) => {
        let name = url.split('/').pop().split('?')[0];
        if(!name.includes('.')) name += '.jpg';
        try { name = decodeURIComponent(name); } catch(e){}
        imageAssets[name] = url;
        return `\\includegraphics{${name}}`;
    });

    // C. 处理 HTML 换行 -> LaTeX 换行 (Pandoc 视空行为段落)
    processed = processed.replace(/<br\s*\/?>/gi, '\n\n')
                         .replace(/<\/p>/gi, '\n\n')
                         .replace(/<\/div>/gi, '\n\n');

    // D. 去除剩余 HTML 标签 (保留内容)
    processed = processed.replace(/<[^>]+>/g, ''); 

    // E. 实体解码
    processed = processed.replace(/&nbsp;/g, ' ')
                         .replace(/&lt;/g, '<')
                         .replace(/&gt;/g, '>')
                         .replace(/&amp;/g, '&');

    return processed.trim();
};

// 3. 生成完整 LaTeX 源码 (修复了列表结构)
const generateLatexCode = () => {
    let imageAssets = {};
    
    // 基础文档结构：加入 enumitem 宏包以支持 label 自定义
    let tex = `\\documentclass[12pt]{article} 
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{enumitem}

% 1. 设置西文和公式字体为 Times New Roman (新罗马)
% mathptmx 会自动将正文西文和数学公式(斜体)都设为新罗马风格
\\usepackage{mathptmx}

% 2. 设置中文字体为宋体 (需要后端使用 XeLaTeX 引擎)
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
        // 题干 (使用 cleanTitle 处理标题，避免 \section 内换行报错)
        // 使用 processContent 处理题目内容，但是 title 作为 section 参数要小心
        // 这里我们将 idx 和 title 分开，title 放 section，内容放正文，或者全部放 section
        // 为了安全起见，我们将题目作为 \section*，并确保没有换行
        let safeTitle = processContent(q.title, imageAssets);
        // 如果题目内容太长或包含换行，最好用 \paragraph 或粗体，而不是 \section
        // 但为了保持结构，我们先尝试清洗换行
        safeTitle = safeTitle.replace(/\n\n/g, ' ').replace(/\n/g, ' '); 
        
        tex += `\\section*{${idx + 1}. ${safeTitle}}\n`;
        
        // 选项 (使用 enumerate + label=\Alph*. 自动生成 A. B. C.)
        if (q.options) {
            const keys = Object.keys(q.options).sort();
            if(keys.length > 0) {
                tex += `\\begin{enumerate}[label=\\Alph*.]\n`;
                keys.forEach(key => {
                    // 这里我们假设 keys 是 A, B, C... 顺序
                    // 如果 keys 是 A, C 这种不连续的，自动编号可能会变成 A, B。
                    // 但为了 Pandoc 稳定性，自动编号是最好的。如果一定要对应 Key，可以使用 description
                    // 鉴于通常选项都是连续的，我们使用自动编号
                    if(q.options[key]) {
                        tex += `\\item ${processContent(q.options[key], imageAssets)}\n`;
                    }
                });
                tex += `\\end{enumerate}\n`;
            }
        }

        // 子题 (使用 enumerate + label=(\arabic*) 自动生成 (1) (2))
        // 解决了 \item[(1)] 导致的解析错误
        if (q.subQuestions && q.subQuestions.length) {
            tex += `\\begin{enumerate}[label=(\\arabic*)]\n`;
            q.subQuestions.forEach((sub, sIdx) => {
                tex += `\\item ${processContent(sub.content, imageAssets)}\n`;
                
                // 子题也有选项的情况
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
    try {
        const { sourceCode, imageAssets } = generateLatexCode();
        
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