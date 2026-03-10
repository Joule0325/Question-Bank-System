<template>
  <view style="display:flex; flex-direction: column; gap: 20px; height: 100%;">
    <view class="top-row">
      <block v-for="tier in tierList" :key="tier.key">
        <view v-if="currentVipType === tier.key" class="info-card" :class="membershipClass">
          <view class="card-bg-decoration"></view>
          <view class="card-main-content">
            <view class="user-header-row">
              <view class="avatar-wrap">
                <image v-if="user.avatar" :src="user.avatar" mode="aspectFill" class="real-avatar" />
                <view v-else class="avatar-placeholder">{{ user.nickname ? user.nickname[0] : 'U' }}</view>
                <view class="level-badge" :class="[getLevelClass(user.level), { 'expanded': isLevelExpanded }]" @click.stop="toggleLevel">
                    <text class="lv-txt">Lv.{{ user.level || 1 }}</text>
                    <text v-if="(user.level || 1) >= 7" class="bolt-icon">⚡</text>
                    <view class="xp-detail" v-if="isLevelExpanded">
                        <text class="xp-num">{{ user.xp || 0 }}</text>
                        <text class="xp-sep">/</text>
                        <text class="xp-next">{{ nextLevelXP }}</text>
                    </view>
                </view>
              </view>
              <view class="header-right">
                <view class="name-row">
                  <text class="nickname">{{ user.nickname || '用户' }}</text>
                  <view class="edit-btn" @click="handleEditInfo">
                    <image src="/static/icons/编辑.svg" class="edit-icon" mode="aspectFit"></image>
                    <text>编辑</text>
                  </view>
                </view>
                <view class="id-tag">ID: {{ user.uid }}</view>
              </view>
            </view>
            <text class="signature">{{ user.signature || '这个人很懒，什么都没写~' }}</text>
            <view class="stats-row">
              <view class="stat-item">
                <text class="stat-num">{{ Array.isArray(user.following) ? user.following.length : 0 }}</text>
                <text class="stat-label">关注</text>
              </view>
              <view class="stat-item">
                <text class="stat-num">{{ Array.isArray(user.fans) ? user.fans.length : 0 }}</text>
                <text class="stat-label">粉丝</text>
              </view>
              <view class="stat-item">
                <text class="stat-num">{{ user.coupons || 0 }}</text>
                <text class="stat-label">优惠券</text>
              </view>
              <view class="stat-item">
                <text class="stat-num text-gold">VIP{{ user.vipLevel || 1 }}</text>
                <text class="stat-label">等级</text>
              </view>
            </view>
          </view>
          <view class="card-footer-slim">
            <text class="expiry-label">{{ expiryText }}</text>
            <view class="renew-btn" @click="openPaymentModal(tier.key)">立即续费</view>
          </view>
        </view>

        <view v-else class="rights-static-card" :class="tier.style">
          <view class="static-header"><text>{{ tier.name }}权益</text></view>
          <view class="static-body">
            <view class="r-item" v-for="(right, rIdx) in tier.rights" :key="rIdx">
              <text>✓</text> {{ right }}
            </view>
          </view>
          <view class="static-footer">
            <block v-if="getTierLevel(tier.key) > getTierLevel(currentVipType)">
              <view class="upgrade-btn" @click="openPaymentModal(tier.key)">立即升级</view>
            </block>
            <block v-else>
              <view class="owned-tag">已拥有</view>
            </block>
          </view>
        </view>
      </block>
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
              <view class="custom-slider-wrap">
                <view class="cs-visual">
                  <view class="cs-mark" v-for="mark in getSliderMarks(12, 24, 1)" :key="mark" :class="{ active: mark === config.fontSize }" :style="{ left: getSliderPercent(mark, 12, 24) + '%' }"></view>
                  <view class="cs-thumb" :style="{ left: getSliderPercent(config.fontSize, 12, 24) + '%' }">
                    <view class="cs-thumb-inner"></view>
                  </view>
                </view>
                <slider class="cs-native" :value="config.fontSize" min="12" max="24" step="1" @changing="e => config.fontSize = e.detail.value" @change="e => config.fontSize = e.detail.value" />
              </view>
            </view>
            
            <view class="cfg-item">
              <text class="cfg-label">行间距 ({{ config.lineHeight }})</text>
              <view class="custom-slider-wrap">
                <view class="cs-visual">
                  <view class="cs-mark" v-for="mark in getSliderMarks(10, 30, 1)" :key="mark" :class="{ active: mark === config.lineHeight * 10 }" :style="{ left: getSliderPercent(mark, 10, 30) + '%' }"></view>
                  <view class="cs-thumb" :style="{ left: getSliderPercent(config.lineHeight * 10, 10, 30) + '%' }">
                    <view class="cs-thumb-inner"></view>
                  </view>
                </view>
                <slider class="cs-native" :value="config.lineHeight * 10" min="10" max="30" step="1" @changing="e => config.lineHeight = e.detail.value / 10" @change="e => config.lineHeight = e.detail.value / 10" />
              </view>
            </view>
            
            <view class="cfg-item">
              <text class="cfg-label">选项上边距 ({{ config.optionMargin }}px)</text>
              <view class="custom-slider-wrap">
                <view class="cs-visual">
                  <view class="cs-mark" v-for="mark in getSliderMarks(0, 20, 2)" :key="mark" :class="{ active: mark === config.optionMargin }" :style="{ left: getSliderPercent(mark, 0, 20) + '%' }"></view>
                  <view class="cs-thumb" :style="{ left: getSliderPercent(config.optionMargin, 0, 20) + '%' }">
                    <view class="cs-thumb-inner"></view>
                  </view>
                </view>
                <slider class="cs-native" :value="config.optionMargin" min="0" max="20" step="2" @changing="e => config.optionMargin = e.detail.value" @change="e => config.optionMargin = e.detail.value" />
              </view>
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
                    <text class="info-chip num">第 1 2 题</text>
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

    <CommonModal :isOpen="editVisible" maxWidth="423px" @close="handleCloseEdit">
      <template #header>
        <view class="custom-header">
          <text class="modal-title">信息编辑</text>
          <view class="header-actions">
            <view class="h-btn primary" @click="saveInfo">保存</view>
            <view class="h-btn" @click="handleCloseEdit">退出</view>
            <view class="h-btn outline primary" @click="saveAndExit">保存并退出</view>
          </view>
        </view>
      </template>

      <view class="edit-content-scroll">
        <view class="avatar-edit-section">
          <view class="avatar-edit-wrapper" @click="chooseAvatar">
            <image v-if="editForm.avatar" :src="editForm.avatar" mode="aspectFill" class="avatar-img-preview" />
            <view v-else class="avatar-placeholder-large">{{ editForm.nickname ? editForm.nickname[0] : 'U' }}</view>
            <view class="camera-mask">
              <image src="/static/icons/相机.svg" class="cam-icon" />
            </view>
          </view>
          <text class="tip-text">点击更换头像</text>
        </view>

        <view class="edit-form-body">
          <view class="form-row-split">
            <view class="form-item flex-1">
              <text class="label">昵称</text>
              <input class="input-field" v-model="editForm.nickname" placeholder="昵称" />
            </view>
            <view class="form-item">
              <text class="label" style="margin-top: 2px;">UID</text>
              <view class="text-display-box">
                <text class="fix-align">{{ user.uid }}</text>
              </view>
            </view>
          </view>

          <view class="form-item">
            <text class="label">邀请码管理</text>
            <view class="invite-row-split">
              <view class="invite-box left">
                <text class="sub-label">我的邀请码</text>
                <view class="code-display">
                  <text class="my-code">{{ user.inviteCode }}</text>
                  <text class="copy-btn" @click="copyInviteCode">复制</text>
                </view>
              </view>
              <view class="invite-box right">
                <text class="sub-label">绑定邀请码</text>
                <view class="bind-input-box">
                  <input class="bind-input" v-model="editForm.boundInviteCode" :disabled="!!user.boundInviteCode" :placeholder="user.boundInviteCode ? '已绑定' : '输入他人邀请码'" maxlength="6" />
                  <text v-if="user.boundInviteCode" class="lock-icon">🔒</text>
                </view>
              </view>
            </view>
            <text v-if="user.boundInviteCode" class="bind-tip">已成功绑定: {{ user.boundInviteCode }}</text>
          </view>

          <view class="form-item">
            <text class="label">我的签名</text>
            <textarea class="textarea-field" v-model="editForm.signature" placeholder="写点什么..." maxlength="100" />
          </view>

          <view class="form-item row-layout">
            <text class="label">性别</text>
            <radio-group class="gender-group" @change="e => editForm.gender = parseInt(e.detail.value)">
              <label class="radio-label" :class="{checked: editForm.gender === 1}">
                <radio value="1" :checked="editForm.gender === 1" color="#2563eb" />男
              </label>
              <label class="radio-label" :class="{checked: editForm.gender === 2}">
                <radio value="2" :checked="editForm.gender === 2" color="#2563eb" />女
              </label>
              <label class="radio-label" :class="{checked: editForm.gender === 0}">
                <radio value="0" :checked="editForm.gender === 0" color="#2563eb" />保密
              </label>
            </radio-group>
          </view>

          <view class="form-row-split">
            <view class="form-item row-layout flex-1">
              <text class="label">出生年月</text>
              <picker mode="date" :value="editForm.birthDate" @change="e => editForm.birthDate = e.detail.value">
                <view class="picker-box"><text>{{ editForm.birthDate || '请选择' }}</text><text class="arrow">></text></view>
              </picker>
            </view>
            <view class="form-item row-layout flex-1">
              <text class="label">毕业学校</text>
              <input class="input-field" v-model="editForm.school" placeholder="请输入" />
            </view>
          </view>
        </view>
      </view>
    </CommonModal>

    <CommonModal :isOpen="paymentVisible" maxWidth="600px" @close="closePaymentModal">
        <template #header>
            <view class="custom-header">
                <text class="modal-title">开通 {{ targetTierName }}</text>
                <view class="win-close-btn" @click="closePaymentModal">✕</view>
            </view>
        </template>
        <view class="payment-container">
            <block v-if="paymentStep === 1">
                <view class="pay-section-title">选择有效期</view>
                <view class="plan-grid">
                    <view v-for="plan in currentPlans" :key="plan.id" class="plan-card" :class="{ active: selectedPlanId === plan.id }" @click="selectPlan(plan)">
                        <view class="plan-tag" v-if="plan.tag">{{ plan.tag }}</view>
                        <text class="plan-name">{{ plan.name }}</text>
                        <view class="plan-price-row"><text class="currency">¥</text><text class="amount">{{ plan.price }}</text></view>
                        <text class="plan-desc">折合 ¥{{ (plan.price / plan.days).toFixed(1) }}/天</text>
                    </view>
                </view>
                <view class="pay-section-title" style="margin-top: 25px;">支付方式</view>
                <view class="pay-method-list">
                    <view class="method-item" :class="{ active: payMethod === 'wechat' }" @click="payMethod = 'wechat'">
                        <view class="m-left"><view class="icon-box wechat">微</view><text>微信支付</text></view>
                        <view class="radio-circle"><view class="inner" v-if="payMethod === 'wechat'"></view></view>
                    </view>
                    <view class="method-item" :class="{ active: payMethod === 'alipay' }" @click="payMethod = 'alipay'">
                        <view class="m-left"><view class="icon-box alipay">支</view><text>支付宝</text></view>
                        <view class="radio-circle"><view class="inner" v-if="payMethod === 'alipay'"></view></view>
                    </view>
                </view>
                <view class="pay-footer">
                    <view class="total-display"><text>实付金额：</text><text class="total-price">¥{{ selectedPlanPrice }}</text></view>
                    <view class="pay-now-btn" @click="goToQrCode">立即支付</view>
                </view>
                <view class="legal-tip">点击支付即代表您同意《会员服务协议》及《隐私政策》。虚拟商品一经售出，概不退款。</view>
            </block>
            <block v-if="paymentStep === 2">
                <view class="qr-view">
                    <view class="qr-header">
                        <text class="qr-amount">¥ {{ selectedPlanPrice }}</text>
                        <text class="qr-desc">请使用{{ payMethodName }}扫一扫</text>
                    </view>
                    <view class="qr-code-box">
                        <view class="mock-qr">
                             <view class="qr-internal">
                                 <text style="font-size:12px; color: #333;">二维码收款</text>
                                 <text style="font-size:10px; color:#999;">(模拟接口)</text>
                             </view>
                        </view>
                        <view class="qr-loading" v-if="isCheckingPayment"><text>支付结果确认中...</text></view>
                    </view>
                    <view class="qr-actions">
                        <view class="h-btn primary" @click="simulatePaySuccess">我已完成支付 (模拟)</view>
                        <view class="h-btn outline" @click="paymentStep = 1">返回选择</view>
                    </view>
                </view>
            </block>
        </view>
    </CommonModal>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import CommonModal from '@/components/CommonModal.vue';
