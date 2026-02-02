<template>
  <view class="full-screen-bg">
    <view class="app-wrapper">
      
      <view class="sidebar">
        <view class="logo-area">
          <view class="logo-icon">E</view>
          <text class="logo-text">ExamPro</text>
        </view>
        <view class="nav-list">
          <view class="nav-item active"><text class="nav-icon">🏠</text> 个人首页</view>
          <view class="nav-item"><text class="nav-icon">📄</text> 组卷/讲义</view>
          <view class="nav-item"><text class="nav-icon">🏷️</text> 标签管理</view>
          <view class="nav-item"><text class="nav-icon">⭐</text> 收藏夹</view>
          <view class="nav-item"><text class="nav-icon">🧾</text> 我的订单</view>
        </view>
        <view class="nav-footer">
          <view class="nav-item logout"><text class="nav-icon">🚪</text> 退出登录</view>
        </view>
      </view>

      <view class="main-content">
        
        <view class="top-row">
          <view class="info-card" :class="membershipClass">
            <view class="card-header">
              <view class="role-badge"><text>{{ roleName }}</text></view>
            </view>
            <view class="card-body">
              <view class="avatar-wrap">
                <view class="avatar-placeholder">{{ user.nickname ? user.nickname[0] : 'U' }}</view>
              </view>
              <view class="info-text">
                <text class="nickname">{{ user.nickname || '用户' }}</text>
                <text class="phone">{{ user.phone || '未绑定手机' }}</text>
              </view>
            </view>
            <view class="card-footer">
              <text class="expiry-label">会员到期：</text>
              <text class="expiry-date">{{ expiryDate }}</text>
            </view>
          </view>
          <view class="rights-static-card diamond-theme">
            <view class="static-header"><text>💎 钻石会员权益</text></view>
            <view class="static-body">
              <view class="r-item"><text>✓</text> 无限次组卷下载</view>
              <view class="r-item"><text>✓</text> 解锁所有题目解析</view>
              <view class="r-item"><text>✓</text> 专属 5G 云存储空间</view>
            </view>
          </view>
          <view class="rights-static-card blackgold-theme">
            <view class="static-header"><text>👑 黑金会员权益</text></view>
            <view class="static-body">
              <view class="r-item"><text>✓</text> 包含所有钻石权益</view>
              <view class="r-item"><text>✓</text> 智能 AI 组卷助手</view>
              <view class="r-item"><text>✓</text> 专属定制学校 Logo</view>
            </view>
          </view>
        </view>

        <view class="config-section">
          <view class="section-header">
            <text class="section-title">题库排版配置</text>
          </view>
          
          <view class="config-grid">
            <view class="config-form">
              <view class="form-content">
                
                <view class="cfg-item">
                  <text class="cfg-label">字体大小 ({{ config.fontSize }}px)</text>
                  <slider class="cfg-slider" :value="config.fontSize" min="12" max="24" activeColor="#2563eb" block-size="16" @change="e => config.fontSize = e.detail.value" />
                </view>

                <view class="cfg-item">
                  <text class="cfg-label">行间距 ({{ config.lineHeight }})</text>
                  <slider class="cfg-slider" :value="config.lineHeight * 10" min="10" max="30" activeColor="#2563eb" block-size="16" @change="e => config.lineHeight = e.detail.value / 10" />
                </view>

                <view class="cfg-item">
                  <text class="cfg-label">选项上边距 ({{ config.optionMargin }}px)</text>
                  <slider class="cfg-slider" :value="config.optionMargin" min="0" max="20" activeColor="#2563eb" block-size="16" @change="e => config.optionMargin = e.detail.value" />
                </view>

                <view class="cfg-item">
                  <text class="cfg-label">选项格式</text>
                  <view class="radio-group">
                    <view class="radio-btn" :class="{ active: config.optionFormat === 'A.' }" @click="config.optionFormat = 'A.'">A.</view>
                    <view class="radio-btn" :class="{ active: config.optionFormat === '(A)' }" @click="config.optionFormat = '(A)'">(A)</view>
                    <view class="radio-btn" :class="{ active: config.optionFormat === 'a.' }" @click="config.optionFormat = 'a.'">a.</view>
                  </view>
                </view>

                <view class="cfg-item">
                  <text class="cfg-label">小题序号格式</text>
                  <view class="radio-group">
                    <view class="radio-btn" :class="{ active: config.subIndexFormat === '1.' }" @click="config.subIndexFormat = '1.'">1.</view>
                    <view class="radio-btn" :class="{ active: config.subIndexFormat === '(1)' }" @click="config.subIndexFormat = '(1)'">(1)</view>
                    <view class="radio-btn" :class="{ active: config.subIndexFormat === '①' }" @click="config.subIndexFormat = '①'">①</view>
                  </view>
                </view>

              </view>

              <view class="btns-row">
                <button class="save-btn" @click="saveConfig">保存配置</button>
                <button class="reset-btn" @click="restoreDefault">重置</button>
              </view>
            </view>

            <view class="preview-wrapper">
              <view class="preview-toolbar">
                <text>效果预览 (Preview)</text>
                <text class="p-tip">样式将同步至所有题目列表</text>
              </view>
              
              <scroll-view scroll-y class="preview-scroll-view">
                <view class="cards-container">
                  
                  <view class="q-card">
                    <view class="q-header">
                      <view class="meta-left">
                        <text class="info-chip year">2024</text>
                        <text class="info-chip source">模拟考</text>
                        <text class="info-chip num">第 1 题</text>
                        <text class="info-chip diff">★★☆☆☆</text>
                        <text class="info-chip type">单选题</text>
                        <text class="info-chip prov">北京</text>
                      </view>
                    </view>

                    <view class="q-body">
                      <view class="content-wrapper" :style="previewStyle">
                        <view class="q-title">
                          <text>这是一道标准的选择题示例。请注意观察：当你在左侧调整行高时，这里的文字间距会发生变化；调整字号时，整体阅读大小会改变。</text>
                        </view>
                        <view class="opt-list">
                          <view class="opt-item" v-for="(txt, key) in sampleOpts" :key="key" :style="{ marginTop: config.optionMargin + 'px' }">
                            <text class="opt-key">{{ formatOptionLabel(key) }}</text>
                            <text class="opt-val">{{ txt }}</text>
                          </view>
                        </view>
                      </view>
                    </view>

                    <view class="q-footer">
                      <view class="tags-row">
                        <view class="tag-badge red">
                          <image src="/static/icons/标签-红.svg" class="tag-icon" mode="aspectFit"></image>
                          <text>函数性质</text>
                        </view>
                        <view class="tag-badge blue">
                          <image src="/static/icons/标签-蓝.svg" class="tag-icon" mode="aspectFit"></image>
                          <text>易错题</text>
                        </view>
                      </view>
                      <view class="footer-right">
                        <text class="hash-code">#A8921</text>
                        <view class="basket-add-btn-rect">加入试题篮</view>
                      </view>
                    </view>
                  </view>

                  <view class="q-card">
                    <view class="q-header">
                      <view class="meta-left">
                        <text class="info-chip year">2023</text>
                        <text class="info-chip source">高考真题</text>
                        <text class="info-chip num">第 12 题</text>
                        <text class="info-chip diff" style="color:#ef4444;background:#fef2f2">★★★★☆</text>
                        <text class="info-chip type">解答题</text>
                      </view>
                    </view>

                    <view class="q-body">
                      <view class="content-wrapper" :style="previewStyle">
                        <view class="q-title">
                          <text>在四棱锥P-ABCD中，底面ABCD是矩形，侧棱PD⊥底面ABCD。</text>
                        </view>
                        
                        <view class="sub-q-list-view">
                          <view class="sub-q-row" v-for="(sub, idx) in sampleSubs" :key="idx">
                            <view class="sub-q-txt">
                              <text class="sub-idx">{{ formatSubIndex(idx + 1) }}</text>
                              <text class="sub-content">{{ sub.content }}</text>
                            </view>
                            <view class="opt-list sub-indent" v-if="sub.options">
                                <view class="opt-item" v-for="(txt, key) in sub.options" :key="key" :style="{ marginTop: config.optionMargin + 'px' }">
                                  <text class="opt-key">{{ formatOptionLabel(key) }}</text>
                                  <text class="opt-val">{{ txt }}</text>
                                </view>
                            </view>
                          </view>
                        </view>
                        
                        <view class="answer-box mt-2">
                            <view class="ans-block">
                                <view class="ans-tag answer">答案</view>
                                <view class="ans-content" :style="previewStyle">{{ sampleAnswer }}</view>
                            </view>
                            <view class="ans-block">
                                <view class="ans-tag analysis">分析</view>
                                <view class="ans-content" :style="previewStyle">{{ sampleAnalysis }}</view>
                            </view>
                            <view class="ans-block">
                                <view class="ans-tag detailed">详解</view>
                                <view class="ans-content" :style="previewStyle">{{ sampleDetailed }}</view>
                            </view>
                        </view>

                      </view>
                    </view>

                    <view class="q-footer">
                      <view class="tags-row">
                        <view class="tag-badge red">
                          <image src="/static/icons/标签-红.svg" class="tag-icon" mode="aspectFit"></image>
                          <text>立体几何</text>
                        </view>
                      </view>
                      <view class="footer-right">
                        <text class="hash-code">#B7712</text>
                        <view class="basket-add-btn-rect">加入试题篮</view>
                      </view>
                    </view>
                  </view>

                </view>
              </scroll-view> 
            </view>
          </view>
        </view>

      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { globalConfig, saveConfig as persistConfig, resetConfig, formatSubIndex } from '../utils/configStore.js';

