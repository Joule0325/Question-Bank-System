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
        <block v-if="currentTab === 'home'">
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
        </block>

        <block v-else-if="currentTab === 'papers'">
          <view class="module-layout">
            <view class="module-sidebar">
              <view class="module-sidebar-header">
                <view class="blue-title-box">试卷分类</view>
                <view class="add-svg-btn" @click="addPaperL1Group" title="新建分类">
                  <image src="/static/icons/添加.svg" class="add-svg-icon" mode="aspectFit"></image>
                </view>
              </view>
              <scroll-view scroll-y class="tree-container">
                <block v-for="l1 in paperTree" :key="l1.id">
                  <view class="node-wrapper" style="margin-left: 0px;">
                    <view class="node-content" :class="{ 'selected': currentPaperL1Id === l1.id && !currentPaperL2Id }" @click="togglePaperL1(l1)">
                      <view class="toggle-icon">
                        <text v-if="l1.children && l1.children.length > 0" class="icon-txt">{{ l1.isOpen ? '-' : '+' }}</text>
                        <text v-else class="icon-txt disabled">●</text>
                      </view>
                      <text class="node-title">{{ l1.name }}</text>
                      <text class="f-count" style="font-size:10px; opacity:0.8; margin-left:auto;">({{ getPaperL1Count(l1) }})</text>
                    </view>
                  </view>
                  <view v-if="l1.isOpen" class="children-list">
                    <view v-for="l2 in l1.children" :key="l2.id" class="node-wrapper" style="margin-left: 16px;">
                      <view class="node-content" :class="{ 'selected': currentPaperL2Id === l2.id }" @click.stop="selectPaperL2(l1.id, l2.id)">
                        <view class="toggle-icon"><text class="icon-txt disabled">●</text></view>
                        <text class="node-title">{{ l2.name }}</text>
                        <text class="f-count" style="font-size:10px; opacity:0.8; margin-left:auto;">({{ getPaperL2List(l2.id).length }})</text>
                      </view>
                    </view>
                  </view>
                </block>
              </scroll-view>
            </view>
            
            <view class="module-workspace">
              <view class="workspace-inner">
                <view class="module-top-bar">
                    <view class="ft-info">
                        <text class="ft-title">
                            {{ currentPaperL1Name }} 
                            <text v-if="currentPaperL2Id" style="color:#cbd5e1; margin:0 5px;">/</text> 
                            {{ currentPaperL2Name }}
                        </text>
                        <text class="ft-desc">共 {{ displayPaperList.length }} 份试卷</text>
                    </view>
                    <view class="ft-actions">
                        <view class="h-btn primary" @click="addPaperL2Group" v-if="currentPaperL1Id" style="margin-right:10px;">+ 新建子分类</view>
                        <block v-if="currentPaperL2Id && displayPaperList.length > 0">
                             <view class="h-btn primary outline" @click="openMovePaperModal">批量移动本页试卷</view>
                        </block>
                        <view class="h-btn outline" style="color:#ef4444; border-color:#ef4444; margin-left:10px;" v-if="currentPaperL1Id && currentPaperL1Id !== 'PL1_DEFAULT'" @click="deletePaperL1">删除分类</view>
                        <view class="h-btn outline" style="color:#ef4444; border-color:#ef4444; margin-left:10px;" v-if="currentPaperL2Id && currentPaperL2Id !== 'PL2_DEFAULT'" @click="deletePaperL2">删除子分类</view>
                    </view>
                </view>

                <scroll-view scroll-y class="module-scroll-view">
                    <view class="module-cards-container">
                        <view v-if="!currentPaperL1Id" class="empty-tip">请选择左侧分类查看试卷</view>
                        <view v-else-if="displayPaperList.length === 0" class="empty-tip">该分类下暂无试卷</view>
                        
                        <view v-for="paper in displayPaperList" :key="paper.id" class="paper-card" @click="openPaper(paper)">
                            <view class="pc-icon" :class="paper.type">{{ paper.type === 'pdf' ? 'PDF' : 'W' }}</view>
                            <view class="pc-content">
                                <view class="pc-title">{{ paper.title || '未命名试卷' }}</view>
                                <view class="pc-sub">{{ paper.subTitle }}</view>
                                <view class="pc-meta">
                                    <text>{{ paper.updateTime }}</text>
                                    <text class="pc-sep">|</text>
                                    <text>{{ paper.questions.length }} 题</text>
                                    <text class="pc-status" :class="{ ok: paper.status === '已下载' }">{{ paper.status }}</text>
                                </view>
                            </view>
                            <view class="pc-actions">
                                <view class="h-btn outline primary" style="font-size: 12px; padding: 2px 8px;" @click.stop="moveSinglePaper(paper)">移动</view>
                                <view class="h-btn outline primary" style="font-size: 12px; padding: 2px 8px; margin-left: 8px;">编辑/下载</view>
                                <view class="h-btn outline" style="font-size: 12px; padding: 2px 8px; color: #ef4444; border-color: #ef4444; margin-left: 8px;" @click.stop="deletePaper(paper.id)">删除</view>
                            </view>
                        </view>
                    </view>
                </scroll-view>
              </view>
            </view>
          </view>
        </block>

        <block v-else-if="currentTab === 'tags'">
          <view class="module-layout">
            <view class="module-sidebar">
              <view class="module-sidebar-header">
                <view class="blue-title-box">一级分类</view>
                <view class="add-svg-btn" @click="addLevel1Group" title="新建一级分类">
                  <image src="/static/icons/添加.svg" class="add-svg-icon" mode="aspectFit"></image>
                </view>
              </view>
              <scroll-view scroll-y class="tree-container">
                <block v-for="l1 in tagTree" :key="l1.id">
                  <view class="node-wrapper" style="margin-left: 0px;">
                    <view class="node-content" :class="{ 'selected': currentL1Id === l1.id }" @click="selectLevel1(l1.id)">
                      <view class="toggle-icon"><text class="icon-txt disabled">●</text></view>
                      <text class="node-title">{{ l1.name }}</text>
                      <text class="f-count" style="font-size:10px; opacity:0.8; margin-left:auto;">({{ getL1Count(l1) }})</text>
                    </view>
                  </view>
                </block>
              </scroll-view>
            </view>

            <view class="module-workspace">
              <view class="workspace-inner">
                <view class="module-top-bar">
                  <view class="ft-info">
                      <text class="ft-title">{{ currentL1Name }}</text>
                      <text class="ft-desc">二级分类管理 & 标签归档 (仅私人空间)</text>
                  </view>
                  <view class="ft-actions">
                      <view class="h-btn primary" @click="addLevel2Group" v-if="currentL1Id" style="margin-right:10px;">+ 新建二级分类</view>
                      <block v-if="selectedTags.length > 0">
                           <view class="h-btn primary outline" @click="openMoveTagModal">移动选中标签 ({{selectedTags.length}})</view>
                      </block>
                      <view class="h-btn outline" style="color:#ef4444; border-color:#ef4444; margin-left:10px;" v-if="currentL1Id && currentL1Id !== 'L1_DEFAULT'" @click="deleteLevel1">删除一级分类</view>
                  </view>
                </view>

                <scroll-view scroll-y class="module-scroll-view">
                  <view class="module-cards-container">
                      <view v-if="!currentL1Id" class="empty-tip">请选择左侧一级分类</view>
                      <block v-else>
                          <view v-for="l2 in currentL2List" :key="l2.id" class="l2-group-card">
                              <view class="l2-header">
                                  <view class="l2-title-row">
                                      <text class="l2-icon">📑</text>
                                      <text class="l2-name">{{ l2.name }}</text>
                                      <text class="l2-count">({{ getL2Tags(l2.id).length }})</text>
                                  </view>
                                  <view class="l2-ops" v-if="l2.id !== 'L2_DEFAULT'">
                                      <text class="op-txt" @click="renameLevel2(l2)">重命名</text>
                                      <text class="op-txt red" @click="deleteLevel2(l2.id)">删除</text>
                                  </view>
                              </view>
                              <view class="l2-body">
                                  <view class="tag-grid">
                                      <view v-for="tag in getL2Tags(l2.id)" :key="tag" class="tag-card small" :class="{ selected: selectedTags.includes(tag) }" @click="toggleTagSelection(tag)">
                                          <text class="t-name">{{ tag }}</text>
                                          <view class="check-circle" v-if="selectedTags.includes(tag)">✓</view>
                                      </view>
                                      <view v-if="getL2Tags(l2.id).length === 0" class="no-tags-tip">无标签</view>
                                  </view>
                              </view>
                          </view>
                      </block>
                  </view>
                </scroll-view>
              </view>
            </view>
          </view>
        </block>

        <block v-else-if="currentTab === 'fav'">
          <view class="module-layout">
            <view class="module-sidebar">
              <view class="module-sidebar-header">
                <view class="blue-title-box">我的收藏</view>
                <view class="add-svg-btn" @click="createNewFolder" title="新建收藏夹">
                  <image src="/static/icons/添加.svg" class="add-svg-icon" mode="aspectFit"></image>
                </view>
              </view>
              <scroll-view scroll-y class="tree-container">
                <block v-for="folder in favFolders" :key="folder.id">
                  <view class="node-wrapper" style="margin-left: 0px;">
                    <view class="node-content" :class="{ 'selected': currentFolderId === folder.id }" @click="selectFolder(folder.id)">
                      <view class="toggle-icon"><text class="icon-txt disabled">●</text></view>
                      <text class="node-title">{{ folder.name }}</text>
                    </view>
                  </view>
                </block>
              </scroll-view>
            </view>
            
            <view class="module-workspace">
              <view class="workspace-inner">
                <view class="module-top-bar">
                  <view class="ft-info">
                    <text class="ft-title">{{ currentFolderName }}</text>
                    <text class="ft-desc">共 {{ favQuestions.length }} 题</text>
                  </view>
                </view>
                
                <scroll-view scroll-y class="module-scroll-view">
                  <view class="module-cards-container">
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
                              <view class="sub-q-txt" style="display: flex; align-items: baseline; margin-bottom: 4px;">
                                <text class="sub-idx">{{ formatSubIndex(sIdx + 1) }}</text>
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
                  </view>
                </scroll-view>
              </view>
            </view>
          </view>
        </block>

        <block v-else-if="currentTab === 'orders'">
          <view style="flex:1; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size: 16px;">
            订单页面开发中...
          </view>
        </block>

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
  
    <ExportQuestionsModal v-model:visible="showPdfModal" :questions="currentEditPaper.questions" :initData="currentEditPaper" @save="loadSavedPapers" />
    <ExportWordModal v-model:visible="showWordModal" :questions="currentEditPaper.questions" :initData="currentEditPaper" @save="loadSavedPapers" />
    
    <CommonModal :isOpen="movePaperModalVisible" maxWidth="400px" @close="movePaperModalVisible = false">
      <template #header>
          <view class="custom-header">
              <text class="modal-title">移动试卷到...</text>
              <view class="win-close-btn" @click="movePaperModalVisible = false">✕</view>
          </view>
      </template>
      <view class="move-tree-scroll">
          <view class="move-tree-tip">请选择一个目标分类</view>
          <view v-for="l1 in paperTree" :key="l1.id" class="move-tree-node">
              <view class="move-l1-row"><text class="name">{{ l1.name }}</text></view>
              <view class="move-l2-container">
                  <view v-for="l2 in l1.children" :key="l2.id" class="move-l2-item" @click="executeMovePaper(l2.id)">
                      <text class="icon">↳</text><text class="name">{{ l2.name }}</text>
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
import LatexText from '@/components/LatexText.vue';
import { request } from '@/utils/request.js';
import CommonModal from '@/components/CommonModal.vue';
import { globalConfig, saveConfig as persistConfig, resetConfig, formatSubIndex, formatOptionLabel } from '../utils/configStore.js';
import ExportQuestionsModal from '@/components/ExportQuestionsModal.vue';
import ExportWordModal from '@/components/ExportWordModal.vue';

