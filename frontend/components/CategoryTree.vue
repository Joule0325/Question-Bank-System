<template>
  <view class="tree-container">
    <view class="node-wrapper" :style="{ marginLeft: (level * 16) + 'px' }">
      <view 
        class="node-content" 
        :class="{ 
          'selected': selectedIds.includes(node.id),
          'drag-over-target': isDragOver 
        }"
        :style="{ width: `calc(260px - ${level * 16}px)` }"
        @click.stop="handleClick"
        
        :draggable="draggable"
        @dragstart="onDragStart"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <view class="toggle-icon" @click.stop="toggleOpen">
          <text v-if="hasChildren" class="icon-txt">{{ isOpen ? '-' : '+' }}</text>
          <text v-else class="icon-txt disabled">●</text>
        </view>
        
        <view v-if="node.color" class="color-dot" :style="{ backgroundColor: node.color }"></view>
        
        <text class="node-title">{{ node.title }}</text>
        
        <view v-if="draggable" class="drag-handle" @click.stop>
           <image src="/static/icons/拖拽.svg" class="drag-icon" />
        </view>
      </view>
    </view>

    <view v-if="isOpen" class="children-list">
      <CategoryTree 
        v-for="child in node.children" 
        :key="child.id" 
        :node="child" 
        :level="level + 1"
        :selectedIds="selectedIds"
        :defaultOpen="defaultOpen" 
        :expandedIds="expandedIds"
        :draggable="draggable" 
        @select="(e, id) => emit('select', e, id)"
        @node-drop="handleRecursiveDrop" 
      ></CategoryTree>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
// 引用自身以递归
import CategoryTree from './CategoryTree.vue';

const props = defineProps({
  node: Object,
  level: Number,
  selectedIds: Array,
  defaultOpen: Boolean,
  expandedIds: Array,
  draggable: { type: Boolean, default: false }
});

const emit = defineEmits(['select', 'node-drop']);

const isOpen = ref(props.defaultOpen);
const isDragOver = ref(false);

watch(() => props.defaultOpen, (val) => isOpen.value = val);

watch(() => props.expandedIds, (ids) => {
  if (ids && ids.includes(props.node.id)) isOpen.value = true;
}, { deep: true });

const hasChildren = computed(() => props.node.children && props.node.children.length > 0);
const toggleOpen = () => { isOpen.value = !isOpen.value; }
const handleClick = (e) => { emit('select', e, props.node); };

// --- 递归事件传递 ---
// 子节点触发 drop 时，父节点收到后要继续往上报，直到报给 ManageContentModal
const handleRecursiveDrop = (payload) => {
  emit('node-drop', payload);
};

// --- 拖拽逻辑 ---
const onDragStart = (e) => {
  if (!props.draggable) return;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', props.node.id);
  // 调试日志
  console.log('Drag Start:', props.node.title);
};

const onDragOver = (e) => {
  if (!props.draggable) return;
  e.preventDefault(); // 【关键】必须阻止默认行为，否则 drop 不会触发
  e.dataTransfer.dropEffect = 'move';
  isDragOver.value = true;
};

const onDragLeave = () => {
  isDragOver.value = false;
};

const onDrop = (e) => {
  if (!props.draggable) return;
  e.stopPropagation(); // 停止冒泡
  isDragOver.value = false;
  
  const sourceId = e.dataTransfer.getData('text/plain');
  console.log('Drop:', sourceId, '->', props.node.title);

  if (sourceId && sourceId !== props.node.id) {
    // 触发事件：请求将 sourceId 移动到我 (targetId) 的下面
    emit('node-drop', { sourceId, targetId: props.node.id, position: 'bottom' });
  }
};
</script>

<style scoped>
.tree-container { width: 100%; overflow-y: hidden; box-sizing: border-box; }
.node-wrapper { position: relative; transition: all 0.2s; margin-bottom: 6px; padding-right: 8px; }

.node-content {
  display: flex; align-items: center; padding: 4px 6px;
  width: 260px; border-radius: 4px; background-color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); cursor: pointer; user-select: none;
  border: 1px solid transparent; margin-right: 15px; max-width: 100%;
  position: relative; 
}
.node-content:hover { background-color: #fff; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); }
.node-content:hover .node-title { color: #2563eb; }
.node-content:hover .icon-txt { color: rgb(98, 148, 206); border-color: rgb(98, 148, 206); }
.node-content.selected { background-color: rgb(98, 148, 206); border-color: rgb(98, 148, 206); }
.node-content.selected .node-title { color: white; font-weight: bold; }

/* 蓝色辅助线：模仿目录类型管理的样式 */
.node-content.drag-over-target::after {
  content: '';
  position: absolute;
  bottom: -5px; 
  left: 0;
  width: 100%;
  height: 3px; 
  background-color: #2563eb; 
  z-index: 10;
  box-shadow: 0 0 4px rgba(37,99,235,0.5); 
  border-radius: 2px;
  pointer-events: none;
}

.toggle-icon { width: 15px; height: 15px; display: flex; align-items: center; justify-content: center; margin-right: 8px; border-radius: 3px; border: 1px solid #f0f0f0; background-color: #f0f0f0; }
.icon-txt { font-family: monospace; font-weight: bold; color: #64748b; font-size: 14px; line-height: 1; }
.icon-txt.disabled { color: #e2e8f0; font-size: 12px; }
.node-title { font-size: 14px; color: #334155; flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.children-list { width: 100%; }
.color-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }

/* 拖拽手柄样式 */
.drag-handle {
  padding: 2px 4px;
  margin-left: auto; /* 靠右对齐 */
  cursor: grab;
  opacity: 0.5;
  display: flex; 
  align-items: center;
}
.drag-handle:hover { opacity: 1; }
.drag-icon { width: 16px; height: 16px; }
</style>