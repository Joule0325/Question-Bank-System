<template>
  <CommonModal :isOpen="visible" title="目录内容管理" maxWidth="900px" @close="$emit('update:visible', false)">
    <view class="content-manage-layout">
      <view class="cm-left">
        <scroll-view scroll-y class="cm-tree-scroll">
          <CategoryTree 
            v-for="cat in manageTreeData" 
            :key="cat.id" 
            :node="cat" 
            :level="0"
            :selectedIds="manageSelectedId ? [manageSelectedId] : []"
            :defaultOpen="true"
            @select="handleManageTreeSelect"
          ></CategoryTree>
          <view v-if="manageTreeData.length===0" class="empty-tip">暂无目录，请在右侧添加</view>
        </scroll-view>
      </view>

      <view class="cm-right">
        <view class="cm-box mb-2">
          <view class="box-title">当前选择的目录</view>
          <view class="box-body" v-if="currentManageNode">
            <view class="form-row">
              <text class="lbl">名称</text>
              <input class="inp flex-1" v-model="currentManageNode.title" />
            </view>
            <view class="form-row mt-2">
              <text class="lbl">颜色</text>
              <view class="color-opts">
                <view v-for="c in colorOptions" :key="c" class="c-circle" :style="{background: c}" 
                  :class="{active: currentManageNode.color === c}"
                  @click="currentManageNode.color = c"></view>
                <view class="c-circle remove" @click="currentManageNode.color = ''">✕</view>
              </view>
            </view>
            <view class="row-end mt-2">
              <button class="btn sm red" @click="deleteCurrentNode">删除目录及其子目录</button>
              <button class="btn sm primary ml-2" @click="saveCurrentNodeInfo">保存信息</button>
            </view>
          </view>
          <view class="box-body center-txt" v-else>请在左侧选择一个目录 (或根目录)</view>
        </view>

        <view class="cm-box flex-1">
          <view class="box-title">{{ currentManageNode ? `[${currentManageNode.title}] 的子目录` : '一级目录管理' }}</view>
          <view class="list-editor flat">
            <view class="le-toolbar sm">
              <view class="tb-btn" @click="addManageChild"><text>➕ 添加</text></view>
              <view class="tb-btn red" @click="deleteManageChildren"><text>🗑️ 删除</text></view>
              <view class="tb-divider"></view>
              <view class="tb-btn" @click="moveManageChild('up')"><text>⬆️</text></view>
              <view class="tb-btn" @click="moveManageChild('down')"><text>⬇️</text></view>
              <view class="tb-divider"></view>
              <view class="tb-btn" @click="listSelectAll(currentChildrenList)"><text>All</text></view>
              <view class="tb-btn" @click="listInverseSelect(currentChildrenList)"><text>Inv</text></view>
            </view>
            <scroll-view scroll-y class="le-body flex-1">
              <view v-for="(item, idx) in currentChildrenList" :key="item.id || idx" class="le-row" :class="{checked: item.checked}" @click="item.checked=!item.checked">
                <view class="col-chk"><text v-if="item.checked" class="chk-icon">✓</text></view>
                <view class="col-color-dot" :style="{background: item.color || '#ccc'}"></view>
                <input class="col-input" v-model="item.title" @click.stop />
              </view>
            </scroll-view>
            <view class="foot-btns">
              <button class="btn primary full" @click="saveChildrenList">保存子目录列表</button>
            </view>
          </view>
        </view>
      </view>
    </view>
  </CommonModal>
</template>

<script setup>
import { ref, watch } from 'vue';
import CommonModal from '@/components/CommonModal.vue';
import CategoryTree from '@/components/CategoryTree.vue';
import { getCategories, manageCategory } from '@/api/question.js';

const props = defineProps(['visible', 'subjectId']);
const emit = defineEmits(['update:visible', 'saved']);

const manageTreeData = ref([]);
const manageSelectedId = ref(null);
const currentManageNode = ref(null);
const currentChildrenList = ref([]);
const colorOptions = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

// 加载数据
const loadData = async () => {
  if (!props.subjectId) return;
  const data = await getCategories(props.subjectId);
  manageTreeData.value = data || [];
  manageSelectedId.value = null;
  currentManageNode.value = null;
  // 默认显示根目录内容
  currentChildrenList.value = JSON.parse(JSON.stringify(manageTreeData.value)).map(c => ({...c, checked: false}));
};

watch(() => props.visible, (val) => {
  if (val) loadData();
});

// 辅助函数
const findNode = (nodes, id) => {
  for(let n of nodes) {
    if(n.id === id) return n; 
    if(n.children) { const found = findNode(n.children, id); if(found) return found; }
  }
  return null;
};

const handleManageTreeSelect = (e, node) => {
  manageSelectedId.value = node.id;
  currentManageNode.value = JSON.parse(JSON.stringify(node));
  currentChildrenList.value = (node.children || []).map(c => ({...c, checked: false}));
};

