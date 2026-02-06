<template>
  <view class="full-screen-bg">
    <view class="app-wrapper">
      
      <view class="sidebar">
        <view class="nav-list">
          <view class="nav-item" :class="{ active: currentTab === 'home' }" @click="currentTab = 'home'">个人首页</view>
          <view class="nav-item">组卷/讲义</view>
          <view class="nav-item">标签管理</view>
          <view class="nav-item" :class="{ active: currentTab === 'fav' }" @click="currentTab = 'fav'">收藏夹</view>
          <view class="nav-item">我的订单</view>
        </view>
      </view>

      <view class="main-content">
        
        <block v-if="currentTab === 'home'">
            <view class="top-row">
              <view class="info-card" :class="membershipClass">
                <view class="card-bg-decoration"></view>
                
                <view class="card-main-content">
                  
                  <view class="user-header-row">
                    <view class="avatar-wrap">
                      <view class="avatar-placeholder">{{ user.nickname ? user.nickname[0] : 'U' }}</view>
                      <view class="level-badge">Lv.{{ user.level || 1 }}</view>
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
                      <text class="stat-num">{{ user.following || 0 }}</text>
                      <text class="stat-label">关注</text>
                    </view>
                    <view class="stat-item">
                      <text class="stat-num">{{ user.fans || 0 }}</text>
                      <text class="stat-label">粉丝</text>
                    </view>
                    <view class="stat-item">
                      <text class="stat-num">{{ user.coupons || 0 }}</text>
                      <text class="stat-label">优惠券</text>
                    </view>
                    <view class="stat-item">
                      <text class="stat-num text-gold">VIP{{ user.vipLevel || 0 }}</text>
                      <text class="stat-label">等级</text>
                    </view>
                  </view>
                </view>

                <view class="card-footer-slim">
                  <text class="expiry-label">会员到期：{{ expiryDate }}</text>
                  <view class="renew-btn">立即续费</view>
                </view>
              </view>

              <view class="rights-static-card diamond-theme">
                <view class="static-header"><text>钻石会员权益</text></view>
                <view class="static-body">
                  <view class="r-item"><text>✓</text> 无限次组卷下载</view>
                  <view class="r-item"><text>✓</text> 解锁所有题目解析</view>
                  <view class="r-item"><text>✓</text> 专属 5G 云存储空间</view>
                </view>
              </view>

              <view class="rights-static-card blackgold-theme">
                <view class="static-header"><text>黑金会员权益</text></view>
                <view class="static-body">
                  <view class="r-item"><text>✓</text> 包含所有钻石权益</view>
                  <view class="r-item"><text>✓</text> 智能 AI 组卷助手</view>
                  <view class="r-item"><text>✓</text> 专属定制学校 Logo</view>
                </view>
              </view>

              <view class="rights-static-card svip-theme">
                <view class="static-header"><text>机构尊享版</text></view>
                <view class="static-body">
                  <view class="r-item"><text>✓</text> 全校师生账号管理</view>
                  <view class="r-item"><text>✓</text> 私有题库独立部署</view>
                  <view class="r-item"><text>✓</text> API 接口对接支持</view>
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
        </block>

        <block v-else-if="currentTab === 'fav'">
            <view class="fav-layout">
              <view class="fav-sidebar">
                <view class="fav-header">
                  <text class="fav-title">我的收藏</text>
                  <view class="add-folder-btn" @click="createNewFolder">+</view>
                </view>
                <scroll-view scroll-y class="folder-list">
                  <view v-for="folder in favFolders" :key="folder.id" 
                        class="folder-item" 
                        :class="{ active: currentFolderId === folder.id }"
                        @click="selectFolder(folder.id)">
                    <text class="f-icon">📂</text>
                    <text class="f-name">{{ folder.name }}</text>
                  </view>
                </scroll-view>
              </view>
              
              <view class="fav-workspace">
                <view class="fav-top-bar">
                  <text class="ft-title">{{ currentFolderName }}</text>
                  <text class="ft-desc">共 {{ favQuestions.length }} 题</text>
                </view>
                
                <scroll-view scroll-y class="fav-scroll-view">
                  <view class="cards-container">
                    <view v-if="favQuestions.length === 0" style="text-align:center; color:#94a3b8; margin-top:50px;">暂无收藏题目</view>
                    
                    <view v-for="q in favQuestions" :key="q.id" class="q-card">
                      <view class="q-header">
                        <view class="meta-left">
                          <text class="info-chip year" v-if="q.year">{{ q.year }}</text>
                          <text class="info-chip source" v-if="q.source">{{ q.source }}</text>
                          <text class="info-chip num" v-if="q.qNumber">第 {{ q.qNumber }} 题</text>
                          <text class="info-chip diff">{{ '★'.repeat(q.difficulty || 3) }}</text>
                          <text class="info-chip type">{{ q.type }}</text>
                        </view>
                        <view class="meta-right">
                          <text class="op-btn red" @click.stop="removeFav(q.id)">取消收藏</text>
                        </view>
                      </view>

                      <view class="q-body" @click="toggleAnswer(q.id)">
                        <view class="content-wrapper" :style="{ fontSize: config.fontSize + 'px', lineHeight: config.lineHeight }">
                          <view class="q-title"><LatexText :text="q.title"></LatexText></view>
                          
                          <view v-if="q.subQuestions && q.subQuestions.length > 0" class="sub-q-list-view">
                            <view v-for="(subQ, sIdx) in q.subQuestions" :key="sIdx" class="sub-q-row">
                              <view class="sub-q-txt" style="display: flex; align-items: baseline;">
                                <text style="font-weight:bold; margin-right:5px; flex-shrink: 0;">{{ formatSubIndex(sIdx + 1) }}</text>
                                <view style="flex:1;"><LatexText :text="subQ.content"></LatexText></view>
                              </view>
                              <view v-if="subQ.options && Object.keys(subQ.options).length > 0" class="opt-grid mt-2 sub-indent" :style="'grid-template-columns: repeat(' + (subQ.optionLayout||4) + ', 1fr)'">
                                 <view v-for="(val, key) in subQ.options" :key="key" class="opt-item" :style="{ marginTop: config.optionMargin + 'px' }">
                                    <text class="opt-key">{{ formatOptionLabel(key) }}</text><LatexText :text="val"></LatexText>
                                 </view>
                              </view>
                            </view>
                          </view>
                          
                          <view v-else-if="q.options && Object.keys(q.options).length > 0" class="opt-grid" :style="'grid-template-columns: repeat(' + (q.optionLayout||4) + ', 1fr)'">
                            <view v-for="(val, key) in q.options" :key="key" class="opt-item" :style="{ marginTop: config.optionMargin + 'px' }">
                                <text class="opt-key">{{ formatOptionLabel(key) }}</text><LatexText :text="val"></LatexText>
                            </view>
                          </view>

                          <view v-if="showAnswerMap[q.id]" class="answer-box mt-2">
                            <view class="ans-block" v-if="q.answer"><view class="ans-tag answer">答案</view><view class="ans-content"><LatexText :text="q.answer"></LatexText></view></view>
                            <view class="ans-block" v-if="q.analysis"><view class="ans-tag analysis">分析</view><view class="ans-content"><LatexText :text="q.analysis"></LatexText></view></view>
                            <view class="ans-block" v-if="q.detailed"><view class="ans-tag detailed">详解</view><view class="ans-content"><LatexText :text="q.detailed"></LatexText></view></view>
                          </view>
                        </view>
                      </view>

                      <view class="q-footer">
                        <view class="tags-row">
                          <view v-for="tag in (q.tags||[])" :key="tag" class="tag-badge blue">
                            <image src="/static/icons/标签-蓝.svg" class="tag-icon" mode="aspectFit"></image><text>{{ tag }}</text>
                          </view>
                        </view>
                        <view class="footer-right">
                          <text class="hash-code">#{{ q.code }}</text>
                        </view>
                      </view>
                    </view>
                    <view style="height: 40px;"></view>
                  </view>
                </scroll-view>
              </view>
            </view>
        </block>

      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import LatexText from '@/components/LatexText.vue'; 
