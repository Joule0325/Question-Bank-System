<template>
  <view class="module-layout">
    <view class="module-sidebar">
      <view class="module-sidebar-header">
        <view class="blue-title-box">一级分类</view>
        <view class="add-svg-btn" @click="addLevel1Group" title="新建一级分类">
          <image src="/static/icons/添加.svg" class="add-svg-icon" mode="aspectFit"></image>
        </view>
      </view>
      <scroll-view scroll-y class="tree-container">
        <block v-for="l1 in tagTree" :key="l1.id">
          <view class="node-wrapper" style="margin-left: 0px;">
            <view class="node-content" :class="{ 'selected': currentL1Id === l1.id }" @click="selectLevel1(l1.id)">
              <view class="toggle-icon"><text class="icon-txt disabled">●</text></view>
              <text class="node-title">{{ l1.name }}</text>
              <text class="f-count" style="font-size:10px; opacity:0.8; margin-left:auto;">({{ getL1Count(l1) }})</text>
            </view>
          </view>
        </block>
      </scroll-view>
    </view>

    <view class="module-workspace">
      <view class="workspace-inner">
        <view class="module-top-bar">
          <view class="ft-info">
              <text class="ft-title">{{ currentL1Name }}</text>
              <text class="ft-desc">二级分类管理 & 标签归档 (仅私人空间)</text>
          </view>
          <view class="ft-actions">
              <view class="h-btn primary" @click="addLevel2Group" v-if="currentL1Id" style="margin-right:10px;">+ 新建二级分类</view>
              <block v-if="selectedTags.length > 0">
                   <view class="h-btn primary outline" @click="openMoveTagModal">移动选中标签 ({{selectedTags.length}})</view>
              </block>
              <view class="h-btn outline" style="color:#ef4444; border-color:#ef4444; margin-left:10px;" v-if="currentL1Id && currentL1Id !== 'L1_DEFAULT'" @click="deleteLevel1">删除一级分类</view>
          </view>
        </view>

        <scroll-view scroll-y class="module-scroll-view">
          <view class="module-cards-container">
              <view v-if="!currentL1Id" class="empty-tip">请选择左侧一级分类</view>
              <block v-else>
                  <view v-for="l2 in currentL2List" :key="l2.id" class="l2-group-card">
                      <view class="l2-header">
                          <view class="l2-title-row">
                              <text class="l2-icon">📑</text>
                              <text class="l2-name">{{ l2.name }}</text>
                              <text class="l2-count">({{ getL2Tags(l2.id).length }})</text>
                          </view>
                          <view class="l2-ops" v-if="l2.id !== 'L2_DEFAULT'">
                              <text class="op-txt" @click="renameLevel2(l2)">重命名</text>
                              <text class="op-txt red" @click="deleteLevel2(l2.id)">删除</text>
                          </view>
                      </view>
                      <view class="l2-body">
                          <view class="tag-grid">
                              <view v-for="tag in getL2Tags(l2.id)" :key="tag" class="tag-card small" :class="{ selected: selectedTags.includes(tag) }" @click="toggleTagSelection(tag)">
                                  <text class="t-name">{{ tag }}</text>
                                  <view class="check-circle" v-if="selectedTags.includes(tag)">✓</view>
                              </view>
                              <view v-if="getL2Tags(l2.id).length === 0" class="no-tags-tip">无标签</view>
                          </view>
                      </view>
                  </view>
              </block>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { request } from '@/utils/request.js';

const tagTree = ref([]); 
const tagMapping = ref({}); 
const currentL1Id = ref(null);
const allUserTags = ref([]); 
const selectedTags = ref([]); 

const initTagData = async () => {
    const storedTree = uni.getStorageSync('USER_TAG_TREE_DATA');
    const storedMapping = uni.getStorageSync('USER_TAG_MAPPING_V2');
    if (storedTree) tagTree.value = JSON.parse(storedTree);
    else { tagTree.value = [ { id: 'L1_DEFAULT', name: '默认分类', children: [ { id: 'L2_DEFAULT', name: '未归档' } ] } ]; uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); }
    if (storedMapping) tagMapping.value = JSON.parse(storedMapping); else tagMapping.value = {};
    if (!currentL1Id.value && tagTree.value.length > 0) currentL1Id.value = tagTree.value[0].id;
    try {
      const res = await request({ url: '/api/questions', method: 'GET', data: { mode: 'private' } });
      const qList = res.data || []; const foundTags = new Set();
      qList.forEach(q => { if (q.tags && Array.isArray(q.tags)) { q.tags.forEach(t => { if(t) foundTags.add(t); }); } if (q.subQuestions) { q.subQuestions.forEach(sq => { if (sq.tags && Array.isArray(sq.tags)) { sq.tags.forEach(t => { if(t) foundTags.add(t); }); } }); } });
      allUserTags.value = Array.from(foundTags);
      let mappingChanged = false;
      allUserTags.value.forEach(t => { if (!tagMapping.value[t]) { tagMapping.value[t] = 'L2_DEFAULT'; mappingChanged = true; } });
      if (mappingChanged) uni.setStorageSync('USER_TAG_MAPPING_V2', JSON.stringify(tagMapping.value));
    } catch (e) {}
    selectedTags.value = [];
};

