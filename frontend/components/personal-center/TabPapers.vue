<template>
  <view class="module-layout">
    <view class="module-sidebar">
      <view class="module-sidebar-header">
        <view class="blue-title-box">试卷分类</view>
        <view class="add-svg-btn" @click="addPaperL1Group" title="新建分类">
          <image src="/static/icons/添加.svg" class="add-svg-icon" mode="aspectFit"></image>
        </view>
      </view>
      <scroll-view scroll-y class="tree-container">
        <block v-for="l1 in paperTree" :key="l1.id">
          <view class="node-wrapper" style="margin-left: 0px;">
            <view class="node-content" :class="{ 'selected': currentPaperL1Id === l1.id && !currentPaperL2Id }" @click="togglePaperL1(l1)">
              <view class="toggle-icon">
                <text v-if="l1.children && l1.children.length > 0" class="icon-txt">{{ l1.isOpen ? '-' : '+' }}</text>
                <text v-else class="icon-txt disabled">●</text>
              </view>
              <text class="node-title">{{ l1.name }}</text>
              <text class="f-count" style="font-size:10px; opacity:0.8; margin-left:auto;">({{ getPaperL1Count(l1) }})</text>
            </view>
          </view>
          <view v-if="l1.isOpen" class="children-list">
            <view v-for="l2 in l1.children" :key="l2.id" class="node-wrapper" style="margin-left: 16px;">
              <view class="node-content" :class="{ 'selected': currentPaperL2Id === l2.id }" @click.stop="selectPaperL2(l1.id, l2.id)">
                <view class="toggle-icon"><text class="icon-txt disabled">●</text></view>
                <text class="node-title">{{ l2.name }}</text>
                <text class="f-count" style="font-size:10px; opacity:0.8; margin-left:auto;">({{ getPaperL2List(l2.id).length }})</text>
              </view>
            </view>
          </view>
        </block>
      </scroll-view>
    </view>
    
    <view class="module-workspace">
      <view class="workspace-inner">
        <view class="module-top-bar">
            <view class="ft-info">
                <text class="ft-title">
                    {{ currentPaperL1Name }} 
                    <text v-if="currentPaperL2Id" style="color:#cbd5e1; margin:0 5px;">/</text> 
                    {{ currentPaperL2Name }}
                </text>
                <text class="ft-desc">共 {{ displayPaperList.length }} 份试卷</text>
            </view>
            <view class="ft-actions">
                <view class="h-btn primary" @click="addPaperL2Group" v-if="currentPaperL1Id" style="margin-right:10px;">+ 新建子分类</view>
                <block v-if="currentPaperL2Id && displayPaperList.length > 0">
                     <view class="h-btn primary outline" @click="openMovePaperModal">批量移动本页试卷</view>
                </block>
                <view class="h-btn outline" style="color:#ef4444; border-color:#ef4444; margin-left:10px;" v-if="currentPaperL1Id && currentPaperL1Id !== 'PL1_DEFAULT'" @click="deletePaperL1">删除分类</view>
                <view class="h-btn outline" style="color:#ef4444; border-color:#ef4444; margin-left:10px;" v-if="currentPaperL2Id && currentPaperL2Id !== 'PL2_DEFAULT'" @click="deletePaperL2">删除子分类</view>
            </view>
        </view>

        <scroll-view scroll-y class="module-scroll-view">
            <view class="module-cards-container">
                <view v-if="!currentPaperL1Id" class="empty-tip">请选择左侧分类查看试卷</view>
                <view v-else-if="displayPaperList.length === 0" class="empty-tip">该分类下暂无试卷</view>
                
                <view v-for="paper in displayPaperList" :key="paper.id" class="paper-card" @click="openPaper(paper)">
                    <view class="pc-icon" :class="paper.type">{{ paper.type === 'pdf' ? 'PDF' : 'W' }}</view>
                    <view class="pc-content">
                        <view class="pc-title">{{ paper.title || '未命名试卷' }}</view>
                        <view class="pc-sub">{{ paper.subTitle }}</view>
                        <view class="pc-meta">
                            <text>{{ paper.updateTime }}</text>
                            <text class="pc-sep">|</text>
                            <text>{{ paper.questions.length }} 题</text>
                            <text class="pc-status" :class="{ ok: paper.status === '已下载' }">{{ paper.status }}</text>
                        </view>
                    </view>
                    <view class="pc-actions">
                        <view class="h-btn outline primary" style="font-size: 12px; padding: 2px 8px;" @click.stop="moveSinglePaper(paper)">移动</view>
                        <view class="h-btn outline primary" style="font-size: 12px; padding: 2px 8px; margin-left: 8px;">编辑/下载</view>
                        <view class="h-btn outline" style="font-size: 12px; padding: 2px 8px; color: #ef4444; border-color: #ef4444; margin-left: 8px;" @click.stop="deletePaper(paper.id)">删除</view>
                    </view>
                </view>
            </view>
        </scroll-view>
      </view>
    </view>

    <ExportQuestionsModal v-model:visible="showPdfModal" :questions="currentEditPaper.questions" :initData="currentEditPaper" @save="loadSavedPapers" />
    <ExportWordModal v-model:visible="showWordModal" :questions="currentEditPaper.questions" :initData="currentEditPaper" @save="loadSavedPapers" />
    
    <CommonModal :isOpen="movePaperModalVisible" maxWidth="400px" @close="movePaperModalVisible = false">
      <template #header>
          <view class="custom-header">
              <text class="modal-title">移动试卷到...</text>
              <view class="win-close-btn" @click="movePaperModalVisible = false">✕</view>
          </view>
      </template>
      <view class="move-tree-scroll">
          <view class="move-tree-tip">请选择一个目标分类</view>
          <view v-for="l1 in paperTree" :key="l1.id" class="move-tree-node">
              <view class="move-l1-row"><text class="name">{{ l1.name }}</text></view>
              <view class="move-l2-container">
                  <view v-for="l2 in l1.children" :key="l2.id" class="move-l2-item" @click="executeMovePaper(l2.id)">
                      <text class="icon">↳</text><text class="name">{{ l2.name }}</text>
                  </view>
              </view>
          </view>
      </view>
    </CommonModal>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import CommonModal from '@/components/CommonModal.vue';
