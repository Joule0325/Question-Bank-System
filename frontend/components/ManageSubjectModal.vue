<template>
  <CommonModal :isOpen="visible" maxWidth="500px" @close="handleClose">
    
    <template #header>
      <view class="custom-header">
        <text class="modal-title">目录类型编辑 (科目)</text>
        <view class="header-actions">
          <view class="h-btn primary" @click="handleSave">保存</view>
          <view class="h-btn" @click="handleClose">关闭</view>
          <view class="h-btn outline primary" @click="handleSaveAndExit">保存并退出</view>
        </view>
      </view>
    </template>

    <view class="list-editor">
      <scroll-view scroll-y class="le-body">
        
        <view 
          v-for="(item, index) in list" 
          :key="item._uid" 
          class="le-row"
          :class="{ 
            'dragging': dragIndex === index, 
            'drag-over-target': dragOverIndex === index && dragIndex !== index
          }"
          draggable="true"
          @dragstart="onDragStart(index, $event)"
          @dragover.prevent="onDragOverMove(index, $event)"
          @drop="onDrop(index)"
          @dragend="onDragEnd"
        >
          <view class="col-title flex-1">
            <input 
              v-if="item.isEditing" 
              class="row-input" 
              v-model="item.title" 
              :focus="true"
              @blur="finishEdit(item)" 
              @confirm="finishEdit(item)"
              placeholder="请输入目录名称"
            />
            <view 
              v-else 
              class="row-text" 
              @dblclick="startEdit(item)"
              title="双击编辑"
            >
              {{ item.title || '(未命名目录)' }}
            </view>
          </view>

          <view class="row-actions">
            <image src="/static/icons/添加同级条目.svg" class="img-btn add" @click.stop="addRow(index)" title="在下方添加" />
            
            <image src="/static/icons/减少.svg" class="img-btn minus" @click.stop="deleteRow(index)" title="删除" />
            
            <view class="drag-handle" title="拖动排序">
                 <image src="/static/icons/拖拽.svg" class="img-btn drag-icon" />
            </view>
          </view>
        </view>

        <view v-if="list.length === 0" class="empty-row" @click="addRow(-1)">
           <image src="/static/icons/添加.svg" class="img-btn add empty-add-icon" />
           <text>点击添加第一个目录类型</text>
        </view>

      </scroll-view>
    </view>
  </CommonModal>
</template>

<script setup>
import { ref, watch } from 'vue';
import CommonModal from '@/components/CommonModal.vue';
import { baseUrl } from '@/utils/request.js';

const props = defineProps(['visible', 'initialData', 'mode']);
const emit = defineEmits(['update:visible', 'saved']);
const list = ref([]);

// [核心修改 2] 增加 dragOverIndex 用于追踪鼠标滑过哪个元素
const dragIndex = ref(null);     // 当前正在拖拽的元素索引
const dragOverIndex = ref(null); // 当前鼠标悬停的目标元素索引

// 初始化数据
watch(() => props.visible, (val) => {
  if(val) {
    list.value = JSON.parse(JSON.stringify(props.initialData || [])).map(s => ({
      ...s, 
      isEditing: false,
      _uid: Math.random().toString(36).substr(2, 9) 
    }));
  }
});

// --- 编辑逻辑 ---
const startEdit = (item) => { item.isEditing = true; };
const finishEdit = (item) => {
  item.isEditing = false;
  if (!item.title.trim()) item.title = '新目录';
};

// --- 增删逻辑 ---
const addRow = (index) => {
  const newItem = { id: 'new_' + Date.now(), title: '新目录', isEditing: true, _uid: Math.random().toString(36).substr(2, 9) };
  list.value.splice(index + 1, 0, newItem);
};
const deleteRow = (index) => { list.value.splice(index, 1); };

// --- [核心修改 2] 全新的拖拽排序逻辑 (带辅助线) ---

// 1. 开始拖拽
const onDragStart = (index, event) => {
  dragIndex.value = index;
  // 兼容火狐等浏览器需要设置 dataTransfer 才能拖拽
  if(event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // 可以设置一个透明图片作为拖拽影像，避免遮挡视线(可选)
      // event.dataTransfer.setDragImage(new Image(), 0, 0);
  }
};

// 2. 拖拽经过某元素 (记录当前经过的索引，用于显示辅助线)
// 注意：这里使用了 @dragover.prevent，阻止默认行为以允许放置
const onDragOverMove = (index, event) => {
  if (dragIndex.value === null || dragIndex.value === index) return;
  // 记录当前鼠标悬停在哪一行上
  dragOverIndex.value = index;
};

// 3. 放置 (Drop) 时才进行数据交换
const onDrop = (index) => {
  if (dragIndex.value !== null && dragIndex.value !== index) {
    // 移动数据：将拖拽的项取出，插入到新的位置
    const item = list.value.splice(dragIndex.value, 1)[0];
    // 这里简单处理，直接插入到当前悬停目标的位置（视觉上是插在它前面或后面，取决于具体实现，这里默认插在目标位置）
    list.value.splice(index, 0, item);
  }
  resetDragState();
};

// 4. 拖拽结束 (清理状态)
const onDragEnd = () => {
  resetDragState();
};

const resetDragState = () => {
  dragIndex.value = null;
  dragOverIndex.value = null;
}


