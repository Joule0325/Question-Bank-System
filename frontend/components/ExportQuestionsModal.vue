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
          <view class="col-title">LaTeX 源码</view>
          <textarea 
            class="source-editor" 
            v-model="sourceCode" 
            maxlength="-1" 
            placeholder="在此输入 LaTeX 源码..."
          ></textarea>
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
import { ref, reactive, watch } from 'vue';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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

// 图片资源映射表 { "save_filename.jpg": "http://download/url" }
let imageAssets = {};

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

/**
 * 🌟 核心兼容逻辑 🌟
 * 解决 404 的关键：
 * 1. 下载链接 (downloadUrl)：完全信任原始数据，如果原始是 http://.../123 (无后缀)，就请求这个。
 * 2. 保存文件名 (saveFilename)：强制加后缀，保证 ZIP 里是图片格式。
 */
const resolveImageInfo = (rawUrl) => {
  // 1. 清洗 URL (去掉 query 参数)
  const cleanUrl = rawUrl.split('?')[0];
  
  // 2. 获取原始文件名
  let originalName = cleanUrl.split('/').pop(); // 例如 "123" 或 "456.jpg"
  
  // 3. 确定下载地址 (Download URL)
  // 绝对不要瞎改 URL！数据库存什么就请求什么，否则后端 404
  const downloadUrl = rawUrl; 

  // 4. 确定保存文件名 (Save Filename)
  // 必须保证有后缀，否则 LaTeX 报错
  let saveFilename = originalName;
  
  // 如果原始名没有后缀，强行加 .jpg (兼容旧数据)
  if (!saveFilename.includes('.')) {
    saveFilename += '.jpg';
  }

  // 解码防止中文乱码
  try { saveFilename = decodeURIComponent(saveFilename); } catch(e){}

  return { saveFilename, downloadUrl };
};

const convertContentToLatex = (text) => {
  if (!text) return '';
  let latex = text;

  // 处理自定义图片格式: [img:url:pos:scale]
  const imgRegex = /\[img:(.*?):([lmr]):(\d+)\]/g;
  latex = latex.replace(imgRegex, (match, rawUrl, pos, scale) => {
    
    // 调用兼容函数
    const { saveFilename, downloadUrl } = resolveImageInfo(rawUrl);
    
    // 存入待下载列表: key=文件名(带后缀), value=下载地址(原始地址)
    imageAssets[saveFilename] = downloadUrl;

    // 解析对齐方式
    let alignCmd = '\\centering'; 
    if (pos === 'l') alignCmd = '\\raggedright';
    if (pos === 'r') alignCmd = '\\raggedleft';

    // 解析缩放
    const widthVal = (parseInt(scale) / 100).toFixed(2);

    return `
\\begin{figure}[H]
  ${alignCmd}
  \\includegraphics[width=${widthVal}\\linewidth]{images/${saveFilename}}
\\end{figure}
`;
  });

  // 处理 Markdown 表格 (保持原始逻辑不变)
  if (latex.includes('|')) {
    const lines = latex.split('\n');
    let inTable = false;
    let tableLines = [];
    let newLines = [];

    const processTable = (tLines) => {
        const contentLines = tLines.filter(l => !/^[\s|:-]+$/.test(l));
        if (contentLines.length === 0) return '';

        const firstLine = contentLines[0];
        const cols = firstLine.split('|').filter(s => s.trim() !== '').length;
        if (cols === 0) return '';
        
        const colSpec = '|' + Array(cols).fill('X<{\\centering}').join('|') + '|';

        let tableBody = '';
        contentLines.forEach(row => {
            const cells = row.split('|');
            const cleanCells = cells.filter((c, i) => {
                 if ((i === 0 || i === cells.length - 1) && c.trim() === '') return false;
                 return true;
            });
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
    if (inTable) {
        newLines.push(processTable(tableLines));
    }
    
    latex = newLines.join('\n');
  }

  // 基础清洗
  latex = latex.replace(/&nbsp;/g, ' ');
  latex = latex.replace(/<br\s*\/?>/g, ' \\\\\n');
  latex = latex.replace(/<p[^>]*>/g, '\n\n').replace(/<\/p>/g, '');
  latex = latex.replace(/<[^>]+>/g, '');
  
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

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}

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
      
      if (q.options) {
          content += `\\begin{itemize}\n`;
          Object.keys(q.options).forEach(key => {
              const optContent = convertContentToLatex(q.options[key]);
              content += `  \\item[${key}.] ${optContent}\n`;
          });
          content += `\\end{itemize}\n`;
      }
      
      if (answerPos.value === 'question') {
         const qAns = convertContentToLatex(q.answer || '略');
         content += `\\vspace{0.5cm}\\textbf{【答案】} ${qAns} \\\\\n`;
         content += `\\vspace{0.5cm}\\hrule\\vspace{0.5cm}\n`;
      } else {
         content += `\\vspace{1cm}\n`;
      }
    });
  }

  if (answerPos.value === 'end' && props.questions && props.questions.length > 0) {
      content += `\\newpage\n\\section*{二、参考答案}\n`;
      props.questions.forEach((q, index) => {
          const qAns = convertContentToLatex(q.answer || '略');
          content += `\\textbf{${index + 1}.} ${qAns} \\\\\n`;
      });
  }

  content += `\n\\end{document}`;
  sourceCode.value = content;
};

