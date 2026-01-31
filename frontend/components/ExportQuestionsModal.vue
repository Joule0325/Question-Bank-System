<template>
  <view class="export-modal-mask" v-if="visible" @click.self="close">
    <view class="export-modal-container">
      
      <view class="modal-header">
        <view class="mode-switch">
          <view 
            class="switch-item" 
            :class="{ active: mode === 'word' }"
            @click="setMode('word')"
          >
            Word 模式
          </view>
          <view 
            class="switch-item" 
            :class="{ active: mode === 'latex' }"
            @click="setMode('latex')"
          >
            LaTeX 模式
          </view>
        </view>
        <view class="header-actions">
          <button class="action-btn primary" @click="handleExport" :disabled="isExporting">
            {{ isExporting ? '打包中...' : '导出 ZIP' }}
          </button>
          <button class="action-btn danger" @click="close">关闭</button>
        </view>
      </view>

      <view class="modal-body">
        
        <view class="col col-source">
          <view class="col-title tab-header">
            <view 
              class="tab-item" 
              :class="{ active: viewMode === 'code' }"
              @click="viewMode = 'code'"
            >
              LaTeX 源码
            </view>
            <view class="divider">|</view>
            <view 
              class="tab-item" 
              :class="{ active: viewMode === 'preview' }"
              @click="handleCompile"
            >
              <text v-if="isCompiling">⏳ 编译中...</text>
              <text v-else>👁️ 编译预览</text>
            </view>
          </view>

          <textarea 
            v-show="viewMode === 'code'"
            class="source-editor" 
            v-model="sourceCode" 
            maxlength="-1" 
            placeholder="在此输入 LaTeX 源码..."
          ></textarea>

          <view v-show="viewMode === 'preview'" class="pdf-preview-container">
            <iframe 
              v-if="pdfUrl" 
              :src="pdfUrl" 
              class="pdf-frame" 
              frameborder="0"
            ></iframe>
            
            <view v-else class="preview-placeholder">
              <text v-if="isCompiling" class="loading-text">正在调用本地 TeX 引擎生成中...</text>
              <view v-else-if="compileError" class="error-box">
                <text class="error-title">❌ 编译失败</text>
                <scroll-view scroll-y class="error-log">
                  <text>{{ compileError }}</text>
                </scroll-view>
              </view>
              <text v-else>点击上方“编译预览”查看 PDF</text>
            </view>
          </view>
        </view>

        <view class="col col-settings">
          <view class="col-title">导出设置</view>
          <scroll-view scroll-y class="settings-scroll">
            
            <view class="setting-group">
              <text class="group-label">试卷标题</text>
              <view class="input-row">
                <input class="custom-input" v-model="titles.main" placeholder="主标题 (如: 2026模拟考)" @input="debounceGenerate" />
              </view>
              <view class="input-row" style="margin-top: 8px;">
                <input class="custom-input" v-model="titles.sub" placeholder="副标题 (如: 物理试题)" @input="debounceGenerate" />
              </view>
            </view>

            <view class="setting-group">
              <text class="group-label">试卷模板</text>
              <view class="template-grid">
                <view 
                  class="tpl-card" 
                  v-for="(tpl, idx) in templates" 
                  :key="tpl.id"
                  :class="{ selected: selectedTplId === tpl.id }"
                  @click="selectTemplate(tpl)"
                >
                  <view class="tpl-thumb">
                    <view class="thumb-placeholder" :style="{ background: selectedTplId === tpl.id ? '#E0F2FE' : '#F3F4F6' }"></view>
                  </view>
                  <text class="tpl-name">{{ tpl.name }}</text>
                </view>
              </view>
            </view>

            <view class="setting-group">
              <text class="group-label">试题属性 (显示在题干前)</text>
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
              <text class="group-label">答案位置</text>
              <view class="radio-list">
                <view 
                  class="radio-item" 
                  :class="{ active: answerPos === 'end' }"
                  @click="answerPos = 'end'"
                >
                  <view class="radio-circle"><view class="radio-dot" v-if="answerPos === 'end'"></view></view>
                  <text class="radio-label">试卷末尾</text>
                </view>
                <view 
                  class="radio-item" 
                  :class="{ active: answerPos === 'question' }"
                  @click="answerPos = 'question'"
                >
                  <view class="radio-circle"><view class="radio-dot" v-if="answerPos === 'question'"></view></view>
                  <text class="radio-label">每题之后</text>
                </view>
              </view>
            </view>

          </scroll-view>
        </view>

      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { compilePaper } from '@/api/question.js';

