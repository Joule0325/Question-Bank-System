<template>
  <view class="module-layout">
    <view class="module-sidebar">
      <view class="module-sidebar-header">
        <view class="blue-title-box">我的收藏</view>
        <view class="add-svg-btn" @click="createNewFolder" title="新建收藏夹">
          <image src="/static/icons/添加.svg" class="add-svg-icon" mode="aspectFit"></image>
        </view>
      </view>
      <scroll-view scroll-y class="tree-container">
        <block v-for="folder in favFolders" :key="folder.id">
          <view class="node-wrapper" style="margin-left: 0px;">
            <view class="node-content" :class="{ 'selected': currentFolderId === folder.id }" @click="selectFolder(folder.id)">
              <view class="toggle-icon"><text class="icon-txt disabled">●</text></view>
              <text class="node-title">{{ folder.name }}</text>
            </view>
          </view>
        </block>
      </scroll-view>
    </view>
    
    <view class="module-workspace">
      <view class="workspace-inner">
        <view class="module-top-bar">
          <view class="ft-info">
            <text class="ft-title">{{ currentFolderName }}</text>
            <text class="ft-desc">共 {{ favQuestions.length }} 题</text>
          </view>
        </view>
        
        <scroll-view scroll-y class="module-scroll-view">
          <view class="module-cards-container">
            <view v-if="favQuestions.length === 0" class="empty-tip">暂无收藏题目</view>
            <view v-for="q in favQuestions" :key="q.id" class="q-card">
              <view class="q-header">
                <view class="meta-left">
                  <text class="info-chip year" v-if="q.year">{{ q.year }}</text>
                  <text class="info-chip source" v-if="q.source">{{ q.source }}</text>
                  <text class="info-chip num" v-if="q.qNumber">第 {{ q.qNumber }} 题</text>
                  <text class="info-chip diff">{{ '★'.repeat(q.difficulty || 3) }}</text>
                  <text class="info-chip type">{{ q.type }}</text>
                </view>
                <view class="meta-right">
                  <text class="op-btn red" @click.stop="removeFav(q.id)">取消收藏</text>
                </view>
              </view>
              <view class="q-body" @click="toggleAnswer(q.id)">
                <view class="content-wrapper" :style="{ fontSize: config.fontSize + 'px', lineHeight: config.lineHeight }">
                  <view class="q-title"><LatexText :text="q.title"></LatexText></view>
                  <view v-if="q.subQuestions && q.subQuestions.length > 0" class="sub-q-list-view">
                    <view v-for="(subQ, sIdx) in q.subQuestions" :key="sIdx" class="sub-q-row">
                      <view class="sub-q-txt" style="display: flex; align-items: baseline; margin-bottom: 4px;">
                        <text class="sub-idx">{{ formatSubIndex(sIdx + 1) }}</text>
                        <view style="flex:1;"><LatexText :text="subQ.content"></LatexText></view>
                      </view>
                      <view v-if="subQ.options && Object.keys(subQ.options).length > 0" class="opt-grid mt-2 sub-indent" :style="'grid-template-columns: repeat(' + (subQ.optionLayout||4) + ', 1fr)'">
                        <view v-for="(val, key) in subQ.options" :key="key" class="opt-item" :style="{ marginTop: config.optionMargin + 'px' }">
                          <text class="opt-key">{{ formatOptionLabel(key) }}</text><LatexText :text="val"></LatexText>
                        </view>
                      </view>
                    </view>
                  </view>
                  <view v-else-if="q.options && Object.keys(q.options).length > 0" class="opt-grid" :style="'grid-template-columns: repeat(' + (q.optionLayout||4) + ', 1fr)'">
                    <view v-for="(val, key) in q.options" :key="key" class="opt-item" :style="{ marginTop: config.optionMargin + 'px' }">
                      <text class="opt-key">{{ formatOptionLabel(key) }}</text><LatexText :text="val"></LatexText>
                    </view>
                  </view>
                  <view v-if="showAnswerMap[q.id]" class="answer-box mt-2">
                    <view class="ans-block" v-if="q.answer"><view class="ans-tag answer">答案</view><view class="ans-content"><LatexText :text="q.answer"></LatexText></view></view>
                    <view class="ans-block" v-if="q.analysis"><view class="ans-tag analysis">分析</view><view class="ans-content"><LatexText :text="q.analysis"></LatexText></view></view>
                    <view class="ans-block" v-if="q.detailed"><view class="ans-tag detailed">详解</view><view class="ans-content"><LatexText :text="q.detailed"></LatexText></view></view>
                  </view>
                </view>
              </view>
              <view class="q-footer">
                <view class="tags-row">
                  <view v-for="tag in (q.tags||[])" :key="tag" class="tag-badge blue">
                    <image src="/static/icons/标签-蓝.svg" class="tag-icon" mode="aspectFit"></image><text>{{ tag }}</text>
                  </view>
                </view>
                <view class="footer-right">
                  <text class="hash-code">#{{ q.code }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import LatexText from '@/components/LatexText.vue';
