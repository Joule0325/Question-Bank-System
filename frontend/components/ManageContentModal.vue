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
            @select="handleManageTreeSelect"
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
const childEditText = ref(''); // 核心：绑定子目录编辑的文本框

// ----------------------------------------------------------------
// 1. 数据加载与树操作
// ----------------------------------------------------------------

const loadData = async () => {
  if (!props.subjectId) return;
  const data = await getCategories(props.subjectId);
  manageTreeData.value = data || [];
  
  // 如果当前有选中节点，刷新后尝试保持选中状态
  if (manageSelectedId.value) {
    const node = findNode(manageTreeData.value, manageSelectedId.value);
    if (node) {
      // 更新当前节点引用，但【不要】重置 childEditText
      // 这样可以防止用户正在输入时，后台刷新导致文字丢失
      // 只有在切换节点或保存成功后，我们才主动更新文本框
      currentManageNode.value = JSON.parse(JSON.stringify(node));
    }
  }
};

watch(() => props.visible, (val) => {
  if (val) {
    loadData();
    // 重置状态
    manageSelectedId.value = null;
    currentManageNode.value = null;
    childEditText.value = '';
  }
});

// 递归查找节点辅助函数
const findNode = (nodes, id) => {
  for(let n of nodes) {
    if(n.id === id) return n; 
    if(n.children) { const found = findNode(n.children, id); if(found) return found; }
  }
  return null;
};

// 【核心逻辑】点击左侧树节点
const handleManageTreeSelect = (e, node) => {
  manageSelectedId.value = node.id;
  currentManageNode.value = JSON.parse(JSON.stringify(node));
  
  // 将该节点的 children 树形结构 -> 转换为文本显示
  childEditText.value = treeToText(node.children || [], 0);
};

// ----------------------------------------------------------------
// 2. 文本 <-> 树结构 转换算法
// ----------------------------------------------------------------

// 树转文本 (Tree -> Text)
const treeToText = (nodes, level) => {
  if (!nodes || nodes.length === 0) return '';
  let text = '';
  const prefix = '-'.repeat(level);
  nodes.forEach(node => {
    // 格式：---标题
    text += `${prefix}${node.title}\n`;
    if (node.children && node.children.length > 0) {
      text += treeToText(node.children, level + 1);
    }
  });
  return text;
};

// 文本转树 (Text -> Tree)
const parseTextToTree = (text) => {
  if (!text || !text.trim()) return [];
  
  const lines = text.split('\n');
  const root = { children: [] }; 
  const stack = [root]; // 栈结构控制层级
  
  // 辅助：获取前面的横杠数量
  const getLevel = (str) => {
    let i = 0;
    while (i < str.length && str[i] === '-') i++;
    return i;
  };

  lines.forEach(line => {
    if (!line.trim()) return; // 跳过空行

    const level = getLevel(line);
    // 去掉横杠，获取真实标题
    let title = line.substring(level).trim();
    if (!title) return; 

    const newNode = {
      title: title,
      children: []
    };

    // 栈操作：如果当前层级 <= 栈顶层级，回退找到正确的父级
    while (stack.length > level + 1) {
      stack.pop();
    }
    
    // 找到父节点 (栈顶就是父节点)
    const parent = stack[stack.length - 1];
    if (parent) {
       parent.children.push(newNode);
    }
    
    // 入栈，作为可能的下一级父节点
    stack.push(newNode);
  });
  
  return root.children;
};

// ----------------------------------------------------------------
// 3. 保存与删除逻辑
// ----------------------------------------------------------------

// 右下角按钮：仅保存子目录
const handleConfirmChildren = async () => {
  if (!currentManageNode.value) return;
  
  // 1. 从文本框解析出最新的子目录结构
  const newChildren = parseTextToTree(childEditText.value);
  
  try {
    uni.showLoading({ title: '保存中...' });
    
    // 2. 发送请求
    await manageCategory({ 
      action: 'update_list', 
      subjectId: props.subjectId, 
      parentId: currentManageNode.value.id, 
      children: newChildren 
    });
    
    // 3. 刷新数据
    await loadData();
    
    // 4. 重新格式化文本框 (确保格式规范)
    const node = findNode(manageTreeData.value, manageSelectedId.value);
    if(node) childEditText.value = treeToText(node.children || [], 0);
    
    uni.hideLoading();
    uni.showToast({title: '子目录已更新', icon: 'success'});
    emit('saved');
    
  } catch(e) {
    uni.hideLoading();
    console.error(e);
    uni.showToast({title: '保存失败', icon: 'none'});
  }
};