import { globalConfig, saveConfig as persistConfig, resetConfig, formatSubIndex, formatOptionLabel } from '@/utils/configStore.js';

// --- 用户资料 ---
const defaultUser = { nickname: 'Admin', signature: '生活不止眼前的苟且，还有诗和远方的田野，更有写不完的代码和改不完的Bug。', level: 3, following: 42, fans: 108, coupons: 5, vipLevel: 1, avatar: '', gender: 0, birthDate: '2000-01-01', school: '清华大学' };
const user = ref({});
const isLevelExpanded = ref(false);
const toggleLevel = () => { isLevelExpanded.value = !isLevelExpanded.value; };
const LEVEL_THRESHOLDS_CFG = [0, 5000, 20000, 80000, 200000, 400000, 600000];
const nextLevelXP = computed(() => { const lv = user.value.level || 1; if (lv >= 7) return 'MAX'; return LEVEL_THRESHOLDS_CFG[lv]; });

const initUserProfile = () => {
    const loginInfo = uni.getStorageSync('user') || {}; 
    let storedProfile = uni.getStorageSync('USER_PROFILE_DATA');
    let profileData = storedProfile ? JSON.parse(storedProfile) : {};
    const realFollowing = Array.isArray(loginInfo.following) ? loginInfo.following : [];
    const realFollowers = Array.isArray(loginInfo.followers) ? loginInfo.followers : [];

    user.value = {
      ...defaultUser, ...profileData,
      username: loginInfo.username, nickname: loginInfo.nickname || profileData.nickname || defaultUser.nickname,
      uid: loginInfo.uid || '未登录', inviteCode: loginInfo.inviteCode || '----', role: loginInfo.role,
      boundInviteCode: loginInfo.boundInviteCode || '', level: loginInfo.level || 1, xp: loginInfo.xp || 0,
      vipType: loginInfo.vipType || 'none', vipExpiry: loginInfo.vipExpiry || null, vipLevel: loginInfo.vipLevel || 1,
      vipXp: loginInfo.vipXp || 0, avatar: loginInfo.avatar || profileData.avatar || '',
      signature: loginInfo.signature || profileData.signature || '', gender: loginInfo.gender !== undefined ? loginInfo.gender : (profileData.gender || 0),
      birthDate: loginInfo.birthDate || profileData.birthDate || '2000-01-01', school: loginInfo.school || profileData.school || '',
      following: realFollowing, followers: realFollowers, fans: realFollowers,
    };
    uni.setStorageSync('USER_PROFILE_DATA', JSON.stringify(user.value));
};