import { request } from '@/utils/request.js';
import { globalConfig, saveConfig as persistConfig, resetConfig, formatSubIndex, formatOptionLabel } from '../utils/configStore.js';

const userRole = ref('regular'); 
// 修改 user 定义：自动生成4位随机ID
const user = ref({ 
  nickname: 'Admin', 
  uid: Math.floor(Math.random() * 9000) + 1000, 
  // 测试长签名换行
  signature: '生活不止眼前的苟且，还有诗和远方的田野，更有写不完的代码和改不完的Bug。', 
  level: 3,
  following: 42,
  fans: 108,
  coupons: 5,
  vipLevel: 1
});
const config = globalConfig;

// --- Tab 切换与收藏夹状态 ---
const currentTab = ref('home'); 
const favFolders = ref([]);
const favMap = ref({});
const currentFolderId = ref(null);
const favQuestions = ref([]);
const showAnswerMap = ref({}); 

// --- 加载收藏夹数据 ---
const loadFavData = () => {
  const folders = uni.getStorageSync('USER_FAV_FOLDERS');
  const data = uni.getStorageSync('USER_FAV_DATA');
  
  if (folders) {
    favFolders.value = JSON.parse(folders);
  } else {
    favFolders.value = [{ id: 1, name: '默认收藏夹' }];
    uni.setStorageSync('USER_FAV_FOLDERS', JSON.stringify(favFolders.value));
  }
  
  if (!currentFolderId.value && favFolders.value.length > 0) {
    currentFolderId.value = favFolders.value[0].id;
  }

  if (data) favMap.value = JSON.parse(data);
  else favMap.value = {};
  
  loadQuestionsForFolder();
};

