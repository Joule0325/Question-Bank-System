<template>
  <CommonModal :isOpen="visible" maxWidth="1300px" @close="close">
    <template #header>
      <view class="add-modal-header">
        <view class="header-info" v-if="previewList.length > 0">
          <text class="status-text">
            共 {{ currentMode === -1 ? previewList.length : cachedPreviewList.length }} 题
            <text v-if="currentMode !== -1" class="mode-tag"> (当前编辑: No.{{ currentMode + 1 }})</text>
          </text>
        </view>
        <view class="header-info" v-else><view></view></view>

        <view class="header-btns">
            <button class="menu-btn" style="color: #7c3aed; border-color: #7c3aed; margin-right: 15px;" @click="openOCRModal">
                ✨ 智能识别
            </button>
            <button class="menu-btn primary" @click="handleSave">保存</button>
            <button class="menu-btn" @click="close">退出</button>
            <button class="menu-btn outline" @click="handleSaveAndExit">保存并退出</button>
        </view>
      </view>
    </template>

    <view class="four-col-layout" @click="handleGlobalClick">
      
      <view class="nav-col" v-if="cachedPreviewList.length > 1">
        <view class="nav-item all" :class="{ active: currentMode === -1 }" @click="switchMode(-1)" title="显示全部">全</view>
        <scroll-view scroll-y class="nav-scroll">
          <view v-for="(item, idx) in cachedPreviewList" :key="idx" class="nav-item num" :class="{ active: currentMode === idx }" @click="switchMode(idx)">{{ idx + 1 }}</view>
        </scroll-view>
      </view>

      <view class="col-editor" @click="setActiveArea('left')">
        <view class="editor-wrap">
          <textarea 
            class="raw-editor" 
            ref="editorRef"
            v-model="inputRawText" 
            maxlength="-1" 
            @input="handleEditorInput"
            @click="handleEditorClick"
            @keydown="handleEditorKeydown"
            @keyup="updateCursorPos"
            @blur="onEditorBlur"
            placeholder="输入题目模板..."
          ></textarea>
        </view>
      </view>

      <view class="col-preview" @click="handlePreviewBgClick">
        <view class="convert-bar">
          <view class="convert-btn" @click.stop="manualParse" title="点击转化">
            <image 
              src="/static/icons/右-箭头.svg" 
              class="convert-icon" 
              mode="aspectFit"
            ></image>
          </view>
        </view>
        <scroll-view scroll-y class="preview-scroll">
          <view v-if="previewList.length === 0" class="empty-preview">
            <text>左侧输入内容后点击“转化”预览</text>
            <text style="display:block; font-size:12px; margin-top:5px; opacity:0.6;">(双击空白处可 显/隐 全部答案)</text>
          </view>
          
          <view v-for="(item, idx) in previewList" :key="item.id + '_' + idx + '_' + parseVersion" class="q-card preview-card mb-4" :id="'q-card-'+idx"
            :class="{ active: currentPreviewIdx === idx }">
            
            <view class="q-header">
              <view class="meta-left">
                <view class="meta-dropdown-wrap" @click.stop="item.showYearDrop = !item.showYearDrop">
                    <text class="info-chip year" :class="{ 'has-more': item.yearList.length > 1 }">{{ item.curYear || '年份' }}</text>
                    <view class="meta-dropdown-list" v-if="item.showYearDrop && item.yearList.length > 1">
                        <view v-for="(opt, oi) in item.yearList" :key="oi" class="meta-dropdown-item" @click.stop="item.curYear=opt; item.showYearDrop=false">{{ opt }}</view>
                    </view>
                </view>

                <view class="meta-dropdown-wrap" @click.stop="item.showSourceDrop = !item.showSourceDrop">
                    <text class="info-chip src" :class="{ 'has-more': item.sourceList.length > 1 }">{{ item.curSource || '来源' }}</text>
                    <view class="meta-dropdown-list" v-if="item.showSourceDrop && item.sourceList.length > 1">
                        <view v-for="(opt, oi) in item.sourceList" :key="oi" class="meta-dropdown-item" @click.stop="item.curSource=opt; item.showSourceDrop=false">{{ opt }}</view>
                    </view>
                </view>

                <view class="meta-dropdown-wrap" @click.stop="item.showNumDrop = !item.showNumDrop">
                    <text class="info-chip num" :class="{ 'has-more': item.numList.length > 1 }">第 {{ item.curNum || '-' }} 题</text>
                    <view class="meta-dropdown-list" v-if="item.showNumDrop && item.numList.length > 1">
                        <view v-for="(opt, oi) in item.numList" :key="oi" class="meta-dropdown-item" @click.stop="item.curNum=opt; item.showNumDrop=false">第 {{ opt }} 题</view>
                    </view>
                </view>

                <text class="info-chip diff">{{ '★'.repeat(item.difficulty || 0) }}</text>
                <text class="info-chip type">{{ item.type }}</text>
                
                <view class="meta-dropdown-wrap" @click.stop="item.showProvDrop = !item.showProvDrop">
                    <text class="info-chip prov" v-if="item.curProv" :class="{ 'has-more': item.provList.length > 1 }">{{ item.curProv }}</text>
                    <text class="info-chip prov err" v-else-if="item._regionErr">(地区错误)</text>
                    <text class="info-chip prov" v-else style="color:#999">(未设置)</text>
                    <view class="meta-dropdown-list" v-if="item.showProvDrop && item.provList.length > 1">
                        <view v-for="(opt, oi) in item.provList" :key="oi" class="meta-dropdown-item" @click.stop="item.curProv=opt; item.showProvDrop=false">{{ opt }}</view>
                    </view>
                </view>

                <view class="fav-btn" style="cursor: default; opacity: 0.8;">
                   <image class="star-icon" :src="item.isFavorite ? '/static/icons/星星-橙.svg' : '/static/icons/星星-灰.svg'" mode="aspectFit"></image>
                </view>
              </view>
              <view class="meta-right"><text class="seq-num">No.{{ currentMode === -1 ? (idx + 1) : (currentMode + 1) }}</text></view>
            </view>

            <view class="q-body">
              <view class="content-wrapper" :style="dynamicFontStyle">
                <view class="body-row" :class="{'material-box': item.subQuestions && item.subQuestions.length > 0}">
                    <view class="q-title"><LatexText :text="item.title"></LatexText></view>
                </view>
                
                <view v-if="item.subQuestions && item.subQuestions.length > 0" class="sub-q-list">
                    <view 
                        v-for="(subQ, sIdx) in item.subQuestions" 
                        :key="sIdx" 
                        class="sub-q-item"
                        :class="{ 'highlight-red': isSubQActive(subQ) }" 
                    >
                        <view class="sub-q-content" style="display: flex; align-items: baseline;">
                            <text style="font-weight:bold; margin-right:5px; flex-shrink: 0;">{{ formatSubIndex(sIdx + 1) }}</text>
                            <view style="flex:1;"><LatexText :text="subQ.content"></LatexText></view>
                        </view>
                        
                        <view v-if="subQ.optionRows && subQ.optionRows.length > 0" class="opt-container mt-2 sub-indent">
                          <view v-for="(row, rIdx) in subQ.optionRows" :key="rIdx" class="opt-row">
                            <view v-for="opt in row" :key="opt.key" class="opt-item" :style="{ marginTop: globalConfig.optionMargin + 'px' }">
                              <text class="opt-key">{{ formatOptionLabel(opt.key) }}</text>
                              <view class="opt-val"><LatexText :text="opt.value"></LatexText></view>
                            </view>
                          </view>
                        </view>

                        <view class="sub-q-tags" v-if="subQ.tags && subQ.tags.length">
                            <text 
                                v-for="tag in subQ.tags" 
                                :key="tag" 
                                class="mini-tag" 
                                @click.stop="handlePreviewTagClick(tag)"
                            >{{ tag }}</text>
                        </view>
                    </view>
                </view>

                <view v-else-if="item.optionRows && item.optionRows.length > 0" class="opt-container">
                  <view v-for="(row, rIdx) in item.optionRows" :key="rIdx" class="opt-row">
                    <view v-for="opt in row" :key="opt.key" class="opt-item" :style="{ marginTop: globalConfig.optionMargin + 'px' }">
                      <text class="opt-key">{{ formatOptionLabel(opt.key) }}</text>
                      <view class="opt-val"><LatexText :text="opt.value"></LatexText></view>
                    </view>
                  </view>
                </view>
                
                <view class="answer-box mt-2" v-if="item.showAnswer">
                  <view class="ans-block" v-if="item.answer">
                    <view class="ans-tag answer">答案</view>
                    <view class="ans-content" :style="dynamicFontStyle"><LatexText :text="item.answer"></LatexText></view>
                  </view>
                  <view class="ans-block" v-if="item.analysis">
                    <view class="ans-tag analysis">分析</view>
                    <view class="ans-content" :style="dynamicFontStyle"><LatexText :text="item.analysis"></LatexText></view>
                  </view>
                  <view class="ans-block" v-if="item.detailed">
                    <view class="ans-tag detailed">详解</view>
                    <view class="ans-content" :style="dynamicFontStyle"><LatexText :text="item.detailed"></LatexText></view>
                  </view>
                </view>

              </view>
            </view>
            <view class="q-footer">
              <view class="tags-row">
                <view v-for="tag in getKnowledgeTags(item.categoryIds)" :key="tag.id" class="tag-badge red">
                  <image src="/static/icons/标签-红.svg" class="tag-icon" mode="aspectFit"></image>
                  <text>{{ tag.title }}</text>
                </view>
                
                <view v-for="tag in item.tags" :key="tag" class="tag-badge blue">
                  <image src="/static/icons/标签-蓝.svg" class="tag-icon" mode="aspectFit"></image>
                  <text>{{ tag }}</text>
                </view>
              </view>
              <view class="toggle-ans-btn" @click.stop="item.showAnswer = !item.showAnswer">
                <image 
                  class="toggle-icon" 
                  :src="item.showAnswer ? '/static/icons/预览-关闭.svg' : '/static/icons/预览-打开.svg'"
                  mode="aspectFit"
                ></image>
                <text>{{ item.showAnswer ? '隐藏答案' : '显示答案' }}</text>
              </view>
            </view>
          </view>
          <view style="height: 100px;"></view>
        </scroll-view>
      </view>

      <view class="col-image" @click="setActiveArea('right')" @drop.prevent="handleDrop" @dragover.prevent>
        <view class="uploaded-list">
          <view class="img-item" v-for="(url, id) in tempUploadedImages" :key="id">
            <view class="img-preview-box"><image :src="url" mode="aspectFit" class="thumb" /></view>
            
            <view class="img-id-row">
                <text class="img-id" title="点击复制">ID: {{ id }}</text>
                <text class="copy-btn" @click.stop="insertImgPlaceholder(id)">插入</text>
            </view>
            
            <view class="img-ctrl-row">
                <text class="ctrl-lbl">排版</text>
                <view class="align-group">
                    <view class="align-btn" @click="updateImgAlign(id, 'l')" title="文字图片混排">行内</view>
                    <view class="align-btn" @click="updateImgAlign(id, 'm')" title="独占一行居中">居中</view>
                    <view class="align-btn" @click="updateImgAlign(id, 'r')" title="文字环绕图片">环绕</view>
                </view>
            </view>
            
            <view class="img-ctrl-row size-row">
                <text class="ctrl-lbl">大小</text>
                <view class="slider-box">
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      step="5"
                      :value="imageSizes[id] || 100" 
                      class="size-slider"
                      @input="(e) => handleSizeChange(id, e)"
                    />
                    <text class="size-val">{{ imageSizes[id] || 100 }}%</text>
                </view>
            </view>

          </view>
        </view>
        <view class="upload-area" @click.stop="handleUploadClick" tabindex="0">
          <image 
            class="upload-icon" 
            src="/static/icons/相机.svg" 
            mode="aspectFit"
          ></image>
          <text class="upload-text">点击 / 粘贴 / 拖拽上传</text>
        </view>
      </view>
    </view>
  </CommonModal>

  <view v-if="showOCRModal" class="ocr-floating-window" :style="{ left: ocrWindow.x + 'px', top: ocrWindow.y + 'px', width: ocrWindow.width + 'px', height: ocrWindow.height + 'px' }">
    <view class="ocr-header" @mousedown="startDrag" @touchstart="startDrag">
        <text class="ocr-title">📄 AI智能识别题目 (PDF/图片)</text>
        <view class="ocr-controls" @mousedown.stop @touchstart.stop>
            <view class="model-select">
                <text>模型:</text>
                <select v-model="selectedModel" class="model-dropdown">
                    <option v-for="m in modelOptions" :key="m.value" :value="m.value">
                        {{ m.label }}
                    </option>
                </select>
            </view>
            <view class="win-close-btn" @click="closeOCRModal">✕</view>
        </view>
    </view>

    <view class="ocr-content" @dragover.prevent @drop.prevent="handleOCRDrop">
        
        <view v-if="!ocrResult && !ocrLoading" class="upload-zone" @click="chooseOCRFile">
            <image src="/static/icons/相机.svg" style="width:48px; height:48px; opacity:0.5; margin-bottom:10px;"></image>
            <text style="font-size:16px; font-weight:bold; color:#475569;">点击 / 粘贴 / 拖拽 上传</text>
            <text style="font-size:12px; color:#94a3b8; margin-top:5px;">支持 PDF, JPG, PNG (粘贴请先点击此处)</text>
        </view>

        <view v-if="ocrLoading" class="loading-zone">
            <view class="spinner"></view>
            <text style="margin-top:15px; color:#2563eb;">正在云端识别中，请稍候...</text>
            <text style="font-size:12px; color:#64748b; margin-top:5px;">(PDF文件可能需要 30秒+)</text>
        </view>

        <view v-if="ocrResult" class="result-zone">
            <view class="result-tip">
                ✅ 识别成功！
                <view style="display:flex; gap:15px; align-items:center;">
                    <text class="copy-link" @click="copyOCRResult">复制</text>
                    <text class="copy-link" style="color: #2563eb; font-weight: 800;" @click="insertOCRResult">
                        📝 插入到题目编辑器
                    </text>
                </view>
                </view>
            <textarea class="result-editor" v-model="ocrResult" maxlength="-1"></textarea>
        </view>

    </view>
    <view class="resize-handle" @mousedown="startResize" @touchstart="startResize">↘</view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import CommonModal from '@/components/CommonModal.vue';