const editVisible = ref(false);
const editForm = ref({});
const handleEditInfo = () => { editForm.value = JSON.parse(JSON.stringify(user.value)); editVisible.value = true; };
const handleCloseEdit = () => { editVisible.value = false; };
const chooseAvatar = () => { uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], crop: { width: 200, height: 200, resize: true }, success: (res) => { editForm.value.avatar = res.tempFilePaths[0]; } }); };
const copyInviteCode = () => { uni.setClipboardData({ data: user.value.inviteCode, success: () => { uni.showToast({ title: '邀请码已复制', icon: 'none' }); } }); };
const saveInfo = async () => { user.value = { ...user.value, ...editForm.value }; uni.setStorageSync('USER_PROFILE_DATA', JSON.stringify(user.value)); uni.showToast({ title: '保存成功', icon: 'success' }); return true; };
const saveAndExit = async () => { const success = await saveInfo(); if (success) handleCloseEdit(); };

// --- 会员权限 ---
const tierList = [
    { key: 'none', name: '普通用户', style: 'regular-theme', rights: ['自定义题目 500个', '导出源码 2次/天', '试题分类 1个'] },
    { key: 'diamond', name: '钻石会员', style: 'diamond-theme', rights: ['自定义题目 3万个', '导出源码 20次/天', '试题分类 4个', '官方答案 1000次/天'] },
    { key: 'blackgold', name: '黑金会员', style: 'blackgold-theme', rights: ['自定义题目 9万个', '导出源码 50次/天', '试题分类 7个', '智能OCR 15次/天'] },
    { key: 'svip', name: '机构尊享', style: 'svip-theme', rights: ['全校师生账号管理', '私有题库独立部署', 'API 接口对接支持'] }
];
const currentVipType = computed(() => { if (!user.value.vipType || user.value.vipType === 'none') return 'none'; if (!user.value.vipExpiry || new Date(user.value.vipExpiry) < new Date()) return 'none'; return user.value.vipType; });
const getTierLevel = (key) => { const levels = { none: 0, diamond: 1, blackgold: 2, svip: 3 }; return levels[key] || 0; };
const membershipClass = computed(() => { const type = currentVipType.value; if (type === 'blackgold') return 'role-blackgold'; if (type === 'diamond') return 'role-diamond'; if (type === 'svip') return 'role-svip'; return 'role-regular'; });
const expiryText = computed(() => { if (currentVipType.value === 'none') return '您目前是普通会员'; if (!user.value.vipExpiry) return ''; const date = new Date(user.value.vipExpiry); return `会员到期：${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`; });
const getLevelClass = (lv) => { const level = lv || 1; if (level <= 2) return 'lv-gray'; if (level <= 4) return 'lv-orange-yellow'; if (level <= 6) return 'lv-orange-red'; return 'lv-red-lightning'; };