// --- 新建文件夹 ---
const createNewFolder = () => {
  uni.showModal({
    title: '新建收藏夹',
    editable: true,
    placeholderText: '请输入文件夹名称',
    success: (res) => {
      if (res.confirm && res.content) {
        const newId = Date.now();
        favFolders.value.push({ id: newId, name: res.content });
        uni.setStorageSync('USER_FAV_FOLDERS', JSON.stringify(favFolders.value));
      }
    }
  });
};

// --- 切换文件夹 ---
const selectFolder = (id) => {
  currentFolderId.value = id;
  loadQuestionsForFolder();
};

// --- 获取当前文件夹题目 ---
const loadQuestionsForFolder = async () => {
  if (!currentFolderId.value) return;

  const targetQids = [];
  for (let qid in favMap.value) {
    if (favMap.value[qid] === currentFolderId.value) {
      targetQids.push(qid); 
    }
  }

  if (targetQids.length === 0) {
    favQuestions.value = [];
    return;
  }

  try {
    const [resPrivate, resPublic] = await Promise.all([
        request({ url: '/api/questions', method: 'GET', data: { mode: 'private' } }),
        request({ url: '/api/questions', method: 'GET', data: { mode: 'public' } })
    ]);

    let allQs = [];
    if (resPrivate && resPrivate.data) allQs = allQs.concat(resPrivate.data);
    if (resPublic && resPublic.data) allQs = allQs.concat(resPublic.data);

    const uniqueQs = new Map();
    allQs.forEach(q => uniqueQs.set(q.id, q));

    favQuestions.value = Array.from(uniqueQs.values())
        .filter(q => targetQids.includes(q.id))
        .map(processQuestionData);

  } catch(e) {
    console.error("加载收藏题目失败", e);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

const processQuestionData = (q) => {
  let parsedOptions = q.options;
  if (typeof parsedOptions === 'string') { try { parsedOptions = JSON.parse(parsedOptions); } catch (e) { parsedOptions = {}; } }
  
  return { 
      ...q, 
      options: parsedOptions || {}, 
      tags: q.tags || [], 
      code: q.code || 'A' + q.id.toString().substr(-4)
  };
};

// --- 取消收藏 ---
const removeFav = (qid) => {
  uni.showModal({
    content: '确定要把这道题移出收藏夹吗？',
    success: (res) => {
      if (res.confirm) {
        delete favMap.value[qid];
        uni.setStorageSync('USER_FAV_DATA', JSON.stringify(favMap.value));
        loadQuestionsForFolder(); 
        uni.showToast({title: '已移除', icon:'none'});
      }
    }
  });
};

const toggleAnswer = (id) => {
    showAnswerMap.value[id] = !showAnswerMap.value[id];
};

const currentFolderName = computed(() => {
    const f = favFolders.value.find(x => x.id === currentFolderId.value);
    return f ? f.name : '收藏夹';
});

// --- 新增：处理编辑点击 ---
const handleEditInfo = () => {
  uni.showToast({ title: '编辑功能开发中...', icon: 'none' });
};

onMounted(() => {
    loadFavData();
});

// 初始化小题默认格式
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
  box-sizing: border-box;
  
  /* --- 防止窗口过小时界面错乱 --- */
  overflow: auto;      
  min-width: 1024px;   
  min-height: 600px;   
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
  width: 120px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.nav-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0px 10px 0px 0px; 
}

.nav-item {
  padding: 8px 8px;
  border-radius: 4px;
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
  display: flex; 
  gap: 15px; 
  /* 允许卡片撑开高度，不再固定高度 */
  min-height: 200px;
  flex-shrink: 0; 
  min-width: 0; 
  width: 100%; 
}

.info-card, .rights-static-card {
  flex: 1; 
  border-radius: 16px; /* 圆角 */
  border: 1px solid #e2e8f0; 
  display: flex; 
  flex-direction: column; 
  overflow: hidden; 
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04); 
  min-width: 0;
  background: white;
  transition: transform 0.2s;
  &:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.06); }
}

