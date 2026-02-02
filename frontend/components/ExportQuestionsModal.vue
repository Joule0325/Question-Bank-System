<template>
  <view class="export-modal-mask" v-if="visible" @click.self="close">
    <view class="export-modal-container">
      
      <view class="modal-header">
        <view class="header-left-controls">
          <view 
            class="h-btn" 
            :class="{ primary: viewMode === 'code' }" 
            @click="viewMode = 'code'"
          >
            LaTeX 源码
          </view>
          <view 
            class="h-btn" 
            :class="{ primary: viewMode === 'preview' }" 
            @click="viewMode = 'preview'"
          >
            预览
          </view>
          <view class="h-btn outline primary" @click="handleCompile">
            <text v-if="isCompiling">⏳ </text>
            {{ isCompiling ? '编译中...' : '编译' }}
          </view>
        </view>

        <view class="header-actions">
          <view 
            class="h-btn primary" 
            @click="handleExport" 
            :class="{ disabled: isExporting }"
          >
            {{ isExporting ? '打包中...' : '导出 ZIP' }}
          </view>
          <view class="h-btn" @click="close">关闭</view>
        </view>
      </view>

      <view class="modal-body">
        
        <view class="col col-source">
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
              <text v-else>点击左上角“编译”按钮生成预览</text>
            </view>
          </view>
        </view>

        <view class="col col-settings">
          <view class="col-title">导出设置</view>
          <scroll-view scroll-y class="settings-scroll">
            
            <view class="setting-group">
              <view class="input-line">
                <text class="input-label">主标题</text>
                <input class="custom-input" v-model="titles.main" placeholder="如: 2026届高三摸底考试" @input="debounceGenerate" />
              </view>
              <view class="input-line">
                <text class="input-label">副标题</text>
                <input class="custom-input" v-model="titles.sub" placeholder="如: 数学试卷" @input="debounceGenerate" />
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
                    <view class="thumb-lines">
                       <view class="tl"></view><view class="tl"></view><view class="tl short"></view>
                    </view>
                  </view>
                  <text class="tpl-name">{{ tpl.name }}</text>
                </view>
              </view>
            </view>

            <view class="setting-group">
              <text class="group-label">试题属性 (显示在题干前)</text>
              <view class="checkbox-list horizontal">
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
              <view class="checkbox-list horizontal">
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
              <view class="radio-list horizontal">
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

// 状态管理
const sourceCode = ref('');
const isExporting = ref(false);
const viewMode = ref('code'); 
const isCompiling = ref(false);
const pdfUrl = ref('');
const compileError = ref('');

// --- 设置状态 ---
const titles = reactive({ main: '2026届圆创联盟&广州市8月调研考试', sub: '数学试卷' });
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
  { id: 1, name: "GEE仿真试卷(A4)" }, 
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

// 内容处理：HTML 转 LaTeX
const processContent = (text, imgCallback) => {
   if (!text) return '';
   
   const placeholders = [];
   let processed = text;

   // 1. 提取 Markdown 图片
   processed = processed.replace(/!\[.*?\]\((.*?)\)/g, (match, url) => {
       const ph = `IMGPH${placeholders.length}END`;
       placeholders.push({ type: 'md', url, pos: 'l' });
       return ph;
   });

   // 2. 提取系统格式图片
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
       
       let p = part.replace(/<br\s*\/?>/gi, ' ').replace(/&nbsp;/g, ' ');
       
       return p.replace(/([#%&_{}])/g, '\\$1')
               .replace(/\^/g, '\\textasciicircum ')
               .replace(/\~/g, '\\textasciitilde ');
   }).join('');

   // 4. 解析 HTML 样式 -> LaTeX 命令
   processed = processed.replace(/<(div|p|span)[^>]*style="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi, (match, tag, style, content) => {
       let result = content;
       const isBold = /font-weight:\s*bold/i.test(style);
       const isCenter = /text-align:\s*center/i.test(style);
       const isIndent = /text-indent:\s*2em/i.test(style);
       
       if (isBold) result = `\\textbf{${result}}`;
       if (isCenter) result = `\\par \\begin{center} ${result} \\end{center} \\par`;
       if (isIndent) result = `\\par \\hspace{2em} ${result}`;
       
       return result;
   });

   // 5. 清理 HTML 标签
   processed = processed.replace(/<\/?(div|p)>/gi, ' \\par ');
   processed = processed.replace(/<\/?span>/gi, ' ');

   // 6. 还原图片
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
           
           if (item.pos === 'm') latex = `\\par \\begin{center} ${imgCmd} \\end{center} \\par`;
           else if (item.pos === 'r') latex = `\\par {\\raggedleft ${imgCmd} \\par}`;
           else latex = ` ${imgCmd} `;
       }
       processed = processed.replace(ph, latex);
   });

   return processed;
};