const userRole = ref('regular'); 
const user = ref({ nickname: 'Admin', phone: '138****8888' });
const config = globalConfig;

// 初始化小题默认格式 (防止旧配置没有这个字段)
if (!config.subIndexFormat) {
  config.subIndexFormat = '(1)';
}

const sampleOpts = { A: '选项A内容，这是一段比较长的文字用来测试换行后的悬挂缩进效果。', B: '选项B内容', C: '选项C内容', D: '选项D内容' };
const sampleSubs = [
  { content: '第一个小题内容。' },
  { content: '第二个小题内容，带有选项。', options: { A: '小题A选项测试悬挂缩进效果，这里文字要足够长才能看出效果', B: '小题B' } },
  { content: '第三个小题内容。' }
];
const sampleAnswer = 'A';
const sampleAnalysis = '这里是试题分析内容。为了演示行间距的调整效果，我们需要一段比较长的文字。当您在左侧调整行间距时，这段文字的行与行之间的距离应该会发生相应的变化。';
const sampleDetailed = '这里是详细解答内容。同样，为了展示字体大小和行间距的实时预览，这段文字也需要足够长。请尝试拖动左侧的滑块，观察这里的排版变化是否符合预期。';

const roleName = computed(() => userRole.value === 'blackgold' ? '黑金会员' : (userRole.value === 'diamond' ? '钻石会员' : '普通会员'));
const membershipClass = computed(() => `role-${userRole.value}`);
const expiryDate = computed(() => '2026-12-31');

