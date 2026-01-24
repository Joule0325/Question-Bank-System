<template>
  <CommonModal :isOpen="visible" maxWidth="1300px" @close="close">
    <template #header>
      <view class="add-modal-header">
        <view class="header-btns">
          <button class="menu-btn primary" @click="handleSave">保存</button>
          <button class="menu-btn" @click="close">关闭</button>
        </view>
        <view class="header-info" v-if="previewList.length > 0">
          <text class="status-text">
            共 {{ currentMode === -1 ? previewList.length : cachedPreviewList.length }} 题
            <text v-if="currentMode !== -1" class="mode-tag"> (当前编辑: No.{{ currentMode + 1 }})</text>
          </text>
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
          <button class="convert-btn" @click.stop="manualParse">转化 &gt;</button>
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
                <text class="info-chip year">{{ item.year }}</text>
                <text class="info-chip src">{{ item.source }}</text>
                <text class="info-chip num">第 {{ item.qNumber }} 题</text>
                <text class="info-chip diff">{{ '★'.repeat(item.difficulty || 0) }}</text>
                <text class="info-chip type">{{ item.type }}</text>
                <text class="info-chip prov" v-if="item.region">{{ item.region }}</text>
                <text class="info-chip prov err" v-else-if="item._regionErr">(地区错误)</text>
                <text class="info-chip prov" v-else style="color:#999">(未设置)</text>
              </view>
              <view class="meta-right"><text class="seq-num">No.{{ currentMode === -1 ? (idx + 1) : (currentMode + 1) }}</text></view>
            </view>

            <view class="q-body" :class="{ 'layout-side-right': item.imgPosCode === 'r' }">
              <view class="content-wrapper">
                <view v-if="item.image && item.imgPosCode.startsWith('u')" class="img-container" :class="'align-'+item.imgAlign">
                   <image :src="item.image" class="q-image" mode="widthFix" />
                </view>
                <view class="body-row"><view class="q-title"><LatexText :text="item.title"></LatexText></view></view>
                <view v-if="item.image && item.imgPosCode.startsWith('m')" class="img-container" :class="'align-'+item.imgAlign">
                   <image :src="item.image" class="q-image" mode="widthFix" />
                </view>
                <view v-if="item.optionRows && item.optionRows.length > 0" class="opt-container">
                  <view v-for="(row, rIdx) in item.optionRows" :key="rIdx" class="opt-row">
                    <view v-for="opt in row" :key="opt.key" class="opt-item">
                      <text class="opt-key">{{ opt.key }}.</text>
                      <view class="opt-val"><LatexText :text="opt.value"></LatexText></view>
                    </view>
                  </view>
                </view>
                <view v-if="item.image && item.imgPosCode.startsWith('b')" class="img-container" :class="'align-'+item.imgAlign">
                   <image :src="item.image" class="q-image" mode="widthFix" />
                </view>
                
                <view class="answer-box mt-2" v-if="item.showAnswer">
                  <view class="ans-block" v-if="item.answer">
                    <view class="ans-tag answer">答案</view>
                    <view class="ans-content"><LatexText :text="item.answer"></LatexText></view>
                  </view>
                  <view class="ans-block" v-if="item.analysis">
                    <view class="ans-tag analysis">分析</view>
                    <view class="ans-content"><LatexText :text="item.analysis"></LatexText></view>
                  </view>
                  <view class="ans-block" v-if="item.detailed">
                    <view class="ans-tag detailed">详解</view>
                    <view class="ans-content"><LatexText :text="item.detailed"></LatexText></view>
                  </view>
                </view>

              </view>
              <view v-if="item.image && item.imgPosCode === 'r'" class="side-img-container">
                 <image :src="item.image" class="q-image" mode="widthFix" />
              </view>
            </view>
            <view class="q-footer">
              <view class="tags-row">
                <view v-for="tag in getKnowledgeTags(item.categoryIds)" :key="tag.id" class="tag-badge red">🏷️ {{ tag.title }}</view>
                <view v-for="tag in item.tags" :key="tag" class="tag-badge blue">🏷️ {{ tag }}</view>
              </view>
              <view class="toggle-ans-btn" @click.stop="item.showAnswer = !item.showAnswer">{{ item.showAnswer ? '🙈 隐藏答案' : '👁️ 显示答案' }}</view>
            </view>
          </view>
          <view style="height: 100px;"></view>
        </scroll-view>
      </view>

      <view class="col-image" @click="setActiveArea('right')" @drop.prevent="handleDrop" @dragover.prevent>
        <view class="uploaded-list">
          <view class="img-item" v-for="(url, id) in tempUploadedImages" :key="id">
            <view class="img-preview-box"><image :src="url" mode="aspectFit" class="thumb" /></view>
            <view class="img-id-row"><text class="img-id">编号: {{ id }}</text><text class="copy-btn" @click.stop="copyId(id)">复制</text></view>
            <view class="img-move-row">
                <view class="move-btn" @click="adjustImgPos(id, 0, -1)" title="上">▲</view>
                <view class="move-btn" @click="adjustImgPos(id, 0, 1)" title="下">▼</view>
                <view class="move-btn" @click="adjustImgPos(id, -1, 0)" title="左">◀</view>
                <view class="move-btn" @click="adjustImgPos(id, 1, 0)" title="右">▶</view>
            </view>
          </view>
        </view>
        <view class="upload-area" @click.stop="handleUploadClick" tabindex="0">
          <text class="upload-icon">📷</text>
          <text class="upload-text">点击 / 粘贴(Ctrl+V) / 拖拽上传</text>
        </view>
      </view>
    </view>
  </CommonModal>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import CommonModal from '@/components/CommonModal.vue';
