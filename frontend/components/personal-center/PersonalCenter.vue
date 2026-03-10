<template>
  <view class="full-screen-bg">
    <view class="app-wrapper">

      <view class="top-nav-container">
        <view class="nav-list">
          <view class="nav-item" :class="{ active: currentTab === 'home' }" @click="switchTab('home')">个人首页</view>
          <view class="nav-item" :class="{ active: currentTab === 'papers' }" @click="switchTab('papers')">组卷/讲义</view>
          <view class="nav-item" :class="{ active: currentTab === 'tags' }" @click="switchTab('tags')">标签管理</view>
          <view class="nav-item" :class="{ active: currentTab === 'fav' }" @click="switchTab('fav')">收藏夹</view>
          <view class="nav-item" :class="{ active: currentTab === 'orders' }" @click="switchTab('orders')">我的订单</view>
        </view>
      </view>

      <view class="main-content">
        <TabHome v-if="currentTab === 'home'" />
        <TabPapers v-if="currentTab === 'papers'" />
        <TabTags v-if="currentTab === 'tags'" />
        <TabFav v-if="currentTab === 'fav'" />
        <TabOrders v-if="currentTab === 'orders'" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import TabHome from './TabHome.vue';
import TabPapers from './TabPapers.vue';
import TabTags from './TabTags.vue';
import TabFav from './TabFav.vue';
import TabOrders from './TabOrders.vue';

const currentTab = ref('home');
const switchTab = (tab) => { 
  currentTab.value = tab; 
};
</script>

<style lang="scss" scoped>
.full-screen-bg { height: 100vh; width: 100%; background-color: #f1f5f9; display: flex; box-sizing: border-box; overflow: auto; min-width: 1024px; min-height: 600px; }
.app-wrapper { width: 100%; height: 100%; background: white; display: flex; flex-direction: column; overflow: hidden; padding: 20px; box-sizing: border-box; }

.top-nav-container { background-color: #f0f0f0; border-radius: 4px; padding: 10px; display: flex; flex-shrink: 0; height: 35px; }
.nav-list { display: flex; flex-direction: row; gap: 12px; padding: 0; align-items: center; justify-content: flex-start; width: 100%; }
.nav-item { padding: 12px 12px; border-radius: 4px; font-size: 14px; color: #64748b; background: #ffffff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; white-space: nowrap; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); height: 8px; }
.nav-item:hover { color: #334155; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08); }
.nav-item.active { color: #2563eb; font-weight: bold; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15); }

.main-content { flex: 1; display: flex; flex-direction: column; padding: 0; gap: 20px; background: white; min-width: 0; width: 100%; height: 100%; box-sizing: border-box; margin-top: 20px; }
</style>