import LatexText from '@/components/LatexText.vue';
import { saveQuestion, updateQuestion } from '@/api/question.js';
import { baseUrl } from '@/utils/request.js';
import { globalConfig, formatOptionLabel, formatSubIndex } from '@/utils/configStore.js';

const props = defineProps({
  visible: Boolean,
  subjectId: String,
  knowledgeList: { type: Array, default: () => [] },
  isPublic: Boolean
});

const emit = defineEmits(['update:visible', 'saved']);

// 状态定义
const editorRef = ref(null);
const isEditing = ref(false);
const editingId = ref(null);
const inputRawText = ref('');
const tempUploadedImages = ref({});
const imageSizes = reactive({}); 

const kpSearchResults = ref([]);
const showKpDropdown = ref(false);
const activeKpIndex = ref(0); 

const previewList = ref([]);
const activeArea = ref('left');
const currentPreviewIdx = ref(-1);
let cursorPosition = 0; 
const editorFocus = ref(false);

const currentMode = ref(-1); 
const fullTextCache = ref(''); 
const cachedPreviewList = ref([]); 
const parseVersion = ref(0);

// 高亮状态
const activeFilterTag = ref(''); 
let lastClickTime = 0;
let globalShowAnswer = true;

// OCR 相关状态
const showOCRModal = ref(false);
const ocrLoading = ref(false);
const ocrResult = ref('');

