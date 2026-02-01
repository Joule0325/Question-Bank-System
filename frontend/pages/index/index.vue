<template>
  <view class="layout-shell" @click="handleGlobalClick">
    <view class="app-sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <view class="logo-area">
        <text class="logo-txt" :class="{ 'mini': isSidebarCollapsed }">{{ isSidebarCollapsed ? 'S' : 'Source' }}</text>
      </view>
      
      <view class="space-switcher" v-if="!isSidebarCollapsed">
         <view class="space-btn" :class="{active: currentMode==='private'}" @click="switchMode('private')">私人</view>
         <view class="space-btn" :class="{active: currentMode==='public'}" @click="switchMode('public')">公共</view>
      </view>
      <view class="space-switcher-mini" v-else>
         <text class="space-char">{{ currentMode==='private' ? '私' : '公' }}</text>
      </view>
      
      <view class="nav-items">
        <view class="nav-item" :class="{active: activeTab==='question_bank'}" @click="activeTab='question_bank'">
          <image src="/static/icons/题库.svg" class="nav-icon-img" mode="aspectFit"></image>
          <text class="nav-txt">题库</text>
        </view>
        <view class="nav-item" :class="{active: activeTab==='class'}" @click="activeTab='class'">
          <image src="/static/icons/白板.svg" class="nav-icon-img" mode="aspectFit"></image>
          <text class="nav-txt">白板</text>
        </view>
        <view class="nav-item" :class="{active: activeTab==='resources'}" @click="activeTab='resources'">
          <image src="/static/icons/资源.svg" class="nav-icon-img" mode="aspectFit"></image>
          <text class="nav-txt">资源</text>
        </view>
      </view>

      <view class="collapse-btn" @click="isSidebarCollapsed = !isSidebarCollapsed">
        <text class="collapse-icon">{{ isSidebarCollapsed ? '»' : '«' }}</text>
      </view>
    </view>

    <view class="main-workspace" v-if="activeTab === 'question_bank'">
      <view class="top-header">
              <view class="header-left-filters">
                <input class="mini-input" v-model="filterYear" placeholder="年份" @input="debounceLoadQuestions" />
                <input class="mini-input small" v-model="filterQNumber" placeholder="题号" @input="debounceLoadQuestions" />
                <input class="mini-input medium" v-model="filterSource" placeholder="来源关键词..." @input="debounceLoadQuestions" />
              </view>
      
              <view class="header-right">
                
                <view class="total-count-box">
                  <text>共</text>
                  <text class="tc-num">{{ questions.length }}</text>
                  <text>题</text>
                </view>
                
                <view class="page-size-wrap">
                  <text class="ps-label">每页</text>
                  <picker :range="[10, 20, 50]" @change="handlePageSizeChange">
                    <view class="ps-box">
                      <text class="ps-text">{{ itemsPerPage }}</text>
                      <image src="/static/icons/三角.svg" class="ps-icon" mode="aspectFit" />
                    </view>
                  </picker>
                  <text class="ps-label">题</text>
                </view>

                <view class="pagination-bar">
                  <image 
                    src="/static/icons/左-圆.svg" 
                    class="pg-circle-btn" 
                    :class="{ disabled: currentPage === 1 }"
                    @click="changePage(-1)" 
                    mode="aspectFit"
                  />

                  <view class="pg-numbers">
                    <view 
                      v-for="(item, index) in visiblePages" 
                      :key="item.key" 
                      class="pg-num-circle" 
                      :class="{ active: item.isActive }"
                      @click="goToPage(item.val)"
                    >
                      {{ item.val }}
                    </view>
                  </view>

                  <view class="pg-more-wrap" v-if="totalPages > 5">
                    <image 
                      src="/static/icons/更多.svg" 
                      class="pg-more-icon" 
                      @click.stop="toggleJumpPopover"
                      mode="aspectFit"
                    />
                    <view class="jump-popover" v-if="showJumpPopover" @click.stop>
                      <input 
                        class="jump-input" 
                        v-model="jumpPageInput" 
                        type="number" 
                        :focus="showJumpPopover" 
                        @confirm="handleJumpConfirm" 
                      />
                      <view class="jump-go-btn" @click="handleJumpConfirm">Go</view>
                    </view>
                  </view>

                  <view class="pg-total-text" v-if="totalPages > 5">
                    共 {{ totalPages }} 页
                  </view>

                  <image 
                    src="/static/icons/右-圆.svg" 
                    class="pg-circle-btn" 
                    :class="{ disabled: currentPage >= totalPages }"
                    @click="changePage(1)" 
                    mode="aspectFit"
                  />
                </view>
                </view>
      </view>

      <view class="workspace-body">
        
        <view class="resource-sidebar-wrapper">
          <view class="resource-sidebar">
            <view class="res-header">
              <view class="subject-wrapper" @click.stop="subjectDropdownOpen = !subjectDropdownOpen">
                <view class="subject-btn" :class="{ 'public-mode': currentMode === 'public' }">
                  <text>{{ currentSubjectName }}</text>
                  <image src="/static/icons/三角.svg" class="arrow-icon" mode="aspectFit"></image>
                </view>
                <view class="custom-subject-dropdown" v-if="subjectDropdownOpen">
                  <view class="sub-item" v-for="(sub, index) in subjects" :key="sub.id" @click.stop="selectSubject(index)" :class="{ active: currentSubjectIdx === index }">{{ sub.title }}</view>
                </view>
              </view>
              <view class="setting-wrapper" v-if="canEdit" @mouseenter="manageMenuOpen = true" @mouseleave="manageMenuOpen = false">
                <view class="setting-btn custom-menu-icon">
                  <view class="menu-line"></view>
                  <view class="menu-line"></view>
                  <view class="menu-line"></view>
                </view>
                <view class="popover-menu" v-if="manageMenuOpen">
                  <view class="menu-item header">目录管理</view>
                  <view class="menu-item" @click="showSubjectModal = true">目录类型编辑</view>
                  <view class="menu-item" @click="showContentModal = true">目录内容管理</view>
                  <view class="divider-h"></view>
                  <view class="menu-item" @click="toggleExpandAll(true)">展开所有目录</view>
                  <view class="menu-item" @click="toggleExpandAll(false)">折叠所有目录</view>
                </view>
              </view>
            </view>

            <view class="search-bar-row">
              <view class="search-wrap">
                <input class="search-input" v-model="catSearch" placeholder="搜索知识点..." @input="handleCatSearchInput" />
              </view>
              <view class="multi-switch" @click="isMultiSelect = !isMultiSelect" :class="{active: isMultiSelect}" title="开启多选">
                <text class="switch-txt">多选</text>
                <view class="switch-btn"></view>
              </view>
            </view>

            <view class="tree-scroll">
              <CategoryTree 
                v-for="cat in categories" 
                :key="cat.id" 
                :node="cat" 
                :level="0"
                :selectedIds="selectedCategoryIds"
                :defaultOpen="defaultTreeOpen"
                :expandedIds="treeExpandedIds"
                @select="handleTreeSelect"
              ></CategoryTree>
            </view>
          </view>
        </view>

        <view class="content-canvas">
          <view class="filter-bar">
            
            <view class="filter-header" @click="isFilterExpanded = !isFilterExpanded">
              <view class="fh-left-group">
                <text class="fh-title">筛选条件 <text v-if="currentMode==='public'" style="font-weight:normal;color:#94a3b8;margin-left:5px;">(公共库)</text></text>
                
                <view class="clear-filter-btn" 
                      v-if="allActiveFilters.length > 0" 
                      @click.stop="clearAllFilters">
                  清空标签筛选
                </view>
              </view>
            
              <text class="fh-icon">{{ isFilterExpanded ? '▲ 收起' : '▼ 展开' }}</text>
            </view>
          
            <view class="filter-body" :class="{ collapsed: !isFilterExpanded }">
              <view class="f-row">
                <text class="f-label">题型:</text>
                <view class="f-tags">
                  <text class="tag" :class="{active: selectedType==='全部'}" @click="selectedType='全部'">全部</text>
                  <text class="tag" v-for="t in typeOptions" :key="t" :class="{active: selectedType===t}" @click="selectedType=t">{{ t }}</text>
                </view>
              </view>
              
              <view class="f-row mt-2">
                <text class="f-label">难度:</text>
                <view class="f-tags">
                  <text class="tag" :class="{active: selectedDiff==='全部'}" @click="selectedDiff='全部'">全部</text>
                  <text class="tag" v-for="d in [1,2,3,4,5]" :key="d" :class="{active: selectedDiff===d}" @click="selectedDiff=d">{{ '★'.repeat(d) }}</text>
                </view>
              </view>
              
              <view class="f-row mt-2 align-start">
                <text class="f-label">地区:</text>
                <view class="province-grid">
                  <text class="tag" :class="{active: selectedProvince==='全部'}" @click="selectedProvince='全部'">全部</text>
                  <text class="tag" v-for="p in provinceOptions" :key="p" :class="{active: selectedProvince===p}" @click="selectedProvince=p">{{ p }}</text>
                </view>
              </view>
          
              <view class="f-row mt-2 active-filters-row" v-if="allActiveFilters.length > 0">
                <text class="f-label">筛选:</text>
                <view class="f-tags">
                  <view v-for="item in allActiveFilters" :key="item.type + item.id" 
                        class="tag-chip" 
                        :class="item.type === 'cat' ? 'red' : 'blue'">
                      <text>{{ item.name }}</text>
                      <text class="x-btn" @click.stop="removeFilter(item)">✕</text>
                  </view>
                  </view>
              </view>
          
            </view> 
          </view>

          <scroll-view scroll-y class="list-scroll">
            <view v-if="loading" class="state-txt">加载中...</view>
            <view v-else-if="questions.length===0" class="state-txt">暂无题目</view>
            
            <view v-for="q in displayedQuestions" :key="q.id" class="q-card">
              <view class="q-header">
                <view class="meta-left">
                  <text class="info-chip year">{{ q.year || '未知年份' }}</text>
                  <text class="info-chip src">{{ q.source || '未知来源' }}</text>
                  <text class="info-chip num">第 {{ q.qNumber || '-' }} 题</text>
                  <text class="info-chip diff">{{ '★'.repeat(q.difficulty) }}</text>
                  <text class="info-chip type">{{ q.type }}</text>
                  <text class="info-chip prov" v-if="q.province">{{ q.province }}</text>
                </view>
                
                <view class="meta-right">
                  <template v-if="currentMode === 'public'">
                      <block v-if="currentUser && currentUser.role === 'admin'">
                          <text class="op-btn green" @click="openForkModal(q)">+ 加入我的题库</text>
                          <text class="op-btn blue" @click="openEditModal(q)">编辑</text>
                          <text class="op-btn red" @click="handleDelete(q.id)">删除</text>
                      </block>
                      <text v-else class="op-btn green" @click="openForkModal(q)">+ 加入我的题库</text>
                  </template>
                  
                  <template v-else>
                      <text class="op-btn blue" @click="openEditModal(q)">编辑</text>
                      <text class="op-btn red" @click="handleDelete(q.id)">删除</text>
                  </template>
                </view>
              </view>

              <view class="q-body" :class="{ 'layout-side-right': q.imgPosCode === 'r' }" @click="toggleAnswer(q.id)">
                <view class="content-wrapper">
                    <view v-if="q.image && q.imgPosCode.startsWith('u')" class="img-container" :class="'align-'+q.imgAlign">
                       <image :src="q.image" class="q-image" mode="widthFix" />
                    </view>

                    <view class="body-row" :class="{'material-box': q.subQuestions && q.subQuestions.length > 0}">
                      <view class="q-title"><LatexText :text="q.title"></LatexText></view>
                    </view>

                    <view v-if="q.image && q.imgPosCode.startsWith('m')" class="img-container" :class="'align-'+q.imgAlign">
                       <image :src="q.image" class="q-image" mode="widthFix" />
                    </view>

                    <view v-if="q.subQuestions && q.subQuestions.length > 0" class="sub-q-list-view">
                        <view 
                            v-for="(subQ, sIdx) in q.subQuestions" 
                            :key="sIdx" 
                            class="sub-q-row"
                            :class="{ 'highlight-active': isSubQHighlighted(subQ) }"
                        >
                            <view class="sub-q-txt"><LatexText :text="subQ.content"></LatexText></view>
                            
                            <view v-if="subQ.options && Object.keys(subQ.options).length > 0" class="opt-grid mt-2" :style="'grid-template-columns: repeat(' + (subQ.optionLayout||4) + ', 1fr)'">
                                 <view v-for="(val, key) in subQ.options" :key="key" class="opt-item">
                                    <text class="opt-key">{{ key }}.</text>
                                    <LatexText :text="val"></LatexText>
                                 </view>
                            </view>
                            
                            <view class="sub-q-tags" v-if="subQ.tags && subQ.tags.length">
                                <text v-for="t in subQ.tags" :key="t" class="mini-tag">{{t}}</text>
                            </view>
                        </view>
                    </view>
                    
                    <view v-else-if="q.options && (q.type && (q.type.includes('单选') || q.type.includes('多选') || q.type.includes('选择')))" class="opt-grid" :style="'grid-template-columns: repeat(' + (q.optionLayout||4) + ', 1fr)'">
                      <view v-for="(val, key) in q.options" :key="key" class="opt-item"><text class="opt-key">{{ key }}.</text><LatexText :text="val"></LatexText></view>
                    </view>

                    <view v-if="q.image && q.imgPosCode.startsWith('b')" class="img-container" :class="'align-'+q.imgAlign">
                       <image :src="q.image" class="q-image" mode="widthFix" />
                    </view>

                    <view v-if="showAnswerMap[q.id]" class="answer-box mt-2">
                        <view class="ans-block" v-if="q.answer">
                            <view class="ans-tag answer">答案</view>
                            <view class="ans-content"><LatexText :text="q.answer"></LatexText></view>
                        </view>
                        <view class="ans-block" v-if="q.analysis">
                            <view class="ans-tag analysis">分析</view>
                            <view class="ans-content"><LatexText :text="q.analysis"></LatexText></view>
                        </view>
                        <view class="ans-block" v-if="q.detailed">
                            <view class="ans-tag detailed">详解</view>
                            <view class="ans-content"><LatexText :text="q.detailed"></LatexText></view>
                        </view>
                    </view>
                </view>
                <view v-if="q.image && q.imgPosCode === 'r'" class="side-img-container">
                   <image :src="q.image" class="q-image" mode="widthFix" />
                </view>
              </view>

              <view class="q-footer">
                <view class="tags-row">
                  <view v-for="tag in getKnowledgeTags(q.categoryIds)" :key="'k-'+(tag.id || tag.title)" class="tag-badge red" @click.stop="handleTagClick(tag.title || tag)">
                    <image src="/static/icons/标签-红.svg" class="tag-icon icon-red" mode="aspectFit"></image>
                    <text>{{ tag.title || tag }}</text>
                  </view>
                  
                  <view v-for="tag in (q.tags||[])" :key="'t-'+tag" class="tag-badge blue" @click.stop="handleTagClick(tag)">
                    <image src="/static/icons/标签-蓝.svg" class="tag-icon icon-blue" mode="aspectFit"></image>
                    <text>{{ tag }}</text>
                  </view>
                </view>
                <view class="footer-right">
                    <text class="hash-code">#{{ q.code }}</text>
                    <view class="basket-add-btn-rect" :class="{waiting: waitingBasketKey===q.id}" @click.stop="toggleWaiting(q.id)">
                        {{ waitingBasketKey===q.id ? '选择篮子...' : '加入试题篮' }}
                    </view>
                </view>
              </view>
            </view>
            <view style="height: 40px;"></view>
          </scroll-view>
        </view>

        <view class="right-toolbar">
          <text class="tool-head">工具</text>
          <view v-if="canEdit" class="tool-btn primary" @click="openAddModal">
              <image src="/static/icons/添加.svg" class="tool-icon-img" mode="aspectFit"></image>
              <text class="t-lbl">录题</text>
          </view>
          <view v-else class="tool-btn disabled">
              <image src="/static/icons/添加.svg" class="tool-icon-img" mode="aspectFit" style="filter:grayscale(1)"></image>
              <text class="t-lbl" style="color:#94a3b8">只读</text>
          </view>
          <view class="divider"></view>
          <text class="tool-head">试题篮</text>
          <view class="basket-col">
            <view v-for="n in 7" :key="n" class="basket-circle" @click="activeBasketId=n">
              {{ n }}<view v-if="baskets[n].length" class="badge">{{ baskets[n].length }}</view>
            </view>
          </view>
        </view>

      </view>
    </view>

    <view class="main-workspace" v-else-if="activeTab === 'class'">
        <view class="whiteboard-wrapper">
            <Whiteboard></Whiteboard>
        </view>
    </view>

    <view class="main-workspace empty-state" v-else>
      <view class="empty-content"><text class="empty-icon">🚧</text><text class="empty-text">功能开发中...</text></view>
    </view>

    <ManageSubjectModal v-model:visible="showSubjectModal" :initialData="subjects" :mode="currentMode" @saved="reloadSubjects" />
    <ManageContentModal v-model:visible="showContentModal" :subjectId="currentSubjectId" :mode="currentMode" @saved="loadCategories" />
    <AddQuestionModal 
        ref="addModalRef" 
        v-model:visible="showAddModal" 
        :subjectId="currentSubjectId" 
        :knowledgeList="flatLeaves" 
        :isPublic="currentMode === 'public'"
        @saved="handleQuestionSaved" 
    />
    
    <ExportQuestionsModal 
        v-model:visible="showExportModal" 
        :questions="questionsForExport"
    />
    
    <ExportWordModal 
        v-model:visible="showWordExportModal" 
        :questions="questionsForExport"
    />

    <QuestionBasketModal 
        :isOpen="activeBasketId !== null"
        :basketId="activeBasketId"
        :baskets="baskets"
        :knowledgeList="flatLeaves" 
        @close="activeBasketId = null"
        @update:basketId="(id) => activeBasketId = id"
        @remove="(qid) => removeFromBasket(activeBasketId, qid)"
        @clear="(bid) => baskets[bid] = []"
        @export-pdf="handleExportPdf"
        @export-word="handleExportWord"
    />

    <view class="fork-modal-overlay" v-if="showForkModal" @click="showForkModal=false">
        <view class="fork-modal-box" @click.stop>
            <view class="fm-title">加入我的题库</view>
            <view class="fm-tip">请选择您私人空间下的目标位置：</view>
            <view class="fm-field">
                <text class="fm-label">选择科目:</text>
                <picker :range="privateSubjects" range-key="title" @change="handleForkSubChange">
                    <view class="fm-picker">{{ selectedForkSub ? selectedForkSub.title : '请选择...' }}</view>
                </picker>
            </view>
            <view class="fm-field" v-if="selectedForkSub">
                <text class="fm-label">选择知识点:</text>
                <picker :range="privateCategoriesFlat" range-key="fullPath" @change="handleForkCatChange">
                    <view class="fm-picker">{{ selectedForkCat ? selectedForkCat.fullPath : '请选择...' }}</view>
                </picker>
            </view>
            <view class="fm-actions">
                <button class="fm-btn cancel" @click="showForkModal=false">取消</button>
                <button class="fm-btn confirm" :disabled="!selectedForkCat" @click="confirmFork">确认克隆</button>
            </view>
        </view>
    </view>

  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { request } from '@/utils/request.js';