import ExportQuestionsModal from '@/components/ExportQuestionsModal.vue';
import ExportWordModal from '@/components/ExportWordModal.vue';

const savedPapers = ref([]);
const showPdfModal = ref(false);
const showWordModal = ref(false);
const currentEditPaper = ref({ questions: [] });
const paperTree = ref([]);
const paperMapping = ref({}); 
const currentPaperL1Id = ref(null);
const currentPaperL2Id = ref(null);
const movePaperModalVisible = ref(false);
const paperToMoveId = ref(null); 

const initPaperData = () => {
    savedPapers.value = uni.getStorageSync('USER_SAVED_PAPERS') || [];
    const storedTree = uni.getStorageSync('USER_PAPER_TREE');
    const storedMap = uni.getStorageSync('USER_PAPER_MAPPING');
    if (storedTree) paperTree.value = JSON.parse(storedTree);
    else { paperTree.value = [ { id: 'PL1_DEFAULT', name: '我的组卷', isOpen: true, children: [{ id: 'PL2_DEFAULT', name: '默认归档' }] } ]; uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); }
    if (storedMap) paperMapping.value = JSON.parse(storedMap); else paperMapping.value = {};
    
    let mapChanged = false;
    savedPapers.value.forEach(p => { if (!paperMapping.value[p.id]) { paperMapping.value[p.id] = 'PL2_DEFAULT'; mapChanged = true; } });
    if (mapChanged) uni.setStorageSync('USER_PAPER_MAPPING', JSON.stringify(paperMapping.value));
    if (!currentPaperL1Id.value && paperTree.value.length > 0) { currentPaperL1Id.value = paperTree.value[0].id; currentPaperL2Id.value = paperTree.value[0].children[0].id; }
};
const currentPaperL1Name = computed(() => { const l1 = paperTree.value.find(i => i.id === currentPaperL1Id.value); return l1 ? l1.name : ''; });
const currentPaperL2Name = computed(() => { if(!currentPaperL1Id.value) return ''; const l1 = paperTree.value.find(i => i.id === currentPaperL1Id.value); if(l1 && currentPaperL2Id.value) { const l2 = l1.children.find(c => c.id === currentPaperL2Id.value); return l2 ? l2.name : ''; } return '所有'; });
const displayPaperList = computed(() => { if (!currentPaperL2Id.value) return []; return savedPapers.value.filter(p => (paperMapping.value[p.id] || 'PL2_DEFAULT') === currentPaperL2Id.value); });
const getPaperL1Count = (l1) => { let count = 0; if(l1.children) l1.children.forEach(l2 => count += getPaperL2List(l2.id).length); return count; };
const getPaperL2List = (l2Id) => { return savedPapers.value.filter(p => (paperMapping.value[p.id] || 'PL2_DEFAULT') === l2Id); };
const togglePaperL1 = (l1) => { if (currentPaperL1Id.value === l1.id) l1.isOpen = !l1.isOpen; else { currentPaperL1Id.value = l1.id; l1.isOpen = true; if(l1.children && l1.children.length > 0) currentPaperL2Id.value = l1.children[0].id; } uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); };
const selectPaperL2 = (l1Id, l2Id) => { currentPaperL1Id.value = l1Id; currentPaperL2Id.value = l2Id; };
const addPaperL1Group = () => { uni.showModal({ title: '新建一级分类', editable: true, placeholderText: '如：高三复习', success: (res) => { if (res.confirm && res.content) { paperTree.value.push({ id: 'PL1_' + Date.now(), name: res.content, isOpen: true, children: [{ id: 'PL2_' + Date.now() + '_def', name: '默认子类' }] }); uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); } } }); };
const addPaperL2Group = () => { uni.showModal({ title: '新建子分类', editable: true, placeholderText: '如：摸底考试', success: (res) => { if (res.confirm && res.content) { const l1 = paperTree.value.find(i => i.id === currentPaperL1Id.value); if (l1) { l1.children.push({ id: 'PL2_' + Date.now(), name: res.content }); uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); } } } }); };
const deletePaperL1 = () => { uni.showModal({ title: '删除分类', content: '其下试卷将移动到默认归档，确定吗？', success: (res) => { if(res.confirm) { const l1 = paperTree.value.find(i => i.id === currentPaperL1Id.value); l1.children.forEach(l2 => { getPaperL2List(l2.id).forEach(p => paperMapping.value[p.id] = 'PL2_DEFAULT'); }); uni.setStorageSync('USER_PAPER_MAPPING', JSON.stringify(paperMapping.value)); paperTree.value = paperTree.value.filter(i => i.id !== currentPaperL1Id.value); uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); currentPaperL1Id.value = 'PL1_DEFAULT'; currentPaperL2Id.value = 'PL2_DEFAULT'; } } }); };
const deletePaperL2 = () => { const l1 = paperTree.value.find(i => i.id === currentPaperL1Id.value); l1.children = l1.children.filter(c => c.id !== currentPaperL2Id.value); uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); currentPaperL2Id.value = l1.children[0]?.id; };
const moveSinglePaper = (paper) => { paperToMoveId.value = paper.id; movePaperModalVisible.value = true; };
const openMovePaperModal = () => { paperToMoveId.value = null; movePaperModalVisible.value = true; };
const executeMovePaper = (targetL2Id) => { if (paperToMoveId.value) { paperMapping.value[paperToMoveId.value] = targetL2Id; } else { displayPaperList.value.forEach(p => paperMapping.value[p.id] = targetL2Id); } uni.setStorageSync('USER_PAPER_MAPPING', JSON.stringify(paperMapping.value)); uni.showToast({ title: '移动成功', icon: 'success' }); movePaperModalVisible.value = false; };
const loadSavedPapers = () => { initPaperData(); };
const openPaper = (paper) => { currentEditPaper.value = paper; if (paper.type === 'pdf') showPdfModal.value = true; else showWordModal.value = true; };
const deletePaper = (id) => { uni.showModal({ title: '删除试卷', content: '确定删除吗？', success: (res) => { if (res.confirm) { let papers = uni.getStorageSync('USER_SAVED_PAPERS') || []; papers = papers.filter(p => p.id !== id); uni.setStorageSync('USER_SAVED_PAPERS', papers); delete paperMapping.value[id]; uni.setStorageSync('USER_PAPER_MAPPING', JSON.stringify(paperMapping.value)); initPaperData(); } } }); };