// Floating Window State
const ocrWindow = reactive({ x: 100, y: 100, width: 600, height: 500, isDragging: false, isResizing: false, startX: 0, startY: 0, initialW: 0, initialH: 0 });
const selectedModel = ref('Qwen');
const modelOptions = [
  { label: 'Qwen (通义千问)', value: 'Qwen' },
  { label: 'DeepSeek V3', value: 'DeepSeek' },
  { label: 'Gemini 2.5 Pro', value: 'Gemini' } 
];

const getClientX = (e) => e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
const getClientY = (e) => e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

const startDrag = (e) => {
    let target = e.target;
    while (target && target.classList && !target.classList.contains('ocr-header')) {
        if (target.tagName === 'SELECT' || target.classList.contains('win-close-btn')) return;
        target = target.parentNode;
    }
    
    ocrWindow.isDragging = true;
    const cx = getClientX(e);
    const cy = getClientY(e);
    ocrWindow.startX = cx - ocrWindow.x;
    ocrWindow.startY = cy - ocrWindow.y;
    
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', onDrag, { passive: false });
    window.addEventListener('touchend', stopDrag);
};

const onDrag = (e) => {
    if (!ocrWindow.isDragging) return;
    if (e.type === 'touchmove') e.preventDefault();
    const cx = getClientX(e);
    const cy = getClientY(e);
    ocrWindow.x = cx - ocrWindow.startX;
    ocrWindow.y = cy - ocrWindow.startY;
};

const stopDrag = () => {
    ocrWindow.isDragging = false;
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', stopDrag);
    window.removeEventListener('touchmove', onDrag);
    window.removeEventListener('touchend', stopDrag);
};

const startResize = (e) => {
    ocrWindow.isResizing = true;
    ocrWindow.startX = getClientX(e);
    ocrWindow.startY = getClientY(e);
    ocrWindow.initialW = ocrWindow.width;
    ocrWindow.initialH = ocrWindow.height;
    
    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', stopResize);
    window.addEventListener('touchmove', onResize, { passive: false });
    window.addEventListener('touchend', stopResize);
};

const onResize = (e) => {
    if (!ocrWindow.isResizing) return;
    if (e.type === 'touchmove') e.preventDefault();
    const cx = getClientX(e);
    const cy = getClientY(e);
    ocrWindow.width = Math.max(400, ocrWindow.initialW + (cx - ocrWindow.startX));
    ocrWindow.height = Math.max(300, ocrWindow.initialH + (cy - ocrWindow.startY));
};

const stopResize = () => {
    ocrWindow.isResizing = false;
    window.removeEventListener('mousemove', onResize);
    window.removeEventListener('mouseup', stopResize);
    window.removeEventListener('touchmove', onResize);
    window.removeEventListener('touchend', stopResize);
};

const PROVINCE_LIST = [
    "全国", "北京", "天津", "上海", "重庆", "河北", "山西", "内蒙古", 
    "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建", 
    "江西", "山东", "河南", "湖北", "湖南", "广东", "广西", 
    "海南", "四川", "贵州", "云南", "西藏", "陕西", "甘肃", 
    "青海", "宁夏", "新疆"
];

const defaultTemplate = `##年份 2023年
##地区 
##来源 新高考II卷
##题号 1
##难度 3
##题型 单选题
##知识点 
##标签 
##题干 
题目内容...
##选项 4
A. 选项A
B. 选项B
C. 选项C
D. 选项D
##答案 
##分析 
##详解 
`;

const open = (questionDataOrArray = null) => {
  emit('update:visible', true);
  if (Array.isArray(questionDataOrArray)) {
      initBatchEdit(questionDataOrArray);
  } else if (questionDataOrArray) {
      initEdit(questionDataOrArray);
  } else {
      initAdd();
  }
};

const close = () => { emit('update:visible', false); };

const initAdd = () => {
  isEditing.value = false;
  editingId.value = null;
  inputRawText.value = defaultTemplate;
  tempUploadedImages.value = {};
  for(const k in imageSizes) delete imageSizes[k];
  currentMode.value = -1;
  fullTextCache.value = '';
  cachedPreviewList.value = [];
  nextTick(() => { parseTemplate(); });
};

// [修改] 辅助函数：生成单题文本，带 ##ID (批量编辑需要ID来区分是新增还是修改)
const generateQuestionTemplate = (q) => {
  const restoreTags = (str) => {
      if (!str) return '';
      let s = str;
      s = s.replace(/<div style="text-indent: 2em;">(.*?)<\/div>/g, '[缩进]$1');
      s = s.replace(/<div style="text-align: center; font-weight: bold;">(.*?)<\/div>/g, '[居中]$1');
      return s;
  };

  let regionStr = q.province || ''; 
  // 注意：##ID 是系统内部用于识别更新的标签，请勿删除
  
  // 【修改点】：在下方模板字符串的第一行添加 ##ID ${q.id || ''}
  let text = `##ID ${q.id || ''}
##年份 ${q.year || ''}
##地区 ${regionStr}
##来源 ${q.source || ''}
##题号 ${q.qNumber || ''}
##难度 ${q.difficulty || ''}
##题型 ${q.type || '单选题'}
##知识点 ${q.categoryIds.map(id => props.knowledgeList.find(l=>l.id==id)?.title).filter(x=>x).join('/')}
##标签 ${(q.tags||[]).join('/')}
##题干 
${restoreTags(q.title || '')}
`;
  
  if (q.subQuestions && q.subQuestions.length > 0) {
      q.subQuestions.forEach((sq, idx) => {
          text += `##小题\n${restoreTags(sq.content || '')}\n`;
          if (sq.options && Object.keys(sq.options).length > 0) {
              text += `##选项 ${sq.optionLayout || 4}\n`;
              Object.keys(sq.options).sort().forEach(k => {
                  text += `${k}.${sq.options[k]}\n`;
              });
          }
          if (sq.tags && sq.tags.length) text += `##小题标签 ${sq.tags.join('/')}\n`;
      });
      text += `##答案 \n${restoreTags(q.answer || '')}\n##分析 \n${restoreTags(q.analysis || '')}\n##详解 \n${restoreTags(q.detailed || '')}\n`;
  } else if (q.type && q.type.includes('选')) {
      const hasOpts = q.options && Object.keys(q.options).length > 0;
      if (hasOpts) {
          text += `##选项 ${q.optionLayout || 4}\n`; 
          Object.keys(q.options).sort().forEach(k => { text += `${k}.${q.options[k]}\n`; });
      }
      text += `##答案 \n${restoreTags(q.answer || '')}\n##分析 \n${restoreTags(q.analysis || '')}\n##详解 \n${restoreTags(q.detailed || '')}\n`;
  } else {
      text += `##答案 \n${restoreTags(q.answer || '')}\n##分析 \n${restoreTags(q.analysis || '')}\n##详解 \n${restoreTags(q.detailed || '')}\n`;
  }
  return text;
};

// 单题编辑
const initEdit = (q) => {
  isEditing.value = true;
  editingId.value = q.id;
  currentMode.value = -1;
  cachedPreviewList.value = [];
  tempUploadedImages.value = {};
  for(const k in imageSizes) delete imageSizes[k];

  let processedText = processImagesInText(generateQuestionTemplate(q));
  inputRawText.value = processedText;
  nextTick(() => { parseTemplate(); });
};

// [核心修复] 批量编辑初始化
const initBatchEdit = (questions) => {
    isEditing.value = true;
    editingId.value = null; 
    currentMode.value = -1;
    cachedPreviewList.value = [];
    tempUploadedImages.value = {};
    for(const k in imageSizes) delete imageSizes[k];

    const textParts = questions.map(q => processImagesInText(generateQuestionTemplate(q)));
    inputRawText.value = textParts.join('\n\n===\n\n');
    
    // 使用 nextTick 确保数据赋值完成后再执行解析，解决无法预览的问题
    nextTick(() => {
        parseTemplate();
    });
};