import { getQuestions, deleteQuestion } from '@/api/question.js';
import CategoryTree from '@/components/CategoryTree.vue';
import LatexText from '@/components/LatexText.vue';
import Whiteboard from '@/components/Whiteboard.vue';
import AddQuestionModal from '@/components/AddQuestionModal.vue';
import ExportQuestionsModal from '@/components/ExportQuestionsModal.vue';
import ExportWordModal from '@/components/ExportWordModal.vue';
import ManageSubjectModal from '@/components/ManageSubjectModal.vue';
import ManageContentModal from '@/components/ManageContentModal.vue';
import QuestionBasketModal from '@/components/QuestionBasketModal.vue';
import { onLoad } from '@dcloudio/uni-app';

// --- 1. 变量定义 ---
const currentMode = ref('private'); 
const isSidebarCollapsed = ref(false); 
const currentUser = ref(null);
const activeTab = ref('question_bank');
const subjects = ref([]);
const currentSubjectIdx = ref(0);
const categories = ref([]);
const questions = ref([]);
const flatLeaves = ref([]);
const loading = ref(false);

const filterYear = ref('');     
const filterSource = ref('');
const filterQNumber = ref('');

const selectedCategoryIds = ref([]);
const selectedType = ref('全部');
const selectedDiff = ref('全部');
const selectedTags = ref([]);
const selectedProvince = ref('全部');
const itemsPerPage = ref(10);
const currentPage = ref(1);