onMounted(() => { initPaperData(); });
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
.children-list { width: 100%; margin-top: 2px; }

.ft-info { display: flex; flex-direction: column; gap: 2px; } .ft-actions { display: flex; align-items: center; }
.ft-title { font-weight: bold; color: #1e293b; font-size: 15px; } .ft-desc { font-size: 12px; color: #94a3b8; }
.empty-tip { text-align: center; color: #94a3b8; margin-top: 50px; }

.paper-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: all 0.2s; box-sizing: border-box; width: 100%; }
.paper-card:hover { border-color: #94a3b8; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.pc-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; color: white; flex-shrink: 0; }
.pc-icon.pdf { background: #ef4444; } .pc-icon.word { background: #2563eb; }
.pc-content { flex: 1; min-width: 0; }
.pc-title { font-weight: bold; font-size: 15px; color: #1e293b; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-sub { font-size: 12px; color: #64748b; margin-bottom: 6px; }
.pc-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #94a3b8; } .pc-sep { color: #cbd5e1; }
.pc-status { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; color: #64748b; } .pc-status.ok { background: #dcfce7; color: #166534; }
.pc-actions { display: flex; align-items: center; }

.custom-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; border-bottom: 1px solid #f1f5f9; background: #fff; flex-shrink: 0; min-height: 60px; box-sizing: border-box; }
.modal-title { font-weight: 800; font-size: 15px; color: #0f172a; margin: 0; }
.win-close-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #94a3b8; border-radius: 4px; } .win-close-btn:hover { background: #e2e8f0; color: #ef4444; }
.h-btn { height: 24px; padding: 0 13px; border-radius: 4px; font-size: 13px; cursor: pointer; background: #f1f5f9; color: #64748b; font-weight: 600; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-sizing: border-box; border: 1px solid transparent; }
.h-btn:hover { background: #e2e8f0; transform: translateY(-1px); } .h-btn.primary { background: #2563eb; color: white; box-shadow: 0 2px 5px rgba(37, 99, 235, 0.2); } .h-btn.primary:hover { background: #1d4ed8; } .h-btn.outline { background: transparent; border-color: #2563eb; color: #2563eb; } .h-btn.outline:hover { background: #eff6ff; border-color: #1d4ed8; color: #1d4ed8; }

.move-tree-scroll { max-height: 300px; overflow-y: auto; padding: 10px; }
.move-tree-tip { font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 10px; }
.move-tree-node { margin-bottom: 5px; }
.move-l1-row { display: flex; align-items: center; padding: 8px; background: #f8fafc; border-radius: 4px; cursor: pointer; }
.move-l1-row:hover { background: #eff6ff; } .move-l1-row .name { font-weight: bold; font-size: 13px; color: #334155; }
.move-l2-container { margin-left: 20px; border-left: 1px solid #e2e8f0; padding-left: 5px; margin-top: 4px; }
.move-l2-item { padding: 6px 10px; cursor: pointer; display: flex; align-items: center; border-radius: 4px; }
.move-l2-item:hover { background: #e2e8f0; color: #2563eb; } .move-l2-item .icon { font-size: 12px; margin-right: 6px; opacity: 0.5; } .move-l2-item .name { font-size: 13px; }
</style>