// --- 排版预览与滑块配置 ---
const config = globalConfig;
if (!config.subIndexFormat) config.subIndexFormat = '(1)';
const getSliderMarks = (min, max, step) => { const marks = []; for (let i = min; i <= max; i += step) marks.push(i); return marks; };
const getSliderPercent = (val, min, max) => { return ((val - min) / (max - min)) * 100; };
const sampleOpts = { A: '选项A内容，这是一段比较长的文字用来测试换行后的悬挂缩进效果。', B: '选项B内容', C: '选项C内容', D: '选项D内容' };
const sampleSubs = [{ content: '第一个小题内容。' }, { content: '第二个小题内容，带有选项。', options: { A: '小题A选项测试悬挂缩进效果', B: '小题B' } }, { content: '第三个小题内容。' }];
const sampleAnswer = 'A'; const sampleAnalysis = '这里是试题分析内容。为了演示行间距调整效果，我们需要一段较长文字。'; const sampleDetailed = '这里是详细解答内容。请尝试拖动左侧滑块，观察排版变化是否符合预期。';
const previewStyle = computed(() => ({ fontSize: `${config.fontSize}px`, lineHeight: config.lineHeight }));
const saveConfig = () => { persistConfig(config); uni.showToast({ title: '配置已保存', icon: 'success' }); };
const restoreDefault = () => { resetConfig(); if (!config.subIndexFormat) config.subIndexFormat = '(1)'; };

// --- 收银台相关操作 ---
const paymentVisible = ref(false);
const targetTierKey = ref('');
const targetTierName = computed(() => { const tier = tierList.find(t => t.key === targetTierKey.value); return tier ? tier.name : ''; });
const paymentStep = ref(1);
const currentPlans = ref([{ id: 1, name: '1个月', price: 30, days: 30 }, { id: 2, name: '3个月', price: 80, days: 90 }, { id: 3, name: '12个月', price: 288, days: 365, tag: '特惠' }]);
const selectedPlanId = ref(1);
const selectedPlanPrice = computed(() => { const plan = currentPlans.value.find(p => p.id === selectedPlanId.value); return plan ? plan.price : 0; });
const payMethod = ref('wechat');
const payMethodName = computed(() => payMethod.value === 'wechat' ? '微信' : '支付宝');
const isCheckingPayment = ref(false);

const openPaymentModal = (tierKey) => { if (tierKey === 'svip') return uni.showToast({ title: '请联系客服', icon: 'none' }); targetTierKey.value = tierKey; paymentStep.value = 1; selectedPlanId.value = 1; paymentVisible.value = true; };
const closePaymentModal = () => { paymentVisible.value = false; isCheckingPayment.value = false; };
const selectPlan = (plan) => { selectedPlanId.value = plan.id; };
const goToQrCode = () => { uni.showLoading({ title: '创建订单中...' }); setTimeout(() => { uni.hideLoading(); paymentStep.value = 2; }, 600); };
const simulatePaySuccess = () => { isCheckingPayment.value = true; setTimeout(() => { isCheckingPayment.value = false; uni.showToast({ title: '支付成功', icon: 'success' }); closePaymentModal(); }, 1500); };

