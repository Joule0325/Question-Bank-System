<template>
	<view class="tree-container">
		<view class="node-wrapper" :style="{ marginLeft: (level * 16) + 'px' }">
			<view 
				class="node-content" 
				:class="{ 'selected': selectedIds.includes(node.id) }"
				:style="{ width: `calc(260px - ${level * 16}px)` }"
				@click.stop="handleClick"
			>
				<view class="toggle-icon" @click.stop="toggleOpen">
					<text v-if="hasChildren" class="icon-txt">{{ isOpen ? '-' : '+' }}</text>
					<text v-else class="icon-txt disabled">●</text>
				</view>
				<view v-if="node.color" class="color-dot" :style="{ backgroundColor: node.color }"></view>
				<text class="node-title">{{ node.title }}</text>
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
				@select="(e, id) => emit('select', e, id)"
			></CategoryTree>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
// 注意：递归组件在 Vue 3 script setup 中通常不需要显式引入自己，但部分环境可能需要
// 如果编译报错，保留下面这行；如果不报错，Vue 3 会自动处理组件名递归。
import CategoryTree from './CategoryTree.vue';

const props = defineProps(['node', 'level', 'selectedIds', 'defaultOpen', 'expandedIds']);
const emit = defineEmits(['select']);

const isOpen = ref(props.defaultOpen);

// Watch props.defaultOpen to support "Expand/Collapse All" from parent
watch(() => props.defaultOpen, (val) => isOpen.value = val);

// Watch expandedIds for Search functionality
watch(() => props.expandedIds, (ids) => {
	if (ids && ids.includes(props.node.id)) {
		isOpen.value = true;
	}
}, { deep: true });

const hasChildren = computed(() => props.node.children && props.node.children.length > 0);

const toggleOpen = () => { isOpen.value = !isOpen.value; }

const handleClick = (e) => {
	emit('select', e, props.node);
};
</script>

<style scoped>
.tree-container {
	width: 100%;
	overflow-y: hidden;
	box-sizing: border-box;
}

.node-wrapper {
	position: relative;
	transition: all 0.2s;
	margin-bottom: 6px;
	padding-right: 8px;
}

.node-content {
	display: flex;
	align-items: center;
	padding: 4px 6px;
	/* 这里保留 width: 260px 作为默认值/回退值，
	   但在 template 中会被动态 style 覆盖 
	*/
	width: 260px; 
	border-radius: 4px;
	background-color: white;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
	cursor: pointer;
	user-select: none;
	border: 1px solid transparent;
	margin-right: 15px;
	max-width: 100%;
}

.node-content:hover {
	background-color: #fff;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.node-content:hover .node-title {
	color: #2563eb;
}

.node-content:hover .icon-txt {
	color: rgb(98, 148, 206);
	border-color: rgb(98, 148, 206);
}

.node-content.selected {
	background-color: rgb(98, 148, 206);
	border-color: rgb(98, 148, 206);
}

.node-content.selected .node-title {
	color: white;
	font-weight: bold;
}

.toggle-icon {
	width: 15px;
	height: 15px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 8px;
	border-radius: 3px;
	border: 1px solid #f0f0f0;
	background-color: #f0f0f0;
}

.icon-txt {
	font-family: monospace;
	font-weight: bold;
	color: #64748b;
	font-size: 14px;
	line-height: 1;
}

.icon-txt.disabled {
	color: #e2e8f0;
	font-size: 12px;
}

.node-title {
	font-size: 14px;
	color: #334155;
	flex: 1;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.children-list {
	width: 100%;
}

.color-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	margin-right: 6px;
}
</style>