const props = defineProps({
  visible: Boolean,
  questions: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:visible', 'export']);

const mode = ref('latex');
const sourceCode = ref('');
const isExporting = ref(false);
const viewMode = ref('code'); 
const isCompiling = ref(false);
const pdfUrl = ref('');
const compileError = ref('');

// --- 设置状态 ---
const titles = reactive({ main: '高中物理练习题', sub: '测试卷' });
const answerPos = ref('end');
const selectedTplId = ref(1);

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

const templates = ref([
  { id: 1, name: "标准试卷" },
  { id: 2, name: "两栏紧凑" },
  { id: 3, name: "答题卡A3" },
  { id: 4, name: "作业练习" }
]);

let imageAssets = {};
let debounceTimer = null;

const debounceGenerate = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => generateLatex(), 500);
};

// --- 工具函数 ---
const cleanTex = (text) => {
  if (!text) return '';
  return text.replace(/([#%&_{}])/g, '\\$1');
};

const resolveImageInfo = (rawUrl) => {
  const cleanUrl = rawUrl.split('?')[0];
  let originalName = cleanUrl.split('/').pop(); 
  const downloadUrl = rawUrl; 
  let saveFilename = originalName;
  if (!saveFilename.includes('.')) { saveFilename += '.jpg'; }
  try { saveFilename = decodeURIComponent(saveFilename); } catch(e){}
  return { saveFilename, downloadUrl };
};

// [终极修复版] 内容处理：
// 修复：使用 \hspace{2em} 强制缩进，替代无效的 \indent
const processContent = (text, imgCallback) => {
   if (!text) return '';
   
   const placeholders = [];
   let processed = text;

   // 1. 提取 Markdown 图片 -> 存入占位符 (无下划线)
   processed = processed.replace(/!\[.*?\]\((.*?)\)/g, (match, url) => {
       const ph = `IMGPH${placeholders.length}END`;
       placeholders.push({ type: 'md', url, pos: 'l' });
       return ph;
   });

   // 2. 提取系统格式图片 [img:url:pos:scale] -> 存入占位符
   const imgRegex = /\[img:(.*?):([lmr]):(\d+)\]/g;
   processed = processed.replace(imgRegex, (match, url, pos, scale) => {
       const ph = `IMGPH${placeholders.length}END`;
       placeholders.push({ type: 'custom', url, pos, scale });
       return ph;
   });
   
   // 3. 全局转义特殊字符 (保护公式 $...$)
   const parts = processed.split(/(\$[^$]*\$)/g);
   processed = parts.map((part, idx) => {
       if (idx % 2 === 1) return part; // 公式不转义
       
       // 预处理 HTML 换行
       let p = part.replace(/<br\s*\/?>/gi, ' \\newline ').replace(/&nbsp;/g, ' ');
       
       // 转义 LaTeX 特殊字符
       return p.replace(/([#%&_{}])/g, '\\$1')
               .replace(/\^/g, '\\textasciicircum ')
               .replace(/~/g, '\\textasciitilde ');
   }).join('');

   // 4. 解析 HTML 样式 -> 转换为 LaTeX 命令
   // 修复：text-indent 改用 \hspace{2em}
   processed = processed.replace(/<(div|p|span)[^>]*style="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi, (match, tag, style, content) => {
       let result = content;
       
       // 检测样式关键字 (忽略大小写)
       const isBold = /font-weight:\s*bold/i.test(style);
       const isCenter = /text-align:\s*center/i.test(style);
       // 关键修改：检测首行缩进
       const isIndent = /text-indent:\s*2em/i.test(style);
       
       // 应用 LaTeX 样式
       if (isBold) {
           result = `\\textbf{${result}}`;
       }
       if (isCenter) {
           // 使用 center 环境
           result = `\\par \\begin{center} ${result} \\end{center} \\par`;
       }
       // 修复：强制插入 2em 空白
       if (isIndent) {
           result = `\\par \\hspace{2em} ${result}`;
       }
       
       return result;
   });

   // 5. 清理剩余的无样式 HTML 标签
   processed = processed.replace(/<\/?(div|p)>/gi, ' \\par ');
   processed = processed.replace(/<\/?span>/gi, ' ');

   // 6. 还原图片 (根据 pos 生成环境)
   placeholders.forEach((item, index) => {
       const ph = `IMGPH${index}END`;
       let latex = '';
       if (imgCallback) {
           const { saveFilename, downloadUrl } = resolveImageInfo(item.url);
           imgCallback(saveFilename, downloadUrl);
           
           let widthScale = 0.6; 
           if (item.type === 'custom') {
               widthScale = (parseInt(item.scale) || 80) / 100;
               if (widthScale > 1) widthScale = 1;
           }
           
           const imgCmd = `\\includegraphics[width=${widthScale}\\linewidth,keepaspectratio]{images/${saveFilename}}`;
           
           // 根据对齐方式包裹
           if (item.pos === 'm') { // 居中
               latex = `\\par \\begin{center} ${imgCmd} \\end{center} \\par`;
           } else if (item.pos === 'r') { // 右对齐
               latex = `\\par {\\raggedleft ${imgCmd} \\par}`;
           } else { // 左对齐
               latex = ` ${imgCmd} `;
           }
       }
       processed = processed.replace(ph, latex);
   });

   return processed;
};

// 格式化选项
const formatOptions = (options, layoutVal) => {
    const layout = Number(layoutVal) || 4; 
    const opts = [];
    ['A', 'B', 'C', 'D'].forEach(k => {
        if (options[k]) opts.push(`\\textbf{${k}.} ${processContent(options[k], (n, u) => imageAssets[n] = u)}`);
    });
    
    if (opts.length === 0) return '';

    let cols = 'l'.repeat(layout); 
    let latex = `\\par \\noindent \\begin{tabular}{@{\\hspace{1em}}${cols}}\n`;
    
    for (let i = 0; i < opts.length; i++) {
        latex += opts[i];
        if ((i + 1) % layout === 0 && i !== opts.length - 1) {
            latex += ' \\\\ \n';
        } else if (i !== opts.length - 1) {
            latex += ' & ';
        }
    }
    latex += `\n\\end{tabular}`;
    return latex;
};

// --- 核心生成逻辑 ---
const generateLatex = () => {
  imageAssets = {};
  
  let docClassOpt = 'UTF8';
  let geoOpt = 'a4paper,landscape,left=2cm,right=2cm,top=2cm,bottom=2cm';
  
  if (selectedTplId.value === 2) {
      docClassOpt += ',twocolumn';
      geoOpt = 'a4paper,left=1.5cm,right=1.5cm,top=2cm,bottom=2cm';
  } else if (selectedTplId.value === 3) {
      geoOpt = 'a3paper,landscape,twocolumn,left=2cm,right=2cm,top=2cm,bottom=2cm';
  }

  let content = `\\documentclass[${docClassOpt}]{ctexart}
\\usepackage{geometry}
\\geometry{${geoOpt}}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{float}
\\usepackage{tabularx}
\\usepackage{xcolor}
\\usepackage{enumitem}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.5em}

\\title{\\heiti \\zihao{2} ${cleanTex(titles.main)} \\\\ \\vspace{0.5em} \\kaishu \\zihao{3} ${cleanTex(titles.sub)}}
\\author{}
\\date{}

\\begin{document}
\\maketitle
\\vspace{1em}

`;

  if (props.questions && props.questions.length > 0) {
    props.questions.forEach((q, index) => {
      // 1. 属性拼接
      let prefixParts = [];
      if (metadata.year && q.year) prefixParts.push(q.year);
      if (metadata.province && q.province) prefixParts.push(q.province);
      if (metadata.source && q.source) prefixParts.push(q.source);
      let prefixStr = prefixParts.join('');

      let diffStr = (metadata.difficulty && q.difficulty) ? `${q.difficulty}星` : '';
      
      let finalAttr = '';
      if (prefixStr && diffStr) {
          finalAttr = `(${prefixStr} ${diffStr})`; 
      } else if (prefixStr || diffStr) {
          finalAttr = `(${prefixStr}${diffStr})`;
      }

      // 2. 题干
      const qTitle = processContent(q.title || '', (n, u) => imageAssets[n] = u);
      content += `\\noindent\\textbf{${index + 1}.} ${finalAttr ? '\\small ' + finalAttr + ' \\normalsize ' : ''}${qTitle}\n\n`;

      // 3. 题目选项
      if (q.options && (q.options.A || q.options.B)) {
          content += formatOptions(q.options, q.optionLayout) + '\n\n';
      }

      // 4. 小题处理
      if (q.subQuestions && q.subQuestions.length > 0) {
          q.subQuestions.forEach(sub => {
              const subContent = processContent(sub.content || '', (n, u) => imageAssets[n] = u);
              content += `\\par \\indent ${subContent}\n\n`;
              if (sub.options && (sub.options.A || sub.options.B)) {
                  content += formatOptions(sub.options, sub.optionLayout) + '\n\n';
              }
          });
      }

      // 5. 答案跟随模式
      if (answerPos.value === 'question') {
          let extras = buildAnswerBlock(q);
          if (extras.length > 0) {
               content += `\\par \\vspace{0.5em} \\noindent \\color{blue} ${extras.join('\\\\ ')} \\color{black} \n\n`;
               content += `\\vspace{0.5cm}\\hrule\\vspace{0.5cm}\n`;
          } else {
               content += `\\vspace{1cm}\n`;
          }
      } else {
          content += `\\vspace{1cm}\n`;
      }
    });
  }

  // 6. 试卷末尾的参考答案
  if (answerPos.value === 'end' && props.questions.length > 0) {
      if (contentSettings.answer || contentSettings.analysis || contentSettings.detailed) {
          content += `\\newpage\n\\section*{参考答案}\n`;
          props.questions.forEach((q, index) => {
              let extras = buildAnswerBlock(q);
              if (extras.length > 0) {
                  content += `\\paragraph{第 ${index + 1} 题}\n`;
                  content += `${extras.join('\\par ')}\n`;
              }
          });
      }
  }

  content += `\n\\end{document}`;
  sourceCode.value = content;
};

// 辅助：构建答案块文本
const buildAnswerBlock = (q) => {
    let parts = [];
    
    if (q.subQuestions && q.subQuestions.length > 0) {
        let subAns = [], subAna = [], subDet = [];
        q.subQuestions.forEach((sub, idx) => {
            if (contentSettings.answer && sub.answer) subAns.push(`(${idx+1}) ${cleanTex(sub.answer)}`);
            if (contentSettings.analysis && sub.analysis) subAna.push(`(${idx+1}) ${processContent(sub.analysis, (n,u)=>imageAssets[n]=u)}`);
            if (contentSettings.detailed && sub.detailed) subDet.push(`(${idx+1}) ${processContent(sub.detailed, (n,u)=>imageAssets[n]=u)}`);
        });
        
        if (subAns.length > 0) parts.push(`\\textbf{【答案】} ${subAns.join('；')}`);
        if (subAna.length > 0) parts.push(`\\textbf{【解析】} ${subAna.join('；')}`);
        if (subDet.length > 0) parts.push(`\\textbf{【详解】} ${subDet.join('；')}`);
        
    } else {
        if (contentSettings.answer && q.answer) parts.push(`\\textbf{【答案】} ${cleanTex(q.answer)}`);
        if (contentSettings.analysis && q.analysis) parts.push(`\\textbf{【解析】} ${processContent(q.analysis, (n,u)=>imageAssets[n]=u)}`);
        if (contentSettings.detailed && q.detailed) parts.push(`\\textbf{【详解】} ${processContent(q.detailed, (n,u)=>imageAssets[n]=u)}`);
    }
    return parts;
};

// --- 事件处理 ---
const handleCompile = async () => {
  viewMode.value = 'preview';
  await nextTick();
  if (isCompiling.value || !sourceCode.value) return;

  isCompiling.value = true;
  compileError.value = '';

  try {
    const res = await compilePaper(sourceCode.value, imageAssets);
    if (res.url) {
      pdfUrl.value = res.url + '?t=' + Date.now();
    }
  } catch (err) {
    console.error('编译失败:', err);
    compileError.value = err.log || err.error || '未知错误';
  } finally {
    isCompiling.value = false;
  }
};

const handleExport = async () => {
  if (isExporting.value) return;
  isExporting.value = true;
  uni.showLoading({ title: '打包资源中...', mask: true });

  try {
    const zip = new JSZip();
    zip.file("paper.tex", sourceCode.value);
    const imgFolder = zip.folder("images");
    const assetEntries = Object.entries(imageAssets);
    
    if (assetEntries.length > 0) {
        const downloadPromises = assetEntries.map(async ([saveFilename, downloadUrl]) => {
          try {
            const res = await uni.request({ url: downloadUrl, method: 'GET', responseType: 'arraybuffer' });
            if (res.statusCode === 200) imgFolder.file(saveFilename, res.data);
          } catch (e) {}
        });
        await Promise.all(downloadPromises);
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "latex_paper.zip");
    uni.showToast({ title: '导出成功', icon: 'success' });
    emit('export');
  } catch (error) {
    uni.showToast({ title: '导出失败', icon: 'none' });
  } finally {
    uni.hideLoading();
    isExporting.value = false;
  }
};

const close = () => { emit('update:visible', false); };
const setMode = (m) => { mode.value = m; };
const toggleMeta = (key) => { metadata[key] = !metadata[key]; debounceGenerate(); };
const toggleContent = (key) => { contentSettings[key] = !contentSettings[key]; debounceGenerate(); };
const selectTemplate = (tpl) => { selectedTplId.value = tpl.id; debounceGenerate(); };

watch(() => props.visible, (newVal) => { if (newVal) generateLatex(); });
watch(() => props.questions, () => { if (props.visible) { generateLatex(); pdfUrl.value = ''; } }, { deep: true });
watch(answerPos, generateLatex);
</script>

<style lang="scss" scoped>
/* 样式保持不变 */
.export-modal-container {
  font-family: "Times New Roman", "Songti SC", "SimSun", serif;
}

.export-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.export-modal-container {
  width: 1200px;
  max-width: 95vw;
  height: auto;
  max-height: 85vh;
  background-color: #F3F4F6;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  overflow: hidden;
}

.modal-header {
  height: 60px;
  background: #FFFFFF;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.mode-switch {
  display: flex;
  background: #F3F4F6;
  border-radius: 6px;
  padding: 2px;
  .switch-item {
    padding: 6px 16px; font-size: 14px; color: #4B5563; cursor: pointer; border-radius: 4px; transition: all 0.2s;
    &.active { background: #3B82F6; color: #FFFFFF; font-weight: bold; }
  }
}

.header-actions {
  display: flex; gap: 12px;
  .action-btn {
    padding: 8px 20px; border-radius: 6px; font-size: 14px; border: none; cursor: pointer; color: white;
    &.primary { background: #10B981; &:hover { background: #059669; } &:disabled { background: #6EE7B7; } }
    &.danger { background: #EF4444; &:hover { background: #DC2626; } }
  }
}

.modal-body { flex: 1; display: flex; gap: 16px; overflow: hidden; }

.col { background: #FFFFFF; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }

.col-title {
  height: 40px; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; font-size: 14px; font-weight: bold; color: #374151; flex-shrink: 0;
  &.tab-header {
    justify-content: flex-start; padding: 0;
    .tab-item {
      height: 100%; padding: 0 20px; display: flex; align-items: center; cursor: pointer; color: #6B7280;
      &:hover { background: #F3F4F6; }
      &.active { color: #3B82F6; font-weight: bold; background: #FFFFFF; border-bottom: 2px solid #3B82F6; }
    }
    .divider { color: #E5E7EB; margin: 0 5px; font-weight: normal; }
  }
}

.col-source {
  flex: 1;
  .source-editor { flex: 1; width: 100%; padding: 16px; border: none; outline: none; resize: none; font-family: monospace; font-size: 13px; color: #1F2937; background: #FFFFFF; box-sizing: border-box; }
}

.pdf-preview-container {
  flex: 1; width: 100%; height: 0; background: #E5E7EB; position: relative;
  .pdf-frame { width: 100%; height: 100%; background: #fff; }
  .preview-placeholder {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; color: #6B7280;
    .loading-text { color: #3B82F6; font-weight: bold; }
    .error-box { width: 90%; height: 80%; background: #FEF2F2; border: 1px solid #FECACA; padding: 10px; color: #7F1D1D; font-size: 12px; white-space: pre-wrap; }
  }
}

.col-settings {
  width: 300px;
  .settings-scroll { flex: 1; padding: 16px; box-sizing: border-box; }
  .setting-group { margin-bottom: 24px; }
  .group-label { font-size: 13px; font-weight: bold; color: #374151; margin-bottom: 12px; display: block; }
  .custom-input { width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
  
  .checkbox-list, .radio-list { display: flex; flex-direction: column; gap: 10px; }
  .cb-item, .radio-item {
    display: flex; align-items: center; gap: 8px; cursor: pointer;
    .cb-box {
      width: 16px; height: 16px; border: 1px solid #D1D5DB; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #fff;
      &.checked { background: #3B82F6; border-color: #3B82F6; .check-mark { font-size: 12px; color: white; } }
    }
    .radio-circle {
      width: 16px; height: 16px; border: 1px solid #D1D5DB; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #fff;
      .radio-dot { width: 8px; height: 8px; background: #3B82F6; border-radius: 50%; }
    }
    &.active .radio-circle { border-color: #3B82F6; }
    .cb-label, .radio-label { font-size: 14px; color: #4B5563; }
  }

  .template-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    
    .tpl-card {
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: all 0.2s;
      
      &:hover { border-color: #3B82F6; }
      &.selected { border-color: #3B82F6; background-color: #EFF6FF; }
      
      .tpl-thumb {
        width: 100%;
        height: 50px;
        background: #F3F4F6;
        border-radius: 4px;
        margin-bottom: 8px;
        .thumb-placeholder { width: 100%; height: 100%; border-radius: 4px; }
      }
      .tpl-name { font-size: 12px; color: #374151; }
    }
  }
}
</style>