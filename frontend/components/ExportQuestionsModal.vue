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
              <text class="group-label">试题属性</text>
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
                    <view class="thumb-placeholder"></view>
                  </view>
                  <text class="tpl-name">{{ tpl.name }}</text>
                </view>
                
                <view class="tpl-card upload-card" @click="uploadTemplate">
                  <view class="upload-icon">+</view>
                  <text class="tpl-name">上传</text>
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
import { compilePaper } from '@/api/question.js'; // 引入编译 API

const props = defineProps({
  visible: Boolean,
  questions: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:visible', 'export']);

const mode = ref('latex');
const sourceCode = ref('');
const isExporting = ref(false);

const answerPos = ref('end');
const selectedTplId = ref(1);

// 图片资源映射表
let imageAssets = {};

// [新增] 编译相关状态
const viewMode = ref('code'); // 'code' | 'preview'
const isCompiling = ref(false);
const pdfUrl = ref('');
const compileError = ref('');

const metadata = reactive({
  source: false,
  year: true,
  province: false,
  difficulty: false
});

const metadataOpts = [
  { key: 'source', label: '来源' },
  { key: 'year', label: '年份' },
  { key: 'province', label: '省份' },
  { key: 'difficulty', label: '难度' }
];

const templates = ref([
  { id: 1, name: "标准\n试卷" },
  { id: 2, name: "两栏\n紧凑" },
  { id: 3, name: "答题卡\nA3" },
  { id: 4, name: "作业\n练习" }
]);

// 核心兼容逻辑：解决 404
const resolveImageInfo = (rawUrl) => {
  const cleanUrl = rawUrl.split('?')[0];
  let originalName = cleanUrl.split('/').pop(); 
  const downloadUrl = rawUrl; 
  let saveFilename = originalName;
  if (!saveFilename.includes('.')) { saveFilename += '.jpg'; }
  try { saveFilename = decodeURIComponent(saveFilename); } catch(e){}
  return { saveFilename, downloadUrl };
};

const convertContentToLatex = (text) => {
  if (!text) return '';
  
  // 1. 分割文本和公式 (简单处理 $...$ )
  // 偶数索引为文本，奇数索引为公式
  const parts = text.split(/(\$[^$]*\$)/g);

  const processedParts = parts.map((part, index) => {
    if (index % 2 === 1) {
      // --- 公式部分 ---
      // 保持原样，不转义
      return part;
    } else {
      // --- 文本部分 ---
      let latex = part;

      // 1. 处理填空题下划线 (连续2个以上)
      latex = latex.replace(/_{2,}/g, ' \\underline{\\hspace{2em}} ');

      // 2. 转义特殊字符 (不转义 _，交给 macro/package 处理，但要转义 & % #)
      latex = latex.replace(/([&%#])/g, '\\$1');
      latex = latex.replace(/\^/g, '\\textasciicircum ');
      latex = latex.replace(/~/g, '\\textasciitilde ');

      // 3. 处理换行
      // 将 HTML <br> 或 <p> 转换为 LaTeX 换行
      latex = latex.replace(/<br\s*\/?>/gi, ' \\newline ');
      latex = latex.replace(/<\/p>/gi, ' \\par ');
      latex = latex.replace(/<p[^>]*>/gi, '');
      // 处理普通文本中的换行符 (保留用户输入的换行结构)
      latex = latex.replace(/\n/g, ' \\newline ');

      // 4. 清理 HTML 标签
      latex = latex.replace(/<[^>]+>/g, '');

      // 5. HTML 实体
      latex = latex.replace(/&nbsp;/g, ' ');
      latex = latex.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

      // 6. 处理自定义图片格式 (内嵌，不使用 figure 环境)
      // 预览区所见即所得：图片如果不换行，这里也不换行
      const imgRegex = /\[img:(.*?):([lmr]):(\d+)\]/g;
      latex = latex.replace(imgRegex, (match, rawUrl, pos, scale) => {
        const { saveFilename, downloadUrl } = resolveImageInfo(rawUrl);
        imageAssets[saveFilename] = downloadUrl;
        
        // 缩放比例
        const widthVal = (parseInt(scale) / 100).toFixed(2);
        
        // 直接插入图片，不带任何位置环境，跟随文本流
        // 使用 raisebox 垂直居中对齐 (0.5\height 使图片中心对齐基线，实际上通常需要微调，但这是通用做法)
        return `\\raisebox{-0.5\\height}{\\includegraphics[width=${widthVal}\\linewidth]{images/${saveFilename}}}`;
      });

      return latex;
    }
  });

  let latex = processedParts.join('');

  // 7. 处理 Markdown 表格 (全局处理，因为表格是块级元素)
  // 简易逻辑：识别被 \newline 分隔的行，如果看起来像表格则转换
  // 注意：上面的 \n 已经被替换为 \newline
  if (latex.includes('|')) {
    const lines = latex.split(/ \\newline | \\par /); // 根据刚才替换的换行符分割
    let inTable = false;
    let tableLines = [];
    let newLines = [];

    const processTable = (tLines) => {
        // 过滤空行
        const contentLines = tLines.filter(l => !/^[\s|:-]+$/.test(l));
        if (contentLines.length === 0) return '';
        
        // 确定列数
        const firstLine = contentLines[0];
        // 移除转义后的 \| 或普通 |
        const cols = firstLine.split('|').filter(s => s && s.trim() !== '').length;
        if (cols === 0) return tLines.join(' \\newline ');

        const colSpec = '|' + Array(cols).fill('X<{\\centering}').join('|') + '|';
        let tableBody = '';
        
        contentLines.forEach(row => {
            const cells = row.split('|');
            const cleanCells = cells.filter((c, i) => {
                 // 过滤首尾的空分割
                 if ((i === 0 || i === cells.length - 1) && (!c || c.trim() === '')) return false;
                 return true;
            });
            // 单元格之间用 & 连接
            const latexCells = cleanCells.map(c => c.trim()).join(' & ');
            tableBody += `      ${latexCells} \\\\ \\hline\n`;
        });

        return `
\\begin{table}[H]
  \\centering
  \\begin{tabularx}{\\linewidth}{${colSpec}}
    \\hline
${tableBody}  \\end{tabularx}
\\end{table}
`;
    };

    lines.forEach(line => {
        const trimmed = line.trim();
        // 简单的表格行判断：以 | 开头并以 | 结尾 (忽略转义符检查，简化处理)
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            if (!inTable) inTable = true;
            tableLines.push(trimmed);
        } else {
            if (inTable) {
                newLines.push(processTable(tableLines));
                tableLines = [];
                inTable = false;
            }
            newLines.push(line);
        }
    });
    if (inTable) { newLines.push(processTable(tableLines)); }
    
    // 重新组合，使用 \n 连接，因为表格环境本身是块级的
    latex = newLines.join('\n'); 
  }

  return latex;
};

const generateLatex = () => {
  imageAssets = {};
  
  let content = `\\documentclass[UTF8]{ctexart}
\\usepackage{geometry}
\\geometry{a4paper,scale=0.8}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{float}
\\usepackage{booktabs}
\\usepackage{tabularx}
\\usepackage{array}
\\usepackage{underscore}
\\usepackage{enumitem}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}
\\setlength{\\fboxrule}{0pt} % 移除图片边框

\\title{数学测试试卷}
\\author{}
\\date{\\today}

\\begin{document}

\\maketitle

\\section*{一、题目列表}

`;

  if (!props.questions || props.questions.length === 0) {
    content += `% 暂无题目数据\n`;
  } else {
    props.questions.forEach((q, index) => {
      const qTitle = convertContentToLatex(q.title || '');
      content += `\\paragraph{第 ${index + 1} 题} \n`;
      content += `${qTitle}\n`;

      // 处理小题
      if (q.subQuestions && q.subQuestions.length > 0) {
          q.subQuestions.forEach((subQ, idx) => {
              const subContent = convertContentToLatex(subQ.content || '');
              // [修改] 移除自动编号 (${idx+1})，仅输出内容 + 换行
              content += `${subContent} \\par\n`; 
              
              // 小题选项
              if (subQ.options && Object.keys(subQ.options).length > 0) {
                  const validKeys = Object.keys(subQ.options).filter(k => subQ.options[k] && subQ.options[k].trim() !== '');
                  if (validKeys.length > 0) {
                      content += `    \\begin{itemize}[nosep, topsep=0pt]\n`;
                      validKeys.forEach(key => {
                          const optContent = convertContentToLatex(subQ.options[key]);
                          content += `      \\item[${key}.] ${optContent}\n`;
                      });
                      content += `    \\end{itemize}\n`;
                  }
              }
          });
      }  
      // 处理主题选项 (如果没小题)
      else if (q.options && Object.keys(q.options).length > 0) {
          const validKeys = Object.keys(q.options).filter(k => q.options[k] && q.options[k].trim() !== '');
          if (validKeys.length > 0) {
              content += `\\begin{itemize}[nosep, topsep=0pt]\n`;
              validKeys.forEach(key => {
                  const optContent = convertContentToLatex(q.options[key]);
                  content += `  \\item[${key}.] ${optContent}\n`;
              });
              content += `\\end{itemize}\n`;
          }
      }

      if (answerPos.value === 'question') {
         // 答案部分也要处理小题
         let qAns = '';
         let qAnalysis = '';
         let qDetailed = '';

         if (q.subQuestions && q.subQuestions.length > 0) {
             q.subQuestions.forEach((subQ, idx) => {
                 // [修改] 移除自动编号
                 qAns += convertContentToLatex(subQ.answer || '略') + ' ';
                 if (subQ.analysis) qAnalysis += convertContentToLatex(subQ.analysis) + ' ';
                 if (subQ.detailed) qDetailed += convertContentToLatex(subQ.detailed) + ' ';
             });
         } else {
             qAns = convertContentToLatex(q.answer || '略');
             qAnalysis = convertContentToLatex(q.analysis || '');
             qDetailed = convertContentToLatex(q.detailed || '');
         }
         
         content += `\\vspace{0.5cm}\\textbf{【答案】} ${qAns} \\par\n`;
         if (qAnalysis) content += `\\textbf{【解析】} ${qAnalysis} \\par\n`;
         if (qDetailed) content += `\\textbf{【详解】} ${qDetailed} \\par\n`;
         
         content += `\\vspace{0.5cm}\\hrule\\vspace{0.5cm}\n`;
      } else {
         content += `\\vspace{1cm}\n`;
      }
    });
  }

  if (answerPos.value === 'end' && props.questions && props.questions.length > 0) {
      content += `\\newpage\n\\section*{二、参考答案}\n`;
      props.questions.forEach((q, index) => {
          let qAns = '';
          let qAnalysis = '';
          let qDetailed = '';

          if (q.subQuestions && q.subQuestions.length > 0) {
             q.subQuestions.forEach((subQ, idx) => {
                 // [修改] 移除自动编号
                 qAns += convertContentToLatex(subQ.answer || '略') + '\\\\ '; 
                 if (subQ.analysis) qAnalysis += convertContentToLatex(subQ.analysis) + '\\\\ ';
                 if (subQ.detailed) qDetailed += convertContentToLatex(subQ.detailed) + '\\\\ ';
             });
          } else {
             qAns = convertContentToLatex(q.answer || '略');
             qAnalysis = convertContentToLatex(q.analysis || '');
             qDetailed = convertContentToLatex(q.detailed || '');
          }
          
          content += `\\paragraph{第 ${index + 1} 题}\n`;
          content += `\\textbf{【答案】} ${qAns} \\par\n`;
          if (qAnalysis) content += `\\textbf{【解析】} ${qAnalysis} \\par\n`;
          if (qDetailed) content += `\\textbf{【详解】} ${qDetailed} \\par\n`;
      });
  }

  content += `\n\\end{document}`;
  sourceCode.value = content;
};

// [新增] 编译处理函数
// [修改] 编译处理函数
const handleCompile = async () => {
  viewMode.value = 'preview';
  
  await nextTick(); // 确保 v-model 更新

  if (isCompiling.value || !sourceCode.value) return;

  isCompiling.value = true;
  compileError.value = '';

  try {
    // 关键修改：传入 imageAssets
    // 这个对象里存了 { "1.jpg": "http://.../1.jpg" } 这样的映射关系
    const res = await compilePaper(sourceCode.value, imageAssets);
    if (res.url) {
      pdfUrl.value = res.url + '?t=' + Date.now();
    }
  } catch (err) {
    console.error('编译失败:', err);
    const errorMsg = err.log || err.error || '未知错误';
    compileError.value = errorMsg;
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
            const res = await uni.request({
              url: downloadUrl,
              method: 'GET',
              responseType: 'arraybuffer'
            });
            if (res.statusCode === 200) {
              imgFolder.file(saveFilename, res.data);
            } else {
              imgFolder.file(saveFilename + "_error.txt", `HTTP ${res.statusCode}`);
            }
          } catch (e) {
            imgFolder.file(saveFilename + "_error.txt", "Net Error");
          }
        });
        await Promise.all(downloadPromises);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "latex_paper_export.zip");
    uni.showToast({ title: '导出成功', icon: 'success' });
    emit('export');
  } catch (error) {
    uni.showToast({ title: '导出失败', icon: 'none' });
  } finally {
    if (isExporting.value) {
        uni.hideLoading();
        isExporting.value = false;
    }
  }
};

