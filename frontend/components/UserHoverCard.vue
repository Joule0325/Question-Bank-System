<template>
  <view class="hover-card" :style="{ top: top + 'px', left: left + 'px' }" @mouseenter="onEnter" @mouseleave="onLeave">
    <view class="card-bg-decoration"></view>
    <view class="card-content">
      <view class="header-row">
        <view class="avatar-wrap">
          <image v-if="userInfo.avatar" :src="userInfo.avatar" mode="aspectFill" class="real-avatar" />
          <view v-else class="avatar-placeholder">{{ userInfo.nickname ? userInfo.nickname[0] : 'U' }}</view>
          <view class="level-badge">Lv.{{ userInfo.level || 1 }}</view>
        </view>
        <view class="info-right">
          <text class="nickname">{{ userInfo.nickname || '用户' }}</text>
          <text class="id-tag">ID: {{ userInfo.uid }}</text>
        </view>
      </view>
      <text class="signature">{{ userInfo.signature || '这个人很懒，什么都没写~' }}</text>
      
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-num">{{ userInfo.following || 0 }}</text>
          <text class="stat-label">关注</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ userInfo.fans || 0 }}</text>
          <text class="stat-label">粉丝</text>
        </view>
        <view class="stat-item">
          <text class="stat-num text-gold">VIP{{ userInfo.vipLevel || 0 }}</text>
          <text class="stat-label">等级</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  userInfo: { type: Object, required: true },
  top: { type: Number, default: 0 },
  left: { type: Number, default: 0 }
});

const emit = defineEmits(['close', 'keep']);

const onEnter = () => emit('keep');
const onLeave = () => emit('close');
</script>

<style lang="scss" scoped>
.hover-card {
  position: fixed;
  z-index: 9999;
  width: 280px;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  padding: 0;
  pointer-events: auto;
}

.card-bg-decoration {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.card-content {
  padding: 16px;
  position: relative;
  z-index: 1;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.avatar-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #eff6ff;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 20px;
  color: #2563eb;
  font-weight: bold;
  overflow: hidden;
}

.real-avatar { width: 100%; height: 100%; border-radius: 50%; }

.level-badge {
  position: absolute; bottom: -2px; right: -4px;
  background: #f59e0b; color: white;
  font-size: 8px; padding: 1px 4px;
  border-radius: 8px; border: 1px solid white;
}

.info-right { display: flex; flex-direction: column; gap: 2px; }
.nickname { font-size: 16px; font-weight: 800; color: #1e293b; }
.id-tag { font-size: 11px; color: #94a3b8; font-family: monospace; }

.signature {
  font-size: 12px; color: #475569; display: block;
  margin-bottom: 15px; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.stats-row {
  display: flex; justify-content: space-between;
  background: rgba(255,255,255,0.6);
  border-radius: 8px; padding: 8px 12px;
  border: 1px solid #f1f5f9;
}

.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-num { font-size: 14px; font-weight: 800; color: #334155; }
.stat-label { font-size: 10px; color: #94a3b8; margin-top: 2px; }
.text-gold { color: #d97706; }
</style>