const processImagesInText = (text) => {
  const tagRegex = /\[img:([^\]]+)\]/g; 
  let imgCounter = 1; 
  
  return text.replace(tagRegex, (match, innerContent) => {
      const parts = innerContent.split(':');
      let width = null;
      let align = null;
      
      if (parts.length > 1 && /^\d+$/.test(parts[parts.length-1])) width = parts.pop();
      if (parts.length > 1 && /^[lmr]$/.test(parts[parts.length-1])) align = parts.pop();
      
      const url = parts.join(':');

      if (url.startsWith('http') || url.startsWith('blob')) {
          const tempId = `IMG_${Date.now()}_${imgCounter++}`; 
          tempUploadedImages.value[tempId] = url;
          imageSizes[tempId] = width ? parseInt(width) : 100;
          let newTag = `[img:${tempId}`;
          if (align) newTag += `:${align}`;
          else if (width) newTag += `:l`; 
          if (width) newTag += `:${width}`;
          newTag += ']';
          return newTag;
      }
      return match;
  });
};

const handleGlobalClick = () => { if (activeArea.value !== 'left') showKpDropdown.value = false; };
const setActiveArea = (area) => { activeArea.value = area; };

const switchMode = (modeIndex) => {
    if (currentMode.value === modeIndex) return;
    saveCurrentToCache();
    currentMode.value = modeIndex;
    loadFromCache(modeIndex);
    manualParse();
};

const saveCurrentToCache = () => {
    const currentText = inputRawText.value;
    if (currentMode.value === -1) { fullTextCache.value = currentText; return; }
    const regex = /^\s*={3,}\s*$/gm;
    const rawChunks = fullTextCache.value.split(regex);
    let validChunkIdx = 0;
    const reconstructed = [];
    
    for (const chunk of rawChunks) {
        if (!chunk.trim() || !/^\s*##/m.test(chunk)) { reconstructed.push(chunk); continue; }
        if (validChunkIdx === currentMode.value) reconstructed.push('\n' + currentText.trim() + '\n');
        else reconstructed.push(chunk);
        validChunkIdx++;
    }
    fullTextCache.value = reconstructed.join('===');
};

const loadFromCache = (modeIndex) => {
    if (modeIndex === -1) { inputRawText.value = fullTextCache.value; return; }
    const regex = /^\s*={3,}\s*$/gm;
    const rawChunks = fullTextCache.value.split(regex);
    let validChunkIdx = 0;
    for (const chunk of rawChunks) {
        if (!chunk.trim() || !/^\s*##/m.test(chunk)) continue;
        if (validChunkIdx === modeIndex) { inputRawText.value = chunk.trim(); return; }
        validChunkIdx++;
    }
    inputRawText.value = '';
};

const insertImgPlaceholder = (id) => {
    const size = imageSizes[id] || 100;
    const placeholder = `[img:${id}:l:${size}]`;
    const textarea = document.querySelector('.raw-editor textarea') || document.querySelector('.raw-editor');
    
    if (textarea && textarea.setRangeText) {
        const start = textarea.selectionStart || inputRawText.value.length;
        const end = textarea.selectionEnd || start;
        const text = inputRawText.value;
        inputRawText.value = text.substring(0, start) + placeholder + text.substring(end);
        nextTick(() => { textarea.focus(); textarea.setSelectionRange(start + placeholder.length, start + placeholder.length); });
    } else { inputRawText.value += '\n' + placeholder; }
    manualParse();
};

const updateImgAlign = (id, align) => { updateTag(id, align, null); };
const handleSizeChange = (id, e) => {
    const val = parseInt(e.detail.value || e.target.value);
    imageSizes[id] = val;
    updateTag(id, null, val);
};
const updateTag = (id, newAlign, newWidth) => {
    let text = inputRawText.value;
    inputRawText.value = text.replace(/\[img:([^\]]+)\]/g, (match, innerContent) => {
        const parts = innerContent.split(':');
        let pWidth = null; let pAlign = null;
        const tempParts = [...parts];
        if (tempParts.length > 1 && /^\d+$/.test(tempParts[tempParts.length-1])) pWidth = tempParts.pop();
        if (tempParts.length > 1 && /^[lmr]$/.test(tempParts[tempParts.length-1])) pAlign = tempParts.pop();
        const currentId = tempParts.join(':');
        if (currentId === id) {
            const finalAlign = newAlign !== null ? newAlign : (pAlign || 'l'); 
            const finalWidth = newWidth !== null ? newWidth : (pWidth || (imageSizes[id] || 100));
            imageSizes[id] = parseInt(finalWidth);
            return `[img:${id}:${finalAlign}:${finalWidth}]`;
        }
        return match;
    });
    manualParse(); 
};

const manualParse = () => { parseTemplate(); };

const highlightError = (start, end, msg) => {
    if (currentMode.value !== -1) { switchMode(-1); }
    setTimeout(() => {
        let ta = document.querySelector('.raw-editor textarea') || document.querySelector('.raw-editor');
        if(ta) { 
            ta.focus(); ta.setSelectionRange(start, end); 
            const textBefore = ta.value.substring(0, start);
            const lineCount = textBefore.split('\n').length;
            ta.scrollTop = Math.max(0, (lineCount * 22) - 100); 
        }
        uni.showToast({title: msg, icon:'none', duration: 3000});
    }, 100);
};

const validateTemplate = () => {
    const text = inputRawText.value;
    const lines = text.split('\n');
    let charCount = 0;
    let currentType = ''; 
    for(let i=0; i<lines.length; i++) {
        const line = lines[i];
        const lineTrim = line.trim();
        const lineStart = charCount;
        const lineEnd = charCount + line.length;
        if (lineTrim.startsWith('===')) currentType = ''; 
        else if (lineTrim.startsWith('##难度')) {
            const parts = line.split(/\s+/);
            const val = parts.length>=2 ? parts[1] : (lineTrim.length>4?lineTrim.substring(4):'');
            if(!/^[1-5]$/.test(val)) { highlightError(lineStart, lineEnd, '难度只能是1-5的整数'); return false; }
        } 
        else if (lineTrim.startsWith('##选项')) {
            const parts = line.split(/\s+/);
            if (parts.length < 2 || !/^\d+$/.test(parts[1])) { highlightError(lineStart, lineEnd, '选项布局数字必须同行'); return false; }
        }
        else if (lineTrim.startsWith('##题型')) {
            const parts = line.split(/\s+/);
            if (parts.length >= 2) currentType = parts[1];
        }
        charCount += line.length + 1;
    }
    return true;
};

const parseTemplate = () => {
  previewList.value = [];
  if (!validateTemplate()) return;
  const text = inputRawText.value;
  if (currentMode.value === -1) fullTextCache.value = text;

  const regex = /^\s*={3,}\s*$/gm;
  let lastIndex = 0;
  let match;
  const chunks = [];
  while ((match = regex.exec(text)) !== null) {
      chunks.push({ content: text.substring(lastIndex, match.index), start: lastIndex, end: match.index });
      lastIndex = regex.lastIndex;
  }
  chunks.push({ content: text.substring(lastIndex), start: lastIndex, end: text.length });

  const newList = [];
  let garbageFound = null; 
  let firstRegionErr = null;

  chunks.forEach(chunk => {
      if(!chunk.content.trim()) return;
      if(/^\s*##/m.test(chunk.content)) {
          const q = parseSingleChunk(chunk.content, chunk.start);
          // 只要有内容，即使没有标题也尝试解析，避免逻辑阻断
          if (q.title || q.type || q.id) {
              if (isEditing.value && !q.id && newList.length === 0 && editingId.value) q.id = editingId.value;
              newList.push(q);
              if (q._regionErr && !firstRegionErr) firstRegionErr = q._regionErr;
          }
      } else {
          if (!garbageFound) garbageFound = chunk;
      }
  });
  
  parseVersion.value++; 
  previewList.value = newList;
  if (currentMode.value === -1) cachedPreviewList.value = newList;

  if (garbageFound) highlightError(garbageFound.start, garbageFound.end, '发现无效内容(非题目)，已定位');
  else if (firstRegionErr) highlightError(firstRegionErr.start, firstRegionErr.end, firstRegionErr.msg);
};

const replaceImages = (text) => {
    if (!text) return '';
    return text.replace(/\[img:([^\]]+)\]/g, (match, innerContent) => {
        const parts = innerContent.split(':');
        let width = null; let align = null;
        if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) width = parts.pop();
        if (parts.length > 1 && /^[lmr]$/.test(parts[parts.length - 1])) align = parts.pop();
        const id = parts.join(':');
        const url = tempUploadedImages.value[id];
        if (url) {
            let newTag = `[img:${url}`;
            if (align) newTag += `:${align}`; else if (width) newTag += `:l`; 
            if (width) newTag += `:${width}`;
            newTag += `]`;
            return newTag;
        }
        return match; 
    });
};