onMounted(() => { initUserProfile(); });
</script>

<style lang="scss" scoped>
.top-row { display: flex; gap: 15px; min-height: 200px; flex-shrink: 0; min-width: 0; width: 100%; }
.info-card, .rights-static-card { flex: 1; border-radius: 4px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04); min-width: 0; background: white; transition: transform 0.2s; }
.info-card:hover, .rights-static-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06); }
.info-card.role-regular { flex: 1.4; position: relative; background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%); border-color: #e2e8f0; }
.info-card.role-diamond { flex: 1.4; position: relative; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-color: #bfdbfe; color: #1e3a8a; }
.info-card.role-blackgold { flex: 1.4; position: relative; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #fbbf24; border-color: #451a03; }
.info-card.role-blackgold .nickname, .info-card.role-blackgold .stat-num { color: #fbbf24 !important; }
.info-card.role-blackgold .signature, .info-card.role-blackgold .stat-label, .info-card.role-blackgold .id-tag { color: #94a3b8 !important; }
.info-card.role-svip { flex: 1.4; position: relative; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border-color: #6d28d9; }
.info-card.role-svip .nickname, .info-card.role-svip .stat-num, .info-card.role-svip .signature, .info-card.role-svip .id-tag, .info-card.role-svip .stat-label { color: white !important; opacity: 0.95; }
.info-card.role-svip .level-badge { background: rgba(255,255,255,0.2) !important; border-color: rgba(255,255,255,0.4) !important; }

.card-bg-decoration { position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
.card-main-content { flex: 1; padding: 20px; display: flex; flex-direction: column; justify-content: flex-start; }
.user-header-row { display: flex; align-items: center; gap: 15px; margin-bottom: 12px; }
.avatar-wrap { position: relative; width: 64px; height: 64px; border-radius: 50%; background: #eff6ff; border: 3px solid white; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center; font-size: 26px; color: #2563eb; flex-shrink: 0; }
.real-avatar { width: 100%; height: 100%; border-radius: 50%; }
.level-badge { position: absolute; bottom: -2px; right: -8px; color: white; font-size: 10px; padding: 2px 8px; border-radius: 12px; border: 2px solid white; font-weight: 800; display: flex; align-items: center; gap: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); background: #94a3b8; transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); max-width: 50px; overflow: hidden; white-space: nowrap; z-index: 20; cursor: pointer; }
.level-badge.expanded { max-width: 160px; padding-right: 10px; }
.xp-detail { display: inline-flex; align-items: center; margin-left: 6px; font-size: 9px; opacity: 0; animation: fadeIn 0.3s forwards 0.1s; }
.xp-sep { margin: 0 2px; opacity: 0.6; }
@keyframes fadeIn { from { opacity: 0; transform: translateX(5px); } to { opacity: 1; transform: translateX(0); } }
.level-badge.lv-gray { background: #94a3b8; } .level-badge.lv-orange-yellow { background: linear-gradient(135deg, #facc15, #fb923c); } .level-badge.lv-orange-red { background: linear-gradient(135deg, #fb923c, #ef4444); } .level-badge.lv-red-lightning { background: linear-gradient(135deg, #dc2626, #b91c1c); padding-right: 6px; }
.bolt-icon { font-size: 10px; color: #fef08a; text-shadow: 0 0 2px rgba(0,0,0,0.2); animation: flash 2s infinite; }
@keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

.header-right { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 5px; }
.name-row { display: flex; align-items: center; gap: 8px; }
.nickname { font-size: 20px; font-weight: 800; color: #1e293b; line-height: 1.2; }
.edit-btn { display: flex; align-items: center; gap: 2px; background: #f1f5f9; padding: 2px 8px; border-radius: 12px; cursor: pointer; transition: all 0.2s; height: 20px; }
.edit-btn:hover { background: #e2e8f0; } .edit-btn text { font-size: 10px; color: #64748b; font-weight: bold; } .edit-icon { width: 10px; height: 10px; opacity: 0.6; }
.id-tag { font-size: 12px; color: #94a3b8; font-family: monospace; margin-left: 1px; }

.signature { font-size: 13px; color: #475569; width: 100%; line-height: 1.5; white-space: normal; word-break: break-all; margin-bottom: 15px; }
.stats-row { display: flex; justify-content: space-around; background: white; border-radius: 12px; padding: 12px 0; border: 1px solid #f1f5f9; width: 100%; margin-top: auto; }
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; } .stat-item:hover .stat-num { color: #2563eb; }
.stat-num { font-size: 16px; font-weight: 800; color: #334155; } .stat-num.text-gold { color: #d97706; }
.stat-label { font-size: 11px; color: #94a3b8; }
.card-footer-slim { height: 36px; background: rgba(37, 99, 235, 0.05); border-top: 1px solid rgba(37, 99, 235, 0.1); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
.expiry-label { font-size: 11px; color: #64748b; font-weight: 500; }
.renew-btn { font-size: 11px; color: #2563eb; font-weight: bold; cursor: pointer; } .renew-btn:hover { text-decoration: underline; }

.rights-static-card .static-header { height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; white-space: nowrap; }
.rights-static-card .static-body { flex: 1; padding: 15px 20px; display: flex; flex-direction: column; gap: 8px; justify-content: center; }
.rights-static-card .r-item { font-size: 12px; color: #475569; display: flex; align-items: center; gap: 8px; }
.rights-static-card .r-item text { font-size: 10px; display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%; background: currentColor; color: white; margin-right: 0; }
.static-footer { height: 36px; border-top: 1px solid rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; }
.upgrade-btn { font-size: 11px; font-weight: bold; cursor: pointer; padding: 4px 12px; border-radius: 12px; background: rgba(0,0,0,0.05); transition: all 0.2s; }
.upgrade-btn:hover { background: rgba(0,0,0,0.1); transform: translateY(-1px); }
.owned-tag { font-size: 11px; color: #94a3b8; font-weight: 500; }

.diamond-theme .static-header { background: #eff6ff; color: #2563eb; } .diamond-theme .r-item text { color: #2563eb; background: rgba(37, 99, 235, 0.2); } .diamond-theme .upgrade-btn { color: #2563eb; background: #eff6ff; } .diamond-theme .upgrade-btn:hover { background: #dbeafe; }
.blackgold-theme .static-header { background: #1e293b; color: #fbbf24; } .blackgold-theme .r-item text { color: #d97706; background: rgba(251, 191, 36, 0.2); } .blackgold-theme .upgrade-btn { color: #d97706; background: #fffbeb; } .blackgold-theme .upgrade-btn:hover { background: #fef3c7; }
.svip-theme .static-header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; } .svip-theme .r-item text { color: #7c3aed; background: rgba(124, 58, 237, 0.2); } .svip-theme .upgrade-btn { color: #7c3aed; background: #f3e8ff; } .svip-theme .upgrade-btn:hover { background: #e9d5ff; }
.regular-theme .static-header { background: #f1f5f9; color: #64748b; } .regular-theme .r-item text { color: #64748b; background: #e2e8f0; }

.config-section { flex: 1; border: 1px solid #e2e8f0; border-radius: 4px; display: flex; flex-direction: column; overflow: hidden; min-height: 0; width: 100%; }
.section-header { height: 44px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; padding: 0 20px; flex-shrink: 0; background: white; }
.section-title { font-weight: bold; color: #1e293b; font-size: 15px; }
.config-grid { flex: 1; display: flex; height: 100%; overflow: hidden; width: 100%; }
.config-form { width: 30%; border-right: 1px solid #e2e8f0; background: white; display: flex; flex-direction: column; height: 100%; overflow: hidden; flex-shrink: 0; }
.form-content { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }
.cfg-item { display: flex; flex-direction: column; gap: 6px; }
.cfg-label { font-size: 14px; font-weight: bold; color: #64748b; }
.radio-group { display: flex; gap: 6px; flex-wrap: wrap; }
.radio-btn { padding: 4px 12px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; color: #64748b; cursor: pointer; background: #fff; transition: all 0.2s; }
.radio-btn:hover { background: #f8fafc; border-color: #cbd5e1; } .radio-btn.active { background: #2563eb; color: white; border-color: #2563eb; }
.btns-row { padding: 15px 20px; border-top: 1px solid #f1f5f9; background: white; display: flex; gap: 10px; margin-top: auto; flex-shrink: 0; }
.save-btn { flex: 2; background: #2563eb; color: white; font-size: 13px; border-radius: 6px; border: none; }
.reset-btn { flex: 1; background: #f1f5f9; color: #64748b; font-size: 13px; border-radius: 6px; border: none; }

.custom-slider-wrap { position: relative; height: 30px; margin: 0 10px; }
.cs-visual { position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); height: 4px; background: #e2e8f0; border-radius: 2px; pointer-events: none; }
.cs-mark { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #cbd5e1; top: 50%; transform: translate(-50%, -50%); z-index: 1; }
.cs-mark.active { background: #333333; }
.cs-thumb { position: absolute; width: 18px; height: 18px; background: white; border: 2px solid #333333; border-radius: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15); z-index: 10; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease; }
.custom-slider-wrap:hover .cs-thumb { transform: translate(-50%, -50%) scale(1.3); box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
.custom-slider-wrap:active .cs-thumb { transform: translate(-50%, -50%) scale(0.85); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.cs-thumb-inner { width: 8px; height: 8px; background: #94a3b8; border-radius: 50%; }
.cs-native { position: absolute; width: 100% !important; height: 100% !important; top: 0; left: 0; margin: 0 !important; opacity: 0; z-index: 20; }

.preview-wrapper { flex: 1; background: #f1f5f9; position: relative; height: 100%; overflow: hidden; width: 0; min-width: 0; }
.preview-toolbar { height: 40px; background: white; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; white-space: nowrap; }
.p-tip { color: #94a3b8; font-size: 11px; }
.preview-scroll-view { position: absolute; top: 40px; bottom: 0; left: 0; right: 0; width: 100%; box-sizing: border-box; }
.cards-container { padding: 0; padding-bottom: 40px; width: 100%; display: flex; flex-direction: column; gap: 15px; }

.q-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); font-family: "Times New Roman", "SimSun", "Songti SC", serif; width: 100%; box-sizing: border-box; }
.q-header { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 12px; }
.meta-left { display: flex; gap: 6px; flex-wrap: wrap; } 
.info-chip { padding: 2px 8px; border-radius: 4px; background: #f1f5f9; color: #64748b; font-size: 11px; display: flex; align-items: center; white-space: nowrap; }
.info-chip.type { color: #2563eb; background: #eff6ff; font-weight: bold; } .info-chip.diff { color: #f59e0b; background: #fffbeb; } .info-chip.prov { background: #f0fdf4; color: #166534; } .info-chip.year { background: #eef2ff; color: #4338ca; } .info-chip.num { font-family: monospace; } .info-chip.source { background: #fff1f2; color: #e11d48; }
.q-body { color: #1e293b; cursor: default; }
.q-title { margin-bottom: 8px; display: flex; align-items: baseline; word-break: break-all; white-space: normal; }
.opt-list { display: flex; flex-direction: column; } .opt-item { display: flex; align-items: baseline; }
.opt-key { font-weight: bold; margin-right: 8px; flex-shrink: 0; color: #334155; } .opt-val { color: #334155; word-break: break-all; flex: 1; }
.sub-q-list-view { margin-top: 12px; border-top: 1px dashed #e2e8f0; padding-top: 12px; } .sub-q-row { margin-bottom: 12px; }
.sub-q-txt { display: flex; align-items: baseline; margin-bottom: 4px; } .sub-idx { font-weight: bold; margin-right: 6px; flex-shrink: 0; color: #334155; }
.sub-content { flex: 1; } .sub-indent { margin-left: 22px; margin-top: 4px; } .mt-2 { margin-top: 12px; }
.answer-box { background: #f0f9ff; padding: 12px 15px; border-radius: 6px; border: 1px dashed #bae6fd; color: #0c4a6e; }
.ans-block { margin-bottom: 0.8em; display: flex; align-items: baseline; } .ans-block:last-child { margin-bottom: 0; }
.ans-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 0.9em; font-weight: bold; margin-right: 8px; flex-shrink: 0; line-height: 1.2 !important; }
.ans-tag.answer { background-color: #2563eb; } .ans-tag.analysis { background-color: #f59e0b; } .ans-tag.detailed { background-color: #10b981; }
.ans-content { color: #334155; word-break: break-all; }
.q-footer { border-top: 1px solid #f1f5f9; margin-top: 12px; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.tags-row { display: flex; gap: 8px; align-items: center; flex: 1; flex-wrap: wrap; }
.tag-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; line-height: 1.2; white-space: nowrap; }
.tag-badge.red { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; } .tag-badge.blue { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
.tag-icon { width: 12px; height: 12px; margin-right: 4px; display: block; }
.footer-right { display: flex; align-items: center; gap: 10px; } .hash-code { font-family: monospace; color: #cbd5e1; font-size: 11px; }
.basket-add-btn-rect { padding: 4px 10px; border-radius: 4px; border: 1px solid #2563eb; color: #2563eb; font-size: 11px; cursor: pointer; transition: all 0.2s; font-weight: 500; background: white; white-space: nowrap; } .basket-add-btn-rect:hover { background: #eff6ff; }

/* 弹窗及通用按钮组件样式 */
.custom-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; border-bottom: 1px solid #f1f5f9; background: #fff; flex-shrink: 0; min-height: 60px; box-sizing: border-box; }
.modal-title { font-weight: 800; font-size: 15px; color: #0f172a; letter-spacing: -0.5px; line-height: 1; margin: 0; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.win-close-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #94a3b8; border-radius: 4px; } .win-close-btn:hover { background: #e2e8f0; color: #ef4444; }
.h-btn { height: 24px; padding: 0 13px; border-radius: 4px; font-size: 13px; cursor: pointer; background: #f1f5f9; color: #64748b; font-weight: 600; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-sizing: border-box; border: 1px solid transparent; }
.h-btn:hover { background: #e2e8f0; transform: translateY(-1px); } .h-btn.primary { background: #2563eb; color: white; box-shadow: 0 2px 5px rgba(37, 99, 235, 0.2); } .h-btn.primary:hover { background: #1d4ed8; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); } .h-btn.outline { background: transparent; border-color: #2563eb; color: #2563eb; } .h-btn.outline:hover { background: #eff6ff; border-color: #1d4ed8; color: #1d4ed8; }

.edit-content-scroll { padding: 30px 40px; max-height: 70vh; overflow-y: auto; }
.avatar-edit-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 35px; }
.avatar-edit-wrapper { width: 108px; height: 108px; border-radius: 50%; position: relative; cursor: pointer; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08); border: 4px solid white; background: #eff6ff; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: transform 0.3s; }
.avatar-edit-wrapper:hover { transform: scale(1.02); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12); } .avatar-edit-wrapper:hover .camera-mask { opacity: 1; } .avatar-edit-wrapper:hover .avatar-img-preview { transform: scale(1.1); }
.avatar-img-preview { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.avatar-placeholder-large { font-size: 44px; color: #3b82f6; font-weight: 800; }
.camera-mask { position: absolute; bottom: 0; left: 0; right: 0; height: 32px; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
.cam-icon { width: 18px; height: 18px; filter: brightness(0) invert(1); opacity: 0.9; }
.tip-text { font-size: 12px; color: #64748b; margin-top: 10px; font-weight: 500; }
.edit-form-body { display: flex; flex-direction: column; gap: 24px; }
.form-item { display: flex; flex-direction: column; gap: 8px; }
.label { font-size: 13px; font-weight: 700; color: #334155; display: flex; align-items: center; white-space: nowrap; }
.input-field, .picker-box, .textarea-field { border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; color: #1e293b; background: #fff; transition: all 0.2s; box-sizing: border-box; }
.input-field, .picker-box { height: 27px; padding: 0 8px; display: flex; align-items: center; }
.textarea-field { padding: 8px 6px 8px 10px; height: 90px; width: 100%; line-height: 1.5; }
.input-field:focus, .textarea-field:focus { border-color: #2563eb; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
.text-display-box { height: 27px; display: flex; align-items: center; font-size: 14px; color: #64748b; background: transparent; border: none; padding: 0; }
.fix-align { position: relative; top: 1px; line-height: 1; }
.form-row-split { display: flex; gap: 10px; align-items: center; } .form-row-split .form-item { flex-direction: row; align-items: center; gap: 8px; } .form-row-split .input-field, .form-row-split .text-display-box { flex: 1; min-width: 0; } .flex-1 { flex: 1; }
.picker-box { justify-content: space-between; cursor: pointer; } .picker-box:hover { border-color: #94a3b8; }
.arrow { color: #94a3b8; font-size: 12px; }
.gender-group { display: flex; gap: 25px; align-items: center; }
.radio-label { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #64748b; cursor: pointer; } .radio-label:hover { color: #334155; } .radio-label.checked { color: #2563eb; font-weight: 600; }
.form-item.row-layout { flex-direction: row; align-items: center; gap: 4px; } .form-item.row-layout .input-field, .form-item.row-layout .picker-box, .form-item.row-layout .gender-group { flex: 1; } .form-item.row-layout .label { min-width: 60px; margin-bottom: 0; }
.invite-row-split { display: flex; gap: 15px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
.invite-box { flex: 1; display: flex; flex-direction: column; gap: 6px; } .invite-box.left { border-right: 1px dashed #cbd5e1; padding-right: 15px; }
.sub-label { font-size: 11px; color: #64748b; }
.code-display { display: flex; align-items: center; justify-content: space-between; height: 30px; }
.my-code { font-family: monospace; font-weight: bold; font-size: 16px; color: #334155; letter-spacing: 1px; }
.copy-btn { font-size: 11px; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 4px; cursor: pointer; }
.bind-input-box { position: relative; display: flex; align-items: center; }
.bind-input { width: 100%; height: 30px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 8px; font-size: 13px; background: white; text-transform: uppercase; } .bind-input[disabled] { background: #f1f5f9; color: #94a3b8; border-color: #e2e8f0; }
.lock-icon { position: absolute; right: 8px; font-size: 12px; }
.bind-tip { font-size: 11px; color: #10b981; margin-top: 4px; margin-left: 4px; }

/* 收银台样式 */
.payment-container { padding: 10px 10px 20px 10px; }
.pay-section-title { font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 12px; }
.plan-grid { display: flex; gap: 12px; }
.plan-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 10px; display: flex; flex-direction: column; align-items: center; cursor: pointer; position: relative; transition: all 0.2s; background: #fff; }
.plan-card:hover { border-color: #cbd5e1; transform: translateY(-2px); } .plan-card.active { border-color: #2563eb; background: #eff6ff; }
.plan-tag { position: absolute; top: -8px; right: -6px; background: #ef4444; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3); }
.plan-name { font-size: 13px; color: #334155; margin-bottom: 6px; font-weight: 500; } .plan-card.active .plan-name { color: #2563eb; font-weight: bold; }
.plan-price-row { display: flex; align-items: flex-end; color: #1e293b; height: 32px; }
.currency { font-size: 14px; margin-bottom: 4px; margin-right: 2px; } .amount { font-size: 24px; font-weight: 800; line-height: 1; } .plan-card.active .plan-price-row { color: #2563eb; }
.plan-desc { font-size: 11px; color: #94a3b8; margin-top: 6px; }
.pay-method-list { display: flex; flex-direction: column; gap: 10px; }
.method-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border: 1px solid #f1f5f9; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.method-item:hover { background: #f8fafc; } .method-item.active { border-color: #2563eb; background: rgba(37,99,235,0.02); }
.m-left { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #334155; }
.icon-box { width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; } .icon-box.wechat { background: #07c160; } .icon-box.alipay { background: #1677ff; }
.radio-circle { width: 18px; height: 18px; border-radius: 50%; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; } .method-item.active .radio-circle { border-color: #2563eb; } .inner { width: 10px; height: 10px; background: #2563eb; border-radius: 50%; }
.pay-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #f1f5f9; }
.total-display { display: flex; align-items: center; font-size: 13px; color: #334155; } .total-price { font-size: 20px; color: #ef4444; font-weight: 800; margin-left: 5px; }
.pay-now-btn { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 8px 25px; border-radius: 20px; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); transition: transform 0.1s; } .pay-now-btn:active { transform: scale(0.96); }
.legal-tip { font-size: 10px; color: #cbd5e1; margin-top: 15px; text-align: center; }
.qr-view { display: flex; flex-direction: column; align-items: center; padding: 20px 0; }
.qr-header { text-align: center; margin-bottom: 20px; } .qr-amount { font-size: 28px; font-weight: 800; color: #1e293b; display: block; } .qr-desc { font-size: 12px; color: #64748b; margin-top: 5px; }
.qr-code-box { width: 180px; height: 180px; background: #fff; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; margin-bottom: 25px; position: relative; }
.mock-qr { width: 100%; height: 100%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
.qr-internal { width: 90%; height: 90%; background: white; border: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.qr-loading { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; color: #2563eb; font-size: 12px; font-weight: bold; }
.qr-actions { width: 100%; display: flex; flex-direction: column; gap: 10px; }
</style>