<template>
  <CommonModal :isOpen="visible" title="目录类型编辑 (科目)" maxWidth="500px" @close="$emit('update:visible', false)">
    <view class="list-editor">
      <view class="le-toolbar">
        <view class="tb-btn" @click="addRow"><text>➕ 添加</text></view>
        <view class="tb-btn red" @click="deleteRows"><text>🗑️ 删除</text></view>
        <view class="tb-divider"></view>
        <view class="tb-btn" @click="move('up')"><text>⬆️ 上移</text></view>
        <view class="tb-btn" @click="move('down')"><text>⬇️ 下移</text></view>
      </view>
      <view class="le-header">
        <text class="col-chk">选</text>
        <text class="col-title">可编辑目录类型</text>
      </view>
      <scroll-view scroll-y class="le-body h-300">
        <view v-for="(item, idx) in list" :key="item.id || idx" class="le-row" :class="{checked: item.checked}" @click="item.checked=!item.checked">
          <view class="col-chk"><text v-if="item.checked" class="chk-icon">✓</text></view>
          <input class="col-input" v-model="item.title" @click.stop placeholder="输入名称" />
        </view>
      </scroll-view>
      <view class="foot-btns">
        <button class="btn" @click="$emit('update:visible', false)">取消</button>
        <button class="btn primary" @click="handleSave">保存修改</button>
      </view>
    </view>
  </CommonModal>
</template>

<script setup>
import { ref, watch } from 'vue';
import CommonModal from '@/components/CommonModal.vue';
import { baseUrl } from '@/utils/request.js';

const props = defineProps(['visible', 'initialData']);
const emit = defineEmits(['update:visible', 'saved']);
const list = ref([]);

watch(() => props.visible, (val) => {
  if(val) list.value = JSON.parse(JSON.stringify(props.initialData)).map(s => ({...s, checked: false}));
});

const addRow = () => list.value.push({ id: 'new_' + Date.now(), title: '', checked: false });
const deleteRows = () => list.value = list.value.filter(s => !s.checked);
const move = (dir) => {
  for (let i = 0; i < list.value.length; i++) {
    if (dir === 'up') {
      if (i > 0 && list.value[i].checked && !list.value[i-1].checked) 
        [list.value[i], list.value[i-1]] = [list.value[i-1], list.value[i]];
    } else {
      const idx = list.value.length - 1 - i;
      if (idx < list.value.length - 1 && list.value[idx].checked && !list.value[idx+1].checked) 
        [list.value[idx], list.value[idx+1]] = [list.value[idx+1], list.value[idx]];
    }
  }
};
const handleSave = async () => {
  try {
    await uni.request({ url: baseUrl + '/api/subjects/manage', method: 'POST', data: { action: 'update_list', list: list.value } });
    emit('saved');
    emit('update:visible', false);
  } catch(e) { uni.showToast({title: '保存失败', icon: 'none'}); }
};
</script>

<style scoped>
.list-editor { display: flex; flex-direction: column; height: 400px; }
.le-toolbar { display: flex; gap: 8px; padding-bottom: 10px; align-items: center; }
.tb-btn { padding: 4px 8px; background: #f1f5f9; border-radius: 4px; font-size: 12px; cursor: pointer; border: 1px solid #e2e8f0; }
.tb-btn:hover { background: #e2e8f0; }
.tb-btn.red { color: #ef4444; }
.tb-divider { width: 1px; height: 16px; background: #cbd5e1; margin: 0 4px; }
.le-header { display: flex; background: #f1f5f9; padding: 8px 10px; font-weight: bold; font-size: 12px; color: #64748b; border-radius: 4px 4px 0 0; }
.le-body { flex: 1; border: 1px solid #e2e8f0; border-top: none; overflow-y: hidden; background: white; }
.le-row { display: flex; align-items: center; padding: 8px 10px; border-bottom: 1px solid #f8fafc; cursor: pointer; }
.le-row:hover { background: #f8fafc; }
.le-row.checked { background: #eff6ff; }
.col-chk { width: 30px; text-align: center; }
.chk-icon { color: #2563eb; }
.col-input { flex: 1; font-size: 13px; padding: 4px; border: 1px solid transparent; background: transparent; }
.col-input:focus { background: white; border-color: #bfdbfe; }
.h-300 { height: 300px; }
.foot-btns { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 10px; border-top: 1px solid #f1f5f9; }
.btn { padding: 6px 20px; border-radius: 4px; font-size: 13px; background: #f1f5f9; cursor: pointer; border: none; }
.btn.primary { background: #2563eb; color: white; }
</style>