const safeProcessOptions = (rawLines, layout = 4) => {
    if (!rawLines || rawLines.length === 0) return { options: {}, rows: [] };
    
    let optFullText = rawLines.join('\n');
    const rawOptions = [];
    
    const parts = optFullText.split(/([A-Z][.、])/);
    const optionsMap = {};

    for(let i = 0; i < parts.length; i++) {
        if (parts[i].match(/^[A-Z][.、]$/)) {
            const k = parts[i].replace(/[.、]/, '').trim();
            if(i + 1 < parts.length) {
                let v = parts[i+1].trim();
                v = replaceImages(v);
                rawOptions.push({ key: k, value: v });
                optionsMap[k] = v;
            }
        }
    }

    return {
        options: optionsMap,
        rows: distributeOptions(rawOptions, layout)
    };
};

const convertHtmlTableToMarkdown = (text) => {
    if (!text) return '';
    return text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, tableContent) => {
        try {
            const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
            if (!rows || rows.length === 0) return match;

            const grid = rows.map(tr => {
                const cells = tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
                return cells.map(cell => cell.replace(/<[^>]+>/g, '').trim().replace(/\n/g, ' '));
            });

            if (grid.length === 0) return match;

            let md = '\n';
            const colCount = grid[0].length;
            md += '| ' + grid[0].join(' | ') + ' |\n';
            md += '| ' + Array(colCount).fill('---').join(' | ') + ' |\n';
            for (let i = 1; i < grid.length; i++) {
                const row = grid[i];
                while (row.length < colCount) row.push(''); 
                md += '| ' + row.join(' | ') + ' |\n';
            }
            return md + '\n';
        } catch (e) {
            console.error('Table convert error:', e);
            return match; 
        }
    });
};

const parseSingleChunk = (chunkText, chunkStartOffset = 0) => {
    const lines = chunkText.split('\n');
    const result = {};
    let currentModule = '';
    const multiLineModules = ['题干', '分析', '答案', '选项', '详解', '小题', '小题标签'];
    
    const qData = {
        id: '', year: '2023', source: '新高考', difficulty: 3, type: '单选题', qNumber: '1',
        title: '', answer: '', analysis: '', detailed: '',
        optionLayout: 4, options: {}, optionRows: [],
        categoryIds: [], tags: [], showAnswer: true,
        province: '', region: '', _regionErr: null,
        subQuestions: [],
        isFavorite: false 
    };

    let charCount = 0; 
    let currentSubQ = null; 

    const pushCurrentSubQ = () => {
        if (currentSubQ) {
            currentSubQ.content = replaceImages(currentSubQ.content);
            const optResult = safeProcessOptions(currentSubQ.rawOptionLines, currentSubQ.optionLayout);
            currentSubQ.options = optResult.options;
            currentSubQ.optionRows = optResult.rows;
            delete currentSubQ.rawOptionLines;
            qData.subQuestions.push(currentSubQ);
        }
    };

    lines.forEach(line => {
        const lineLen = line.length + 1;
        const trimmed = line.trim();
        const headerMatch = trimmed.match(/^##\s*([^\s]+)(?:\s+(.*))?$/);

        if (headerMatch) {
            const moduleName = headerMatch[1];
            const content = headerMatch[2] || '';
            
            // [重要] ID 处理：确保 ID 被正确解析，否则无法更新
            if (moduleName === 'ID') {
                qData.id = content.trim();
                currentModule = null; 
                charCount += lineLen;
                return;
            }

            if (moduleName === '小题') {
                pushCurrentSubQ();
                currentSubQ = { 
                    content: content ? content + '\n' : '', 
                    tags: [], answer: '', analysis: '', detailed: '',
                    rawOptionLines: [], 
                    optionLayout: 4
                };
                currentModule = '小题内容';
                charCount += lineLen;
                return;
            }
            if (currentSubQ && moduleName === '选项') {
                if (content && /^\d+$/.test(content)) currentSubQ.optionLayout = parseInt(content);
                currentModule = '小题_选项';
                charCount += lineLen;
                return;
            }
            if (moduleName === '小题标签') {
                if (currentSubQ) currentSubQ.tags = content.split('/').map(t=>t.trim()).filter(x=>x);
                currentModule = null;
                charCount += lineLen;
                return;
            }
            if (moduleName === '地区') {
                if (content) {
                    const absStart = chunkStartOffset + charCount;
                    const absEnd = absStart + line.length;
                    if (/(香港|澳门|台湾)/.test(content)) qData._regionErr = { start: absStart, end: absEnd, msg: '暂不支持该地区录入' };
                    else {
                        const inputs = content.split('/');
                        const validProvincesFound = [];
                        let hasError = false;
                        for (const input of inputs) {
                            const raw = input.trim();
                            if (!raw) continue;
                            const matched = PROVINCE_LIST.find(p => p === raw || raw.startsWith(p));
                            if (matched) validProvincesFound.push(matched);
                            else { hasError = true; qData._regionErr = { start: absStart, end: absEnd, msg: `"${raw}" 不是支持的省份` }; break; }
                        }
                        if (!hasError && validProvincesFound.length > 0) qData.province = validProvincesFound.join('/');
                    }
                }
            } 
            
            currentModule = moduleName;
            
            if (['答案', '分析', '详解'].includes(moduleName)) {
                 pushCurrentSubQ(); 
                 currentSubQ = null; 
                 if (content) {
                     const key = moduleName === '详解' ? 'detailed' : (moduleName === '分析' ? 'analysis' : 'answer');
                     qData[key] = content;
                 }
                 currentModule = moduleName; 
            } else if (currentSubQ) {
            } else {
                 if (!result[currentModule]) result[currentModule] = [];
                 if (content) result[currentModule].push(content);
            }

        } else {
            let processedLine = line;
            if (line.includes('[缩进]')) processedLine = `<div style="text-indent: 2em;">${line.replace('[缩进]', '')}</div>`;
            else if (line.includes('[居中]')) processedLine = `<div style="text-align: center; font-weight: bold;">${line.replace('[居中]', '')}</div>`;

            if (currentSubQ) {
                if (currentModule === '小题内容') currentSubQ.content += processedLine + '\n';
                else if (currentModule === '小题_选项') currentSubQ.rawOptionLines.push(processedLine);
            } else {
                if (['答案', '分析', '详解'].includes(currentModule)) {
                    const key = currentModule === '详解' ? 'detailed' : (currentModule === '分析' ? 'analysis' : 'answer');
                    if (qData[key] && !qData[key].endsWith('\n')) qData[key] += '\n';
                    qData[key] += processedLine + '\n';
                }
                else if (currentModule) {
                   if (trimmed === '//') result[currentModule].push('');
                   else result[currentModule].push(processedLine);
                }
            }
        }
        charCount += lineLen;
    });

    pushCurrentSubQ();

    const getVal = (key) => {
        if (!result[key]) return '';
        const rawStr = result[key].join(multiLineModules.includes(key) ? '\n' : '/');
        return replaceImages(rawStr); 
    };

    qData.year = getVal('年份'); qData.source = getVal('来源'); qData.qNumber = getVal('题号');
    qData.difficulty = parseInt(getVal('难度')) || 3; qData.type = getVal('题型') || '单选题';
    qData.title = getVal('题干'); qData.region = qData.province; 

    qData.answer = replaceImages(qData.answer);
    qData.analysis = replaceImages(qData.analysis);
    qData.detailed = replaceImages(qData.detailed);

    const kpRaw = getVal('知识点');
    // 修复1：原代码使用了未定义的 id 变量导致崩溃。
    // 修复2：逻辑修正为根据“名称”反查“ID”，确保保存时数据正确。
    qData.categoryIds = kpRaw ? kpRaw.split('/').map(n => {
        const title = n.trim();
        const found = props.knowledgeList.find(l => l.title === title);
        return found ? found.id : null;
    }).filter(x => x) : [];

    const tagRaw = getVal('标签');
    // 增强：兼容中文逗号或英文逗号分隔，不仅限于斜杠
    qData.tags = tagRaw ? tagRaw.split(/[\/，,]/).map(t => t.trim()).filter(x => x) : [];
    // 【核心修复区域结束】

    if (qData.subQuestions.length > 0) {
        const allTags = new Set(qData.tags);
        qData.subQuestions.forEach(sq => {
            if (sq.tags) sq.tags.forEach(t => allTags.add(t));
        });
        qData.tags = Array.from(allTags);
    }

    if (!qData.subQuestions.length && qData.type.includes('选')) {
        const optLines = result['选项'] || [];
        let targetCols = 4; let startIdx = 0;
        if (optLines.length > 0 && /^\d+$/.test(optLines[0].trim())) { targetCols = parseInt(optLines[0].trim()); startIdx = 1; }
        
        const rawOptLines = optLines.slice(startIdx);
        const optResult = safeProcessOptions(rawOptLines, targetCols);
        qData.options = optResult.options;
        qData.optionLayout = targetCols;
        qData.optionRows = optResult.rows;
    } else { qData.options = {}; qData.optionRows = []; }
    
    const split = (s) => s ? String(s).split('/').map(i=>i.trim()).filter(x=>x) : [];
    qData.yearList = split(qData.year); qData.curYear = qData.yearList[0] || '';
    qData.sourceList = split(qData.source); qData.curSource = qData.sourceList[0] || '';
    qData.provList = split(qData.province); qData.curProv = qData.provList[0] || '';
    qData.numList = split(qData.qNumber); qData.curNum = qData.numList[0] || '';
    
    qData.showYearDrop = false;
    qData.showSourceDrop = false;
    qData.showProvDrop = false;
    qData.showNumDrop = false;

    return qData;
};

const distributeOptions = (options, colCount) => {
    if (options.length === 0) return [];
    if (colCount <= 0) colCount = 1;
    const resultRows = [];
    for (let i = 0; i < options.length; i += colCount) {
        resultRows.push(options.slice(i, i + colCount));
    }
    return resultRows;
};

const updateCursorPos = (e) => {
    if (document) {
        const el = document.querySelector('.raw-editor textarea') || document.querySelector('.raw-editor');
        if (el && typeof el.selectionStart === 'number') cursorPosition = el.selectionStart;
        else if (e && e.target && typeof e.target.selectionStart === 'number') cursorPosition = e.target.selectionStart;
    }
};
const onEditorBlur = () => { setTimeout(() => { showKpDropdown.value = false; }, 200); editorFocus.value = false; };
const handleEditorInput = (e) => { if(e.target) cursorPosition = e.target.selectionStart; };

const handleEditorKeydown = (e) => {
    if (!showKpDropdown.value || !kpSearchResults.value.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeKpIndex.value = (activeKpIndex.value + 1) % kpSearchResults.value.length; } 
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeKpIndex.value = (activeKpIndex.value - 1 + kpSearchResults.value.length) % kpSearchResults.value.length; } 
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectKp(kpSearchResults.value[activeKpIndex.value]); } 
    else if (e.key === 'Escape') { showKpDropdown.value = false; }
};

