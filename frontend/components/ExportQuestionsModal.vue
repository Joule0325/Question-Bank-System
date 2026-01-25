<template>
  <view class="export-modal-mask" v-if="visible" @click.self="close">
    <view class="export-modal-container">
      
      <!-- Header -->
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
          <button class="action-btn primary" @click="handleExport">导出</button>
          <button class="action-btn danger" @click="close">关闭</button>
        </view>
      </view>

      <!-- Main Body -->
      <view class="modal-body">
        
        <!-- Left Column: Source -->
        <view class="col col-source">
          <view class="col-title">LaTeX 源码</view>
          <textarea 
            class="source-editor" 
            v-model="sourceCode" 
            maxlength="-1" 
            placeholder="在此输入 LaTeX 源码..."
          ></textarea>
        </view>

        <!-- Middle Column: Preview -->
        <view class="col col-preview">
          <view class="col-title">预览</view>
          <view class="preview-stage">
            <view class="paper-sheet">
              <view class="paper-content">
                <text class="preview-title">数学测试</text>
                <view class="preview-q">
                  <text>1. 求解 x:</text>
                  <text class="math-eq">x² + 2x + 1 = 0</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- Right Column: Settings -->
        <view class="col col-settings">
          <view class="col-title">导出设置</view>
          <scroll-view scroll-y class="settings-scroll">
            
            <!-- Metadata -->
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

            <!-- Answer Placement -->
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

            <!-- Template -->
            <view class="setting-group">
              <text class="group-label">试卷模板</text>
              <view class="template-grid">
                <view 
                  class="tpl-card" 
                  v-for="(tpl, idx) in templates" 
                  :key="tpl.id"
                  :class="{ selected: selectedTplId === tpl.id }"
                  @click="selectTemplate(tpl)"
                  @dblclick="previewTemplate(tpl)"
                >
                  <view class="tpl-thumb">
                    <!-- Placeholder for PDF cover -->
                    <view class="thumb-placeholder"></view>
                  </view>
                  <text class="tpl-name">{{ tpl.name }}</text>
                </view>
                
                <view class="tpl-card upload-card" @click="uploadTemplate">
                  <view class="upload-icon">+</view>
                  <text class="tpl-name">上传</text>
                </view>
              </view>
              <text class="tips">双击预览完整PDF，单击选中</text>
            </view>

          </scroll-view>
        </view>

      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';

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

const answerPos = ref('end');
const selectedTplId = ref(1);

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

const generateLatex = () => {
  if (!props.questions || props.questions.length === 0) {
    sourceCode.value = `\\documentclass{ctexart}
\\usepackage{amsmath}
\\begin{document}
% 暂无题目
\\end{document}`;
    return;
  }

  let content = `\\documentclass{ctexart}
\\usepackage{amsmath}
\\usepackage{geometry}
\\geometry{a4paper,scale=0.8}

\\begin{document}

\\section*{数学测试}

`;

  props.questions.forEach((q, index) => {
    content += `\\paragraph{第${index + 1}题} ${q.title || ''}\n`;
    
    if (q.options) {
        // Simple handling of options
        content += `\\begin{itemize}\n`;
        Object.keys(q.options).forEach(key => {
            content += `  \\item[${key}.] ${q.options[key]}\n`;
        });
        content += `\\end{itemize}\n`;
    }
    content += `\n`;
  });

  if (answerPos.value === 'end') {
      content += `\\newpage\n\\section*{答案}\n`;
      props.questions.forEach((q, index) => {
          content += `\\textbf{${index + 1}.} ${q.answer || '略'} \\\\\n`;
      });
  }

  content += `\n\\end{document}`;
  sourceCode.value = content;
};

watch(() => props.visible, (newVal) => {
  if (newVal) {
    generateLatex();
  }
});

watch(() => props.questions, () => {
    if (props.visible) generateLatex();
}, { deep: true });

watch(answerPos, () => {
    generateLatex();
});

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

const previewTemplate = (tpl) => {
  uni.showToast({
    title: `预览: ${tpl.name.replace('\n', '')}`,
    icon: 'none'
  });
};

const uploadTemplate = () => {
  uni.showToast({
    title: '上传功能待开发',
    icon: 'none'
  });
};

const handleExport = () => {
  uni.showLoading({ title: '导出中...' });
  setTimeout(() => {
    uni.hideLoading();
    uni.showToast({ title: '导出成功' });
    emit('export');
    close();
  }, 1500);
};

</script>

<style lang="scss" scoped>
/* Font settings */
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
  height: 800px;
  background-color: #F3F4F6;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  overflow: hidden;
}

/* Header */
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
    
    &.danger { background: #EF4444; }
    &.danger:hover { background: #DC2626; }
  }
}

/* Body */
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

/* Left Column */
.col-source {
  width: 380px;
  
  .source-editor {
    flex: 1;
    width: 100%;
    padding: 16px;
    border: none;
    outline: none;
    resize: none;
    font-family: 'Roboto Mono', 'Menlo', monospace; /* Code font exception */
    font-size: 13px;
    line-height: 1.6;
    color: #1F2937;
    background: #FFFFFF;
    box-sizing: border-box;
  }
}

/* Middle Column */
.col-preview {
  flex: 1;
  background: #F3F4F6; /* Override white for gap */
  
  .preview-stage {
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 24px;
    overflow-y: auto;
  }
  
  .paper-sheet {
    width: 480px;
    min-height: 640px;
    background: #FFFFFF;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    padding: 40px;
    box-sizing: border-box;
    
    .paper-content {
      color: #000000;
      
      .preview-title {
        font-size: 18px;
        font-weight: bold;
        display: block;
        text-align: center;
        margin-bottom: 24px;
      }
      
      .preview-q {
        font-size: 15px;
        line-height: 1.6;
        
        .math-eq {
          display: block;
          margin: 8px 0;
          text-align: center;
          font-family: "Times New Roman", serif;
          font-style: italic;
        }
      }
    }
  }
}

/* Right Column */
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
    
    .tips {
      display: block;
      width: 100%;
      font-size: 11px;
      color: #9CA3AF;
      margin-top: 4px;
    }
  }
}
</style>