// 顶部按钮：全局保存 (重命名 + 子目录)
const handleGlobalSave = async () => {
  if (!currentManageNode.value) {
    uni.showToast({title: '请先选择目录', icon:'none'});
    return false;
  }

  uni.showLoading({ title: '保存中...' });
  let hasError = false;

  // 1. 保存名称 (Rename)
  try {
    await manageCategory({ 
      action: 'rename', 
      id: currentManageNode.value.id, 
      title: currentManageNode.value.title 
    });
  } catch(e) { hasError = true; }

  // 2. 保存子目录 (Update List)
  // 【关键修复】：这里必须从 childEditText 解析数据，绝对不能用旧变量
  try {
    const childrenFromText = parseTextToTree(childEditText.value);
    
    await manageCategory({ 
      action: 'update_list', 
      subjectId: props.subjectId, 
      parentId: currentManageNode.value.id, 
      children: childrenFromText 
    });
  } catch(e) { hasError = true; }

  uni.hideLoading();

  if (!hasError) {
    uni.showToast({title:'保存成功', icon:'success'});
    // 刷新全树
    await loadData();
    // 重新格式化文本框
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

const handleClose = () => { 
  emit('update:visible', false); 
};

const deleteCurrentNode = async () => {
  if(!currentManageNode.value) return;
  uni.showModal({
    content: `确定删除 [${currentManageNode.value.title}] 及其所有子目录吗？`,
    success: async (res) => {
      if(res.confirm) {
        await manageCategory({ action: 'delete', id: currentManageNode.value.id });
        // 清空状态
        currentManageNode.value = null;
        childEditText.value = '';
        manageSelectedId.value = null;
        
        await loadData(); // 刷新树
        emit('saved');
      }
    }
  });
};
</script>

<style scoped>
/* --- 头部自定义样式 (保持不变) --- */
.custom-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee; background: #fff; }
.modal-title { font-weight: bold; font-size: 16px; color: #333; }
.header-actions { display: flex; gap: 10px; }
.h-btn { padding: 6px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; background: #f1f5f9; color: #64748b; font-weight: bold; display: flex; align-items: center; }
.h-btn:hover { background: #e2e8f0; }
.h-btn.primary { background: #2563eb; color: white; }
.h-btn.outline { background: transparent; border: 1px solid #2563eb; color: #2563eb; box-sizing: border-box; }

/* --- 整体布局 --- */
.content-manage-layout { display: flex; height: 900px; gap: 12px; padding: 12px; }

/* --- 左侧：无边框，灰底 --- */
.cm-left { 
  width: 300px; 
  display: flex; flex-direction: column; background: #f0f0f0; 
  border-radius: 4px; /* 只有圆角，没有 border */
}
.cm-tree-scroll { flex: 1; padding: 10px; overflow-y: hidden; }
.empty-tip { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }

/* --- 右侧 --- */
.cm-right { flex: 1; display: flex; flex-direction: column; gap: 12px;}

/* --- 盒子通用样式 --- */
/* 核心修改：背景统一为白色，无边框 */
.cm-box { 
  background: white; 
  /* border: 1px solid #e2e8f0; */ /* 已注释掉边框 */
  border-radius: 4px; 
  display: flex; flex-direction: column; overflow: hidden; 
}
/* 1. 标题：去背景，干净利落 */
.box-title { 
  background: transparent; 
  padding: 0 0 8px 0px;   /* 下方留点空隙给灰色盒子 */
  font-weight: bold; 
  font-size: 14px; 
  color: #475569; 
  border-bottom: none; 
}

/* 2. 内容区域：灰色圆角矩形 + 让子元素整体居中 */
.box-body { 
  background: #ffffff;      /* 灰色背景 */
  border-radius: 0px;       /* 圆角 */
  padding: 0px;            /* 给内部多一点留白，看起来更大气 */
  
  display: flex;
  align-items: center;      /* 垂直居中 */
}

/* 3. 输入行容器 */
.form-row {
  display: flex; 
  align-items: center; 
  gap: 12px;                /* 元素之间的间距 */
  
  /* 这里设为 auto，让它包裹内容，从而被父元素 box-body 居中 */
  width: 100%;        
}

/* 4. 输入框 */
.inp { 
  height: 32px; 
  padding: 6px 10px; 
  font-size: 13px; 
  
  border: 1px solid #cbd5e1; 
  border-radius: 4px; 
  background: white;        /* 输入框背景白色，突出显示 */
  
  /* 【核心】文字左对齐 */
  text-align: left;    
  flex: 1;
  box-sizing: border-box; 
  
  /* 建议给个固定宽度，或者 min-width，否则居中时可能显得太窄 */
  width: auto;         
}

.lbl { width: 40px; font-weight: bold; color: #64748b; }
.flex-1 { flex: 1; }

/* 红色删除按钮 (右侧上面的修改) */
.del-btn-rect {
  background: #ef4444; color: white;
  padding: 0 12px; border-radius: 4px;
  font-size: 12px; font-weight: bold; cursor: pointer;
  height: 32px; line-height: 32px; display: flex; align-items: center;
  margin-left: 10px;
  white-space: nowrap; /* 核心：防止文字换行 */
  flex-shrink: 0;      /* 核心：禁止按钮缩小 */
}
.del-btn-rect:hover { background: #dc2626; }

/* --- 右下角样式 (恢复原样) --- */
/* 1. 下部盒子外部容器：改成灰色背景、圆角 */
.bottom-section { 
  background: #f0f0f0; 
  border-radius: 4px; 
  padding: 12px; 
  display: flex; 
  flex-direction: column;
}

.bottom-header-row {
  display: flex;
  justify-content: space-between; /* 一左一右 */
  align-items: center;            /* 垂直居中 */
  margin-bottom: 10px;            /* 和下方文本框拉开距离 */
}

.section-title {
  font-weight: bold;
  font-size: 14px;
  color: #475569;
}

/* 按钮样式 (放在右上角) */
.confirm-btn {
  background: #2563eb;
  color: white;
  font-size: 12px;       /* 字体稍微小一点，显得精致 */
  padding: 4px 12px;     /* 内边距 */
  border-radius: 4px;
  border: none;
  cursor: pointer;
  line-height: 24px;     /* 确保文字垂直居中 */
  margin: 0;             /* 去掉默认 margin */
}
.confirm-btn:hover { background: #1d4ed8; }
.confirm-btn:active { opacity: 0.8; }

.text-edit-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 文本域样式 */
.child-textarea {
  flex: 1; /* 撑满剩余高度 */
  width: 100%;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  box-sizing: border-box;
  color: #333;
}


/* 按钮行 */
.btn-row {
  display: flex;
  justify-content: flex-end; /* 按钮靠右，或者 center 居中 */
}

/* 2. 列表编辑器容器：去掉边框，因为外层已经是灰色了 */
.list-editor.flat { 
  border: none;         /* 去边框 */
  background: transparent; 
  height: 100%;
  display: flex; flex-direction: column;
}

/* 3. 工具栏 (添加/删除按钮那一栏)：透明背景 */
.le-toolbar.sm { 
  background: transparent; 
  border-bottom: none; 
  padding: 0 0 8px 0;   /* 稍微留点空隙 */
}

/* 4. 列表主体 (核心)：设为白色背景，形成卡片感 */
.le-body { 
  flex: 1; 
  overflow-y: auto; 
  
  /* --- 核心：列表内容区变成白色卡片 --- */
  background: white;    
  border-radius: 6px;   
  /* -------------------------------- */
}

/* 5. 每一行列表项 */
.le-row {
  display: flex; align-items: center; 
  padding: 8px 10px; 
  border-bottom: 1px solid #f1f5f9; /* 浅色分割线 */
  cursor: pointer;
}

/* 复用原有的列表样式，确保列表看起来正常 */
.list-editor.flat { 
  height: 100%; 
  /* border: 1px solid #e2e8f0; */ /* 如果你也想去掉列表的边框，就注释这行；想保留就解开 */
  border-radius: 4px; 
  display: flex; flex-direction: column; 
}
.le-toolbar.sm { padding: 8px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 8px; align-items: center; }
.tb-btn { padding: 4px 8px; background: white; border-radius: 4px; font-size: 12px; cursor: pointer; border: 1px solid #e2e8f0; }
.tb-divider { width: 1px; height: 16px; background: #cbd5e1; margin: 0 4px; }

/* 列表主体 */
.le-body { flex: 1; overflow-y: auto; }
.le-row { display: flex; align-items: center; padding: 8px 10px; border-bottom: 1px solid #f8fafc; cursor: pointer; }
.le-row.checked { background: #eff6ff; }
.col-chk { width: 30px; text-align: center; }
.chk-icon { color: #2563eb; }
.col-input { flex: 1; font-size: 13px; background: transparent; border: none; }

/* 其他辅助 */
.center-txt { text-align: center; color: #94a3b8; font-size: 13px; margin-top: 10px; }
.mb-2 { margin-bottom: 8px; }
</style>