const saveCurrentNodeInfo = async () => {
  if (!currentManageNode.value) return;
  try {
    await manageCategory({ action: 'rename', id: currentManageNode.value.id, title: currentManageNode.value.title });
    // 更新本地树
    const nodeInTree = findNode(manageTreeData.value, currentManageNode.value.id);
    if(nodeInTree) { nodeInTree.title = currentManageNode.value.title; nodeInTree.color = currentManageNode.value.color; }
    uni.showToast({title:'已保存信息', icon:'success'});
    emit('saved');
  } catch(e) { uni.showToast({title:'保存失败', icon:'none'}); }
};

const deleteCurrentNode = async () => {
  if(!currentManageNode.value) return;
  uni.showModal({
    content: `确定删除 [${currentManageNode.value.title}] 及其所有子目录吗？`,
    success: async (res) => {
      if(res.confirm) {
        await manageCategory({ action: 'delete', id: currentManageNode.value.id });
        currentManageNode.value = null;
        currentChildrenList.value = [];
        await loadData(); // 刷新树
        emit('saved');
      }
    }
  });
};

const addManageChild = () => { currentChildrenList.value.push({ id: 'new_' + Date.now(), title: '', checked: false }); };
const deleteManageChildren = () => { currentChildrenList.value = currentChildrenList.value.filter(c => !c.checked); };

const moveManageChild = (dir) => {
  const list = currentChildrenList.value;
  for (let i = 0; i < list.length; i++) {
    if (dir === 'up') {
      if (i > 0 && list[i].checked && !list[i-1].checked) [list[i], list[i-1]] = [list[i-1], list[i]];
    } else {
      const idx = list.length - 1 - i;
      if (idx < list.length - 1 && list[idx].checked && !list[idx+1].checked) [list[idx], list[idx+1]] = [list[idx+1], list[idx]];
    }
  }
};

const saveChildrenList = async () => {
  try {
    const parentId = currentManageNode.value ? currentManageNode.value.id : null;
    await manageCategory({ action: 'update_list', subjectId: props.subjectId, parentId: parentId, children: currentChildrenList.value });
    uni.showToast({title:'保存成功', icon:'success'});
    // 重新加载数据并尝试恢复选中状态
    const lastSelected = manageSelectedId.value;
    await loadData();
    if (lastSelected) {
        const node = findNode(manageTreeData.value, lastSelected);
        if (node) handleManageTreeSelect(null, node);
    }
    emit('saved');
  } catch(e) { uni.showToast({title:'保存失败', icon:'none'}); }
};

const listSelectAll = (list) => list.forEach(i => i.checked = true);
const listInverseSelect = (list) => list.forEach(i => i.checked = !i.checked);
</script>

<style scoped>
.content-manage-layout { display: flex; height: 500px; gap: 16px; }
.cm-left { width: 260px; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; flex-direction: column; background: #f8fafc; }
.cm-tree-scroll { flex: 1; padding: 10px; overflow-y: hidden; }
.empty-tip { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }
.cm-right { flex: 1; display: flex; flex-direction: column; }
.cm-box { background: white; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }
.box-title { background: #f1f5f9; padding: 8px 12px; font-weight: bold; font-size: 13px; color: #475569; border-bottom: 1px solid #e2e8f0; }
.box-body { padding: 12px; }
.center-txt { text-align: center; color: #94a3b8; font-size: 13px; margin-top: 10px; }
.form-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.lbl { width: 40px; font-weight: bold; color: #64748b; }
.inp { border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 8px; font-size: 13px; }
.flex-1 { flex: 1; }
.mt-2 { margin-top: 8px; }
.mb-2 { margin-bottom: 8px; }
.color-opts { display: flex; gap: 8px; }
.c-circle { width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
.c-circle.active { border-color: #333; box-shadow: 0 0 0 2px white inset; }
.c-circle.remove { border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; }
.row-end { display: flex; justify-content: flex-end; }
.btn { padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; border: none; background: #f1f5f9; color: #64748b; }
.btn.primary { background: #2563eb; color: white; }
.btn.red { color: #ef4444; }
.ml-2 { margin-left: 8px; }
.btn.full { width: 100%; padding: 8px; }

/* List Editor styles reused */
.list-editor.flat { height: 100%; border: 1px solid #e2e8f0; border-radius: 4px; display: flex; flex-direction: column; }
.le-toolbar.sm { padding: 8px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 8px; align-items: center; }
.tb-btn { padding: 4px 8px; background: #f1f5f9; border-radius: 4px; font-size: 12px; cursor: pointer; border: 1px solid #e2e8f0; }
.tb-divider { width: 1px; height: 16px; background: #cbd5e1; margin: 0 4px; }
.le-body { flex: 1; overflow-y: auto; }
.le-row { display: flex; align-items: center; padding: 8px 10px; border-bottom: 1px solid #f8fafc; cursor: pointer; }
.le-row.checked { background: #eff6ff; }
.col-chk { width: 30px; text-align: center; }
.chk-icon { color: #2563eb; }
.col-color-dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
.col-input { flex: 1; font-size: 13px; background: transparent; border: none; }
.foot-btns { padding: 10px; border-top: 1px solid #f1f5f9; }
</style>