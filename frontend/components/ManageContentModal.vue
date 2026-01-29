<template>
  <CommonModal :isOpen="visible" maxWidth="900px" @close="handleClose">
    
    <template #header>
      <view class="custom-header">
        <text class="modal-title">目录内容管理</text>
        <view class="header-actions">
          <view class="h-btn primary" @click="handleGlobalSave">保存</view>
          <view class="h-btn" @click="handleClose">关闭</view>
          <view class="h-btn outline primary" @click="handleSaveAndExit">保存并退出</view>
        </view>
      </view>
    </template>

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
            :draggable="true"
            @select="handleManageTreeSelect"
            @node-drop="handleNodeDrop"
          ></CategoryTree>
          
          <view v-if="manageTreeData.length===0" class="empty-tip">暂无目录，请在右侧添加</view>
        </scroll-view>
      </view>

      <view class="cm-right">
        
        <view class="cm-box top-section mb-2">
          <view class="box-title">当前选择的目录</view>
          <view class="box-body" v-if="currentManageNode">
            <view class="form-row">
              <input class="inp flex-1" v-model="currentManageNode.title" placeholder="输入目录名称" />
              <view class="del-btn-rect" @click="deleteCurrentNode">删除目录及其子目录</view>
            </view>
            </view>
          <view class="box-body center-txt" v-else>请在左侧选择一个目录 (或根目录)</view>
        </view>

        <view class="cm-box bottom-section flex-1">
          <view class="bottom-header-row">
            <text class="section-title">
              {{ currentManageNode ? `编辑 [${currentManageNode.title}] 的子目录` : '一级目录管理' }}
            </text>
            <button class="confirm-btn" @click="handleConfirmChildren">确定保存子目录</button>
          </view>
          <view class="text-edit-container">
            <textarea 
              class="child-textarea" 
              v-model="childEditText" 
              placeholder="在此直接输入子目录&#10;使用 - 代表层级，例如：&#10;第一章&#10;- 第一节&#10;- 第二节&#10;-- 小节1"
              maxlength="-1"
            ></textarea>
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

// 数据状态
const manageTreeData = ref([]);
const manageSelectedId = ref(null);
const currentManageNode = ref(null);
const childEditText = ref(''); 

// 数据加载
const loadData = async () => {
  if (!props.subjectId) return;
  const data = await getCategories(props.subjectId);
  manageTreeData.value = data || [];
  
  if (manageSelectedId.value) {
    const node = findNode(manageTreeData.value, manageSelectedId.value);
    if (node) {
      currentManageNode.value = JSON.parse(JSON.stringify(node));
    }
  }
};

watch(() => props.visible, (val) => {
  if (val) {
    loadData();
    manageSelectedId.value = null;
    currentManageNode.value = null;
    childEditText.value = '';
  }
});

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
  childEditText.value = treeToText(node.children || [], 0);
};

// ----------------------------------------------------------------
// [核心] 拖拽处理逻辑
// ----------------------------------------------------------------
const handleNodeDrop = async ({ sourceId, targetId, position }) => {
  console.log('Main Modal received drop:', sourceId, '->', targetId);
  if (!sourceId || !targetId) return;

  // 1. 防死循环检查
  const sourceNode = findNode(manageTreeData.value, sourceId);
  if (sourceNode) {
     const isTargetInsideSource = findNode(sourceNode.children || [], targetId);
     if (isTargetInsideSource) {
         uni.showToast({ title: '不能拖动到自己的子目录下', icon: 'none' });
         return;
     }
  }

  try {
    uni.showLoading({ title: '排序中...' });
    
    // 2. 调用后端
    await manageCategory({
      action: 'reorder',
      sourceId,
      targetId,
      position: 'bottom'
    });
    
    // 3. 刷新
    await loadData();
    
    // 4. 刷新右侧文本框
    if (manageSelectedId.value) {
       const node = findNode(manageTreeData.value, manageSelectedId.value);
       if (node) {
           childEditText.value = treeToText(node.children || [], 0);
       }
    }

    uni.hideLoading();
  } catch (e) {
    uni.hideLoading();
    console.error(e);
    uni.showToast({ title: '移动失败', icon: 'none' });
  }
};


// 文本转换逻辑
const treeToText = (nodes, level) => {
  if (!nodes || nodes.length === 0) return '';
  let text = '';
  const prefix = '-'.repeat(level);
  nodes.forEach(node => {
    text += `${prefix}${node.title}\n`;
    if (node.children && node.children.length > 0) {
      text += treeToText(node.children, level + 1);
    }
  });
  return text;
};

const parseTextToTree = (text) => {
  if (!text || !text.trim()) return [];
  const lines = text.split('\n');
  const root = { children: [] }; 
  const stack = [root];
  const getLevel = (str) => {
    let i = 0; while (i < str.length && str[i] === '-') i++; return i;
  };
  lines.forEach(line => {
    if (!line.trim()) return;
    const level = getLevel(line);
    let title = line.substring(level).trim();
    if (!title) return; 
    const newNode = { title: title, children: [] };
    while (stack.length > level + 1) { stack.pop(); }
    const parent = stack[stack.length - 1];
    if (parent) { parent.children.push(newNode); }
    stack.push(newNode);
  });
  return root.children;
};