// 格式化选项 (使用 tasks 宏包，增强版)
const formatOptions = (options, layoutVal, indent = '') => {
    if (!options) return '';
    
    // 过滤掉值为空的选项
    const validKeys = Object.keys(options)
        .filter(k => options[k] && String(options[k]).trim() !== '') 
        .sort();
    
    if (validKeys.length === 0) return '';

    const layout = Number(layoutVal) || 4; 
    
    // 增加缩进，使源码更整洁
    let latex = `${indent}\\begin{tasks}(${layout})\n`;
    validKeys.forEach(k => {
        latex += `${indent}\t\\task ${processContent(options[k], (n, u) => imageAssets[n] = u)}\n`;
    });
    latex += `${indent}\\end{tasks}`;
    
    return latex;
};

// --- 核心生成逻辑 ---
const generateLatex = () => {
  imageAssets = {};
  
  // 基础文档类设置
  let content = `\\documentclass[11pt]{ctexart}
\\usepackage{amsmath,amssymb,bm}
\\usepackage{graphicx}
\\usepackage{geometry}
\\usepackage{fancyhdr}
\\usepackage{lastpage}
\\usepackage{enumitem}
\\usepackage{setspace}
\\usepackage{tasks} % 关键：用于选项排版
\\usepackage{txfonts} % Times New Roman 风格

% ===== GEEexam.sty 核心定义内联 =====
% 页面设置
\\geometry{a4paper, portrait, hmargin={2cm, 2cm}, vmargin={1.5cm, 1.5cm}, footskip=0.75cm, headsep=0.25cm}

% 页眉页脚
\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\fancyfoot[C]{\\kaishu ${cleanTex(titles.sub)} \\quad 第 \\thepage 页 \\quad (共 \\pageref{LastPage} 页)}

% 自定义命令
\\newcommand{\\juemi}{\\textbf{绝密 $\\bigstar$ 启用前} \\par}
\\newcommand{\\biaoti}[1]{\\begin{center}{\\heiti\\zihao{2} #1}\\end{center}}
\\newcommand{\\fubiaoti}[1]{\\begin{center}{\\kaishu\\zihao{3} #1}\\end{center}}

% tasks 设置 (仿 GEEexam.sty)
\\settasks{
    label=\\Alph*.,
    label-offset={0.4em},
    label-align=left,
    column-sep={1em},
    label-width=2ex,
    item-indent={15pt},
    before-skip={-0.7em},
    after-skip={-0.7em}
}

% 全局设置
\\setlength{\\parindent}{0pt}
\\setstretch{2.1}
% ===================================

\\begin{document}

\\zihao{5}
\\juemi
\\biaoti{${cleanTex(titles.main)}}
\\fubiaoti{${cleanTex(titles.sub)}}

{\\heiti 注意事项}:
\\begin{enumerate}[itemsep=-0.3em,topsep=0pt]
    \\item 答卷前,考生务必将自己的姓名和准考证号填写在答题卡上.
    \\item 回答选择题时,选出每小题答案后,用铅笔把答题卡对应题目的答案标号涂黑.如需改动,用橡皮擦干净后,再选涂其它答案标号.回答非选择题时,将答案写在答题卡上.写在本试卷上无效.
    \\item 考试结束后,将本试卷和答题卡一并交回.
\\end{enumerate}

\\vspace{1em}
`;

  // 分组逻辑
  const groupMap = {
      'choice': { name: '选择题', list: [] },
      'multiple_choice': { name: '多选题', list: [] },
      'fill': { name: '填空题', list: [] },
      'subjective': { name: '解答题', list: [] },
      'other': { name: '综合题', list: [] }
  };

  if (props.questions && props.questions.length > 0) {
      props.questions.forEach(q => {
          let type = 'other';
          if (q.type) {
              if (q.type.includes('单选') || q.type === 'choice') type = 'choice';
              else if (q.type.includes('多选')) type = 'multiple_choice';
              else if (q.type.includes('填空')) type = 'fill';
              else if (q.type.includes('解答') || q.type.includes('简答')) type = 'subjective';
          } else {
             // 兜底推断
             if (q.options && Object.keys(q.options).length > 0) type = 'choice';
             else type = 'subjective';
          }
          groupMap[type].list.push(q);
      });
  }

  // 生成题目列表计数器
  let qCounter = 0;
  
  // 生成器函数
  const generateSection = (title, qList) => {
      if (qList.length === 0) return '';
      // 使用缩进让源码好看
      let secTex = `\\section*{${title}}\n\\begin{enumerate}[leftmargin=1.7em, start=${qCounter + 1}]\n`;
      
      qList.forEach((q) => {
          qCounter++;
          secTex += `\t\\item `;
          
          // 属性
          let attrStr = '';
          if (metadata.year || metadata.province || metadata.difficulty) {
              let parts = [];
              if (metadata.year && q.year) parts.push(q.year);
              if (metadata.province && q.province) parts.push(q.province);
              if (metadata.difficulty && q.difficulty) parts.push(q.difficulty + '星');
              if (parts.length > 0) attrStr = `\\small (${parts.join(' ')}) \\normalsize `;
          }
          
          const qTitle = processContent(q.title || '', (n, u) => imageAssets[n] = u);
          secTex += `${attrStr}${qTitle}\n`;

          // 选项 (大题) - 增加缩进
          if (q.options) {
              secTex += formatOptions(q.options, q.optionLayout, '\t') + '\n';
          }

          // 小题 (使用 enumerate + tasks)
          if (q.subQuestions && q.subQuestions.length > 0) {
              secTex += `\t\\begin{enumerate}[label=(\\arabic*)]\n`; // 增加子题号 (1)(2)
              q.subQuestions.forEach(sub => {
                  const subContent = processContent(sub.content || '', (n, u) => imageAssets[n] = u);
                  secTex += `\t\t\\item ${subContent}\n`;
                  
                  // 关键修复：只要有options，就调用 formatOptions 生成 tasks
                  if (sub.options) {
                      secTex += formatOptions(sub.options, sub.optionLayout, '\t\t') + '\n';
                  }
              });
              secTex += `\t\\end{enumerate}\n`;
          }

          // 答案位置：每题之后
          if (answerPos.value === 'question') {
             let extras = buildAnswerBlock(q);
             if (extras.length > 0) {
                 secTex += `\t\\par {\\color{blue} ${extras.join(' \\\\ ')} }\n`;
             }
             secTex += `\t\\vspace{1em}\n\n`;
          } else {
             secTex += `\t\\vspace{1em}\n\n`;
          }
      });
      secTex += `\\end{enumerate}\n\n`;
      return secTex;
  };

  content += generateSection('一、选择题', groupMap.choice.list);
  content += generateSection('二、多选题', groupMap.multiple_choice.list);
  content += generateSection('三、填空题', groupMap.fill.list);
  content += generateSection('四、解答题', groupMap.subjective.list);
  content += generateSection('五、其他试题', groupMap.other.list);

  // 答案位置：文末
  if (answerPos.value === 'end' && props.questions.length > 0) {
      if (contentSettings.answer || contentSettings.analysis || contentSettings.detailed) {
          content += `\\newpage\n\\section*{参考答案}\n`;
          let allQs = [];
          Object.values(groupMap).forEach(g => allQs = allQs.concat(g.list));
          
          allQs.forEach((q, idx) => {
              let extras = buildAnswerBlock(q);
              if (extras.length > 0) {
                  content += `\\paragraph{第 ${idx + 1} 题}\n`;
                  content += `${extras.join('\\par ')}\n`;
              }
          });
      }
  }

  content += `\n\\end{document}`;
  sourceCode.value = content;
};

