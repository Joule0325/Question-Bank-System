<template>
	<view class="modal-mask" v-if="isOpen" >
		<view class="modal-container" :style="{ maxWidth: maxWidth, width: '100%' }" @click.stop>
			<view class="modal-header">
				<text class="modal-title">{{ title }}</text>
				<view class="close-btn" @click="$emit('close')">✕</view>
			</view>
			<view class="modal-body"><slot></slot></view>
		</view>
	</view>
</template>

<script setup>
defineProps({
	isOpen: Boolean,
	title: String,
	maxWidth: { type: String, default: '600px' }
});
defineEmits(['close']);
</script>

<style scoped>
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
.modal-container { background: white; border-radius: 8px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; margin: 15px; }
.modal-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; background: #f9f9f9; }
.modal-title { font-weight: bold; font-size: 16px; }
.close-btn { cursor: pointer; padding: 0 5px; color: #999; }
.modal-body { padding: 20px; overflow-y: auto; }
</style>