// --- Tab 切换 ---
const currentTab = ref('home');
const switchTab = (tab) => { 
  currentTab.value = tab; 
  if (tab === 'tags') initTagData();
  if (tab === 'papers') initPaperData(); 
  if (tab === 'fav') loadFavData();
};

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

// --- 组卷/讲义逻辑 ---
const savedPapers = ref([]);
const showPdfModal = ref(false);
const showWordModal = ref(false);
const currentEditPaper = ref({ questions: [] });
const paperTree = ref([]);
const paperMapping = ref({}); 
const currentPaperL1Id = ref(null);
const currentPaperL2Id = ref(null);
const movePaperModalVisible = ref(false);
const paperToMoveId = ref(null); 

const initPaperData = () => {
    savedPapers.value = uni.getStorageSync('USER_SAVED_PAPERS') || [];
    const storedTree = uni.getStorageSync('USER_PAPER_TREE');
    const storedMap = uni.getStorageSync('USER_PAPER_MAPPING');
    if (storedTree) paperTree.value = JSON.parse(storedTree);
    else { paperTree.value = [ { id: 'PL1_DEFAULT', name: '我的组卷', isOpen: true, children: [{ id: 'PL2_DEFAULT', name: '默认归档' }] } ]; uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); }
    if (storedMap) paperMapping.value = JSON.parse(storedMap); else paperMapping.value = {};
    
    let mapChanged = false;
    savedPapers.value.forEach(p => { if (!paperMapping.value[p.id]) { paperMapping.value[p.id] = 'PL2_DEFAULT'; mapChanged = true; } });
    if (mapChanged) uni.setStorageSync('USER_PAPER_MAPPING', JSON.stringify(paperMapping.value));
    if (!currentPaperL1Id.value && paperTree.value.length > 0) { currentPaperL1Id.value = paperTree.value[0].id; currentPaperL2Id.value = paperTree.value[0].children[0].id; }
};
const currentPaperL1Name = computed(() => { const l1 = paperTree.value.find(i => i.id === currentPaperL1Id.value); return l1 ? l1.name : ''; });
const currentPaperL2Name = computed(() => { if(!currentPaperL1Id.value) return ''; const l1 = paperTree.value.find(i => i.id === currentPaperL1Id.value); if(l1 && currentPaperL2Id.value) { const l2 = l1.children.find(c => c.id === currentPaperL2Id.value); return l2 ? l2.name : ''; } return '所有'; });
const displayPaperList = computed(() => { if (!currentPaperL2Id.value) return []; return savedPapers.value.filter(p => (paperMapping.value[p.id] || 'PL2_DEFAULT') === currentPaperL2Id.value); });
const getPaperL1Count = (l1) => { let count = 0; if(l1.children) l1.children.forEach(l2 => count += getPaperL2List(l2.id).length); return count; };
const getPaperL2List = (l2Id) => { return savedPapers.value.filter(p => (paperMapping.value[p.id] || 'PL2_DEFAULT') === l2Id); };
const togglePaperL1 = (l1) => { if (currentPaperL1Id.value === l1.id) l1.isOpen = !l1.isOpen; else { currentPaperL1Id.value = l1.id; l1.isOpen = true; if(l1.children && l1.children.length > 0) currentPaperL2Id.value = l1.children[0].id; } uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); };
const selectPaperL2 = (l1Id, l2Id) => { currentPaperL1Id.value = l1Id; currentPaperL2Id.value = l2Id; };
const addPaperL1Group = () => { uni.showModal({ title: '新建一级分类', editable: true, placeholderText: '如：高三复习', success: (res) => { if (res.confirm && res.content) { paperTree.value.push({ id: 'PL1_' + Date.now(), name: res.content, isOpen: true, children: [{ id: 'PL2_' + Date.now() + '_def', name: '默认子类' }] }); uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); } } }); };
const addPaperL2Group = () => { uni.showModal({ title: '新建子分类', editable: true, placeholderText: '如：摸底考试', success: (res) => { if (res.confirm && res.content) { const l1 = paperTree.value.find(i => i.id === currentPaperL1Id.value); if (l1) { l1.children.push({ id: 'PL2_' + Date.now(), name: res.content }); uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); } } } }); };
const deletePaperL1 = () => { uni.showModal({ title: '删除分类', content: '其下试卷将移动到默认归档，确定吗？', success: (res) => { if(res.confirm) { const l1 = paperTree.value.find(i => i.id === currentPaperL1Id.value); l1.children.forEach(l2 => { getPaperL2List(l2.id).forEach(p => paperMapping.value[p.id] = 'PL2_DEFAULT'); }); uni.setStorageSync('USER_PAPER_MAPPING', JSON.stringify(paperMapping.value)); paperTree.value = paperTree.value.filter(i => i.id !== currentPaperL1Id.value); uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); currentPaperL1Id.value = 'PL1_DEFAULT'; currentPaperL2Id.value = 'PL2_DEFAULT'; } } }); };
const deletePaperL2 = () => { const l1 = paperTree.value.find(i => i.id === currentPaperL1Id.value); l1.children = l1.children.filter(c => c.id !== currentPaperL2Id.value); uni.setStorageSync('USER_PAPER_TREE', JSON.stringify(paperTree.value)); currentPaperL2Id.value = l1.children[0]?.id; };
const moveSinglePaper = (paper) => { paperToMoveId.value = paper.id; movePaperModalVisible.value = true; };
const openMovePaperModal = () => { paperToMoveId.value = null; movePaperModalVisible.value = true; };
const executeMovePaper = (targetL2Id) => { if (paperToMoveId.value) { paperMapping.value[paperToMoveId.value] = targetL2Id; } else { displayPaperList.value.forEach(p => paperMapping.value[p.id] = targetL2Id); } uni.setStorageSync('USER_PAPER_MAPPING', JSON.stringify(paperMapping.value)); uni.showToast({ title: '移动成功', icon: 'success' }); movePaperModalVisible.value = false; };
const loadSavedPapers = () => { initPaperData(); };
const openPaper = (paper) => { currentEditPaper.value = paper; if (paper.type === 'pdf') showPdfModal.value = true; else showWordModal.value = true; };
const deletePaper = (id) => { uni.showModal({ title: '删除试卷', content: '确定删除吗？', success: (res) => { if (res.confirm) { let papers = uni.getStorageSync('USER_SAVED_PAPERS') || []; papers = papers.filter(p => p.id !== id); uni.setStorageSync('USER_SAVED_PAPERS', papers); delete paperMapping.value[id]; uni.setStorageSync('USER_PAPER_MAPPING', JSON.stringify(paperMapping.value)); initPaperData(); } } }); };