import LatexText from '@/components/LatexText.vue';
import { saveQuestion, updateQuestion } from '@/api/question.js';
import { baseUrl } from '@/utils/request.js';

const props = defineProps({
  visible: Boolean,
  subjectId: String,
  knowledgeList: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:visible', 'saved']);

const editorRef = ref(null);
const isEditing = ref(false);
const editingId = ref(null);
const inputRawText = ref('');
const tempUploadedImages = ref({});
const imageOffset = reactive({ x: 0, y: 0 });

const kpSearchResults = ref([]);
const showKpDropdown = ref(false);
const kpDropdownTop = ref(0);
const currentEditingLineIdx = ref(-1);
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

let lastClickTime = 0;
let globalShowAnswer = true;

const PROVINCE_LIST = [
    "北京", "天津", "上海", "重庆", "河北", "山西", "内蒙古", 
    "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建", 
    "江西", "山东", "河南", "湖北", "湖南", "广东", "广西", 
    "海南", "四川", "贵州", "云南", "西藏", "陕西", "甘肃", 
    "青海", "宁夏", "新疆"
];

// [修改] 默认模板增加 ##详解
const defaultTemplate = `##年份 2023年
##地区 
##来源 新高考II卷
##题号 1
##难度 3
##题型 单选题
##知识点 
##标签 
##题干 函数$y=\\dfrac{\\sqrt{x-1}}{3}$的定义域为.
##选项 4
A.$(1,+\\infty)$
B.$(-\\infty,1)$
C.$[1,+\\infty)$
D.$(-\\infty,1]$
##配图 
##答案 
##分析 
##详解 
`;

const open = (questionData = null) => {
  emit('update:visible', true);
  if (questionData) initEdit(questionData);
  else initAdd();
};

const close = () => { emit('update:visible', false); };

const initAdd = () => {
  isEditing.value = false;
  editingId.value = null;
  inputRawText.value = defaultTemplate;
  tempUploadedImages.value = {};
  imageOffset.x = 0; imageOffset.y = 0;
  currentMode.value = -1;
  fullTextCache.value = '';
  cachedPreviewList.value = [];
  parseTemplate();
};

const initEdit = (q) => {
  isEditing.value = true;
  editingId.value = q.id;
  currentMode.value = -1;
  cachedPreviewList.value = [];
  
  let regionStr = q.province || ''; 

  let text = `##年份 ${q.year || ''}
##地区 ${regionStr}
##来源 ${q.source || ''}
##题号 ${q.qNumber || ''}
##难度 ${q.difficulty || ''}
##题型 ${q.type || '单选题'}
##知识点 ${q.categoryIds.map(id => props.knowledgeList.find(l=>l.id==id)?.title).filter(x=>x).join('/')}
##标签 ${(q.tags||[]).join('/')}
##题干 
${q.title || ''}
`;
  
  if (q.type && q.type.includes('选')) {
      text += `##选项 ${q.optionLayout || 4}\n`; 
      if(q.options) {
        Object.keys(q.options).sort().forEach(k => { text += `${k}.${q.options[k]}\n`; });
      }
  }
  
  // [修改] 修复图片ID问题：生成随机ID
  let imgIdStr = '';
  if(q.image) {
    const existingId = Math.floor(1000000 + Math.random() * 9000000).toString();
    tempUploadedImages.value[existingId] = q.image;
    imgIdStr = existingId;
    
    if(q.image.includes('?pos=')) {
        const match = q.image.match(/pos=([a-z]+)/);
        if(match) imgIdStr = match[1] + imgIdStr;
    }
  }
  
  // [修改] 回显模板顺序：答案、分析、详解
  text += `##配图 ${imgIdStr}\n##答案 \n${q.answer || ''}\n##分析 \n${q.analysis || ''}\n##详解 \n${q.detailed || ''}\n`;
  inputRawText.value = text;
  parseTemplate();
};

const handleGlobalClick = () => { 
    if (activeArea.value !== 'left') showKpDropdown.value = false;
};
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
    if (currentMode.value === -1) {
        fullTextCache.value = currentText;
        return;
    }
    const regex = /^\s*={3,}\s*$/gm;
    const rawChunks = fullTextCache.value.split(regex);
    let validChunkIdx = 0;
    const reconstructed = [];
    
    for (const chunk of rawChunks) {
        if (!chunk.trim() || !/^\s*##/m.test(chunk)) {
            reconstructed.push(chunk); 
            continue;
        }
        if (validChunkIdx === currentMode.value) {
            reconstructed.push('\n' + currentText.trim() + '\n');
        } else {
            reconstructed.push(chunk);
        }
        validChunkIdx++;
    }
    fullTextCache.value = reconstructed.join('===');
};

const loadFromCache = (modeIndex) => {
    if (modeIndex === -1) {
        inputRawText.value = fullTextCache.value;
        return;
    }
    const regex = /^\s*={3,}\s*$/gm;
    const rawChunks = fullTextCache.value.split(regex);
    let validChunkIdx = 0;
    for (const chunk of rawChunks) {
        if (!chunk.trim() || !/^\s*##/m.test(chunk)) continue;
        if (validChunkIdx === modeIndex) {
            inputRawText.value = chunk.trim();
            return;
        }
        validChunkIdx++;
    }
    inputRawText.value = '';
};

const adjustImgPos = (id, dx, dy) => {
    const text = inputRawText.value;
    const lines = text.split('\n');
    let targetLineIdx = -1;
    let currentCode = 'bm'; 
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('##配图') && lines[i].includes(id)) {
            targetLineIdx = i;
            const content = lines[i].trim().substring(4).trim();
            const match = content.match(/^([a-z]+)?(.+)$/i);
            if (match && match[1]) currentCode = match[1];
            break;
        }
    }
    if (targetLineIdx === -1) return uni.showToast({title: '未在编辑器找到该图片ID', icon: 'none'});
    let isMCQ = false;
    for (let i = targetLineIdx; i >= 0; i--) {
        if (lines[i].trim().startsWith('##题型')) { isMCQ = lines[i].includes('选'); break; }
        if (lines[i].trim() === '===') break;
    }
    let newCode = calculateNewPos(currentCode, dx, dy, isMCQ);
    lines[targetLineIdx] = `##配图 ${newCode}${id}`;
    inputRawText.value = lines.join('\n');
    manualParse();
};