/* --- 重新设计的个人信息卡片 --- */
.info-card {
  flex: 1.4; /* 个人信息卡片宽度比例 */
  position: relative;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  /* 移除固定高度，允许内容撑开 */
}

.card-bg-decoration {
  position: absolute;
  top: -50px; right: -50px;
  width: 150px; height: 150px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

/* --- 卡片主内容区 --- */
.card-main-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  /* 移除 justify-content: space-between，让内容自然排列，高度自适应 */
  justify-content: flex-start; 
}

/* --- 1. 顶部区域：头像 + 右侧信息 --- */
.user-header-row {
  display: flex;
  align-items: center; /* [关键] 确保头像和右侧文字垂直居中对齐 */
  gap: 15px;           /* 头像和右侧信息的间距 */
  margin-bottom: 12px; /* 与下方签名的间距 */
}

/* 头像 */
.avatar-wrap {
  position: relative;
  width: 64px; 
  height: 64px;
  border-radius: 50%;
  background: #eff6ff;
  border: 3px solid white;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; color: #2563eb;
  flex-shrink: 0;
}

.level-badge {
  position: absolute;
  bottom: -2px; right: -4px;
  background: #f59e0b;
  color: white;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 10px;
  border: 2px solid white;
  font-weight: bold;
}

/* 右侧信息块 */
.header-right {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start; /* 左对齐 */
  gap: 5px; /* [关键] 用户名行和ID之间的间距设置为 3px */
}

/* 用户名行 (用户名 + 编辑按钮) */
.name-row {
  display: flex;
  align-items: center; /* 垂直居中 */
  gap: 8px; /* 用户名和编辑按钮之间的间距 */
}

.nickname {
  font-size: 20px; 
  font-weight: 800;
  color: #1e293b;
  line-height: 1.2;
}