const typeOptions = ref(['单选题','多选题','填空题','解答题']);
const provinceOptions = ref([ "全国", "北京", "天津", "上海", "重庆", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "广西", "海南", "四川", "贵州", "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆" ]);

const catSearch = ref('');
const defaultTreeOpen = ref(false);
const treeExpandedIds = ref([]);
const manageMenuOpen = ref(false);
const subjectDropdownOpen = ref(false);
const isMultiSelect = ref(false);
const isFilterExpanded = ref(true); 

const showAddModal = ref(false);
const showSubjectModal = ref(false);
const showContentModal = ref(false);
const showExportModal = ref(false);
const showWordExportModal = ref(false);
const addModalRef = ref(null);

const activeBasketId = ref(null);
const showAnswerMap = ref({});
const waitingBasketKey = ref(null);
const baskets = ref({1:[],2:[],3:[],4:[],5:[],6:[],7:[]});

const showJumpPopover = ref(false);
const jumpPageInput = ref('');

let debounceTimer = null;

const showForkModal = ref(false);
const forkTargetQuestion = ref(null);
const privateSubjects = ref([]);
const privateCategoriesFlat = ref([]);
const selectedForkSub = ref(null);
const selectedForkCat = ref(null);

// --- 2. 生命周期 ---
onLoad((options) => {
  if (options.mode === 'public') {
    currentMode.value = 'public';
  } else {
    currentMode.value = 'private';
  }
});

