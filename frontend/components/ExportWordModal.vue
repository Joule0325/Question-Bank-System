<template>
  <view class="export-modal-mask" v-if="visible" @click.self="close">
    <view class="export-modal-container">
      
      <view class="modal-header">
        <view class="modal-title">导出 Word</view>
        <view class="header-actions">
          <button class="action-btn primary" @click="handleExport" :disabled="isExporting">
            {{ isExporting ? '生成中...' : '导出 Word' }}
          </button>
          <button class="action-btn danger" @click="close">关闭</button>
        </view>
      </view>

      <view class="modal-body">
        
        <view class="col col-source">
          <view class="col-title">
            <view class="tab-item active">📄 效果预览</view>
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
                        
                        <view v-if="q.options && (q.options.A || q.options.B)" class="q-opts" :style="{gridTemplateColumns: `repeat(${q.optionLayout||4}, 1fr)`}">
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
                <input class="custom-input" v-model="titles.main" placeholder="主标题 (如: 2026模拟考)" />
              </view>
              <view class="input-row" style="margin-top: 8px;">
                <input class="custom-input" v-model="titles.sub" placeholder="副标题 (如: 物理试题)" />
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
import { saveAs } from 'file-saver';
import LatexText from '@/components/LatexText.vue';

const props = defineProps({
  visible: Boolean,
  questions: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:visible']);

const isExporting = ref(false);

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

const close = () => { emit('update:visible', false); };
const toggleMeta = (key) => { metadata[key] = !metadata[key]; };
const toggleContent = (key) => { contentSettings[key] = !contentSettings[key]; };
const selectTemplate = (tpl) => { selectedTplId.value = tpl.id; };

const handleExport = () => {
    isExporting.value = true;
    
    // 简单的 HTML 转 Doc 导出实现 (MIME trick)
    try {
        let htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset="utf-8">
                <title>${titles.main}</title>
                <style>
                    body { font-family: 'SimSun'; }
                    .main-title { font-size: 24pt; font-weight: bold; text-align: center; }
                    .sub-title { font-size: 16pt; text-align: center; margin-bottom: 20px; }
                    .q-item { margin-bottom: 15px; }
                    .q-title { font-size: 12pt; font-weight: bold; }
                    .q-opts { margin-top: 5px; margin-left: 20px; display: flex; flex-wrap: wrap; }
                    .opt-item { margin-right: 20px; }
                </style>
            </head>
            <body>
                <div class="main-title">${titles.main}</div>
                <div class="sub-title">${titles.sub}</div>
        `;
        
        props.questions.forEach((q, idx) => {
            // 题干
            let attr = [];
            if(metadata.year && q.year) attr.push(q.year);
            if(metadata.province && q.province) attr.push(q.province);
            if(metadata.difficulty && q.difficulty) attr.push(q.difficulty+'星');
            let attrStr = attr.length ? `(${attr.join(' ')})` : '';
            
            // 简单的文本处理，实际 Word 导出可能需要更复杂的 HTML 清洗
            let qTitle = q.title.replace(/<[^>]+>/g, ''); 
            
            htmlContent += `
                <div class="q-item">
                    <p class="q-title">${idx+1}. ${attrStr} ${qTitle}</p>
            `;
            
            // 选项
            if(q.options) {
                htmlContent += `<div class="q-opts">`;
                for(let k in q.options) {
                    if(q.options[k]) htmlContent += `<span class="opt-item">${k}. ${q.options[k].replace(/<[^>]+>/g,'')}</span>`;
                }
                htmlContent += `</div>`;
            }
            
            htmlContent += `</div>`;
        });
        
        htmlContent += `</body></html>`;
        
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        saveAs(blob, `${titles.main || '试卷'}.doc`);
        uni.showToast({ title: '已导出', icon: 'success' });
        
    } catch(e) {
        uni.showToast({ title: '导出失败', icon: 'none' });
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