// 辅助：构建答案块
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
const toggleMeta = (key) => { metadata[key] = !metadata[key]; debounceGenerate(); };
const toggleContent = (key) => { contentSettings[key] = !contentSettings[key]; debounceGenerate(); };
const selectTemplate = (tpl) => { selectedTplId.value = tpl.id; debounceGenerate(); };

watch(() => props.visible, (newVal) => { if (newVal) generateLatex(); });
watch(() => props.questions, () => { if (props.visible) { generateLatex(); pdfUrl.value = ''; } }, { deep: true });
watch(answerPos, generateLatex);
</script>

<style lang="scss" scoped>
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
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  overflow: hidden;
  font-family: "Times New Roman", "Songti SC", "SimSun", serif;
}

.modal-header {
  height: 45px;
  background: #FFFFFF;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  flex-shrink: 0;
}

/* 左侧控制区布局 */
.header-left-controls {
  display: flex;
  gap: 10px;
}

/* 按钮样式 */
.h-btn {
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  background: #f1f5f9;
  color: #64748b;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover { background: #e2e8f0; }
  
  &.primary { 
    background: #2563eb; 
    color: white; 
    &:hover { background: #1d4ed8; }
  }
  
  &.outline { 
    background: transparent; 
    border: 1px solid #2563eb; 
    color: #2563eb; 
    box-sizing: border-box; 
    &:hover { background: rgba(37, 99, 235, 0.05); }
  }
  
  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.header-actions {
  display: flex; 
  gap: 12px;
}

.modal-body { flex: 1; display: flex; gap: 12px; overflow: hidden; }

.col { background: #FFFFFF; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }

.col-title {
  height: 40px; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; font-size: 14px; font-weight: bold; color: #374151; flex-shrink: 0; padding-left: 15px;
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
  width: 330px;
  background: #FFFFFF;
  border-left: 1px solid #E5E7EB;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  .settings-scroll { 
    flex: 1; 
    height: 0;
    padding: 20px 0px 20px 20px; 
    box-sizing: border-box; 
    overflow-y: auto;
  }
  
  .setting-group { margin-bottom: 24px; margin-right: 20px;}
  
  .group-label { 
    font-size: 13px; font-weight: bold; color: #1e293b; margin-bottom: 10px; display: block; 
  }

  .input-line {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    
    .input-label {
      width: 50px;
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
      flex-shrink: 0;
    }
    
    .custom-input { 
      flex: 1; 
      height: 25px; 
      padding: 0 10px; 
      border: 1px solid #E2E8F0; 
      border-radius: 4px; 
      font-size: 12px; 
      background: #F8FAFC;
      transition: all 0.2s;
      
      &:focus {
        background: #FFFFFF;
        border-color: #3B82F6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }
    }
  }
  
  .checkbox-list, .radio-list { 
    display: flex; 
    gap: 12px;
    
    &.horizontal {
      flex-direction: row;
      flex-wrap: wrap;
    }
  }
  
  .cb-item, .radio-item {
    display: flex; align-items: center; gap: 6px; cursor: pointer;
    background: #F8FAFC; padding: 3px 3px; border-radius: 6px; border: 1px solid transparent;
    transition: all 0.2s;
    
    &:hover { background: #F1F5F9; }
    
    .cb-box {
      width: 16px; height: 16px; border: 1px solid #CBD5E1; border-radius: 4px; 
      display: flex; align-items: center; justify-content: center; background: #fff;
      &.checked { background: #3B82F6; border-color: #3B82F6; .check-mark { font-size: 12px; color: white; line-height: 1; } }
    }
    
    .radio-circle {
      width: 16px; height: 16px; border: 1px solid #CBD5E1; border-radius: 50%; 
      display: flex; align-items: center; justify-content: center; background: #fff;
      .radio-dot { width: 8px; height: 8px; background: #3B82F6; border-radius: 50%; }
    }
    &.active .radio-circle { border-color: #3B82F6; }
    
    .cb-label, .radio-label { font-size: 13px; color: #475569; }
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    
    .tpl-card {
      background: #fff;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 6px 10px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: all 0.2s;
      
      &:hover { border-color: #93C5FD; transform: translateY(-1px); box-shadow: 0 2px 5px rgba(0,0,0,0.03); }
      &.selected { border-color: #3B82F6; background-color: #EFF6FF; }
      
      .tpl-thumb {
        width: 100%;
        height: 80px;
        background: #F1F5F9;
        border-radius: 4px;
        margin-bottom: 8px;
        display: flex; flex-direction: column; justify-content: center; padding: 6px; box-sizing: border-box; gap: 4px;
        
        .thumb-lines .tl { height: 2px; background: #CBD5E1; width: 100%; margin-bottom: 3px; border-radius: 2px; }
        .thumb-lines .tl.short { width: 60%; }
      }
      .tpl-name { 
          font-size: 12px; color: #475569; text-align: center; white-space: nowrap; transform: scale(0.95); 
          width: 100%; overflow: hidden; text-overflow: ellipsis;
      }
    }
  }
}
</style>