const selectKp = (kp) => {
  const lines = inputRawText.value.split('\n');
  inputRawText.value += `##知识点 ${kp.title}\n`;
  showKpDropdown.value = false;
  parseTemplate();
};

const handleEditorClick = () => { updateCursorPos({}); showKpDropdown.value = false; };
const handleUploadClick = (e) => {
    setActiveArea('right');
    if (e && (e.ctrlKey || e.metaKey)) return;
    uni.chooseImage({ count: 1, success: (res) => { uploadFileObj(res.tempFilePaths[0]); } });
};
const uploadFileObj = (filePath) => {
    uni.uploadFile({
        url: baseUrl + '/api/upload', filePath, name: 'file',
        success: (upRes) => {
            const d = JSON.parse(upRes.data);
            if(d.url) {
                const id = 'IMG_' + Math.floor(100 + Math.random() * 900); 
                tempUploadedImages.value[id] = d.url;
                imageSizes[id] = 100; 
                uni.showToast({title: '上传成功 ID:'+id, icon:'none'});
            }
        },
        fail: () => { uni.showToast({title: '上传失败', icon:'none'}); }
    });
};
const handleDrop = (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) uploadFileObj(window.URL.createObjectURL(files[0]));
};
const handlePasteGlobal = (e) => {
    if (!props.visible) return;
    if (activeArea.value === 'right') {
        const items = e.clipboardData && e.clipboardData.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    uploadFileObj(window.URL.createObjectURL(items[i].getAsFile()));
                    e.preventDefault();
                    break;
                }
            }
        }
    }
};
onMounted(() => { window.addEventListener('paste', handlePasteGlobal); });
onUnmounted(() => { window.removeEventListener('paste', handlePasteGlobal); });

const copyId = (id) => { uni.setClipboardData({ data: id, success: () => uni.showToast({title: '已复制', icon: 'none'}) }); };

const handlePreviewBgClick = () => {
    setActiveArea('mid');
    const now = Date.now();
    if (now - lastClickTime < 300) { 
        globalShowAnswer = !globalShowAnswer; 
        previewList.value.forEach(item => { item.showAnswer = globalShowAnswer; }); 
    }
    lastClickTime = now;
};

const handlePreviewTagClick = (tag) => {
    activeFilterTag.value = activeFilterTag.value === tag ? '' : tag;
};
const isSubQActive = (subQ) => {
    if (!activeFilterTag.value) return false;
    return subQ.tags && subQ.tags.includes(activeFilterTag.value);
};

const handleSaveAndExit = async () => {
    const success = await handleSave();
    if (success) close();
};

const handleSave = async () => {
  if (currentMode.value !== -1) switchMode(-1); else parseTemplate();
  if(previewList.value.length === 0) { uni.showToast({title:'没有识别到题目', icon:'none'}); return false; }
  
  const hasRegionError = previewList.value.some(q => q._regionErr);
  if (hasRegionError) {
      const errItem = previewList.value.find(q => q._regionErr);
      highlightError(errItem._regionErr.start, errItem._regionErr.end, errItem._regionErr.msg);
      return false;
  }

  uni.showLoading({ title: '保存中' });
  try {
      for (const item of previewList.value) {
          const payload = { ...item, subjectId: props.subjectId, isPublic: props.isPublic };
          delete payload.optionRows; delete payload.showAnswer; 
          delete payload.imgPosCode; delete payload.imgAlign; delete payload.imgId;
          delete payload._regionErr; delete payload.region; delete payload.isFavorite; 
          
          if (payload.subQuestions) {
              payload.subQuestions.forEach(sq => {
                  delete sq.optionRows; 
                  delete sq.rawOptionLines;
              });
          }

          if(item.id) await updateQuestion(item.id, payload);
          else await saveQuestion(payload);
      }
      uni.hideLoading();
      uni.showToast({title:'全部已保存', icon:'success'});
      emit('saved');
      return true;
  } catch(e) {
      uni.hideLoading();
      console.error(e);
      uni.showToast({title:'保存失败', icon:'none'});
      return false;
  }
};
const getKnowledgeTags = (ids) => ids.map(id => props.knowledgeList.find(l => l.id === id) || {id, title:id}).filter(x=>x);
const selectPreviewItem = (idx) => { currentPreviewIdx.value = idx; };