import { request } from '@/utils/request.js';
import { globalConfig, formatSubIndex, formatOptionLabel } from '@/utils/configStore.js';

const favFolders = ref([]);
const favMap = ref({});
const currentFolderId = ref(null);
const favQuestions = ref([]);
const showAnswerMap = ref({});
const config = globalConfig;

const loadFavData = () => {
  const folders = uni.getStorageSync('USER_FAV_FOLDERS');
  const data = uni.getStorageSync('USER_FAV_DATA');
  if (folders) favFolders.value = JSON.parse(folders);
  else { favFolders.value = [{ id: 1, name: '默认收藏夹' }]; uni.setStorageSync('USER_FAV_FOLDERS', JSON.stringify(favFolders.value)); }
  if (!currentFolderId.value && favFolders.value.length > 0) currentFolderId.value = favFolders.value[0].id;
  if (data) favMap.value = JSON.parse(data); else favMap.value = {};
  loadQuestionsForFolder();
};

const createNewFolder = () => { uni.showModal({ title: '新建收藏夹', editable: true, placeholderText: '请输入文件夹名称', success: (res) => { if (res.confirm && res.content) { favFolders.value.push({ id: Date.now(), name: res.content }); uni.setStorageSync('USER_FAV_FOLDERS', JSON.stringify(favFolders.value)); } } }); };

const selectFolder = (id) => { currentFolderId.value = id; loadQuestionsForFolder(); };

const loadQuestionsForFolder = async () => {
  if (!currentFolderId.value) return;
  const targetQids = [];
  for (let qid in favMap.value) { if (favMap.value[qid] === currentFolderId.value) targetQids.push(qid); }
  if (targetQids.length === 0) { favQuestions.value = []; return; }
  try {
    const [resPrivate, resPublic] = await Promise.all([ request({ url: '/api/questions', method: 'GET', data: { mode: 'private' } }), request({ url: '/api/questions', method: 'GET', data: { mode: 'public' } }) ]);
    let allQs = [];
    if (resPrivate && resPrivate.data) allQs = allQs.concat(resPrivate.data);
    if (resPublic && resPublic.data) allQs = allQs.concat(resPublic.data);
    const uniqueQs = new Map();
    allQs.forEach(q => uniqueQs.set(q.id, q));
    favQuestions.value = Array.from(uniqueQs.values()).filter(q => targetQids.includes(q.id)).map(processQuestionData);
  } catch (e) { }
};

const processQuestionData = (q) => { let parsedOptions = q.options; if (typeof parsedOptions === 'string') { try { parsedOptions = JSON.parse(parsedOptions); } catch (e) { parsedOptions = {}; } } return { ...q, options: parsedOptions || {}, tags: q.tags || [], code: q.code || 'A' + q.id.toString().substr(-4) }; };

const removeFav = (qid) => { uni.showModal({ content: '确定移出吗？', success: (res) => { if (res.confirm) { delete favMap.value[qid]; uni.setStorageSync('USER_FAV_DATA', JSON.stringify(favMap.value)); loadQuestionsForFolder(); } } }); };

const toggleAnswer = (id) => { showAnswerMap.value[id] = !showAnswerMap.value[id]; };

const currentFolderName = computed(() => { const f = favFolders.value.find(x => x.id === currentFolderId.value); return f ? f.name : '收藏夹'; });

onMounted(() => { loadFavData(); });
</script>

