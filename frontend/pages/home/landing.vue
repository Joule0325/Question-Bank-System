<template>
  <view class="landing-container">
    <view class="hero-section">
      <image src="/static/logo.png" class="hero-logo" mode="aspectFit"></image>
      <text class="hero-title">构建你的第二大脑</text>
      <text class="hero-subtitle">智能题库 · 知识图谱 · 自由组卷</text>
      
      <view class="action-buttons">
        <button class="btn primary" @click="goToLogin">开启我的空间</button>
        <button class="btn outline" @click="goToPublic">先逛逛公共库</button>
      </view>
    </view>
    
    <view class="feature-grid">
      <view class="feature-card">
        <text class="icon">🚀</text>
        <text class="title">极速录入</text>
        <text class="desc">支持 OCR、LaTeX 公式解析，所见即所得。</text>
      </view>
      <view class="feature-card">
        <text class="icon">🌳</text>
        <text class="title">私人图谱</text>
        <text class="desc">完全自定义的知识树，构建个性化复习体系。</text>
      </view>
      <view class="feature-card">
        <text class="icon">🤝</text>
        <text class="title">资源共享</text>
        <text class="desc">一键克隆公共库优质题目，化为己用。</text>
      </view>
    </view>
  </view>
</template>

<script setup>
const goToLogin = () => {
    console.log("准备跳转到登录页...");
    uni.navigateTo({ 
        url: '/pages/login/login', // 确保前面带了 /
        success: () => console.log("跳转成功"),
        fail: (err) => {
            console.error("跳转失败详情：", err);
            // 如果报错 "page not found"，说明物理文件或路径配置错了
        }
    });
};

const goToPublic = () => {
  // 修改这里：跳转到题库主页 index.vue
  // 使用 reLaunch 是为了清空之前的页面栈，让 index 作为新的首页
  uni.reLaunch({ 
    url: '/pages/index/index?mode=public',
    success: () => {
      console.log('成功进入公共库模式');
    },
    fail: (err) => {
      console.error('跳转到主页失败：', err);
    }
  });
};
</script>

<style lang="scss">
.landing-container { height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.hero-section { text-align: center; margin-bottom: 60px; }
.hero-logo { width: 80px; height: 80px; margin-bottom: 20px; }
.hero-title { font-size: 32px; font-weight: 900; color: #1e293b; display: block; margin-bottom: 10px; letter-spacing: 2px; }
.hero-subtitle { font-size: 16px; color: #64748b; margin-bottom: 40px; display: block; }
.action-buttons { display: flex; gap: 20px; justify-content: center; }
.btn { border-radius: 30px; font-size: 16px; padding: 0 40px; height: 50px; line-height: 50px; cursor: pointer; border: none; }
.btn.primary { background: #2563eb; color: white; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3); transition: transform 0.2s; }
.btn.primary:active { transform: scale(0.95); }
.btn.outline { background: white; color: #334155; border: 1px solid #cbd5e1; }
.feature-grid { display: flex; gap: 30px; }
.feature-card { background: white; padding: 30px; border-radius: 16px; width: 200px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.feature-card .icon { font-size: 30px; display: block; margin-bottom: 10px; }
.feature-card .title { font-weight: bold; color: #334155; margin-bottom: 8px; display: block; }
.feature-card .desc { font-size: 12px; color: #94a3b8; line-height: 1.6; }
</style>