// --- 导出逻辑 (修复了 Loading 配对问题) ---
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
        console.log(`准备下载 ${assetEntries.length} 张图片...`);
        
        const downloadPromises = assetEntries.map(async ([saveFilename, downloadUrl]) => {
          try {
            console.log(`下载: ${downloadUrl} -> 保存为: ${saveFilename}`);
            
            // 使用原始 URL 下载
            const res = await uni.request({
              url: downloadUrl,
              method: 'GET',
              responseType: 'arraybuffer'
            });
            
            if (res.statusCode === 200) {
              imgFolder.file(saveFilename, res.data);
            } else {
              console.error(`Status Error ${res.statusCode}: ${downloadUrl}`);
              imgFolder.file(saveFilename + "_error.txt", `HTTP ${res.statusCode}`);
            }
          } catch (e) {
            console.error(`Network Error:`, e);
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
    console.error('Export failed:', error);
    uni.showToast({ title: '导出失败', icon: 'none' });
  } finally {
    // 确保 Loading 只关闭一次，解决控制台警告
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
    if (props.visible) generateLatex();
}, { deep: true });

watch(answerPos, generateLatex);

const close = () => {
  emit('update:visible', false);
};

const setMode = (m) => {
  mode.value = m;
};

const toggleMeta = (key) => {
  metadata[key] = !metadata[key];
};

const selectTemplate = (tpl) => {
  selectedTplId.value = tpl.id;
};

const uploadTemplate = () => {
  uni.showToast({ title: '上传功能待开发', icon: 'none' });
};
</script>

<style lang="scss" scoped>
/* 样式已完全恢复为第一次提供的原版 */
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

.col-title {
  height: 40px;
  background: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 14px;
  font-weight: bold;
  color: #374151;
  flex-shrink: 0;
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

.col-settings {
  width: 300px;
  
  .settings-scroll {
    flex: 1;
    padding: 16px;
    box-sizing: border-box;
  }
  
  .setting-group {
    margin-bottom: 24px;
    
    .group-label {
      font-size: 13px;
      font-weight: bold;
      color: #374151;
      margin-bottom: 12px;
      display: block;
    }
  }
  
  .checkbox-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    
    .cb-item {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      
      .cb-box {
        width: 16px;
        height: 16px;
        border: 1px solid #D1D5DB;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        
        &.checked {
          background: #3B82F6;
          border-color: #3B82F6;
        }
        
        .check-mark {
          font-size: 12px;
          color: white;
        }
      }
      
      .cb-label {
        font-size: 14px;
        color: #4B5563;
      }
    }
  }
  
  .radio-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    
    .radio-item {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      
      .radio-circle {
        width: 16px;
        height: 16px;
        border: 1px solid #D1D5DB;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
      }
      
      &.active {
        .radio-circle {
          border-color: #3B82F6;
        }
        .radio-dot {
          width: 8px;
          height: 8px;
          background: #3B82F6;
          border-radius: 50%;
        }
      }
      
      .radio-label {
        font-size: 14px;
        color: #4B5563;
      }
    }
  }
  
  .template-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    
    .tpl-card {
      width: 80px;
      height: 110px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 4px;
      box-sizing: border-box;
      cursor: pointer;
      transition: all 0.2s;
      
      &.selected {
        border-color: #3B82F6;
        background: #EFF6FF;
        box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
        
        .tpl-name {
          color: #1D4ED8;
          font-weight: bold;
        }
      }
      
      .tpl-thumb {
        width: 40px;
        height: 54px;
        background: #fff;
        border: 1px solid #E5E7EB;
        margin-bottom: 8px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      
      .tpl-name {
        font-size: 12px;
        color: #6B7280;
        text-align: center;
        line-height: 1.3;
        white-space: pre-wrap;
      }
      
      &.upload-card {
        justify-content: center;
        
        .upload-icon {
          width: 28px;
          height: 28px;
          background: #E5E7EB;
          border-radius: 50%;
          color: #fff;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }
      }
    }
  }
}
</style>