// 保存逻辑
const handleConfirmChildren = async () => {
  if (!currentManageNode.value) return;
  const newChildren = parseTextToTree(childEditText.value);
  try {
    uni.showLoading({ title: '保存中...' });
    await manageCategory({ action: 'update_list', subjectId: props.subjectId, parentId: currentManageNode.value.id, children: newChildren });
    await loadData();
    const node = findNode(manageTreeData.value, manageSelectedId.value);
    if(node) childEditText.value = treeToText(node.children || [], 0);
    uni.hideLoading();
    uni.showToast({title: '子目录已更新', icon: 'success'});
    emit('saved');
  } catch(e) {
    uni.hideLoading(); console.error(e); uni.showToast({title: '保存失败', icon: 'none'});
  }
};

const handleGlobalSave = async () => {
  if (!currentManageNode.value) { uni.showToast({title: '请先选择目录', icon:'none'}); return false; }
  uni.showLoading({ title: '保存中...' });
  let hasError = false;
  try {
    await manageCategory({ action: 'rename', id: currentManageNode.value.id, title: currentManageNode.value.title });
  } catch(e) { hasError = true; }
  try {
    const childrenFromText = parseTextToTree(childEditText.value);
    await manageCategory({ action: 'update_list', subjectId: props.subjectId, parentId: currentManageNode.value.id, children: childrenFromText });
  } catch(e) { hasError = true; }
  uni.hideLoading();
  if (!hasError) {
    uni.showToast({title:'保存成功', icon:'success'});
    await loadData();
    const node = findNode(manageTreeData.value, manageSelectedId.value);
    if(node) childEditText.value = treeToText(node.children || [], 0);
    emit('saved');
    return true;
  } else {
    uni.showToast({title:'部分保存失败', icon:'none'});
    return false;
  }
};

const handleSaveAndExit = async () => {
  const success = await handleGlobalSave();
  if (success) handleClose();
};

const handleClose = () => { emit('update:visible', false); };

const deleteCurrentNode = async () => {
  if(!currentManageNode.value) return;
  uni.showModal({
    content: `确定删除 [${currentManageNode.value.title}] 及其所有子目录吗？`,
    success: async (res) => {
      if(res.confirm) {
        await manageCategory({ action: 'delete', id: currentManageNode.value.id });
        currentManageNode.value = null;
        childEditText.value = '';
        manageSelectedId.value = null;
        await loadData();
        emit('saved');
      }
    }
  });
};
</script>

<style scoped>
/* --- 头部自定义样式 --- */
.custom-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee; background: #fff; }
.modal-title { font-weight: bold; font-size: 16px; color: #333; }
.header-actions { display: flex; gap: 10px; }
.h-btn { padding: 3px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; background: #f1f5f9; color: #64748b; font-weight: bold; display: flex; align-items: center; }
.h-btn:hover { background: #e2e8f0; }
.h-btn.primary { background: #2563eb; color: white; }
.h-btn.outline { background: transparent; border: 1px solid #2563eb; color: #2563eb; box-sizing: border-box; }

/* --- 整体布局 --- */
.content-manage-layout { display: flex; height: 900px; gap: 12px; padding: 12px; }

/* --- 左侧 --- */
.cm-left { width: 300px; display: flex; flex-direction: column; background: #f0f0f0; border-radius: 4px; }
.cm-tree-scroll { flex: 1; padding: 10px; overflow-y: hidden; }
.empty-tip { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }

/* --- 右侧 --- */
.cm-right { flex: 1; display: flex; flex-direction: column; gap: 12px;}
.cm-box { background: white; border-radius: 4px; display: flex; flex-direction: column; overflow: hidden; }
.box-title { background: transparent; padding: 0 0 8px 0px; font-weight: bold; font-size: 14px; color: #475569; border-bottom: none; }
.box-body { background: #ffffff; border-radius: 0px; padding: 0px; display: flex; align-items: center; }
.form-row { display: flex; align-items: center; gap: 12px; width: 100%; }
.inp { height: 32px; padding: 6px 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; text-align: left; flex: 1; box-sizing: border-box; width: auto; }

.del-btn-rect { background: #ef4444; color: white; padding: 0 12px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; height: 32px; line-height: 32px; display: flex; align-items: center; margin-left: 10px; white-space: nowrap; flex-shrink: 0; }
.del-btn-rect:hover { background: #dc2626; }

.bottom-section { background: #f0f0f0; border-radius: 4px; padding: 12px; display: flex; flex-direction: column; }
.bottom-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.section-title { font-weight: bold; font-size: 14px; color: #475569; }
.confirm-btn { background: #2563eb; color: white; font-size: 12px; padding: 4px 12px; border-radius: 4px; border: none; cursor: pointer; line-height: 24px; margin: 0; }
.confirm-btn:hover { background: #1d4ed8; }
.text-edit-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.child-textarea { flex: 1; width: 100%; background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; font-size: 14px; line-height: 1.6; box-sizing: border-box; color: #333; }
.center-txt { text-align: center; color: #94a3b8; font-size: 13px; margin-top: 10px; }
.mb-2 { margin-bottom: 8px; }
.flex-1 { flex: 1; }
</style>