// --- 标签管理逻辑 ---
const tagTree = ref([]); 
const tagMapping = ref({}); 
const currentL1Id = ref(null);
const allUserTags = ref([]); 
const selectedTags = ref([]); 
const initTagData = async () => {
    const storedTree = uni.getStorageSync('USER_TAG_TREE_DATA');
    const storedMapping = uni.getStorageSync('USER_TAG_MAPPING_V2');
    if (storedTree) tagTree.value = JSON.parse(storedTree);
    else { tagTree.value = [ { id: 'L1_DEFAULT', name: '默认分类', children: [ { id: 'L2_DEFAULT', name: '未归档' } ] } ]; uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); }
    if (storedMapping) tagMapping.value = JSON.parse(storedMapping); else tagMapping.value = {};
    if (!currentL1Id.value && tagTree.value.length > 0) currentL1Id.value = tagTree.value[0].id;
    try {
      const res = await request({ url: '/api/questions', method: 'GET', data: { mode: 'private' } });
      const qList = res.data || []; const foundTags = new Set();
      qList.forEach(q => { if (q.tags && Array.isArray(q.tags)) { q.tags.forEach(t => { if(t) foundTags.add(t); }); } if (q.subQuestions) { q.subQuestions.forEach(sq => { if (sq.tags && Array.isArray(sq.tags)) { sq.tags.forEach(t => { if(t) foundTags.add(t); }); } }); } });
      allUserTags.value = Array.from(foundTags);
      let mappingChanged = false;
      allUserTags.value.forEach(t => { if (!tagMapping.value[t]) { tagMapping.value[t] = 'L2_DEFAULT'; mappingChanged = true; } });
      if (mappingChanged) uni.setStorageSync('USER_TAG_MAPPING_V2', JSON.stringify(tagMapping.value));
    } catch (e) {}
    selectedTags.value = [];
};
const currentL1Name = computed(() => { const l1 = tagTree.value.find(item => item.id === currentL1Id.value); return l1 ? l1.name : '未选择'; });
const currentL2List = computed(() => { const l1 = tagTree.value.find(item => item.id === currentL1Id.value); return l1 ? l1.children : []; });
const getL1Count = (l1) => { if (!l1 || !l1.children) return 0; let count = 0; l1.children.forEach(l2 => { count += getL2Tags(l2.id).length; }); return count; };
const getL2Tags = (l2Id) => { return allUserTags.value.filter(t => (tagMapping.value[t] || 'L2_DEFAULT') === l2Id); };
const selectLevel1 = (id) => { currentL1Id.value = id; selectedTags.value = []; };
const addLevel1Group = () => { uni.showModal({ title: '新建一级分类', editable: true, placeholderText: '例如：按学科、按年份', success: (res) => { if (res.confirm && res.content) { tagTree.value.push({ id: 'L1_' + Date.now(), name: res.content, children: [] }); uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); } } }); };
const addLevel2Group = () => { if (!currentL1Id.value) return; uni.showModal({ title: '新建二级分类', editable: true, placeholderText: '例如：数学、物理、2023年', success: (res) => { if (res.confirm && res.content) { const l1 = tagTree.value.find(i => i.id === currentL1Id.value); if (l1) { l1.children.push({ id: 'L2_' + Date.now(), name: res.content }); uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); } } } }); };
const deleteLevel1 = () => { if (currentL1Id.value === 'L1_DEFAULT') return uni.showToast({ title: '默认不可删除', icon: 'none' }); uni.showModal({ title: '删除', content: '确定删除吗？', success: (res) => { if (res.confirm) { const l1 = tagTree.value.find(i => i.id === currentL1Id.value); if (l1 && l1.children) { l1.children.forEach(l2 => { const tags = getL2Tags(l2.id); tags.forEach(t => tagMapping.value[t] = 'L2_DEFAULT'); }); } uni.setStorageSync('USER_TAG_MAPPING_V2', JSON.stringify(tagMapping.value)); tagTree.value = tagTree.value.filter(i => i.id !== currentL1Id.value); uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); currentL1Id.value = 'L1_DEFAULT'; } } }); };
const renameLevel2 = (l2) => { uni.showModal({ title: '重命名', editable: true, content: l2.name, success: (res) => { if (res.confirm && res.content) { l2.name = res.content; uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); } } }); };
const deleteLevel2 = (l2Id) => { uni.showModal({ title: '删除', content: '确定吗？', success: (res) => { if (res.confirm) { const tags = getL2Tags(l2Id); tags.forEach(t => tagMapping.value[t] = 'L2_DEFAULT'); uni.setStorageSync('USER_TAG_MAPPING_V2', JSON.stringify(tagMapping.value)); const l1 = tagTree.value.find(i => i.id === currentL1Id.value); if (l1) { l1.children = l1.children.filter(sub => sub.id !== l2Id); uni.setStorageSync('USER_TAG_TREE_DATA', JSON.stringify(tagTree.value)); } } } }); };
const toggleTagSelection = (tag) => { if (selectedTags.value.includes(tag)) selectedTags.value = selectedTags.value.filter(t => t !== tag); else selectedTags.value.push(tag); };
const openMoveTagModal = () => { const flatOptions = []; const flatIds = []; tagTree.value.forEach(l1 => { l1.children.forEach(l2 => { flatOptions.push(`${l1.name} / ${l2.name}`); flatIds.push(l2.id); }); }); uni.showActionSheet({ itemList: flatOptions, success: (res) => { const targetL2Id = flatIds[res.tapIndex]; selectedTags.value.forEach(t => { tagMapping.value[t] = targetL2Id; }); uni.setStorageSync('USER_TAG_MAPPING_V2', JSON.stringify(tagMapping.value)); uni.showToast({ title: '移动成功', icon: 'none' }); selectedTags.value = []; } }); };

