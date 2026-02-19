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
          <view class="name-row">
              <text class="nickname">{{ userInfo.nickname || '用户' }}</text>
              
              <view v-if="!isSelf" 
                    class="follow-btn" 
                    :class="{ 'following': isFollowing, 'friend': isFriend }"
                    @click.stop="handleFollow"
              >
                  {{ followBtnText }}
              </view>
          </view>
          <text class="id-tag">ID: {{ userInfo.uid }}</text>
        </view>
      </view>
      <text class="signature">{{ userInfo.signature || '这个人很懒，什么都没写~' }}</text>
      
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-num">{{ currentFollowingCount }}</text>
          <text class="stat-label">关注</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ currentFansCount }}</text>
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
import { defineProps, defineEmits, computed, ref, onMounted, watch } from 'vue';
import { followUser } from '@/api/user.js'; // 引入API

const props = defineProps({
  userInfo: { type: Object, required: true },
  top: { type: Number, default: 0 },
  left: { type: Number, default: 0 }
});

const emit = defineEmits(['close', 'keep']);

// 本地状态，用于点击后即时更新显示，不需要刷新页面
const localFansCount = ref(props.userInfo.fans || 0);
const currentUser = ref(uni.getStorageSync('user') || {});

// 监听 props 变化，更新本地数据
watch(() => props.userInfo, (newVal) => {
    if(newVal) localFansCount.value = newVal.fans || 0;
}, { immediate: true });

// 计算属性
const isSelf = computed(() => {
    return currentUser.value.uid === props.userInfo.uid;
});

const isFollowing = computed(() => {
    // 检查当前登录用户的 following 列表里有没有这个人的 ID
    // 注意：userInfo._id 是 MongoDB 的 ObjectId
    const myFollowing = currentUser.value.following || [];
    return myFollowing.includes(props.userInfo._id || props.userInfo.id);
});

// 简单的互关判断逻辑 (需后端返回 followers 列表支持更精准判断，这里做简化展示)
// 真正的互关判断最好依赖后端返回的 isFriend 字段
const isFriend = ref(false); 

const followBtnText = computed(() => {
    if (isFriend.value) return '互相关注';
    if (isFollowing.value) return '已关注';
    return '+ 关注';
});

const currentFansCount = computed(() => {
    // 后端现在返回的是 followers 数组
    if (Array.isArray(props.userInfo.followers)) {
        return props.userInfo.followers.length;
    }
    return props.userInfo.fans || 0;
});

const currentFollowingCount = computed(() => {
    // 关注列表也是数组，显示长度
    if (Array.isArray(props.userInfo.following)) {
        return props.userInfo.following.length;
    }
    return props.userInfo.following || 0;
});

const onEnter = () => emit('keep');
const onLeave = () => emit('close');

const handleFollow = async () => {
    if (!uni.getStorageSync('token')) {
        return uni.showToast({ title: '请先登录', icon: 'none' });
    }

    try {
        // 调用接口
        const res = await followUser(props.userInfo._id || props.userInfo.id);
        
        if (res.success) {
            // 1. 更新当前用户的本地缓存 (myFollowing)
            currentUser.value.following = res.myFollowing;
            uni.setStorageSync('user', currentUser.value);
            
            // 2. 更新目标用户的粉丝数显示
            localFansCount.value = res.targetFollowersCount;
            
            // 3. 更新好友状态
            isFriend.value = res.isFriend;

            uni.showToast({ 
                title: res.action === 'followed' ? '关注成功' : '已取消关注', 
                icon: 'none' 
            });
        }
    } catch (e) {
        console.error(e);
        uni.showToast({ title: '操作失败', icon: 'none' });
    }
};
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
.name-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* [新增] 关注按钮样式 */
.follow-btn {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
    
    // 默认状态 (+关注)
    background: #2563eb;
    color: white;
    border: 1px solid #2563eb;

    &:hover {
        background: #1d4ed8;
    }

    // 已关注状态
    &.following {
        background: #f1f5f9;
        color: #64748b;
        border: 1px solid #cbd5e1;
        &:hover {
            content: '取消'; /* 只有鼠标放上去才显式取消含义，这里仅作样式参考 */
            background: #e2e8f0;
            color: #ef4444; 
            border-color: #fca5a5;
        }
    }

    // 互相关注状态
    &.friend {
        background: #ecfdf5;
        color: #10b981;
        border: 1px solid #6ee7b7;
    }
}
</style>