<style lang="scss" scoped>
.module-layout { display: flex; flex-direction: row; width: 100%; height: 100%; gap: 20px; min-height: 0; }
.module-sidebar { width: 300px; background-color: #f0f0f0; border-radius: 4px; display: flex; flex-direction: column; flex-shrink: 0; padding: 15px; box-sizing: border-box; }
.module-sidebar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; flex-shrink: 0; }
.blue-title-box { background-color: #2563eb; color: white; font-size: 13px; font-weight: bold; padding: 6px 10px; border-radius: 4px; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2); }
.add-svg-btn { width: 28px; height: 28px; background: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s; }
.add-svg-btn:hover { background: #e2e8f0; transform: translateY(-1px); }
.add-svg-icon { width: 16px; height: 16px; }

.module-workspace { flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100%; }
.workspace-inner { display: flex; flex-direction: column; gap: 15px; height: 100%; width: 100%; }
.module-top-bar { background-color: white; border-radius: 12px; height: 60px; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03); border: 1px solid #f1f5f9; width: 100%; box-sizing: border-box; }
.module-scroll-view { flex: 1; min-height: 0; width: 100%; background: transparent; }
.module-cards-container { padding: 0; padding-bottom: 40px; width: 100%; display: flex; flex-direction: column; gap: 15px; }

.tree-container { 
  flex: 1; 
  overflow-y: auto; 
  overflow-x: hidden; 
  min-height: 0; 
  
  /* 主要修改下面这两行：去掉原本的 margin: 0 -5px; 等，让它宽度保持100% */
  margin: 0; 
  padding: 5px 0 0 0; 
  
  box-sizing: border-box; 
}
.node-wrapper { 
  position: relative; 
  transition: all 0.2s; 
  margin-bottom: 8px; 
  /* 删掉原本的 padding-right: 8px; */
}
.node-content { display: flex; align-items: center; padding: 6px 8px; width: 100%; border-radius: 4px; background-color: white; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); cursor: pointer; user-select: none; border: 1px solid transparent; box-sizing: border-box; position: relative; }
.node-content:hover { background-color: #fff; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); }
.node-content:hover .node-title { color: #2563eb; } .node-content:hover .icon-txt { color: rgb(98, 148, 206); }
.node-content.selected { background-color: rgb(98, 148, 206); border-color: rgb(98, 148, 206); }
.node-content.selected .node-title, .node-content.selected .icon-txt, .node-content.selected .f-count { color: white; font-weight: bold; }
.toggle-icon { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; margin-right: 8px; border-radius: 3px; border: 1px solid #f0f0f0; background-color: #f0f0f0; flex-shrink: 0; }
.node-content.selected .toggle-icon { border-color: rgba(255,255,255,0.3); background-color: rgba(255,255,255,0.2); }
.icon-txt { font-family: monospace; font-weight: bold; color: #64748b; font-size: 14px; line-height: 1; }
.icon-txt.disabled { color: #cbd5e1; font-size: 10px; }
.node-title { font-size: 13px; color: #334155; flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

.ft-info { display: flex; flex-direction: column; gap: 2px; }
.ft-title { font-weight: bold; color: #1e293b; font-size: 15px; } .ft-desc { font-size: 12px; color: #94a3b8; }
.empty-tip { text-align: center; color: #94a3b8; margin-top: 50px; }

.q-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); font-family: "Times New Roman", "SimSun", "Songti SC", serif; width: 100%; box-sizing: border-box; }
.q-header { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 12px; }
.meta-left { display: flex; gap: 6px; flex-wrap: wrap; } .meta-right { display: flex; align-items: center; }
.info-chip { padding: 2px 8px; border-radius: 4px; background: #f1f5f9; color: #64748b; font-size: 11px; display: flex; align-items: center; white-space: nowrap; }
.info-chip.type { color: #2563eb; background: #eff6ff; font-weight: bold; } .info-chip.diff { color: #f59e0b; background: #fffbeb; } .info-chip.prov { background: #f0fdf4; color: #166534; } .info-chip.year { background: #eef2ff; color: #4338ca; } .info-chip.num { font-family: monospace; } .info-chip.source { background: #fff1f2; color: #e11d48; }
.q-body { color: #1e293b; cursor: default; }
.q-title { margin-bottom: 8px; display: flex; align-items: baseline; word-break: break-all; white-space: normal; }
.opt-list { display: flex; flex-direction: column; } .opt-item { display: flex; align-items: baseline; }
.opt-key { font-weight: bold; margin-right: 8px; flex-shrink: 0; color: #334155; } .opt-val { color: #334155; word-break: break-all; flex: 1; }
.sub-q-list-view { margin-top: 12px; border-top: 1px dashed #e2e8f0; padding-top: 12px; } .sub-q-row { margin-bottom: 12px; }
.sub-q-txt { display: flex; align-items: baseline; margin-bottom: 4px; } .sub-idx { font-weight: bold; margin-right: 6px; flex-shrink: 0; color: #334155; }
.sub-content { flex: 1; } .sub-indent { margin-left: 22px; margin-top: 4px; } .mt-2 { margin-top: 12px; }
.opt-grid { display: grid; gap: 4px 8px; margin-bottom: 10px; color: #334155; }
.answer-box { background: #f0f9ff; padding: 12px 15px; border-radius: 6px; border: 1px dashed #bae6fd; color: #0c4a6e; }
.ans-block { margin-bottom: 0.8em; display: flex; align-items: baseline; } .ans-block:last-child { margin-bottom: 0; }
.ans-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 0.9em; font-weight: bold; margin-right: 8px; flex-shrink: 0; line-height: 1.2 !important; }
.ans-tag.answer { background-color: #2563eb; } .ans-tag.analysis { background-color: #f59e0b; } .ans-tag.detailed { background-color: #10b981; }
.ans-content { color: #334155; word-break: break-all; }
.q-footer { border-top: 1px solid #f1f5f9; margin-top: 12px; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.tags-row { display: flex; gap: 8px; align-items: center; flex: 1; flex-wrap: wrap; }
.tag-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; line-height: 1.2; white-space: nowrap; }
.tag-badge.red { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; } .tag-badge.blue { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
.tag-icon { width: 12px; height: 12px; margin-right: 4px; display: block; }
.footer-right { display: flex; align-items: center; gap: 10px; } .hash-code { font-family: monospace; color: #cbd5e1; font-size: 11px; }
.op-btn { font-weight: bold; cursor: pointer; font-size: 11px; margin-left: 10px; } .op-btn.red { color: #ef4444; }
</style>