// --- 收藏夹逻辑 ---
const favFolders = ref([]);
const favMap = ref({});
const currentFolderId = ref(null);
const favQuestions = ref([]);
const showAnswerMap = ref({});

const loadFavData = () => {
  const folders = uni.getStorageSync('USER_FAV_FOLDERS');
  const data = uni.getStorageSync('USER_FAV_DATA');
  if (folders) favFolders.value = JSON.parse(folders);
  else { favFolders.value = [{ id: 1, name: '默认收藏夹' }]; uni.setStorageSync('USER_FAV_FOLDERS', JSON.stringify(favFolders.value)); }
  if (!currentFolderId.value && favFolders.value.length > 0) currentFolderId.value = favFolders.value[0].id;
  if (data) favMap.value = JSON.parse(data); else favMap.value = {};
  loadQuestionsForFolder();
};
const createNewFolder = () => { uni.showModal({ title: '新建收藏夹', editable: true, placeholderText: '请输入文件夹名称', success: (res) => { if (res.confirm && res.content) { favFolders.value.push({ id: Date.now(), name: res.content }); uni.setStorageSync('USER_FAV_FOLDERS', JSON.stringify(favFolders.value)); } } }); };
const selectFolder = (id) => { currentFolderId.value = id; loadQuestionsForFolder(); };
const loadQuestionsForFolder = async () => {
  if (!currentFolderId.value) return;
  const targetQids = [];
  for (let qid in favMap.value) { if (favMap.value[qid] === currentFolderId.value) targetQids.push(qid); }
  if (targetQids.length === 0) { favQuestions.value = []; return; }
  try {
    const [resPrivate, resPublic] = await Promise.all([ request({ url: '/api/questions', method: 'GET', data: { mode: 'private' } }), request({ url: '/api/questions', method: 'GET', data: { mode: 'public' } }) ]);
    let allQs = [];
    if (resPrivate && resPrivate.data) allQs = allQs.concat(resPrivate.data);
    if (resPublic && resPublic.data) allQs = allQs.concat(resPublic.data);
    const uniqueQs = new Map();
    allQs.forEach(q => uniqueQs.set(q.id, q));
    favQuestions.value = Array.from(uniqueQs.values()).filter(q => targetQids.includes(q.id)).map(processQuestionData);
  } catch (e) { }
};
const processQuestionData = (q) => { let parsedOptions = q.options; if (typeof parsedOptions === 'string') { try { parsedOptions = JSON.parse(parsedOptions); } catch (e) { parsedOptions = {}; } } return { ...q, options: parsedOptions || {}, tags: q.tags || [], code: q.code || 'A' + q.id.toString().substr(-4) }; };
const removeFav = (qid) => { uni.showModal({ content: '确定移出吗？', success: (res) => { if (res.confirm) { delete favMap.value[qid]; uni.setStorageSync('USER_FAV_DATA', JSON.stringify(favMap.value)); loadQuestionsForFolder(); } } }); };
const toggleAnswer = (id) => { showAnswerMap.value[id] = !showAnswerMap.value[id]; };
const currentFolderName = computed(() => { const f = favFolders.value.find(x => x.id === currentFolderId.value); return f ? f.name : '收藏夹'; });