onMounted(async () => {
  const token = uni.getStorageSync('token');
  const user = uni.getStorageSync('user');

  if (currentMode.value !== 'public' && !token) {
    uni.reLaunch({ url: '/pages/login/login' });
    return;
  }

  if (token) currentUser.value = user;
  
  await reloadSubjects(); 
  
  window.addEventListener('keydown', handleKeyBasket);
  window.addEventListener('click', handleGlobalClick);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyBasket);
  window.removeEventListener('click', handleGlobalClick);
});

// --- 3. API 请求 (修复 mode 参数缺失问题) ---
const reloadSubjects = async () => {
  try {
    const subData = await request({ 
      url: '/api/subjects', 
      method: 'GET', 
      data: { mode: currentMode.value } 
    });
    subjects.value = subData || [];
    currentSubjectIdx.value = 0;
    await reloadAll();
  } catch(e) { console.error("加载科目失败", e); }
};

const reloadAll = async () => { 
  await loadCategories(); 
  await refreshFilters(); 
  await loadQuestions(); 
};

const loadCategories = async () => {
  if(!currentSubjectId.value) return;
  try {
    const data = await request({ 
      url: '/api/categories', 
      method: 'GET', 
      data: { subjectId: currentSubjectId.value, mode: currentMode.value } 
    });
    categories.value = data || [];
    const leaves = [];
    const traverse = (nodes, path) => nodes?.forEach(n => {
      const currentPath = path ? `${path} / ${n.title}` : n.title;
      if(!n.children?.length) leaves.push({ ...n, fullPath: currentPath });
      else traverse(n.children, currentPath);
    });
    traverse(categories.value, '');
    flatLeaves.value = leaves;
  } catch(e) { console.error("加载目录失败", e); }
};

const refreshFilters = async () => { 
  if(!currentSubjectId.value) return;
  try {
    const res = await request({ 
      url: '/api/filters', 
      method: 'GET', 
      data: { subjectId: currentSubjectId.value, mode: currentMode.value } // 核心修复：带上 mode
    });
    if (res && res.types) {
        typeOptions.value = res.types.length ? res.types : ['单选题','多选题','填空题','解答题'];
    }
  } catch(e) { console.error("加载过滤器失败", e); }
};

const loadQuestions = async () => {
  if (!currentSubjectId.value) return;
  loading.value = true;
  const params = { subjectId: currentSubjectId.value, mode: currentMode.value };
  
  if (selectedType.value !== '全部') params.type = selectedType.value;
  if (selectedDiff.value !== '全部') params.difficulty = selectedDiff.value;
  if (selectedProvince.value !== '全部') params.province = selectedProvince.value;
  if (filterYear.value) params.year = filterYear.value;
  if (filterSource.value) params.source = filterSource.value;
  if (filterQNumber.value) params.qNumber = filterQNumber.value;
  if (selectedTags.value.length) params.tags = selectedTags.value.join(',');
  
  if (selectedCategoryIds.value.length) {
      const allIds = new Set();
      selectedCategoryIds.value.forEach(sid => {
          const node = findNode(categories.value, sid);
          if (node) getAllLeafIds([node]).forEach(id => allIds.add(id));
      });
      if (allIds.size > 0) params.categoryIds = Array.from(allIds).join(',');
  }

  try {
    const res = await request({ url: '/api/questions', method: 'GET', data: params });
    questions.value = (res.data || []).map(q => {
      let parsedOptions = q.options;
      if (typeof parsedOptions === 'string') { try { parsedOptions = JSON.parse(parsedOptions); } catch (e) { parsedOptions = {}; } }
      if (!parsedOptions) parsedOptions = { A: '', B: '', C: '', D: '' };
      
      let imgPosCode = 'bm'; let imgAlign = 'center';
      if (q.image && typeof q.image === 'string') {
          const match = q.image.match(/[?&]pos=([a-z]+)/);
          if (match) {
              imgPosCode = match[1];
              if (imgPosCode === 'r') imgAlign = 'side-right'; 
              else { const h = imgPosCode.charAt(1) || 'm'; imgAlign = h === 'l' ? 'left' : (h === 'r' ? 'right' : 'center'); }
          }
      }
      return { ...q, options: parsedOptions, tags: q.tags || [], code: q.code || 'A' + q.id.toString().substr(-4), imgPosCode, imgAlign };
    });
  } catch (e) { console.error(e); } finally { loading.value = false; }
};

// --- 4. 业务方法 ---
const switchMode = (mode) => {
  if(currentMode.value === mode) return;
  if (mode === 'private' && !uni.getStorageSync('token')) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  currentMode.value = mode;
  currentPage.value = 1;
  selectedCategoryIds.value = [];
  reloadSubjects();
};