.edit-btn {
  display: flex; align-items: center; gap: 2px;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  height: 20px;
  &:hover { background: #e2e8f0; }
}
.edit-btn text { font-size: 10px; color: #64748b; font-weight: bold; }
.edit-icon { width: 10px; height: 10px; opacity: 0.6; }

/* ID 样式 */
.id-tag {
  font-size: 12px;
  color: #94a3b8;
  font-family: monospace;
  margin-left: 1px; /* 微调左边距，使其视觉上与上方文字对齐 */
}

/* --- 2. 个性签名 (独立一行) --- */
.signature {
  font-size: 13px;
  color: #475569;
  width: 100%;       /* 占满容器宽度，和下方圆角矩形对齐 */
  line-height: 1.5;  /* [关键] 1.5倍行距 */
  white-space: normal; /* 允许换行 */
  word-break: break-all;
  margin-bottom: 15px; /* 与下方统计条的间距 */
}

/* --- 3. 统计条 (圆角矩形) --- */
.stats-row {
  display: flex;
  justify-content: space-around;
  background: white;
  border-radius: 12px;
  padding: 12px 0;
  border: 1px solid #f1f5f9;
  width: 100%;       /* 宽度占满 */
  margin-top: auto;  /* 如果内容少，推到底部；内容多自然跟随 */
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  &:hover .stat-num { color: #2563eb; }
}

.stat-num {
  font-size: 16px;
  font-weight: 800;
  color: #334155;
  &.text-gold { color: #d97706; }
}

.stat-label {
  font-size: 11px;
  color: #94a3b8;
}

/* 底部：过期条 */
.card-footer-slim {
  height: 36px;
  background: rgba(37, 99, 235, 0.05);
  border-top: 1px solid rgba(37, 99, 235, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.expiry-label { font-size: 11px; color: #64748b; font-weight: 500; }
.renew-btn {
  font-size: 11px; color: #2563eb; font-weight: bold; cursor: pointer;
  &:hover { text-decoration: underline; }
}

/* --- 权益卡片通用 --- */
.rights-static-card {
  .static-header { height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; white-space: nowrap; }
  .static-body { flex: 1; padding: 15px 20px; display: flex; flex-direction: column; gap: 8px; justify-content: center; }
  .r-item { font-size: 12px; color: #475569; display: flex; align-items: center; gap: 8px; }
  .r-item text { font-size: 10px; display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%; background: currentColor; color: white; margin-right: 0; }
}

/* 主题色 */
.diamond-theme { 
  .static-header { background: #eff6ff; color: #2563eb; } 
  .r-item text { color: #2563eb; background: rgba(37, 99, 235, 0.2); }
}
.blackgold-theme { 
  .static-header { background: #1e293b; color: #fbbf24; } 
  .r-item text { color: #d97706; background: rgba(251, 191, 36, 0.2); }
}
.svip-theme {
  .static-header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; }
  .r-item text { color: #7c3aed; background: rgba(124, 58, 237, 0.2); }
}

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
  /* --- 限制最大宽度并居中 --- */
  max-width: 1200px; 
  margin: 0 auto;    
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

/* --- 收藏夹布局 --- */
.fav-layout {
  display: flex; width: 100%; height: 100%;
  border: 1px solid #e2e8f0; border-radius: 12px;
  overflow: hidden; background: white;
  /* 确保 Flex 布局下不溢出 */
  min-height: 0; 
}

/* 1. 收藏夹侧边栏 */
.fav-sidebar {
  width: 220px; border-right: 1px solid #e2e8f0;
  /* 改用相对定位，作为绝对定位子元素的锚点 */
  position: relative; 
  background: #f8fafc; flex-shrink: 0; display: block;
}

.fav-header {
  height: 50px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 15px; border-bottom: 1px solid #e2e8f0; background: white;
  /* 头部绝对定位或者保留在流中，这里保留在流中即可，但上面的列表需要绝对定位避开它 */
  position: absolute; top: 0; left: 0; width: 100%; z-index: 10; box-sizing: border-box;
}

.fav-title { font-weight: bold; color: #334155; font-size: 14px; }

.add-folder-btn {
  width: 24px; height: 24px; border-radius: 4px; background: #eff6ff; color: #2563eb;
  display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer;
}

/* 侧边栏滚动列表：强制绝对定位 */
.folder-list {
  position: absolute;
  top: 50px; /* 避开头部高度 */
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px;
  box-sizing: border-box;
  /* 确保可以滚动 */
  overflow-y: auto; 
}

.folder-item {
  display: flex; align-items: center; padding: 10px; border-radius: 6px;
  cursor: pointer; color: #64748b; font-size: 13px; margin-bottom: 4px;
  &:hover { background: #e2e8f0; }
  &.active { background: #eff6ff; color: #2563eb; font-weight: bold; }
}
.f-icon { margin-right: 8px; font-size: 14px; }
.f-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 2. 收藏夹右侧主区域 */
.fav-workspace {
  flex: 1; min-width: 0; background: #f1f5f9;
  /* 改用相对定位 */
  position: relative; 
  display: block; /* 覆盖之前的 flex */
}

.fav-top-bar {
  height: 50px; background: white; border-bottom: 1px solid #e2e8f0;
  display: flex; align-items: center; justify-content: space-between; padding: 0 20px;
  /* 头部绝对定位 */
  position: absolute; top: 0; left: 0; width: 100%; z-index: 10; box-sizing: border-box;
}

.ft-title { font-weight: bold; color: #1e293b; font-size: 15px; }
.ft-desc { font-size: 12px; color: #94a3b8; }

/* 主区域滚动列表：强制绝对定位 */
.fav-scroll-view {
  position: absolute;
  top: 50px; /* 避开头部高度 */
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  box-sizing: border-box;
  /* 移除 flex 相关属性 */
  padding: 0;
}

/* 空状态容器修正 */
.empty-fav {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 14px;
}

/* --- 补充 Index 风格的题目样式 --- */
.opt-grid { display: grid; gap: 4px 8px; margin-bottom: 10px; color: #334155; }
.sub-q-list-view { margin-top: 12px; border-top: 1px dashed #e2e8f0; padding-top: 12px; }
.sub-q-row { margin-bottom: 12px; }
.sub-q-txt { display: flex; align-items: baseline; margin-bottom: 4px; }
.sub-indent { margin-left: 22px; margin-top: 4px; }
.meta-right { display: flex; align-items: center; }
.op-btn { font-weight: bold; cursor: pointer; font-size: 11px; margin-left: 10px; }
.op-btn.red { color: #ef4444; }

/* --- 全局防挤压补丁 --- */
/* 禁止所有图标、标签、按钮、侧边栏被 flex 压缩 */
.sidebar, .fav-sidebar, 
.avatar-wrap, .role-badge, 
.tag-icon, .f-icon, 
.info-chip, .tag-badge, 
.op-btn, .fav-header, 
.check-icon, .radio-btn {
    flex-shrink: 0 !important;
}
</style>