const handleSave = async () => {
  try {
    uni.showLoading({ title: '保存中...' });
    
    // 1. 获取请求返回的完整结果 (res)
    const res = await uni.request({ 
      url: baseUrl + '/api/subjects/manage', 
      method: 'POST', 
      header: { Authorization: 'Bearer ' + uni.getStorageSync('token') },
      data: { 
          action: 'update_list', 
          list: list.value.map(item => ({ id: item.id, title: item.title })), 
          mode: props.mode 
      } 
    });

    // 2. [关键修复] 检查 HTTP 状态码
    // 如果不是 200 (比如 403, 500)，手动抛出错误进入 catch
    if (res.statusCode && res.statusCode !== 200) {
        // 尝试获取后端返回的具体错误文字 (例如: "您的会员等级最多只能...")
        const errorMsg = res.data?.error || '保存失败';
        throw new Error(errorMsg);
    }

    // 3. 只有状态码是 200 时，才执行成功逻辑
    uni.hideLoading();
    uni.showToast({ title: '保存成功', icon: 'success' });
    emit('saved');
    return true;

  } catch(e) { 
    uni.hideLoading();
    
    // 4. [关键修复] 将具体的错误原因显示给用户
    // e.message 就是上面 throw new Error(...) 里的内容
    const msg = e.message || '保存失败';
    
    uni.showToast({ 
        title: msg, 
        icon: 'none',
        duration: 3000 // 错误提示多留几秒，让你看清楚
    }); 
    
    console.error('保存出错:', e);
    return false;
  }
};
const handleSaveAndExit = async () => { const success = await handleSave(); if (success) handleClose(); };
const handleClose = () => { emit('update:visible', false); };
</script>

<style scoped>
/* --- 头部样式 --- */
.custom-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee; background: #fff; }
.modal-title { font-weight: bold; font-size: 16px; color: #333; }
.header-actions { display: flex; gap: 10px; }
.h-btn { padding: 4px 12px; border-radius: 4px; font-size: 13px; cursor: pointer; background: #f1f5f9; color: #64748b; font-weight: bold; display: flex; align-items: center; }
.h-btn:hover { background: #e2e8f0; }
.h-btn.primary { background: #2563eb; color: white; }
.h-btn.outline { background: transparent; border: 1px solid #2563eb; color: #2563eb; box-sizing: border-box; }

/* --- 列表容器 --- */
.list-editor { display: flex; flex-direction: column; height: 500px; padding: 10px; background: #f8fafc; }
.le-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-bottom: 10px; }

/* --- 列表行样式 --- */
.le-row { 
  display: flex; 
  align-items: center; 
  padding: 4px 10px; 
  background: white; 
  border-radius: 4px; 
  border: 1px solid #e2e8f0; 
  /* [核心修改 2] 必须设置相对定位，为了让辅助线绝对定位 */
  position: relative;
  transition: all 0.2s;
  margin-bottom: 8px;
}
.le-row:hover { border-color: #cbd5e1; }

/* 正在被拖拽的元素样式 */
.le-row.dragging { opacity: 0.4; background: #f1f5f9; border: 1px dashed #94a3b8; }

/* [核心修改 2] 辅助线样式：当元素被拖拽经过时，使用伪类显示一条蓝线 */
.le-row.drag-over-target::after {
    content: '';
    position: absolute;
    /* 显示在元素下方，模拟插入位置 */
    bottom: -5px; 
    left: 0;
    width: 100%;
    height: 2px; /* 辅助线高度 */
    background-color: #2563eb; /* 蓝色辅助线 */
    border-radius: 2px;
    z-index: 10;
    pointer-events: none; /* 确保辅助线不干扰鼠标事件 */
    box-shadow: 0 0 4px rgba(37, 99, 235, 0.5); /* 增加一点光晕效果 */
}


.col-title { font-size: 14px; color: #334155; margin-right: 15px; }
.flex-1 { flex: 1; }
.row-text { padding: 6px 0; width: 100%; cursor: text; }
.row-input { width: 100%; font-size: 14px; padding: 5px 8px; border: 1px solid #2563eb; border-radius: 4px; background: #eff6ff;}

/* --- [核心修改 1] 按钮区域新样式 --- */
.row-actions { display: flex; align-items: center; gap: 12px; }

/* 通用图片按钮样式 */
.img-btn {
  width: 22px;
  height: 22px;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  opacity: 0.7;
}
.img-btn:hover { opacity: 1; transform: scale(1.1); }

/* 特定颜色微调 (如果 SVG 本身没有颜色，可以用 CSS filter，这里假设 SVG 自带颜色) */
.img-btn.add:hover { filter: drop-shadow(0 0 2px rgba(37, 99, 235, 0.5)); }
.img-btn.minus:hover { filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.5)); }

/* 拖动把手容器 */
.drag-handle {
    cursor: grab;
    display: flex; align-items: center;
    padding: 2px;
}
.drag-handle:active { cursor: grabbing; }
.drag-icon { width: 22px; height: 22px; opacity: 0.5; } /* 拖动图标稍微大一点淡一点 */
.drag-handle:hover .drag-icon { opacity: 0.8; }


/* 空状态 */
.empty-row { 
  padding: 20px; border: 2px dashed #cbd5e1; border-radius: 8px; color: #64748b; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; gap: 8px; 
}
.empty-row:hover { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
.empty-add-icon { width: 24px; height: 24px; opacity: 0.6; }
</style>