const calculateNewPos = (code, dx, dy, isMCQ) => {
    if (code === 'r') { if (dx === -1) return 'mr'; return 'r'; }
    let v = code.charAt(0); let h = code.charAt(1) || 'm'; 
    const vMap = isMCQ ? ['u', 'm', 'b'] : ['u', 'b'];
    if (dy !== 0) {
        let idx = vMap.indexOf(v);
        if (idx === -1) idx = vMap.length - 1;
        idx += dy;
        if (idx < 0) idx = 0; if (idx >= vMap.length) idx = vMap.length - 1;
        v = vMap[idx];
    }
    const hMap = ['l', 'm', 'r'];
    if (dx !== 0) {
        let idx = hMap.indexOf(h);
        if (idx === -1) idx = 1;
        if (h === 'r' && dx === 1) return 'r'; 
        idx += dx;
        if (idx < 0) idx = 0; if (idx >= hMap.length) idx = hMap.length - 1;
        h = hMap[idx];
    }
    return v + h;
};

const manualParse = () => { parseTemplate(); };

const highlightError = (start, end, msg) => {
    if (currentMode.value !== -1) { switchMode(-1); }
    setTimeout(() => {
        let ta = document.querySelector('.raw-editor textarea') || document.querySelector('.raw-editor');
        if(ta) { 
            ta.focus(); 
            ta.setSelectionRange(start, end); 
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
            if (currentType && !currentType.includes('选')) { 
                highlightError(lineStart, lineEnd, `非选择题不能包含选项`); 
                return false; 
            }
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
          
          if (q.title || q.type) {
              if (isEditing.value && newList.length === 0 && editingId.value) q.id = editingId.value;
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

  if (garbageFound) {
      highlightError(garbageFound.start, garbageFound.end, '发现无效内容(非题目)，已定位');
  } else if (firstRegionErr) {
      highlightError(firstRegionErr.start, firstRegionErr.end, firstRegionErr.msg);
  }
};

const parseSingleChunk = (chunkText, chunkStartOffset = 0) => {
    const lines = chunkText.split('\n');
    const result = {};
    let currentModule = '';
    // [修改] 增加 详解
    const multiLineModules = ['题干', '分析', '答案', '选项', '详解'];
    
    const qData = {
        id: '', year: '2023', source: '新高考', difficulty: 3, type: '单选题', qNumber: '1',
        title: '', image: '', answer: '', analysis: '', detailed: '',
        optionLayout: 4, options: {}, optionRows: [],
        categoryIds: [], tags: [], showAnswer: true,
        imgPosCode: 'bm', imgAlign: 'center', imgId: '',
        province: '', region: '', 
        _regionErr: null
    };

    let charCount = 0; 

    lines.forEach(line => {
        const lineLen = line.length + 1; 
        const trimmed = line.trim();
        const headerMatch = trimmed.match(/^##\s*([^\s]+)(?:\s+(.*))?$/);
        
        if (headerMatch) {
            const moduleName = headerMatch[1];
            const content = headerMatch[2];
            currentModule = moduleName;
            
            if (moduleName === '地区') {
                if (content) {
                    const absStart = chunkStartOffset + charCount;
                    const absEnd = absStart + line.length;
                    
                    if (/(香港|澳门|台湾)/.test(content)) {
                        qData._regionErr = { start: absStart, end: absEnd, msg: '暂不支持该地区录入' };
                    } else {
                        const inputs = content.split('/');
                        const validProvincesFound = [];
                        let hasError = false;
                        for (const input of inputs) {
                            const raw = input.trim();
                            if (!raw) continue;
                            // [修改] 使用 PROVINCE_LIST 进行匹配，支持前缀匹配
                            const matched = PROVINCE_LIST.find(p => p === raw || raw.startsWith(p));
                            if (matched) validProvincesFound.push(matched);
                            else { hasError = true; qData._regionErr = { start: absStart, end: absEnd, msg: `"${raw}" 不是支持的省份` }; break; }
                        }
                        if (!hasError && validProvincesFound.length > 0) qData.province = validProvincesFound.join('/');
                    }
                }
            } else {
                if (!result[currentModule]) result[currentModule] = [];
                if (content) result[currentModule].push(content);
            }
            if (!multiLineModules.includes(moduleName)) currentModule = null; 
        } else {
            if (currentModule) {
                if (trimmed === '//') result[currentModule].push('');
                else if (trimmed) result[currentModule].push(line.trim());
            }
        }
        charCount += lineLen;
    });

    const getVal = (key) => result[key] ? result[key].join(multiLineModules.includes(key) ? '\n' : '/') : '';

    qData.year = getVal('年份'); 
    qData.source = getVal('来源'); qData.qNumber = getVal('题号');
    qData.difficulty = parseInt(getVal('难度')) || 3; qData.type = getVal('题型') || '单选题';
    qData.title = getVal('题干'); 
    qData.region = qData.province; 

    const kpRaw = getVal('知识点');
    qData.categoryIds = kpRaw ? kpRaw.split('/').map(n=>props.knowledgeList.find(l=>l.title===n.trim())?.id).filter(x=>x) : [];
    const tagRaw = getVal('标签');
    qData.tags = tagRaw ? tagRaw.split('/').map(t=>t.trim()).filter(x=>x) : [];

    const imgRaw = getVal('配图');
    if (imgRaw) {
        const match = imgRaw.match(/^([a-z]+)?(.+)$/i);
        if (match) {
            let code = match[1] || 'bm'; 
            const id = match[2];
            qData.imgId = id;
            qData.imgPosCode = code;
            if (code === 'r') { qData.imgAlign = 'side-right'; } 
            else {
                const h = code.charAt(1) || 'm';
                if (h === 'l') qData.imgAlign = 'left';
                else if (h === 'r') qData.imgAlign = 'right';
                else qData.imgAlign = 'center';
            }
            if (tempUploadedImages.value[id]) qData.image = tempUploadedImages.value[id];
            else if (id === 'EXISTING') qData.image = tempUploadedImages.value['EXISTING'];
        }
    }

    if (qData.type.includes('选')) {
        const optLines = result['选项'] || [];
        let targetCols = 4;
        const rawOptions = [];
        if (optLines.length > 0 && /^\d+$/.test(optLines[0])) { targetCols = parseInt(optLines[0]); optLines.shift(); }
        optLines.forEach(line => {
            const parts = line.split(/([A-Z][.、])/).filter(x=>x);
            for(let i=0; i<parts.length; i+=2) {
                if(i+1 < parts.length) {
                    const k = parts[i].replace(/[.、]/, '').trim();
                    const v = parts[i+1].trim();
                    rawOptions.push({ key: k, value: v });
                    qData.options[k] = v;
                }
            }
        });
        qData.optionLayout = targetCols;
        qData.optionRows = distributeOptions(rawOptions, targetCols);
    } else { qData.options = {}; qData.optionRows = []; }

    qData.analysis = getVal('分析');
    qData.answer = getVal('答案');
    qData.detailed = getVal('详解'); // [新增]
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

// ... (Editor Functions 保持不变) ...
const updateCursorPos = (e) => {
    if (document) {
        const el = document.querySelector('.raw-editor textarea') || document.querySelector('.raw-editor');
        if (el && typeof el.selectionStart === 'number') cursorPosition = el.selectionStart;
        else if (e && e.target && typeof e.target.selectionStart === 'number') cursorPosition = e.target.selectionStart;
    }
};
const onEditorBlur = () => { setTimeout(() => { showKpDropdown.value = false; }, 200); editorFocus.value = false; };
const handleEditorInput = (e) => {
    if(e.target) cursorPosition = e.target.selectionStart;
};

const handleEditorKeydown = (e) => {
    if (!showKpDropdown.value || !kpSearchResults.value.length) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeKpIndex.value = (activeKpIndex.value + 1) % kpSearchResults.value.length;
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeKpIndex.value = (activeKpIndex.value - 1 + kpSearchResults.value.length) % kpSearchResults.value.length;
    } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectKp(kpSearchResults.value[activeKpIndex.value]);
    } else if (e.key === 'Escape') {
        showKpDropdown.value = false;
    }
};

const selectKp = (kp) => {
  const lines = inputRawText.value.split('\n');
  const idx = currentEditingLineIdx.value;
  if(idx === -1) return;
  const line = lines[idx];
  const lastSlash = line.lastIndexOf('/');
  const spaceIdx = line.indexOf(' ');
  const prefixLimit = Math.max(lastSlash, spaceIdx);
  let newLine = (prefixLimit === -1) ? ('##知识点 ' + kp.title) : (line.substring(0, prefixLimit + 1) + kp.title);
  lines[idx] = newLine;
  inputRawText.value = lines.join('\n');
  showKpDropdown.value = false;
  parseTemplate();
};

const handleEditorClick = () => { 
    updateCursorPos({});
    showKpDropdown.value = false; 
};

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
                const id = Math.floor(1000000 + Math.random() * 9000000).toString();
                tempUploadedImages.value[id] = d.url;
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

const moveImage = (dx, dy) => { imageOffset.x += dx; imageOffset.y += dy; };
const resetImagePos = () => { imageOffset.x = 0; imageOffset.y = 0; };
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

const handleSave = async () => {
  if (currentMode.value !== -1) switchMode(-1); else parseTemplate();
  if(previewList.value.length === 0) return uni.showToast({title:'没有识别到题目', icon:'none'});
  
  const hasRegionError = previewList.value.some(q => q._regionErr);
  if (hasRegionError) {
      const errItem = previewList.value.find(q => q._regionErr);
      highlightError(errItem._regionErr.start, errItem._regionErr.end, errItem._regionErr.msg);
      return;
  }

  uni.showLoading({ title: '保存中' });
  try {
      for (const item of previewList.value) {
          if (item.image && item.imgPosCode !== 'bm') {
              const sep = item.image.includes('?') ? '&' : '?';
              item.image += `${sep}pos=${item.imgPosCode}`;
          }
          const payload = { ...item, subjectId: props.subjectId };
          delete payload.optionRows; delete payload.showAnswer; delete payload.imgPosCode; delete payload.imgAlign; delete payload.imgId;
          delete payload._regionErr; delete payload.region; 
          
          if(item.id) await updateQuestion(item.id, payload);
          else await saveQuestion(payload);
      }
      uni.hideLoading();
      uni.showToast({title:'全部已保存', icon:'success'});
      emit('saved');
  } catch(e) {
      uni.hideLoading();
      uni.showToast({title:'保存失败', icon:'none'});
  }
};
const getKnowledgeTags = (ids) => ids.map(id => props.knowledgeList.find(l => l.id === id) || {id, title:id}).filter(x=>x);

const selectPreviewItem = (idx) => { currentPreviewIdx.value = idx; };

defineExpose({ open });
</script>

<style scoped>
/* (Header, Nav, Editor 样式保持不变) */
.add-modal-header { background: #f9f9f9; padding: 10px 15px; border-bottom: 1px solid #eee; display: flex; flex-shrink: 0; justify-content: space-between; align-items: center; }
.header-btns { display: flex; gap: 10px; }
.header-info { text-align: right; }
.status-text { font-size: 12px; color: #64748b; font-weight: bold; }
.shortcut-tips { font-size: 11px; color: #999; margin-top: 2px; }
.menu-btn { padding: 6px 20px; border-radius: 20px; font-size: 13px; cursor: pointer; border: 1px solid #ccc; background: white; }
.menu-btn.primary { background: #2563eb; color: white; border-color: #2563eb; }
.four-col-layout { display: flex; height: 700px; border-top: 1px solid #eee; overflow: hidden; }
.nav-col { width: 50px; background: #f8fafc; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; padding-top: 10px; flex-shrink: 0; }
.nav-item { width: 36px; height: 36px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; margin-bottom: 8px; font-weight: bold; color: #64748b; background: #fff; border: 1px solid #e2e8f0; transition: all 0.2s; }
.nav-item:hover { transform: scale(1.05); }
.nav-item.all { border-radius: 50%; border: 2px solid #94a3b8; color: #475569; }
.nav-item.active { background: #2563eb; color: white; border-color: #2563eb; box-shadow: 0 2px 5px rgba(37,99,235,0.3); }
.nav-scroll { flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; overflow-y: auto; }
.nav-scroll::-webkit-scrollbar { display: none; }
.col-editor { width: 25%; border-right: 1px solid #eee; display: flex; flex-direction: column; padding: 10px; position: relative; min-width: 250px; overflow-y: auto; height: 100%; box-sizing: border-box; }
.editor-wrap { flex: 1; position: relative; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; min-height: 500px; }
.raw-editor { width: 100%; height: 100%; padding: 10px; box-sizing: border-box; font-family: monospace; font-size: 14px; line-height: 1.6; border: none; outline: none; resize: none; }
.kp-dropdown { position: absolute; width: 200px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #eee; z-index: 50; max-height: 200px; overflow-y: auto; border-radius: 4px; }
.kp-item { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f9f9f9; cursor: pointer; display: flex; align-items: center; }
.kp-item:hover, .kp-item.active { background: #eff6ff; color: #2563eb; }
.idx-badge { background: #e2e8f0; color: #64748b; font-size: 10px; width: 16px; height: 16px; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-right: 8px; }
.header-tip { color: #999; font-size: 11px; background: #f1f1f1; cursor: default; padding: 5px 12px; }
.col-preview { width: 50%; border-right: 1px solid #eee; display: flex; flex-direction: column; background: #f8fafc; min-width: 400px; position: relative; overflow-y: auto; height: 100%; box-sizing: border-box; }
.convert-bar { position: absolute; left: 0; top: 50%; transform: translate(-50%, -50%); z-index: 10; }
.convert-btn { background: #2563eb; color: white; width: 24px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 0 4px 4px 0; cursor: pointer; writing-mode: vertical-rl; border: none; box-shadow: 2px 0 5px rgba(0,0,0,0.1); }
.preview-scroll { flex: 1; padding: 20px; box-sizing: border-box; }
.empty-preview { text-align: center; color: #94a3b8; margin-top: 50px; }
.preview-card { min-height: 200px; background: white; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 2px solid transparent; transition: all 0.2s; }
.preview-card.active { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37,99,235,0.1); }
.mb-4 { margin-bottom: 16px; }
.q-header { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 10px; }
.meta-left { display: flex; gap: 6px; flex-wrap: wrap; }
/* [优化] 头部信息圆角矩形样式 */
.info-chip { padding: 2px 8px; border-radius: 4px; background: #f1f5f9; color: #64748b; font-size: 11px; display: flex; align-items: center; }
.info-chip.type { color: #2563eb; background: #eff6ff; font-weight: bold; }
.info-chip.diff { color: #f59e0b; background: #fffbeb; }
.info-chip.err { color: #ef4444; background: #fef2f2; font-weight: bold; }
.info-chip.prov { background: #f0fdf4; color: #166534; }
.info-chip.year { background: #eef2ff; color: #4338ca; }
.info-chip.num { font-family: monospace; }
.m-diff { color: #f59e0b; }
.seq-num { font-weight: bold; color: #cbd5e1; }
.q-title { display: block; width: 100%; font-size: 15px; line-height: 1.6; color: #1e293b; }
.body-row { display: flex; margin-bottom: 10px; }
.img-container { margin: 10px 0; display: flex; width: 100%; }
.img-container.align-left { justify-content: flex-start; }
.img-container.align-center { justify-content: center; }
.img-container.align-right { justify-content: flex-end; }
.q-image { max-width: 100%; border: 1px solid #eee; border-radius: 4px; }
.layout-side-right { display: flex; gap: 15px; align-items: flex-start; }
.layout-side-right .content-wrapper { flex: 1; }
.layout-side-right .side-img-container { width: 30%; max-width: 200px; flex-shrink: 0; }
.col-image { width: 25%; display: flex; flex-direction: column; padding: 10px; background: #fff; min-width: 250px; overflow-y: auto; height: 100%; box-sizing: border-box; }
.uploaded-list { flex: 1; margin-bottom: 15px; }
.img-item { border: 1px solid #eee; padding: 10px; border-radius: 6px; margin-bottom: 15px; background: #fcfcfc; }
.img-preview-box { width: 100%; height: 120px; background: #f1f1f1; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 8px; }
.thumb { width: 100%; height: 100%; }
.img-id-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.img-id { font-size: 13px; font-weight: bold; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px; user-select: all; }
.copy-btn { font-size: 12px; color: #64748b; cursor: pointer; text-decoration: underline; }
.img-move-row { display: flex; gap: 6px; align-items: center; justify-content: center; }
.move-btn { width: 24px; height: 24px; background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05); user-select: none;}
.move-btn:active { background: #f1f5f9; transform: translateY(1px); }
.reset-link { font-size: 12px; color: #ef4444; margin-left: 5px; cursor: pointer; }
.upload-area { border: 2px dashed #cbd5e1; border-radius: 8px; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; background: #f8fafc; flex-shrink: 0; outline: none; }
.upload-area:focus { border-color: #2563eb; background: #eff6ff; }
.upload-icon { font-size: 28px; margin-bottom: 6px; }
.upload-text { font-size: 11px; color: #64748b; }
.opt-container { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; color: #334155; }
.opt-row { display: flex; gap: 10px; width: 100%; }
.opt-item { flex: 1; display: flex; align-items: flex-start; font-size: 14px; }
.opt-key { font-weight: bold; margin-right: 5px; flex-shrink: 0; margin-top: 0; line-height: 1.6; }
.opt-val { flex: 1; word-break: break-all; }
.opt-item :deep(.latex-text-container) { display: inline-block; width: auto; }
/* [修改] 答案/分析样式优化 */
.answer-box { background: #f0f9ff; padding: 12px 15px; border-radius: 6px; border: 1px dashed #bae6fd; font-size: 14px; color: #0c4a6e; }
.ans-block { margin-bottom: 12px; }
.ans-block:last-child { margin-bottom: 0; }
.ans-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold; margin-bottom: 4px; }
.ans-tag.answer { background-color: #2563eb; }   /* 蓝色 */
.ans-tag.analysis { background-color: #f59e0b; } /* 橙色 */
.ans-tag.detailed { background-color: #10b981; } /* 绿色 */
.ans-content { font-size: 14px; line-height: 1.6; color: #334155; }
.q-footer { border-top: 1px solid #f1f5f9; margin-top: 10px; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.toggle-ans-btn { font-size: 12px; color: #64748b; cursor: pointer; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; }
.toggle-ans-btn:hover { background: #e2e8f0; color: #333; }
.tags-row { display: flex; gap: 8px; align-items: center; }
.tag-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; cursor: pointer; }
.tag-badge.red { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
.tag-badge.blue { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
</style>