// --- 收银台相关操作 ---
const openPaymentModal = (tierKey) => { if (tierKey === 'svip') return uni.showToast({ title: '请联系客服', icon: 'none' }); targetTierKey.value = tierKey; paymentStep.value = 1; selectedPlanId.value = 1; paymentVisible.value = true; };
const closePaymentModal = () => { paymentVisible.value = false; isCheckingPayment.value = false; };
const selectPlan = (plan) => { selectedPlanId.value = plan.id; };
const goToQrCode = () => { if (!selectedPlan.value) return; uni.showLoading({ title: '创建订单中...' }); setTimeout(() => { uni.hideLoading(); paymentStep.value = 2; }, 600); };

onMounted(() => { initUserProfile(); loadFavData(); });
</script>

<style lang="scss" scoped>
/* =========================================
   1. 整体基础布局 & 顶部导航
   ========================================= */
.full-screen-bg { height: 100vh; width: 100%; background-color: #f1f5f9; display: flex; box-sizing: border-box; overflow: auto; min-width: 1024px; min-height: 600px; }
.app-wrapper { width: 100%; height: 100%; background: white; display: flex; flex-direction: column; overflow: hidden; padding: 20px; box-sizing: border-box; }

.top-nav-container { background-color: #f0f0f0; border-radius: 4px; padding: 10px; display: flex; flex-shrink: 0; height: 35px; }
.nav-list { display: flex; flex-direction: row; gap: 12px; padding: 0; align-items: center; justify-content: flex-start; width: 100%; }
.nav-item { padding: 12px 12px; border-radius: 4px; font-size: 14px; color: #64748b; background: #ffffff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; white-space: nowrap; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); height: 8px; }
.nav-item:hover { color: #334155; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08); }
.nav-item.active { color: #2563eb; font-weight: bold; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15); }

.main-content { flex: 1; display: flex; flex-direction: column; padding: 0; gap: 20px; background: white; min-width: 0; width: 100%; height: 100%; box-sizing: border-box; margin-top: 20px; }

/* =========================================
   2. 首页 (Home) 专属样式
   ========================================= */
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

/* 高级自定义滑动条样式 */
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


/* =========================================
   3. 分类页统一模块化布局 (Papers, Tags, Fav)
   ========================================= */
.module-layout { display: flex; flex-direction: row; width: 100%; height: 100%; gap: 20px; min-height: 0; }
.module-sidebar { width: 350px; background-color: #f0f0f0; border-radius: 8px; display: flex; flex-direction: column; flex-shrink: 0; padding: 15px; box-sizing: border-box; }
.module-sidebar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; flex-shrink: 0; }
.blue-title-box { background-color: #2563eb; color: white; font-size: 13px; font-weight: bold; padding: 6px 10px; border-radius: 4px; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2); }
.add-svg-btn { width: 28px; height: 28px; background: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s; }
.add-svg-btn:hover { background: #e2e8f0; transform: translateY(-1px); }
.add-svg-icon { width: 16px; height: 16px; }

.module-workspace { flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100%; }
.workspace-inner { display: flex; flex-direction: column; gap: 15px; height: 100%; width: 100%; }
.module-top-bar { background-color: white; border-radius: 12px; height: 60px; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03); border: 1px solid #f1f5f9; width: 100%; box-sizing: border-box; }
.module-scroll-view { flex: 1; min-height: 0; width: 100%; background: transparent; }
.module-cards-container, .tag-manage-container, .cards-container { padding: 0; padding-bottom: 40px; width: 100%; display: flex; flex-direction: column; gap: 15px; }

/* =========================================
   4. 左侧目录树节点样式
   ========================================= */
.tree-container { flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0; margin: 0 -5px; padding: 5px 5px 0 5px; box-sizing: border-box; }
.node-wrapper { position: relative; transition: all 0.2s; margin-bottom: 8px; padding-right: 8px; }
.node-content { display: flex; align-items: center; padding: 6px 8px; width: 100%; border-radius: 4px; background-color: white; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); cursor: pointer; user-select: none; border: 1px solid transparent; box-sizing: border-box; position: relative; }
.node-content:hover { background-color: #fff; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); }
.node-content:hover .node-title { color: #2563eb; } .node-content:hover .icon-txt { color: rgb(98, 148, 206); }
.node-content.selected { background-color: rgb(98, 148, 206); border-color: rgb(98, 148, 206); }
.node-content.selected .node-title, .node-content.selected .icon-txt, .node-content.selected .f-count { color: white; font-weight: bold; }
.toggle-icon { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; margin-right: 8px; border-radius: 3px; border: 1px solid #f0f0f0; background-color: #f0f0f0; flex-shrink: 0; }
.node-content.selected .toggle-icon { border-color: rgba(255,255,255,0.3); background-color: rgba(255,255,255,0.2); }
.icon-txt { font-family: monospace; font-weight: bold; color: #64748b; font-size: 14px; line-height: 1; }
.icon-txt.disabled { color: #cbd5e1; font-size: 10px; }
.node-title { font-size: 13px; color: #334155; flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.children-list { width: 100%; margin-top: 2px; }

/* =========================================
   5. 顶部操作文字与按钮
   ========================================= */
.ft-info { display: flex; flex-direction: column; gap: 2px; } .ft-actions { display: flex; align-items: center; }
.ft-title { font-weight: bold; color: #1e293b; font-size: 15px; } .ft-desc { font-size: 12px; color: #94a3b8; }
.empty-tip { text-align: center; color: #94a3b8; margin-top: 50px; }

/* =========================================
   6. 试卷与题目卡片 (.paper-card, .q-card)
   ========================================= */
.paper-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: all 0.2s; box-sizing: border-box; width: 100%; }
.paper-card:hover { border-color: #94a3b8; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.pc-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; color: white; flex-shrink: 0; }
.pc-icon.pdf { background: #ef4444; } .pc-icon.word { background: #2563eb; }
.pc-content { flex: 1; min-width: 0; }
.pc-title { font-weight: bold; font-size: 15px; color: #1e293b; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-sub { font-size: 12px; color: #64748b; margin-bottom: 6px; }
.pc-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #94a3b8; } .pc-sep { color: #cbd5e1; }
.pc-status { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; color: #64748b; } .pc-status.ok { background: #dcfce7; color: #166534; }
.pc-actions { display: flex; align-items: center; }

.q-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); font-family: "Times New Roman", "SimSun", "Songti SC", serif; width: 100%; box-sizing: border-box; }
.q-header { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 12px; }
.meta-left { display: flex; gap: 6px; flex-wrap: wrap; } .meta-right { display: flex; align-items: center; }
.info-chip { padding: 2px 8px; border-radius: 4px; background: #f1f5f9; color: #64748b; font-size: 11px; display: flex; align-items: center; white-space: nowrap; }
.info-chip.type { color: #2563eb; background: #eff6ff; font-weight: bold; } .info-chip.diff { color: #f59e0b; background: #fffbeb; } .info-chip.prov { background: #f0fdf4; color: #166534; } .info-chip.year { background: #eef2ff; color: #4338ca; } .info-chip.num { font-family: monospace; } .info-chip.source { background: #fff1f2; color: #e11d48; }
.q-body { color: #1e293b; cursor: default; }
.q-title { margin-bottom: 8px; display: flex; align-items: baseline; word-break: break-all; white-space: normal; }
.opt-list { display: flex; flex-direction: column; } .opt-item { display: flex; align-items: baseline; }
.opt-key { font-weight: bold; margin-right: 8px; flex-shrink: 0; color: #334155; } .opt-val { color: #334155; word-break: break-all; flex: 1; }
.sub-q-list-view { margin-top: 12px; border-top: 1px dashed #e2e8f0; padding-top: 12px; } .sub-q-row { margin-bottom: 12px; }
.sub-q-txt { display: flex; align-items: baseline; margin-bottom: 4px; } .sub-idx { font-weight: bold; margin-right: 6px; flex-shrink: 0; color: #334155; }
.sub-content { flex: 1; } .sub-indent { margin-left: 22px; margin-top: 4px; } .mt-2 { margin-top: 12px; }
.opt-grid { display: grid; gap: 4px 8px; margin-bottom: 10px; color: #334155; }
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
.op-btn { font-weight: bold; cursor: pointer; font-size: 11px; margin-left: 10px; } .op-btn.red { color: #ef4444; }

/* =========================================
   7. 标签管理卡片特有样式
   ========================================= */
.l2-group-card { background: white; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; width: 100%; box-sizing: border-box;}
.l2-header { background: #f8fafc; padding: 10px 15px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
.l2-title-row { display: flex; align-items: center; gap: 8px; } .l2-icon { font-size: 14px; } .l2-name { font-weight: bold; font-size: 14px; color: #334155; } .l2-count { color: #94a3b8; font-size: 12px; }
.l2-ops { display: flex; gap: 10px; } .op-txt { font-size: 11px; color: #64748b; cursor: pointer; } .op-txt:hover { color: #2563eb; } .op-txt.red:hover { color: #ef4444; }
.l2-body { padding: 15px; }
.tag-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
.tag-card { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; position: relative; transition: all 0.2s; }
.tag-card.small { padding: 6px 10px; font-size: 12px; } .tag-card:hover { border-color: #94a3b8; } .tag-card.selected { border-color: #2563eb; background: #eff6ff; color: #2563eb; font-weight: bold; }
.t-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.check-circle { width: 16px; height: 16px; background: #2563eb; border-radius: 50%; color: white; font-size: 10px; display: flex; align-items: center; justify-content: center; position: absolute; top: -5px; right: -5px; }
.no-tags-tip { font-size: 12px; color: #cbd5e1; grid-column: 1 / -1; text-align: center; padding: 10px 0; font-style: italic; }

/* =========================================
   8. 弹窗及通用按钮组件样式
   ========================================= */
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

.move-tree-scroll { max-height: 300px; overflow-y: auto; padding: 10px; }
.move-tree-tip { font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 10px; }
.move-tree-node { margin-bottom: 5px; }
.move-l1-row { display: flex; align-items: center; padding: 8px; background: #f8fafc; border-radius: 4px; cursor: pointer; }
.move-l1-row:hover { background: #eff6ff; } .move-l1-row .name { font-weight: bold; font-size: 13px; color: #334155; }
.move-l2-container { margin-left: 20px; border-left: 1px solid #e2e8f0; padding-left: 5px; margin-top: 4px; }
.move-l2-item { padding: 6px 10px; cursor: pointer; display: flex; align-items: center; border-radius: 4px; }
.move-l2-item:hover { background: #e2e8f0; color: #2563eb; } .move-l2-item .icon { font-size: 12px; margin-right: 6px; opacity: 0.5; } .move-l2-item .name { font-size: 13px; }

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