// === OCR 逻辑部分 (增强版V2) ===
const openOCRModal = () => { 
    showOCRModal.value = true; 
    ocrResult.value = ''; 
    ocrLoading.value = false; 
    window.addEventListener('paste', handleOCRPaste);
};
const closeOCRModal = () => { 
    showOCRModal.value = false; 
    window.removeEventListener('paste', handleOCRPaste);
};

const uploadOCRFile = (fileOrPath) => {
    if (ocrLoading.value) return;
    ocrLoading.value = true;
    ocrResult.value = ''; 

    const formData = new FormData();
    formData.append('model', selectedModel.value);

    if (fileOrPath instanceof File || (fileOrPath.raw && fileOrPath.raw instanceof File)) {
         formData.append('file', fileOrPath instanceof File ? fileOrPath : fileOrPath.raw);
    } else if (fileOrPath.blob && fileOrPath.blob instanceof Blob) {
         formData.append('file', fileOrPath.blob, 'pasted_image.png');
    } else {
        if (typeof fileOrPath === 'string') {
             fetch(fileOrPath).then(r => r.blob()).then(blob => {
                 uploadOCRFile({ blob }); 
             }).catch(e => {
                 ocrLoading.value = false;
                 uni.showToast({ title: '文件读取失败', icon: 'none' });
             });
             return; 
        }
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', baseUrl + '/api/smart-ocr?model=' + selectedModel.value, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + (uni.getStorageSync('token') || ''));

    let lastProcessedIndex = 0;

    xhr.onprogress = () => {
        const responseText = xhr.responseText;
        const newContent = responseText.substring(lastProcessedIndex);
        lastProcessedIndex = responseText.length;

        const lines = newContent.split('\n\n');
        for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
                try {
                    const jsonStr = line.trim().substring(6);
                    if (!jsonStr) continue;
                    const data = JSON.parse(jsonStr);

                    if (data.t === 'txt') {
                        ocrResult.value += data.c;
                    } else if (data.t === 'imgs') {
                        tempUploadedImages.value = { ...tempUploadedImages.value, ...data.d };
                        Object.keys(data.d).forEach(k => imageSizes[k] = 80);
                        uni.showToast({ title: `提取到配图`, icon: 'none' });
                    } else if (data.t === 'err') {
                        console.error('OCR Stream Error:', data.c);
                        uni.showToast({ title: '识别错误: ' + data.c, icon: 'none' });
                    }
                } catch (e) {
                }
            }
        }
    };

    xhr.onload = () => {
        ocrLoading.value = false;
        if (xhr.status !== 200) {
            uni.showToast({ title: '请求失败: ' + xhr.status, icon: 'none' });
        }
    };

    xhr.onerror = () => {
        ocrLoading.value = false;
        uni.showToast({ title: '网络错误', icon: 'none' });
    };

    xhr.send(formData);
};

const insertOCRResult = () => {
    if (!ocrResult.value) return;
    if (inputRawText.value && inputRawText.value.trim()) {
        inputRawText.value += '\n\n===\n\n' + ocrResult.value;
    } else {
        inputRawText.value = ocrResult.value;
    }
    closeOCRModal();
    setTimeout(() => {
        manualParse(); 
        uni.showToast({ title: '已插入并预览', icon: 'success' });
    }, 200);
};

const chooseOCRFile = () => {
    uni.chooseFile({
        count: 1,
        extension: ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.webp'],
        success: (res) => {
            if (res.tempFiles.length > 0) {
                const file = res.tempFiles[0];
                uploadOCRFile(file); 
            }
        },
        fail: (err) => {
            console.error('选择文件失败', err);
        }
    });
};

const handleOCRPaste = (e) => {
    if (!showOCRModal.value) return; 
    const items = e.clipboardData && e.clipboardData.items;
    if (items) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file') {
                const blob = item.getAsFile();
                if (blob) {
                    uploadOCRFile(blob);
                    e.preventDefault(); 
                    return;
                }
            }
        }
    }
};

const handleOCRDrop = (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        uploadOCRFile(files[0]);
    }
};

const copyOCRResult = () => {
    uni.setClipboardData({
        data: ocrResult.value,
        success: () => uni.showToast({ title: '已复制', icon: 'none' })
    });
};

const dynamicFontStyle = computed(() => {
  return {
    fontSize: `${globalConfig.fontSize}px`,
    lineHeight: globalConfig.lineHeight
  };
});

defineExpose({ open });
</script>