const previewStyle = computed(() => ({
  fontSize: `${config.fontSize}px`,
  lineHeight: config.lineHeight
}));

// 选项标签格式化
const formatOptionLabel = (key) => {
  const fmt = config.optionFormat;
  return fmt === 'A.' ? `${key}.` : (fmt === '(A)' ? `(${key})` : `${key.toLowerCase()}.`);
};

const saveConfig = () => {
  persistConfig(config);
  uni.showToast({ title: '配置已保存', icon: 'success' });
};
const restoreDefault = () => {
  resetConfig();
  if (!config.subIndexFormat) config.subIndexFormat = '(1)';
};
</script>

<style lang="scss" scoped>
/* =========================================
   1. 整体布局 & 侧边栏 (Layout)
   ========================================= */
.full-screen-bg {
  height: 100vh;
  width: 100%;
  background-color: #f1f5f9;
  display: flex;
  overflow: hidden;
  box-sizing: border-box;
}

.app-wrapper {
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  overflow: hidden;
}

/* 左侧导航 */
.sidebar {
  width: 200px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 20px 0;
}

.logo-area {
  padding: 0 24px 30px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: #2563eb;
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.logo-text {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
}

.nav-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}

.nav-item {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover { background: #e2e8f0; color: #334155; }
  &.active { background: #eff6ff; color: #2563eb; font-weight: bold; }
}
.nav-footer { padding: 0 12px; }
.nav-item.logout { color: #ef4444; &:hover { background: #fef2f2; } }

/* 右侧主内容容器 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
  background: white;
  min-width: 0;
  width: 0; /* 强制 flex 自适应 */
  height: 100%;
  box-sizing: border-box;
}

/* =========================================
   2. 顶部会员卡片 (Top Row)
   ========================================= */
.top-row {
  display: flex; gap: 15px; height: 160px; flex-shrink: 0; min-width: 0; width: 100%; 
}

.info-card, .rights-static-card {
  flex: 1; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03); min-width: 0;
}

.info-card {
  &.role-regular .card-header { background: linear-gradient(135deg, #64748b, #94a3b8); }
  .card-header { height: 40px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; white-space: nowrap; }
  .card-body { flex: 1; display: flex; align-items: center; padding: 0 20px; gap: 12px; overflow: hidden; }
  .avatar-wrap { width: 50px; height: 50px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #94a3b8; border: 2px solid white; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); flex-shrink: 0; }
  .info-text { display: flex; flex-direction: column; min-width: 0; }
  .nickname { font-size: 15px; font-weight: bold; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .phone { font-size: 12px; color: #94a3b8; white-space: nowrap; }
  .card-footer { height: 32px; background: #f8fafc; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #64748b; border-top: 1px solid #f1f5f9; white-space: nowrap; }
}

.rights-static-card {
  .static-header { height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; white-space: nowrap; }
  .static-body { flex: 1; padding: 10px 20px; display: flex; flex-direction: column; gap: 6px; justify-content: center; overflow: hidden; }
  .r-item { font-size: 12px; color: #475569; display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
}
.diamond-theme { .static-header { background: #eff6ff; color: #2563eb; } .r-item text { color: #2563eb; font-weight: bold; } }
.blackgold-theme { .static-header { background: #1e293b; color: #fbbf24; } .r-item text { color: #d97706; font-weight: bold; } }

/* =========================================
   3. 配置区布局 (Config Section)
   ========================================= */
.config-section {
  flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; min-height: 0; width: 100%; 
}
.section-header {
  height: 44px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; padding: 0 20px; flex-shrink: 0; background: white;
}
.section-title { font-weight: bold; color: #1e293b; font-size: 15px; }

.config-grid { flex: 1; display: flex; height: 100%; overflow: hidden; width: 100%; }

/* 左侧表单 (Fixed Width) */
.config-form {
  width: 280px; border-right: 1px solid #e2e8f0; background: white; display: flex; flex-direction: column; height: 100%; overflow: hidden; flex-shrink: 0;
}
.form-content { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }

.cfg-item { display: flex; flex-direction: column; gap: 6px; }
.cfg-label { font-size: 12px; font-weight: bold; color: #64748b; }
.cfg-slider { width: 100%; margin: 0; }

.radio-group { display: flex; gap: 6px; flex-wrap: wrap; }
.radio-btn {
  padding: 4px 12px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; color: #64748b; cursor: pointer; background: #fff; transition: all 0.2s;
  &:hover { background: #f8fafc; border-color: #cbd5e1; }
  &.active { background: #2563eb; color: white; border-color: #2563eb; }
}

.btns-row { padding: 15px 20px; border-top: 1px solid #f1f5f9; background: white; display: flex; gap: 10px; margin-top: auto; flex-shrink: 0; }
.save-btn { flex: 2; background: #2563eb; color: white; font-size: 13px; border-radius: 6px; border: none; }
.reset-btn { flex: 1; background: #f1f5f9; color: #64748b; font-size: 13px; border-radius: 6px; border: none; }

/* =========================================
   4. 右侧预览区 (修复溢出的核心)
   ========================================= */
.preview-wrapper {
  flex: 1; background: #f1f5f9; position: relative; height: 100%; overflow: hidden; width: 0; min-width: 0;
}
.preview-toolbar {
  height: 40px; background: white; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; white-space: nowrap;
}
.p-tip { color: #94a3b8; font-size: 11px; }

/* 强制使用绝对定位 */
.preview-scroll-view {
  position: absolute; top: 40px; bottom: 0; left: 0; right: 0; width: 100%; box-sizing: border-box;
}
.cards-container {
  padding: 20px; display: flex; flex-direction: column; gap: 15px; width: 100%; box-sizing: border-box;
}

/* =========================================
   5. 题库卡片样式 (Q-Card)
   ========================================= */
.q-card {
  background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); font-family: "Times New Roman", "SimSun", "Songti SC", serif;
  width: 100%; box-sizing: border-box;
}

.q-header { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 12px; }
.meta-left { display: flex; gap: 6px; flex-wrap: wrap; }
.info-chip {
  padding: 2px 8px; border-radius: 4px; background: #f1f5f9; color: #64748b; font-size: 11px; display: flex; align-items: center; white-space: nowrap;
  &.type { color: #2563eb; background: #eff6ff; font-weight: bold; }
  &.diff { color: #f59e0b; background: #fffbeb; }
  &.prov { background: #f0fdf4; color: #166534; }
  &.year { background: #eef2ff; color: #4338ca; }
  &.num { font-family: monospace; }
  &.source { background: #fff1f2; color: #e11d48; }
}

.q-body { color: #1e293b; cursor: default; }
.q-title { margin-bottom: 8px; display: flex; align-items: baseline; word-break: break-all; white-space: normal; }
.q-idx { font-weight: bold; margin-right: 8px; flex-shrink: 0; }

.opt-list { display: flex; flex-direction: column; }
.opt-item { display: flex; align-items: baseline; }
.opt-key { font-weight: bold; margin-right: 8px; flex-shrink: 0; color: #334155; }
.opt-val { color: #334155; word-break: break-all; flex: 1; }

/* 小题样式 */
.sub-q-list-view { margin-top: 12px; border-top: 1px dashed #e2e8f0; padding-top: 12px; }
.sub-q-row { margin-bottom: 12px; }
.sub-q-txt { display: flex; align-items: baseline; margin-bottom: 4px; }
.sub-idx { font-weight: bold; margin-right: 6px; flex-shrink: 0; color: #334155; }
.sub-content { flex: 1; }
.sub-indent { margin-left: 22px; margin-top: 4px; } /* Removed margin-left: 24px to allow full width for options */

/* 答案解析区域 */
.mt-2 { margin-top: 12px; }
.answer-box { background: #f0f9ff; padding: 12px 15px; border-radius: 6px; border: 1px dashed #bae6fd; color: #0c4a6e; }
.ans-block { margin-bottom: 0.8em; display: flex; align-items: baseline; }
.ans-block:last-child { margin-bottom: 0; }
.ans-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 0.9em; font-weight: bold; margin-right: 8px; flex-shrink: 0; line-height: 1.2 !important; }
.ans-tag.answer { background-color: #2563eb; } 
.ans-tag.analysis { background-color: #f59e0b; } 
.ans-tag.detailed { background-color: #10b981; } 
.ans-content { color: #334155; word-break: break-all; }

.q-footer { border-top: 1px solid #f1f5f9; margin-top: 12px; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.tags-row { display: flex; gap: 8px; align-items: center; flex: 1; flex-wrap: wrap; }
.tag-badge {
  font-size: 11px; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; line-height: 1.2; white-space: nowrap;
  &.red { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
  &.blue { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
}
.tag-icon { width: 12px; height: 12px; margin-right: 4px; display: block; }
.footer-right { display: flex; align-items: center; gap: 10px; }
.hash-code { font-family: monospace; color: #cbd5e1; font-size: 11px; }
.basket-add-btn-rect {
  padding: 4px 10px; border-radius: 4px; border: 1px solid #2563eb; color: #2563eb; font-size: 11px; cursor: pointer; transition: all 0.2s; font-weight: 500; background: white; white-space: nowrap;
  &:hover { background: #eff6ff; }
}
</style>