const currentL1Name = computed(() => { const l1 = tagTree.value.find(item => item.id === currentL1Id.value); return l1 ? l1.name : '未选择'; });
const currentL2List = computed(() => { const l1 = tagTree.value.find(item => item.id === currentL1Id.value); return l1 ? l1.children : []; });
const getL1Count = (l1) => { if (!l1 || !l1.children) return 0; let count = 0; l1.children.forEach(l2 => { count += getL2Tags(l2.id).length; }); return count; };
const getL2Tags = (l2Id) => { return allUserTags.value.filter(t => (tagMapping.value[t] || 'L2_DEFAULT') === l2Id); };
const selectLevel1 = (id) => { currentL1Id.value = id; selectedTags.value = []; };
const addLevel1Group = () => { uni.showModal({ title: '新建一级分类', editable: true, placeholderText: '例如：按学科、按年份', success: (res) => { if (res.confirm && res.content) { tagTree.value.push({ id: 'L1_' + Date.now(), name: res.content, children: [] }); uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); } } }); };
const addLevel2Group = () => { if (!currentL1Id.value) return; uni.showModal({ title: '新建二级分类', editable: true, placeholderText: '例如：数学、物理、2023年', success: (res) => { if (res.confirm && res.content) { const l1 = tagTree.value.find(i => i.id === currentL1Id.value); if (l1) { l1.children.push({ id: 'L2_' + Date.now(), name: res.content }); uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); } } } }); };
const deleteLevel1 = () => { if (currentL1Id.value === 'L1_DEFAULT') return uni.showToast({ title: '默认不可删除', icon: 'none' }); uni.showModal({ title: '删除', content: '确定删除吗？', success: (res) => { if (res.confirm) { const l1 = tagTree.value.find(i => i.id === currentL1Id.value); if (l1 && l1.children) { l1.children.forEach(l2 => { const tags = getL2Tags(l2.id); tags.forEach(t => tagMapping.value[t] = 'L2_DEFAULT'); }); } uni.setStorageSync('USER_TAG_MAPPING_V2', JSON.stringify(tagMapping.value)); tagTree.value = tagTree.value.filter(i => i.id !== currentL1Id.value); uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); currentL1Id.value = 'L1_DEFAULT'; } } }); };
const renameLevel2 = (l2) => { uni.showModal({ title: '重命名', editable: true, content: l2.name, success: (res) => { if (res.confirm && res.content) { l2.name = res.content; uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); } } }); };
const deleteLevel2 = (l2Id) => { uni.showModal({ title: '删除', content: '确定吗？', success: (res) => { if (res.confirm) { const tags = getL2Tags(l2Id); tags.forEach(t => tagMapping.value[t] = 'L2_DEFAULT'); uni.setStorageSync('USER_TAG_MAPPING_V2', JSON.stringify(tagMapping.value)); const l1 = tagTree.value.find(i => i.id === currentL1Id.value); if (l1) { l1.children = l1.children.filter(sub => sub.id !== l2Id); uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); } } } }); };
const toggleTagSelection = (tag) => { if (selectedTags.value.includes(tag)) selectedTags.value = selectedTags.value.filter(t => t !== tag); else selectedTags.value.push(tag); };
const openMoveTagModal = () => { const flatOptions = []; const flatIds = []; tagTree.value.forEach(l1 => { l1.children.forEach(l2 => { flatOptions.push(`${l1.name} / ${l2.name}`); flatIds.push(l2.id); }); }); uni.showActionSheet({ itemList: flatOptions, success: (res) => { const targetL2Id = flatIds[res.tapIndex]; selectedTags.value.forEach(t => { tagMapping.value[t] = targetL2Id; }); uni.setStorageSync('USER_TAG_MAPPING_V2', JSON.stringify(tagMapping.value)); uni.showToast({ title: '移动成功', icon: 'none' }); selectedTags.value = []; } }); };

onMounted(() => { initTagData(); });
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

.ft-info { display: flex; flex-direction: column; gap: 2px; } .ft-actions { display: flex; align-items: center; }
.ft-title { font-weight: bold; color: #1e293b; font-size: 15px; } .ft-desc { font-size: 12px; color: #94a3b8; }
.empty-tip { text-align: center; color: #94a3b8; margin-top: 50px; }

.l2-group-card { background: white; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; width: 100%; box-sizing: border-box;}
.l2-header { background: #f8fafc; padding: 10px 15px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
.l2-title-row { display: flex; align-items: center; gap: 8px; } .l2-icon { font-size: 14px; } .l2-name { font-weight: bold; font-size: 14px; color: #334155; } .l2-count { color: #94a3b8; font-size: 12px; }
.l2-ops { display: flex; gap: 10px; } .op-txt { font-size: 11px; color: #64748b; cursor: pointer; } .op-txt:hover { color: #2563eb; } .op-txt.red:hover { color: #ef4444; }
.l2-body { padding: 15px; }
.tag-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
.tag-card { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; position: relative; transition: all 0.2s; }
.tag-card.small { padding: 6px 10px; font-size: 12px; } .tag-card:hover { border-color: #94a3b8; } .tag-card.selected { border-color: #2563eb; background: #eff6ff; color: #2563eb; font-weight: bold; }
.t-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.check-circle { width: 16px; height: 16px; background: #2563eb; border-radius: 50%; color: white; font-size: 10px; display: flex; align-items: center; justify-content: center; position: absolute; top: -5px; right: -5px; }
.no-tags-tip { font-size: 12px; color: #cbd5e1; grid-column: 1 / -1; text-align: center; padding: 10px 0; font-style: italic; }

.h-btn { height: 24px; padding: 0 13px; border-radius: 4px; font-size: 13px; cursor: pointer; background: #f1f5f9; color: #64748b; font-weight: 600; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-sizing: border-box; border: 1px solid transparent; }
.h-btn:hover { background: #e2e8f0; transform: translateY(-1px); } .h-btn.primary { background: #2563eb; color: white; box-shadow: 0 2px 5px rgba(37, 99, 235, 0.2); } .h-btn.primary:hover { background: #1d4ed8; } .h-btn.outline { background: transparent; border-color: #2563eb; color: #2563eb; } .h-btn.outline:hover { background: #eff6ff; border-color: #1d4ed8; color: #1d4ed8; }
</style>