const openForkModal = async (q) => {
  if (!uni.getStorageSync('token')) {
    uni.showToast({ title: '登录后可加入题库', icon: 'none' });
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  forkTargetQuestion.value = q;
  showForkModal.value = true;
  selectedForkSub.value = null;
  selectedForkCat.value = null;
  const subs = await request({ url: '/api/subjects', method: 'GET', data: { mode: 'private' } });
  privateSubjects.value = subs || [];
};

const handleForkSubChange = async (e) => {
  const idx = e.detail.value;
  selectedForkSub.value = privateSubjects.value[idx];
  const cats = await request({ url: '/api/categories', method: 'GET', data: { subjectId: selectedForkSub.value.id, mode: 'private' } });
  const leaves = [];
  const traverse = (nodes, path) => nodes?.forEach(n => {
      const currentPath = path ? `${path} / ${n.title}` : n.title;
      if(!n.children?.length) leaves.push({ ...n, fullPath: currentPath });
      else traverse(n.children, currentPath);
  });
  traverse(cats, '');
  privateCategoriesFlat.value = leaves;
};

const handleForkCatChange = (e) => {
  selectedForkCat.value = privateCategoriesFlat.value[e.detail.value];
};

const confirmFork = async () => {
  if(!forkTargetQuestion.value || !selectedForkSub.value || !selectedForkCat.value) return;
  try {
    await request({
      url: '/api/questions/fork',
      method: 'POST',
      data: {
        questionId: forkTargetQuestion.value.id,
        targetSubjectId: selectedForkSub.value.id,
        targetCategoryIds: [selectedForkCat.value.id]
      }
    });
    uni.showToast({ title: '已加入我的题库', icon: 'success' });
    showForkModal.value = false;
  } catch(e) { uni.showToast({ title: '加入失败', icon: 'none' }); }
};

const findNode = (nodes, id) => { for(let n of nodes) { if(n.id === id) return n; if(n.children) { const found = findNode(n.children, id); if(found) return found; } } return null; };
const getAllLeafIds = (nodes) => { let ids = []; nodes.forEach(node => { if (!node.children || node.children.length === 0) ids.push(node.id); else ids = [...ids, ...getAllLeafIds(node.children)]; }); return ids; };
const debounceLoadQuestions = () => { if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { loadQuestions(); }, 500); };
const handleCatSearchInput = () => { if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { handleCatSearch(); }, 500); };
const handleCatSearch = () => { 
    const keyword = catSearch.value;
    if(!keyword) return; 
    const matchedLeaves = flatLeaves.value.filter(l => l.title.includes(keyword));
    if(matchedLeaves.length) {
        selectedCategoryIds.value = matchedLeaves.map(l => l.id);
        loadQuestions();
    }
};
const handlePageSizeChange = (e) => { itemsPerPage.value = [10,20,50][e.detail.value]; currentPage.value = 1; loadQuestions(); }
const changePage = (delta) => {
    const newVal = currentPage.value + delta;
    if(newVal >= 1 && newVal <= totalPages.value) currentPage.value = newVal;
};
const toggleJumpPopover = () => { showJumpPopover.value = !showJumpPopover.value; if(showJumpPopover.value) jumpPageInput.value = ''; };
const handleJumpConfirm = () => {
  const p = parseInt(jumpPageInput.value);
  if (p && p >= 1 && p <= totalPages.value) {
    currentPage.value = p; loadQuestions(); showJumpPopover.value = false;
  } else { uni.showToast({title:'页码无效', icon:'none'}); }
};
const handleTagClick = (tag) => { if(selectedTags.value.includes(tag)) selectedTags.value = selectedTags.value.filter(t => t !== tag); else selectedTags.value.push(tag); };
const isSubQHighlighted = (subQ) => { if (!selectedTags.value.length || !subQ.tags?.length) return false; return subQ.tags.some(tag => selectedTags.value.includes(tag)); };
const removeFilter = (item) => {
    if (item.type === 'cat') selectedCategoryIds.value = selectedCategoryIds.value.filter(id => id !== item.id);
    else if (item.type === 'tag') selectedTags.value = selectedTags.value.filter(tag => tag !== item.name);
    else if (item.type === 'province') selectedProvince.value = '全部';
    else if (item.type === 'year') { filterYear.value = ''; loadQuestions(); }
    else if (item.type === 'source') { filterSource.value = ''; loadQuestions(); }
    else if (item.type === 'qnum') { filterQNumber.value = ''; loadQuestions(); }
};
const clearAllFilters = () => { 
    selectedCategoryIds.value = []; selectedTags.value = []; selectedProvince.value = '全部'; filterYear.value = ''; filterSource.value = ''; filterQNumber.value = ''; loadQuestions(); 
};
const selectSubject = (index) => { currentSubjectIdx.value = index; subjectDropdownOpen.value = false; reloadAll(); };
const openAddModal = () => { showAddModal.value = true; addModalRef.value?.open(); };
const openEditModal = (q) => { showAddModal.value = true; addModalRef.value?.open(q); };
const handleDelete = async (id) => { uni.showModal({ content: '确定删除?', success: async (res) => { if(res.confirm) { await deleteQuestion(id); loadQuestions(); } } }); };
const handleQuestionSaved = async () => { 
    loading.value = true;
    questions.value = []; // Force list clear for visual feedback
    setTimeout(async () => {
        await refreshFilters(); 
        await loadQuestions(); 
    }, 500); // Small delay to ensure backend consistency
};
const handleTreeSelect = (e, node) => {
    const id = node.id;
    const isLeaf = !node.children || node.children.length === 0;
    if(isMultiSelect.value) { 
        if (isLeaf) {
            let newSelection = [...selectedCategoryIds.value];
            if(newSelection.includes(id)) newSelection = newSelection.filter(x => x !== id);
            else newSelection.push(id);
            selectedCategoryIds.value = newSelection;
        } else { uni.showToast({title: '不能选择其他级别目录', icon: 'none'}); }
    } else {
        selectedCategoryIds.value = (selectedCategoryIds.value.length === 1 && selectedCategoryIds.value[0] === id) ? [] : [id];
    }
};
const toggleExpandAll = (expand) => { defaultTreeOpen.value = expand; manageMenuOpen.value = false; };
const getKnowledgeTags = (ids) => ids.map(id => flatLeaves.value.find(l => l.id === id) || {id, title:id}).filter(x=>x);
const toggleAnswer = (id) => showAnswerMap.value[id] = !showAnswerMap.value[id];
const toggleWaiting = (id) => waitingBasketKey.value = waitingBasketKey.value === id ? null : id;
const handleKeyBasket = (e) => { if(waitingBasketKey.value && e.key >= '1' && e.key <= '7') { const k = parseInt(e.key); const q = questions.value.find(x => x.id === waitingBasketKey.value); if(q && !baskets.value[k].find(x => x.id === q.id)) baskets.value[k].push(q); waitingBasketKey.value = null; } if(e.key === 'Escape') waitingBasketKey.value = null; };
const removeFromBasket = (bid, qid) => baskets.value[bid] = baskets.value[bid].filter(x => x.id !== qid);
const handleExportPdf = () => { showExportModal.value = true; };
const handleExportWord = () => { showWordExportModal.value = true; };
const handleGlobalClick = (e) => { manageMenuOpen.value = false; subjectDropdownOpen.value = false; showJumpPopover.value = false; };

// --- 5. Watchers & Computed ---
watch([selectedType, selectedDiff, selectedProvince, selectedCategoryIds, selectedTags], () => {
    currentPage.value = 1;
    loadQuestions();
});

const currentSubjectName = computed(() => subjects.value[currentSubjectIdx.value]?.title || '加载中');
const currentSubjectId = computed(() => subjects.value[currentSubjectIdx.value]?.id);
const canEdit = computed(() => currentMode.value === 'private' || (currentMode.value === 'public' && currentUser.value && currentUser.value.role === 'admin'));
const totalPages = computed(() => Math.ceil(questions.value.length / itemsPerPage.value));
const displayedQuestions = computed(() => questions.value.slice((currentPage.value-1)*itemsPerPage.value, currentPage.value*itemsPerPage.value));
const provinceOptionsWithAll = computed(() => ['全部', ...provinceOptions.value]);
const questionsForExport = computed(() => activeBasketId.value && baskets.value[activeBasketId.value] ? baskets.value[activeBasketId.value] : []);

const allActiveFilters = computed(() => {
  const list = [];
  selectedCategoryIds.value.forEach(id => {
      const n = findNode(categories.value, id);
      if(n && (!n.children || n.children.length === 0)) list.push({ type: 'cat', id: id, name: n.title }); 
  });
  selectedTags.value.forEach(tag => { list.push({ type: 'tag', id: tag, name: tag }); });
  if(selectedProvince.value !== '全部') list.push({ type: 'province', id: 'prov', name: selectedProvince.value });
  if(selectedType.value !== '全部') list.push({ type: 'type', id: 'type', name: selectedType.value });
  if(selectedDiff.value !== '全部') list.push({ type: 'diff', id: 'diff', name: '★'.repeat(selectedDiff.value) });
  if(filterYear.value) list.push({ type: 'year', id: 'year', name: filterYear.value });
  if(filterSource.value) list.push({ type: 'source', id: 'src', name: filterSource.value });
  if(filterQNumber.value) list.push({ type: 'qnum', id: 'qn', name: '#' + filterQNumber.value });
  return list;
});