<style scoped>
.add-modal-header { background: #f9f9f9; padding: 10px 15px; border-bottom: 1px solid #eee; display: flex; flex-shrink: 0; justify-content: space-between; align-items: center; }
.header-btns { display: flex; gap: 10px; }
.header-info { text-align: left; }
.menu-btn { padding: 2px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; background: #f1f5f9; color: #64748b; font-weight: bold; display: flex; align-items: center; justify-content: center; line-height: 1.5; }
.menu-btn:hover { background: #e2e8f0; }
.menu-btn.primary { background: #2563eb; color: white; border: 1px solid #2563eb; }
.menu-btn.outline { background: transparent; border: 1px solid #2563eb; color: #2563eb; box-sizing: border-box; }
.four-col-layout { display: flex; height: 700px; border-top: 1px solid #eee; overflow: hidden; }
.nav-col { width: 50px; background: #f8fafc; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; padding-top: 10px; flex-shrink: 0; }
.nav-item { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 0; line-height: 1; font-size: 11px; margin: 0 auto 8px auto; cursor: pointer; font-weight: bold; color: #64748b; background: #fff; border: 1px solid #e2e8f0; transition: all 0.2s; box-sizing: border-box; }
.nav-item:hover { transform: scale(1.05); }
.nav-item.all { border: 1px solid #94a3b8; color: #475569; }
.nav-item.active { background: #f97316; color: white; border-color: #f97316; box-shadow: 0 2px 5px rgba(249, 115, 22, 0.3); }
.nav-scroll { flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; overflow-y: auto; }
.nav-scroll::-webkit-scrollbar { display: none; }
.col-editor { width: 25%; border-right: 1px solid #eee; display: flex; flex-direction: column; padding: 10px; position: relative; min-width: 250px; overflow-y: auto; height: 100%; box-sizing: border-box; }
.editor-wrap { flex: 1; position: relative;  border-radius: 4px; overflow: hidden; min-height: 500px; background-color: #f0f0f0;}
.raw-editor { width: 100%; height: 100%; padding: 10px; box-sizing: border-box; font-family: monospace; font-size: 14px; line-height: 1.6; border: none; outline: none; resize: none; }
.col-preview { width: 58%; display: flex; flex-direction: column; background: #f8fafc; min-width: 400px; position: relative; height: 100%; box-sizing: border-box; }
.convert-bar { position: absolute; left: 0; top: 50%; transform: translate(-50%, -50%); z-index: 10; }
.convert-btn { background: transparent; box-shadow: none; border: none; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; margin-left: -15px; background-color: #fff; border: 1px solid #e2e8f0; }
.convert-btn:hover { background: #eff6ff; transform: scale(1.1); border-color: #2563eb; }
.convert-icon { width: 24px; height: 24px; filter: invert(31%) sepia(93%) saturate(1376%) hue-rotate(202deg) brightness(94%) contrast(96%); }
.preview-scroll { flex: 1; padding: 12px 2px 12px 12px; box-sizing: border-box; overflow-y: auto; }
.empty-preview { text-align: center; color: #94a3b8; margin-top: 50px; }
.preview-card { min-height: 100px; background: white; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 2px solid transparent; transition: all 0.2s; width: 92.2%;}
.preview-card.active { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37,99,235,0.1); }
.mb-4 { margin-bottom: 16px; }
.q-header { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 10px; }
.meta-left { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.info-chip { padding: 2px 8px; border-radius: 4px; background: #f1f5f9; color: #64748b; font-size: 11px; display: flex; align-items: center; position: relative; }
.info-chip.type { color: #2563eb; background: #eff6ff; font-weight: bold; }
.info-chip.diff { color: #f59e0b; background: #fffbeb; }
.info-chip.err { color: #ef4444; background: #fef2f2; font-weight: bold; }
.info-chip.prov { background: #f0fdf4; color: #166534; }
.info-chip.year { background: #eef2ff; color: #4338ca; }
.info-chip.num { font-family: monospace; }
.seq-num { font-weight: bold; color: #cbd5e1; }
.q-title { display: block; width: 100%; line-height: 1.6; color: #1e293b; }
.body-row { display: flex; margin-bottom: 10px; }
.material-box { border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; }
.sub-q-item { margin-bottom: 20px; padding: 8px; border-radius: 6px; transition: background 0.3s; }
.sub-q-item.highlight-red { background-color: #fef2f2; }
.sub-q-item.highlight-red .sub-q-content :deep(.latex-text-container) { color: #ef4444 !important; font-weight: bold; }
.sub-indent { margin-left: 22px; }
.sub-q-tags { margin-top: 8px; display: flex; gap: 10px; }
.mini-tag { font-size: 10px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 10px; cursor: pointer; }
.mini-tag:hover { background: #e2e8f0; color: #334155; }
.sub-q-ans-box { margin-top: 8px; padding: 8px; background: #f8fafc; border-radius: 4px; color: #334155; }
.ans-label { font-weight: bold; color: #2563eb; margin-right: 4px; }
.mb-1 { margin-bottom: 4px; }
.mt-2 { margin-top: 8px; }
.col-image { width: 17%; display: flex; flex-direction: column; padding: 10px; background: #fff; min-width: 180px; overflow-y: auto; height: 100%; box-sizing: border-box; }
.uploaded-list { flex: 1; margin-bottom: 15px; }
.img-item { border: 1px solid #eee; padding: 10px; border-radius: 6px; margin-bottom: 15px; background: #fcfcfc; }
.img-preview-box { width: 100%; height: 120px; background: #f1f1f1; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 8px; }
.thumb { width: 100%; height: 100%; }
.img-id-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.img-id { font-size: 13px; font-weight: bold; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px; user-select: all; }
.copy-btn { font-size: 12px; color: #2563eb; cursor: pointer; text-decoration: underline; font-weight: bold;}
.upload-area { border: 2px dashed #cbd5e1; border-radius: 8px; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; background: #f8fafc; flex-shrink: 0; outline: none; }
.upload-area:focus { border-color: #2563eb; background: #eff6ff; }
.upload-icon { width: 32px; height: 32px; margin-bottom: 6px; opacity: 0.6; }
.upload-text { font-size: 11px; color: #64748b; }
.opt-container { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; color: #334155; }
.opt-row { display: flex; gap: 10px; width: 100%; }
.opt-item { flex: 1; display: flex; align-items: baseline; } 
.opt-key { font-weight: bold; margin-right: 8px; flex-shrink: 0; line-height: 1.6; } 
.opt-val { flex: 1; word-break: break-all; }
.opt-item :deep(.latex-text-container) { display: inline-block; width: auto; vertical-align: middle; }
.answer-box { background: #f0f9ff; padding: 12px 15px; border-radius: 6px; border: 1px dashed #bae6fd; color: #0c4a6e; }
.ans-block { margin-bottom: 0.8em; display: flex; align-items: baseline; }
.ans-block:last-child { margin-bottom: 0; }
.ans-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 0.9em; font-weight: bold; margin-right: 8px; flex-shrink: 0; line-height: 1.2 !important; }
.ans-tag.answer { background-color: #2563eb; } 
.ans-tag.analysis { background-color: #f59e0b; } 
.ans-tag.detailed { background-color: #10b981; } 
.ans-content { color: #334155; flex: 1; }
.q-footer { border-top: 1px solid #f1f5f9; margin-top: 20px; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; }
.toggle-ans-btn { font-size: 12px; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 4px; background: #f1f5f9; display: flex; align-items: center; gap: 4px; transition: all 0.2s; }
.toggle-ans-btn:hover { background: #e2e8f0; color: #333; }
.toggle-icon { width: 14px; height: 14px; opacity: 0.7; }
.tags-row { display: flex; gap: 8px; align-items: center; }
.tag-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; cursor: pointer; display: flex;align-items: center;}
.tag-icon { width: 12px; height: 12px; margin-right: 3px; }
.tag-badge text { line-height: 1; position: relative; top: -0.1px; }
.tag-badge.red { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
.tag-badge.blue { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
.img-ctrl-row { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; border-top: 1px dashed #eee; padding-top: 8px; }
.ctrl-lbl { font-size: 11px; color: #94a3b8; width: 30px; }
.align-group { display: flex; gap: 4px; }
.align-btn { width: 40px; height: 24px; background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; color: #64748b; }
.align-btn:hover { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
.slider-box { flex: 1; display: flex; align-items: center; gap: 5px; }
.size-slider { flex: 1; height: 20px; cursor: pointer; }
.size-val { font-size: 11px; color: #2563eb; font-weight: bold; width: 35px; text-align: right; }

/* 收藏按钮样式 */
.fav-btn {
  display: flex; align-items: center; margin-left: 12px; cursor: default; opacity: 0.8;
}
.star-icon { width: 16px; height: 16px; display: block; }

/* 下拉框样式 */
.meta-dropdown-wrap { position: relative; display: inline-block; }
.meta-dropdown-list { position: absolute; top: 100%; left: 0; background: white; border: 1px solid #e2e8f0; z-index: 99; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); min-width: 100%; white-space: nowrap; margin-top: 2px; }
.meta-dropdown-item { padding: 6px 10px; font-size: 11px; color: #64748b; cursor: pointer; transition: background 0.2s; }
.meta-dropdown-item:hover { background: #f1f5f9; color: #2563eb; }
.info-chip.has-more { cursor: pointer; padding-right: 20px; }
.info-chip.has-more::after { content: '▼'; font-size: 8px; position: absolute; right: 6px; opacity: 0.5; top: 50%; transform: translateY(-50%); }

/* OCR Modal Styles */
.ocr-body { padding: 20px; height: 500px; display: flex; flex-direction: column; outline: none; }
.upload-zone {
    flex: 1; border: 2px dashed #cbd5e1; border-radius: 12px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: #f8fafc; cursor: pointer; transition: all 0.2s;
}
.upload-zone:hover { border-color: #7c3aed; background: #f5f3ff; }

.loading-zone { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.spinner {
    width: 40px; height: 40px; border: 4px solid #e2e8f0;
    border-top: 4px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.result-zone { flex: 1; display: flex; flex-direction: column; }
.result-tip { font-size: 13px; color: #166534; background: #dcfce7; padding: 10px; border-radius: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; }
.copy-link { color: #2563eb; font-weight: bold; cursor: pointer; text-decoration: underline; }
.result-editor {
    flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;
    font-family: monospace; font-size: 14px; line-height: 1.6; resize: none; background: #fff;
}

/* Floating Window Styles */
.ocr-floating-window {
    position: fixed;
    z-index: 9999;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    border: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 300px;
    min-height: 300px;
}
.ocr-header {
    height: 40px;
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 10px;
    cursor: move;
    user-select: none;
}
.ocr-title {
    font-weight: bold;
    font-size: 14px;
    color: #334155;
}
.ocr-controls {
    display: flex;
    align-items: center;
    gap: 10px;
}
.model-select {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: #64748b;
}
.model-dropdown {
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 12px;
    background: white;
    outline: none;
}
.win-close-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #94a3b8;
    border-radius: 4px;
}
.win-close-btn:hover {
    background: #e2e8f0;
    color: #ef4444;
}
.ocr-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 10px;
    overflow: hidden;
    background: #fff;
}
.resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 15px;
    height: 15px;
    cursor: nwse-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #cbd5e1;
    user-select: none;
}
</style>