watch(() => props.visible, (newVal) => {
  if (newVal) generateLatex();
});

watch(() => props.questions, () => {
    if (props.visible) {
        generateLatex();
        pdfUrl.value = ''; // 数据变更，重置PDF
        viewMode.value = 'code';
    }
}, { deep: true });

watch(answerPos, generateLatex);

const close = () => { emit('update:visible', false); };
const setMode = (m) => { mode.value = m; };
const toggleMeta = (key) => { metadata[key] = !metadata[key]; };
const selectTemplate = (tpl) => { selectedTplId.value = tpl.id; };
const uploadTemplate = () => { uni.showToast({ title: '上传功能待开发', icon: 'none' }); };
</script>

<style lang="scss" scoped>
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
    padding: 6px 16px;
    font-size: 14px;
    color: #4B5563;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
    
    &.active {
      background: #3B82F6;
      color: #FFFFFF;
      font-weight: bold;
    }
  }
}

.header-actions {
  display: flex;
  gap: 12px;
  
  .action-btn {
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 14px;
    border: none;
    cursor: pointer;
    color: white;
    font-family: inherit;
    
    &.primary { background: #10B981; }
    &.primary:hover { background: #059669; }
    &.primary:disabled { background: #6EE7B7; cursor: not-allowed; }
    
    &.danger { background: #EF4444; }
    &.danger:hover { background: #DC2626; }
  }
}

.modal-body {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden;
}

.col {
  background: #FFFFFF;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* [新增/修改] 标题样式，支持 Tab */
.col-title {
  height: 40px;
  background: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: bold;
  color: #374151;
  flex-shrink: 0;
  
  &.tab-header {
    justify-content: flex-start;
    padding: 0;
    
    .tab-item {
      height: 100%;
      padding: 0 20px;
      display: flex;
      align-items: center;
      cursor: pointer;
      color: #6B7280;
      transition: all 0.2s;
      
      &:hover { background: #F3F4F6; }
      
      &.active {
        color: #3B82F6;
        font-weight: bold;
        background: #FFFFFF;
        position: relative;
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: #3B82F6;
        }
      }
    }
    .divider { color: #E5E7EB; margin: 0 5px; font-weight: normal; }
  }
}

.col-source {
  flex: 1; 
  
  .source-editor {
    flex: 1;
    width: 100%;
    padding: 16px;
    border: none;
    outline: none;
    resize: none;
    font-family: 'Roboto Mono', 'Menlo', monospace;
    font-size: 13px;
    line-height: 1.6;
    color: #1F2937;
    background: #FFFFFF;
    box-sizing: border-box;
  }
}

/* [新增] PDF 预览样式 */
.pdf-preview-container {
  flex: 1;
  width: 100%;
  height: 0;
  background: #E5E7EB;
  position: relative;
  
  .pdf-frame {
    width: 100%;
    height: 100%;
    background: #fff;
  }
  
  .preview-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: #6B7280;
    
    .loading-text { color: #3B82F6; font-weight: bold; }
    
    .error-box {
      width: 90%;
      height: 80%;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 6px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      
      .error-title {
        color: #DC2626;
        font-weight: bold;
        margin-bottom: 8px;
      }
      .error-log {
        flex: 1;
        height: 0;
        font-family: monospace;
        font-size: 12px;
        color: #7F1D1D;
        white-space: pre-wrap;
      }
    }
  }
}

.col-settings {
  width: 300px;
  
  .settings-scroll {
    flex: 1;
    padding: 16px;
    box-sizing: border-box;
  }
  
  .setting-group { margin-bottom: 24px; }
  .group-label { font-size: 13px; font-weight: bold; color: #374151; margin-bottom: 12px; display: block; }
  
  .checkbox-list {
    display: flex; flex-direction: column; gap: 10px;
    .cb-item {
      display: flex; align-items: center; gap: 8px; cursor: pointer;
      .cb-box {
        width: 16px; height: 16px; border: 1px solid #D1D5DB; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #fff;
        &.checked { background: #3B82F6; border-color: #3B82F6; }
        .check-mark { font-size: 12px; color: white; }
      }
      .cb-label { font-size: 14px; color: #4B5563; }
    }
  }
  
  .radio-list {
    display: flex; flex-direction: column; gap: 10px;
    .radio-item {
      display: flex; align-items: center; gap: 8px; cursor: pointer;
      .radio-circle { width: 16px; height: 16px; border: 1px solid #D1D5DB; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #fff; }
      &.active {
        .radio-circle { border-color: #3B82F6; }
        .radio-dot { width: 8px; height: 8px; background: #3B82F6; border-radius: 50%; }
      }
      .radio-label { font-size: 14px; color: #4B5563; }
    }
  }
  
  .template-grid {
    display: flex; flex-wrap: wrap; gap: 12px;
    .tpl-card {
      width: 80px; height: 110px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; display: flex; flex-direction: column; align-items: center; padding: 8px 4px; box-sizing: border-box; cursor: pointer; transition: all 0.2s;
      &.selected {
        border-color: #3B82F6; background: #EFF6FF; box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
        .tpl-name { color: #1D4ED8; font-weight: bold; }
      }
      .tpl-thumb { width: 40px; height: 54px; background: #fff; border: 1px solid #E5E7EB; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
      .tpl-name { font-size: 12px; color: #6B7280; text-align: center; line-height: 1.3; white-space: pre-wrap; }
      &.upload-card {
        justify-content: center;
        .upload-icon { width: 28px; height: 28px; background: #E5E7EB; border-radius: 50%; color: #fff; font-size: 20px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
      }
    }
  }
}
</style>