const visiblePages = computed(() => {
  const total = totalPages.value || 1;
  const current = currentPage.value;
  const maxVisible = 5;
  if (total <= maxVisible) return Array.from({length: total}, (_, i) => ({ val: i + 1, key: 'p-'+(i+1), isActive: i+1 === current }));
  let start = current - 2;
  if (start < 1) start = 1;
  if (start + 4 > total) start = total - 4; 
  const arr = [];
  for(let i = 0; i < 5; i++) {
    const p = start + i;
    arr.push({ val: p, key: 'slot-' + i, isActive: p === current });
  }
  return arr;
});
</script>

<style lang="scss">
/* 此处保持您的原始样式代码完全不变 */
page { height: 100%; overflow: hidden; font-family: "Times New Roman", "SimSun", "Songti SC", serif;}
.layout-shell { display: flex; width: 100%; height: 100vh; background-color: #ffffff; }

/* 侧边栏模式切换 */
.space-switcher { display: flex; background: #f1f5f9; padding: 4px; margin: 0 10px 15px 10px; border-radius: 6px; width: 85%; box-sizing: border-box; }
.space-btn { flex: 1; text-align: center; font-size: 12px; padding: 4px 0; cursor: pointer; border-radius: 4px; color: #64748b; font-weight: bold; transition: all 0.2s; }
.space-btn.active { background: white; color: #2563eb; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

.space-switcher-mini { margin-bottom: 20px; text-align: center; }
.space-char { display: inline-block; width: 28px; height: 28px; line-height: 28px; background: #eff6ff; color: #2563eb; font-weight: bold; border-radius: 50%; font-size: 14px; border: 1px solid #2563eb; }

/* 禁用状态 */
.tool-btn.disabled { opacity: 0.6; cursor: not-allowed; border-color: #f1f5f9; box-shadow: none; }
.op-btn.green { color: #10b981; }

/* Fork Modal 遮罩 */
.fork-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; }
.fork-modal-box { background: white; padding: 20px; border-radius: 8px; width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.fm-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #334155; }
.fm-tip { font-size: 13px; color: #64748b; margin-bottom: 20px; }
.fm-field { margin-bottom: 15px; }
.fm-label { display: block; font-size: 13px; font-weight: bold; margin-bottom: 5px; color: #475569; }
.fm-picker { border: 1px solid #cbd5e1; padding: 8px 10px; border-radius: 4px; font-size: 14px; color: #334155; background: #f8fafc; cursor: pointer; }
.fm-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }
.fm-btn { font-size: 13px; padding: 6px 16px; border-radius: 4px; border: none; cursor: pointer; }
.fm-btn.cancel { background: #f1f5f9; color: #64748b; }
.fm-btn.confirm { background: #2563eb; color: white; }
.fm-btn.confirm:disabled { background: #94a3b8; cursor: not-allowed; }

.subject-btn.public-mode { background: #2563eb; box-shadow: 0 0px 6px rgba(37, 99, 235, 0.5); }
.subject-btn { background:#F87F23; } 

.active-filters-row { display: flex; align-items: flex-start !important; margin-top: 13px !important; width: 100%; }
.active-filters-row .f-tags { display: flex; flex-wrap: wrap; gap: 10px; width: 100%; }
.active-filters-row .f-label { margin-top: 1px !important; align-self: flex-start; }
.tag-chip { display: flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; border: 1px solid transparent; height: 16px; }
.tag-chip.red { background: #fef2f2; color: #ef4444; border-color: #fee2e2; border-radius: 4px; }
.tag-chip.blue { background: #eff6ff; color: #2563eb; border-color: #dbeafe; border-radius: 4px; }
.x-btn { margin-left: 3px; cursor: pointer; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; padding-top: 2px; }
.app-sidebar { width: 120px; background: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; padding: 20px 0; color: #334155; flex-shrink: 0; position: relative; transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; }
.app-sidebar.collapsed { width: 60px; }
.collapse-btn { margin-top: auto; width: 100%; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-top: 1px solid #f1f5f9; transition: background 0.2s; }
.collapse-btn:hover { background: #f8fafc; }
.collapse-icon { font-size: 18px; color: #94a3b8; transition: transform 0.3s; }
.collapse-btn:hover .collapse-icon { color: #2563eb; }
.logo-area { color: #334155; font-weight: bold; font-size: 18px; margin-bottom: 30px; white-space: nowrap; height: 24px; display: flex; align-items: center; justify-content: center; }
.logo-txt { transition: opacity 0.3s; }
.nav-items { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.nav-item { position: relative; height: 55px; display: flex; flex-direction: row; align-items: center; justify-content: center; cursor: pointer; color: #64748b; width: 98%; transition: all 0.3s; border-radius: 10px; }
.nav-item.active { background: transparent; color: #f97316; }
.nav-item.active::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 10px; height: 90%; background: radial-gradient(ellipse at left center, rgba(249, 115, 22, 0.6) 20%, rgba(249, 115, 22, 0) 70%); pointer-events: none; z-index: 0; transition: opacity 0.2s; opacity: 1; }
.app-sidebar.collapsed .nav-item.active::before, .app-sidebar.collapsed .nav-item.active::after { opacity: 0; }
.nav-icon-img { width: 20px; height: 20px; margin-bottom: 0; margin-right: 8px; display: block; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.nav-item.active .nav-icon-img { filter: drop-shadow(0 0 3px #f97316); transform: scale(1.2); position: relative; z-index: 1; }
.nav-txt { font-size: 14px; color: #334155; white-space: nowrap; opacity: 1; max-width: 80px; transition: opacity 0.2s ease-in-out, max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), margin-right 0.3s; transform-origin: left center; }
.nav-item.active .nav-txt { font-weight: bold; transform: scale(1.1); color: #f97316; }
.app-sidebar.collapsed .nav-item { width: 40px; height: 40px; margin: 4px auto; padding: 0; justify-content: center; }
.app-sidebar.collapsed .nav-icon-img { margin-right: 0 !important; margin-left: 0; }
.app-sidebar.collapsed .nav-txt { opacity: 0; max-width: 0; margin-right: 0; overflow: hidden; }
.main-workspace { flex: 1; display: flex; flex-direction: column; min-width: 0; height: 100%; overflow: hidden; }
.empty-state { display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; }
.empty-content { text-align: center; }
.empty-icon { font-size: 40px; margin-bottom: 10px; display: block; }
.empty-text { font-size: 18px; font-weight: bold; color: #64748b; margin-bottom: 5px; display: block; }
.top-header { height: 50px; background: #f0f0f0; margin: 12px 12px 0 12px; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); display: flex; justify-content: space-between; align-items: center; padding: 0 12px; flex-shrink: 0; border-bottom: none; }
.header-left-filters { display: flex; align-items: center; gap: 10px; }
.mini-input { background: #ffffff; border: 1px solid transparent; height: 27px; line-height: 32px; border-radius: 6px; padding: 0 10px; font-size: 13px; color: #334155; width: 80px; transition: all 0.2s; }
.mini-input:focus { background: white; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
.mini-input.small { width: 60px; }
.mini-input.medium { width: 140px; }
.header-right { display: flex; align-items: center; gap: 20px; font-size: 13px; color: #64748b; }
.total-count-box { display: flex; align-items: baseline; font-size: 13px; color: #64748b; }
.tc-num { font-size: 18px; font-weight: bold; color: #334155; margin: 0 4px; font-family: monospace; }
.page-size-wrap { display: flex; align-items: center; gap: 6px; }
.ps-label { color: #64748b; }
.ps-box { display: flex; align-items: center; background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 6px; height: 25px; box-sizing: border-box; cursor: pointer; transition: all 0.2s; }
.ps-box:hover { border-color: #cbd5e1; background: #f8fafc; }
.ps-icon { width: 10px; height: 10px; margin-left: 8px; opacity: 0.6; transform: rotate(180deg); margin-bottom: 0.8px; }
.ps-text { font-weight: 500; color: #334155; }
.pagination-bar { display: flex; align-items: center; gap: 8px; margin-left: 10px; }
.pg-circle-btn { width: 28px; height: 28px; cursor: pointer; opacity: 0.8; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.pg-circle-btn:hover { opacity: 1; transform: scale(1.1); }
.pg-circle-btn.disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
.pg-numbers { display: flex; align-items: center; gap: 6px; }
.pg-num-circle { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; font-weight: 500; font-size: 13px; transition: background-color 0.2s ease, color 0.2s ease; font-variant-numeric: tabular-nums; }
.pg-num-circle:hover { background: #f1f5f9; color: #334155; }
.pg-num-circle.active { background: #F87F23; color: white; box-shadow: 0 2px 4px rgba(248, 127, 35, 0.3); transform: scale(1.05); }
.pg-more-wrap { position: relative; display: flex; align-items: center; }
.pg-more-icon { width: 20px; height: 20px; cursor: pointer; opacity: 0.6; margin: 0 4px; }
.pg-more-icon:hover { opacity: 1; }
.jump-popover { position: absolute; top: 32px; left: 50%; transform: translateX(-50%); background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 6px; padding: 8px; display: flex; align-items: center; gap: 6px; z-index: 999; }
.jump-popover::before { content: ''; position: absolute; top: -5px; left: 50%; transform: translateX(-50%); border-width: 0 5px 5px 5px; border-style: solid; border-color: transparent transparent white transparent; }
.jump-input { width: 50px; height: 26px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center; font-size: 13px; background: #f8fafc; }
.jump-go-btn { background: #F87F23; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; }
.pg-total-text { color: #94a3b8; margin: 0 4px; font-size: 13px; }
.workspace-body { flex: 1; display: flex; overflow: hidden; height: 100%; }
.resource-sidebar-wrapper { width: 300px; padding: 12px; flex-shrink: 0; display: flex; flex-direction: column; }
.resource-sidebar { flex: 1; background: #F0F0F0; border-radius: 4px; display: flex; flex-direction: column; overflow: hidden; gap: 15px; padding-top: 15px;}
.res-header { padding: 0px 12px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; border-radius: 4px;}
.subject-wrapper { position: relative; width: auto; }
.subject-btn { background:#F87F23; color: white; font-size: 14px; height: 32px; box-sizing: border-box; padding: 0px 14px; width: fit-content; max-width: 160px; display: flex; justify-content: space-between; align-items: center; border-radius: 4px; transition: transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.2s; box-shadow: 0 0px 6px rgba(249, 115, 22, 0.5); -webkit-tap-highlight-color: transparent; cursor: pointer; user-select: none; }
.subject-btn:active { transform: scale(0.96); opacity: 0.85; }
.subject-btn text:first-child { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; margin-right: 4px; }
.arrow-icon { width: 12px; height: 12px; margin-left: 4px; flex-shrink: 0; display: block; filter: brightness(0) invert(1); transform: rotate(180deg); position: relative; top: 0.5px; }
.custom-subject-dropdown { position: absolute; top: 100%; left: 50%;transform: translateX(-50%);width: 100%; background: white; border: 1px ; border-radius: 4px; box-shadow: 0 0px 12px rgba(0, 0, 0, 0.12); z-index: 50; margin-top: 4px; }
.sub-item { padding: 8px 12px; font-size: 13px; cursor: pointer; text-align: center;}
.sub-item:hover { background: #f8fafc; }
.sub-item.active { color: #F87F23; font-weight: bold; background: #f87f231A; }
.setting-wrapper { position: relative; }
.setting-btn.custom-menu-icon { display: flex; flex-direction: column; justify-content: center; align-items: center; width: 32px; height: 32px; gap: 4px; border-radius: 4px; background-color: transparent; transition: background-color 0.2s, transform 0.2s; cursor: pointer; }
.setting-btn.custom-menu-icon:hover { background-color: rgba(0, 0, 0, 0.05); }
.setting-btn.custom-menu-icon:active { transform: scale(0.92); background-color: rgba(0, 0, 0, 0.1); }
.menu-line { width: 16px; height: 2px; background-color: #94a3b8; border-radius: 2px; }
.setting-wrapper:hover .menu-line { background-color: #2563eb; }
.popover-menu { position: absolute; top: 100%; right: 0; margin-top: 2px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; border-radius: 6px; width: 110px; text-align: center;}
.menu-item { padding: 8px 12px; font-size: 13px; cursor: pointer; &:hover { background: #f8fafc; } }
.menu-item.header { font-weight: bold; color: #94a3b8; font-size: 12px; border-bottom: 1px solid #eee; }
.divider-h { height: 1px; background: #f1f5f9; margin: 4px 0; }
.search-bar-row { display: flex; align-items: center; padding: 0 12px; gap: 0px; flex-shrink: 0; }
.search-wrap { flex: 1; }
.search-input { background: white; padding: 0 10px; border-radius: 4px; font-size: 13px; width: 95%; box-sizing: border-box; height: 32px; line-height: 32px; border: 1px solid #e2e8f0; }
.multi-switch { display: flex; align-items: center; gap: 4px; cursor: pointer; padding: 4px 4px; border-radius: 4px; user-select: none; }
.multi-switch:hover { background: #e2e8f0; }
.multi-switch.active { background: #eff6ff; color: #2563eb; }
.switch-txt { font-size: 12px; font-weight: bold; }
.switch-btn { width: 32px; height: 18px; background: #cbd5e1; border-radius: 9px; position: relative; transition: background 0.2s; }
.multi-switch.active .switch-btn { background: #2563eb; }
.switch-btn::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: transform 0.2s; }
.multi-switch.active .switch-btn::after { transform: translateX(14px); }
.tree-scroll { flex: 1; width: 100%; overflow-y: auto; box-sizing: border-box; white-space: nowrap; padding: 0 4px 10px 13px; }
.tree-scroll::-webkit-scrollbar { -webkit-appearance: none; width: 4px; height: 6px; }
.tree-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; }
.tree-scroll::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
.tree-scroll::-webkit-scrollbar-track { background: transparent; }
.content-canvas { flex: 1; background: #f8fafc; display: flex; flex-direction: column; min-width: 0; height: 100%; overflow: hidden; }
.filter-bar { background: white; padding: 10px 20px; margin: 12px; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); flex-shrink: 0; font-size: 14px; }
.fh-left-group { display: flex; align-items: center; gap: 12px; }
.clear-filter-btn { background-color: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; border-radius: 4px; font-size: 12px; padding: 2px 10px; height: 24px; display: flex; align-items: center; cursor: pointer; font-weight: normal; }
.clear-filter-btn:hover { background-color: #fee2e2; }
.filter-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; margin-bottom: 0px; }
.fh-title { font-weight: bold; color: #334155; font-size: 14px; }
.filter-body { display: flex; flex-direction: column; overflow: hidden; max-height: 1000px; opacity: 1; transition: all 0.1s ease-in-out; margin-top: 20px; }
.filter-body.collapsed { max-height: 0; opacity: 0; margin: 0; padding: 0; }
.fh-icon { font-size: 12px; color: #94a3b8; }
.filter-header:hover .fh-icon { color: #2563eb; }
.f-row { display: flex; align-items: center; gap: 2px; font-size: 13px; }
.f-row.mt-2 { margin-top: 8px; }
.f-row.align-start { align-items: flex-start; }
.f-label { font-weight: bold; color: #64748b; width: 40px; flex-shrink: 0; margin-top: 4px; font-size: 14px;}
.f-tags { display: flex; flex-wrap: wrap; gap: 0px; flex: 1; }
.tag { padding: 4px 12px; border: none; background: transparent; cursor: pointer; color: #64748b; position: relative; font-size: 14px; }
.tag.active { background: transparent; color: #2563eb; font-weight: bold; border: none; }
.province-grid { display: grid; grid-template-columns: repeat(11, 1fr); gap: 0px 0px; flex: 1; }
.province-grid .tag { text-align: center; display: flex; justify-content: center; align-items: center; }
.list-scroll { flex: 1; padding: 12px 0px 12px 12px; box-sizing: border-box; overflow-y: hidden; height: 100%; }
.state-txt { text-align: center; margin-top: 50px; color: #94a3b8; }
.q-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;margin-right: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.q-header { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 10px; }
.meta-left { display: flex; gap: 6px; flex-wrap: wrap; }
.info-chip { padding: 2px 8px; border-radius: 4px; background: #f1f5f9; color: #64748b; font-size: 11px; display: flex; align-items: center; }
.info-chip.type { color: #2563eb; background: #eff6ff; font-weight: bold; }
.info-chip.diff { color: #f59e0b; background: #fffbeb; }
.info-chip.err { color: #ef4444; background: #fef2f2; font-weight: bold; }
.info-chip.prov { background: #f0fdf4; color: #166534; }
.info-chip.year { background: #eef2ff; color: #4338ca; }
.info-chip.num { font-family: monospace; }
.op-btn { margin-left: 10px; cursor: pointer; font-weight: bold; }
.op-btn.blue { color: #2563eb; }
.op-btn.red { color: #ef4444; }
.q-body { cursor: pointer; }
.body-row { display: flex; margin-bottom: 10px; }
.material-box { border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; }
.sub-q-list-view { margin-top: 10px; border-top: 1px dashed #eee; padding-top: 10px; }
.sub-q-row { margin-bottom: 1px; padding: 8px; border-radius: 6px; transition: background 0.3s; }
.sub-q-row.highlight-active { background-color: #fef2f2; }
.sub-q-row.highlight-active .sub-q-txt :deep(.latex-text-container) { color: #ef4444; font-weight: bold; }
.sub-q-tags { display: flex; gap: 6px; margin-top: 4px; }
.mini-tag { font-size: 10px; background: #f1f5f9; color: #94a3b8; padding: 1px 6px; border-radius: 4px; }
.sub-q-ans-box { margin-top: 6px; font-size: 13px; color: #2563eb; background: #eff6ff; padding: 4px 8px; border-radius: 4px; }
.ans-label { font-weight: bold; margin-right: 5px; }
.q-title { flex: 1; font-size: 15px; line-height: 1.6; color: #1e293b; }
.opt-grid { display: grid; gap: 4px 8px; font-size: 14px; margin-bottom: 10px; color: #334155; }
.opt-key { font-weight: bold; margin-right: 5px; flex-shrink: 0; font-size: 16px;}
.opt-item { display: flex; align-items: center; margin-bottom: 0; }
.opt-item :deep(.latex-text-container) { flex: 1; width: auto; }
.answer-box { background: #f0f9ff; padding: 12px 15px; border-radius: 6px; border: 1px dashed #bae6fd; font-size: 14px; color: #0c4a6e; }
.ans-block { margin-bottom: 12px; }
.ans-block:last-child { margin-bottom: 0; }
.ans-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold; margin-bottom: 4px; }
.ans-tag.answer { background-color: #2563eb; } 
.ans-tag.analysis { background-color: #f59e0b; } 
.ans-tag.detailed { background-color: #10b981; } 
.ans-content { font-size: 14px; line-height: 1.6; color: #334155; }
.q-footer { border-top: 1px solid #f1f5f9; margin-top: 10px; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.tags-row { display: flex; gap: 8px; align-items: center; flex: 1; }
.tag-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; cursor: pointer; display: flex;align-items: center; }
.tag-badge.red { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
.tag-badge.blue { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
.tag-icon { width: 12px; height: 12px; margin-right: 4px; display: block; }
.tag-badge text { line-height: 1; position: relative; top: -0.1px; }
.footer-right { display: flex; align-items: center; gap: 10px; }
.hash-code { font-family: monospace; color: #cbd5e1; font-size: 11px; }
.basket-add-btn-rect { padding: 4px 10px; border-radius: 4px; border: 1px solid #2563eb; color: #2563eb; font-size: 11px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; font-weight: 500; }
.basket-add-btn-rect:hover { background: #eff6ff; }
.basket-add-btn-rect.waiting { background: #2563eb; color: white; animation: pulse 1s infinite; }
.img-container { margin: 10px 0; display: flex; width: 100%; }
.img-container.align-left { justify-content: flex-start; }
.img-container.align-center { justify-content: center; }
.img-container.align-right { justify-content: flex-end; }
.layout-side-right { display: flex; gap: 15px; align-items: flex-start; }
.layout-side-right .content-wrapper { flex: 1; }
.layout-side-right .side-img-container { width: 30%; max-width: 200px; flex-shrink: 0; }
.right-toolbar { width: 70px; background: #f0f0f0; border-radius: 4px; margin: 12px 12px 12px 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.03); display: flex; flex-direction: column; align-items: center; padding: 20px 0; flex-shrink: 0; }
.tool-head { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
.tool-btn { width: 48px; height: 48px; border-radius: 12px; background: white; border: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 12px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: all 0.2s; }
.tool-btn.primary { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; }
.tool-icon-img { width: 22px; height: 22px; margin-bottom: 1px; display: block; margin-left: 0; margin-right: 0; }
.t-lbl { font-size: 10px; margin-top: 4px; line-height: 1; font-weight: 500; color: #2563eb; }
.divider { width: 40px; height: 1px; background: #e2e8f0; margin: 10px 0 20px; }
.basket-col { display: flex; flex-direction: column; gap: 8px; }
.basket-circle { width: 35px; height: 35px; border-radius: 4px; background: white; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; color: #64748b; font-weight: bold; margin-top: 10px;}
.basket-circle:hover { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
.badge { position: absolute; top: -2px; right: -2px; background: #ef4444; color: white; font-size: 9px; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.whiteboard-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
.mt-2 { margin-top: 8px; }
</style>