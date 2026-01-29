<template>
  <view class="layout-shell" @click="handleGlobalClick">
    <view class="app-sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <view class="logo-area">
        <text class="logo-txt" :class="{ 'mini': isSidebarCollapsed }">{{ isSidebarCollapsed ? 'S' : 'Source' }}</text>
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
                <view class="subject-btn">
                  <text>{{ currentSubjectName }}</text>
                  <image src="/static/icons/三角.svg" class="arrow-icon" mode="aspectFit"></image>
                </view>
                <view class="custom-subject-dropdown" v-if="subjectDropdownOpen">
                  <view class="sub-item" v-for="(sub, index) in subjects" :key="sub.id" @click.stop="selectSubject(index)" :class="{ active: currentSubjectIdx === index }">{{ sub.title }}</view>
                </view>
              </view>
              <view class="setting-wrapper" @mouseenter="manageMenuOpen = true" @mouseleave="manageMenuOpen = false">
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
                <text class="fh-title">筛选条件</text>
                
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
                  <view v-for="item in allActiveFilters" :key="item.id" 
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
                  <text class="op-btn blue" @click="openEditModal(q)">编辑</text>
                  <text class="op-btn red" @click="handleDelete(q.id)">删除</text>
                </view>
              </view>

              <view class="q-body" :class="{ 'layout-side-right': q.imgPosCode === 'r' }" @click="toggleAnswer(q.id)">
                <view class="content-wrapper">
                    <view v-if="q.image && q.imgPosCode.startsWith('u')" class="img-container" :class="'align-'+q.imgAlign">
                       <image :src="q.image" class="q-image" mode="widthFix" />
                    </view>
                    <view class="body-row">
                      <view class="q-title"><LatexText :text="q.title"></LatexText></view>
                    </view>
                    <view v-if="q.image && q.imgPosCode.startsWith('m')" class="img-container" :class="'align-'+q.imgAlign">
                       <image :src="q.image" class="q-image" mode="widthFix" />
                    </view>
                    <view v-if="q.options && (q.type && (q.type.includes('单选') || q.type.includes('多选') || q.type.includes('选择')))" class="opt-grid" :style="'grid-template-columns: repeat(' + (q.optionLayout||4) + ', 1fr)'">
                      <view v-for="(val, key) in q.options" :key="key" class="opt-item"><text class="opt-key">{{ key }}.</text><LatexText :text="val"></LatexText></view>
                    </view>
                    <view v-if="q.image && q.imgPosCode.startsWith('b')" class="img-container" :class="'align-'+q.imgAlign">
                       <image :src="q.image" class="q-image" mode="widthFix" />
                    </view>

                    <view v-if="showAnswerMap[q.id]" class="answer-box">
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
                    <image 
                      src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMyIgaGVpZ2h0PSIyMyIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIj48cGF0aCBkPSJNOCA0NEw4IDZDOCA0Ljg5NTQzIDguODk1NDMgNCAxMCA0SDM4QzM5LjEwNDYgNCA0MCA0Ljg5NTQzIDQwIDZWNDRMMjQgMzUuNzI3M0w4IDQ0WiIgZmlsbD0iI2VmNDQ0NCIgc3Ryb2tlPSIjZWY0NDQ0IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMTYgMThIMzIiIHN0cm9rZT0iI0ZGRiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=" 
                      class="tag-icon" 
                      mode="aspectFit"
                    ></image>
                    <text>{{ tag.title || tag }}</text>
                  </view>
                  
                  <view v-for="tag in (q.tags||[])" :key="'t-'+tag" class="tag-badge blue" @click.stop="handleTagClick(tag)">
                    <image 
                      src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMyIgaGVpZ2h0PSIyMyIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIj48cGF0aCBkPSJNOCA0NEw4IDZDOCA0Ljg5NTQzIDguODk1NDMgNCAxMCA0SDM4QzM5LjEwNDYgNCA0MCA0Ljg5NTQzIDQwIDZWNDRMMjQgMzUuNzI3M0w4IDQ0WiIgZmlsbD0iIzNiODJmNiIgc3Ryb2tlPSIjM2I4MmY2IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMTYgMThIMzIiIHN0cm9rZT0iI0ZGRiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=" 
                      class="tag-icon" 
                      mode="aspectFit"
                    ></image>
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
          <view class="tool-btn primary" @click="openAddModal">
              <image src="/static/icons/添加.svg" class="tool-icon-img" mode="aspectFit"></image>
              <text class="t-lbl">录题</text>
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

    <ManageSubjectModal v-model:visible="showSubjectModal" :initialData="subjects" @saved="reloadSubjects" />
    <ManageContentModal v-model:visible="showContentModal" :subjectId="currentSubjectId" @saved="loadCategories" />
    <AddQuestionModal 
        ref="addModalRef" 
        v-model:visible="showAddModal" 
        :subjectId="currentSubjectId" 
        :knowledgeList="flatLeaves" 
        @saved="handleQuestionSaved" 
    />
    
    <ExportQuestionsModal 
        v-model:visible="showExportModal" 
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

  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { getSubjects, getCategories, getQuestions, deleteQuestion, getFilters } from '@/api/question.js';
import { baseUrl } from '@/utils/request.js';
import CategoryTree from '@/components/CategoryTree.vue';
import LatexText from '@/components/LatexText.vue';
import Whiteboard from '@/components/Whiteboard.vue';
import AddQuestionModal from '@/components/AddQuestionModal.vue';
import ExportQuestionsModal from '@/components/ExportQuestionsModal.vue';
import ManageSubjectModal from '@/components/ManageSubjectModal.vue';
import ManageContentModal from '@/components/ManageContentModal.vue';
import QuestionBasketModal from '@/components/QuestionBasketModal.vue';

// --- 新增：折叠状态控制 ---
const isSidebarCollapsed = ref(false); 

const ALL_PROVINCES = [
    "全国", "北京", "天津", "上海", "重庆", "河北", "山西", "内蒙古", 
    "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建", 
    "江西", "山东", "河南", "湖北", "湖南", "广东", "广西", 
    "海南", "四川", "贵州", "云南", "西藏", "陕西", "甘肃", 
    "青海", "宁夏", "新疆"
];

// --- State ---
const activeTab = ref('question_bank');
const subjects = ref([]);
const currentSubjectIdx = ref(0);
const categories = ref([]);
const questions = ref([]);
const flatLeaves = ref([]);
const loading = ref(false);

const selectedCategoryIds = ref([]);
const selectedType = ref('全部');
const selectedDiff = ref('全部');
const selectedTags = ref([]);
const itemsPerPage = ref(10);
const currentPage = ref(1);

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
const addModalRef = ref(null);

const activeBasketId = ref(null);
const showAnswerMap = ref({});
const waitingBasketKey = ref(null);
const baskets = ref({1:[],2:[],3:[],4:[],5:[],6:[],7:[]});

const typeOptions = ref(['单选题','多选题','填空题','解答题']);
const provinceOptions = ref(ALL_PROVINCES); 
const selectedProvince = ref('全部');
const filterYear = ref('');
const filterSource = ref('');
const filterQNumber = ref('');

// --- [分页新增] 状态变量 ---
const showJumpPopover = ref(false);
const jumpPageInput = ref('');

let debounceTimer = null;

const currentSubjectName = computed(() => subjects.value[currentSubjectIdx.value]?.title || '加载中');
const currentSubjectId = computed(() => subjects.value[currentSubjectIdx.value]?.id);
const totalPages = computed(() => Math.ceil(questions.value.length / itemsPerPage.value));
const displayedQuestions = computed(() => questions.value.slice((currentPage.value-1)*itemsPerPage.value, currentPage.value*itemsPerPage.value));

const provinceOptionsWithAll = computed(() => ['全部', ...provinceOptions.value]);

const questionsForExport = computed(() => {
    if (activeBasketId.value && baskets.value[activeBasketId.value]) {
        return baskets.value[activeBasketId.value];
    }
    return [];
});

const allActiveFilters = computed(() => {
    const list = [];
    selectedCategoryIds.value.forEach(id => {
        const n = findNode(categories.value, id);
        if(n && (!n.children || n.children.length === 0)) {
            list.push({ type: 'cat', id: id, name: n.title }); 
        }
    });
    selectedTags.value.forEach(tag => { list.push({ type: 'tag', id: tag, name: tag }); });
    if(selectedProvince.value !== '全部') list.push({ type: 'province', id: 'prov', name: selectedProvince.value });
    if(filterYear.value) list.push({ type: 'year', id: 'year', name: filterYear.value });
    if(filterSource.value) list.push({ type: 'source', id: 'src', name: filterSource.value });
    if(filterQNumber.value) list.push({ type: 'qnum', id: 'qn', name: '#' + filterQNumber.value });
    return list;
});

// --- [分页新增] 核心修改：固定槽位计算逻辑 ---
const visiblePages = computed(() => {
  const total = totalPages.value || 1;
  const current = currentPage.value;
  const maxVisible = 5;

  // 1. 页数少于等于5：正常显示，不涉及“中间圆圈不动”的问题
  if (total <= maxVisible) {
    return Array.from({length: total}, (_, i) => {
        const p = i + 1;
        return { 
            val: p, 
            key: 'p-'+p, // 普通模式key用页码，正常切换
            isActive: p === current
        };
    });
  }

  // 2. 页数大于5：采用“固定槽位”策略
  // 无论当前是第几页，我们都生成5个item
  // 我们计算这5个item显示的数值，尽量让current在中间 (index 2)
  
  let start = current - 2;
  
  // 边界处理：防止超出
  if (start < 1) start = 1;
  if (start + 4 > total) start = total - 4; // 保证始终显示5个

  const arr = [];
  for(let i = 0; i < 5; i++) {
      const p = start + i;
      arr.push({
          val: p,
          // 【绝对关键】：key 绑定为 'slot-0', 'slot-1'... 
          // 这样 Vue 认为这 5 个 DOM 元素从未变过，只是里面的 text 变了。
          // 圆圈 active 状态如果一直对应 slot-2，那圆圈就真的一动不动。
          key: 'slot-' + i, 
          isActive: p === current
      });
  }
  return arr;
});

// --- [分页新增] 跳转逻辑 ---
const goToPage = (p) => {
  if (p === currentPage.value) return;
  currentPage.value = p;
  loadQuestions();
};

const toggleJumpPopover = () => {
  showJumpPopover.value = !showJumpPopover.value;
  if(showJumpPopover.value) jumpPageInput.value = '';
};

const handleJumpConfirm = () => {
  const p = parseInt(jumpPageInput.value);
  if (p && p >= 1 && p <= totalPages.value) {
    currentPage.value = p;
    loadQuestions();
    showJumpPopover.value = false;
  } else {
    uni.showToast({title:'页码无效', icon:'none'});
  }
};

watch([selectedType, selectedDiff, selectedTags, selectedCategoryIds], () => {
    currentPage.value = 1;
    loadQuestions();
}, { deep: true });

watch([selectedProvince], () => {
    currentPage.value = 1;
    loadQuestions();
});

onMounted(async () => {
    const subData = await getSubjects();
    subjects.value = subData || [];
    if(subjects.value.length) {
        await reloadAll(); 
    }
    window.addEventListener('keydown', handleKeyBasket);
    window.addEventListener('click', handleGlobalClick);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyBasket);
    window.removeEventListener('click', handleGlobalClick);
});

// --- Logic ---

const debounceLoadQuestions = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        loadQuestions();
    }, 500);
};

const handleCatSearchInput = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        handleCatSearch();
    }, 500);
};

const refreshFilters = async () => {
    if(!currentSubjectId.value) return;
    try {
        const res = await getFilters(currentSubjectId.value);
        typeOptions.value = (res.types && res.types.length) ? res.types : ['单选题','多选题','填空题','解答题'];
        if(selectedType.value !== '全部' && !typeOptions.value.includes(selectedType.value)) {
            selectedType.value = '全部';
        }
        if(selectedProvince.value !== '全部' && !provinceOptions.value.includes(selectedProvince.value)) {
            selectedProvince.value = '全部';
        }
    } catch(e) { console.error(e); }
};

const handleQuestionSaved = async () => {
    await refreshFilters();
    await loadQuestions();
};

const toggleExpandAll = (expand) => {
    defaultTreeOpen.value = expand;
    manageMenuOpen.value = false;
};

const getAllLeafIds = (nodes) => {
    let ids = [];
    nodes.forEach(node => {
        if (!node.children || node.children.length === 0) ids.push(node.id);
        else ids = [...ids, ...getAllLeafIds(node.children)];
    });
    return ids;
};

const findNode = (nodes, id) => {
    for(let n of nodes) {
        if(n.id === id) return n; 
        if(n.children) { const found = findNode(n.children, id); if(found) return found; }
    }
    return null;
};

const findPathToNode = (nodes, targetId, path = []) => {
    for (const node of nodes) {
        if (node.id === targetId) return [...path];
        if (node.children) {
            const foundPath = findPathToNode(node.children, targetId, [...path, node.id]);
            if (foundPath) return foundPath;
        }
    }
    return null;
};

const loadCategories = async () => {
    if(!currentSubjectId.value) return;
    const data = await getCategories(currentSubjectId.value);
    categories.value = data || [];
    const leaves = [];
    const traverse = (nodes, path) => nodes?.forEach(n => {
        const currentPath = path ? `${path} / ${n.title}` : n.title;
        if(!n.children?.length) leaves.push({ ...n, fullPath: currentPath });
        else traverse(n.children, currentPath);
    });
    traverse(data, '');
    flatLeaves.value = leaves;
};

const loadQuestions = async () => {
    if (!currentSubjectId.value) return;
    loading.value = true;
    
    const params = { subjectId: currentSubjectId.value };
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
        const res = await getQuestions(params);
        questions.value = (res.data || []).map(q => {
            let parsedOptions = q.options;
            if (typeof parsedOptions === 'string') {
                try { parsedOptions = JSON.parse(parsedOptions); } catch (e) { parsedOptions = {}; }
            }
            if (!parsedOptions) parsedOptions = { A: '', B: '', C: '', D: '' };
            
            let imgPosCode = 'bm';
            let imgAlign = 'center';
            if (q.image) {
                const match = q.image.match(/[?&]pos=([a-z]+)/);
                if (match) {
                    imgPosCode = match[1];
                    if (imgPosCode === 'r') imgAlign = 'side-right'; 
                    else {
                        const h = imgPosCode.charAt(1) || 'm';
                        if (h === 'l') imgAlign = 'left';
                        else if (h === 'r') imgAlign = 'right';
                        else imgAlign = 'center';
                    }
                }
            }

            return {
                ...q,
                options: parsedOptions,
                tags: q.tags || [],
                code: q.code || 'A' + q.id.toString().substr(-4),
                imgPosCode, 
                imgAlign
            };
        });
    } catch (e) {
        console.error(e);
        uni.showToast({ title: '加载失败', icon: 'none' });
    } finally {
        loading.value = false;
    }
};

const handleTagClick = (tag) => {
    if(selectedTags.value.includes(tag)) selectedTags.value = selectedTags.value.filter(t => t !== tag);
    else selectedTags.value.push(tag);
};

const handleProvinceChange = (e) => {
    selectedProvince.value = provinceOptionsWithAll.value[e.detail.value];
};

const removeFilter = (item) => {
    if (item.type === 'cat') selectedCategoryIds.value = selectedCategoryIds.value.filter(id => id !== item.id);
    else if (item.type === 'tag') selectedTags.value = selectedTags.value.filter(tag => tag !== item.name);
    else if (item.type === 'province') selectedProvince.value = '全部';
    else if (item.type === 'year') { filterYear.value = ''; loadQuestions(); }
    else if (item.type === 'source') { filterSource.value = ''; loadQuestions(); }
    else if (item.type === 'qnum') { filterQNumber.value = ''; loadQuestions(); }
};

const clearAllFilters = () => { 
    selectedCategoryIds.value = []; 
    selectedTags.value = []; 
    selectedProvince.value = '全部';
    filterYear.value = '';
    filterSource.value = '';
    filterQNumber.value = '';
    loadQuestions(); 
};

const selectSubject = (index) => { currentSubjectIdx.value = index; subjectDropdownOpen.value = false; reloadAll(); };
const reloadSubjects = async () => {
    const lastId = currentSubjectId.value;
    const subData = await getSubjects();
    subjects.value = subData || [];
    const idx = subjects.value.findIndex(s => s.id === lastId);
    currentSubjectIdx.value = idx !== -1 ? idx : 0;
    reloadAll();
};

const reloadAll = async () => { 
    await loadCategories(); 
    await refreshFilters(); 
    await loadQuestions(); 
};

const handleTreeSelect = (e, node) => {
    const id = node.id;
    const isLeaf = !node.children || node.children.length === 0;

    if(isMultiSelect.value) { 
        if (isLeaf) {
            const leavesOnly = selectedCategoryIds.value.filter(sid => {
                const n = findNode(categories.value, sid);
                return n && (!n.children || n.children.length === 0);
            });
            let newSelection = [...leavesOnly];
            if(newSelection.includes(id)) newSelection = newSelection.filter(x => x !== id);
            else newSelection.push(id);
            selectedCategoryIds.value = newSelection;
        } else {
            uni.showToast({title: '不能选择其他级别目录', icon: 'none'});
        }
    } else {
        if(selectedCategoryIds.value.length === 1 && selectedCategoryIds.value[0] === id) selectedCategoryIds.value = [];
        else selectedCategoryIds.value = [id];
    }
};

const changePage = (delta) => {
    const newVal = currentPage.value + delta;
    if(newVal >= 1 && newVal <= totalPages.value) currentPage.value = newVal;
};
const handlePageSizeChange = (e) => { itemsPerPage.value = [10,20,50][e.detail.value]; currentPage.value = 1; loadQuestions(); }

const handleCatSearch = () => { 
    const keyword = catSearch.value;
    if(!keyword) return; 
    const matchedLeaves = flatLeaves.value.filter(l => l.title.includes(keyword));
    if(matchedLeaves.length) {
        const ids = matchedLeaves.map(l => l.id);
        selectedCategoryIds.value = ids;
        const parentsToExpand = new Set();
        matchedLeaves.forEach(leaf => {
            const path = findPathToNode(categories.value, leaf.id);
            if (path) path.forEach(pid => parentsToExpand.add(pid));
        });
        treeExpandedIds.value = Array.from(parentsToExpand);
        loadQuestions();
    }
};

const openAddModal = () => {
    showAddModal.value = true;
    addModalRef.value?.open();
};

const openEditModal = (q) => {
    showAddModal.value = true;
    addModalRef.value?.open(q);
};

const handleDelete = async (id) => { uni.showModal({ content: '确定删除?', success: async (res) => { if(res.confirm) { await deleteQuestion(id); loadQuestions(); } } }); };
const toggleWaiting = (id) => waitingBasketKey.value = waitingBasketKey.value === id ? null : id;
const handleKeyBasket = (e) => { if(waitingBasketKey.value && e.key >= '1' && e.key <= '7') { const k = parseInt(e.key); const q = questions.value.find(x => x.id === waitingBasketKey.value); if(q && !baskets.value[k].find(x => x.id === q.id)) baskets.value[k].push(q); waitingBasketKey.value = null; } if(e.key === 'Escape') waitingBasketKey.value = null; };
const removeFromBasket = (bid, qid) => baskets.value[bid] = baskets.value[bid].filter(x => x.id !== qid);

// 导出处理函数
const handleExportPdf = () => {
    showExportModal.value = true;
    uni.showToast({ title: '准备导出PDF...', icon: 'none' });
};
const handleExportWord = () => {
    showExportModal.value = true;
    uni.showToast({ title: '准备导出Word...', icon: 'none' });
};

const getKnowledgeTags = (ids) => ids.map(id => flatLeaves.value.find(l => l.id === id) || {id, title:id}).filter(x=>x);
const toggleAnswer = (id) => showAnswerMap.value[id] = !showAnswerMap.value[id];
const handleGlobalClick = (e) => {
    manageMenuOpen.value = false;
    subjectDropdownOpen.value = false;
    showJumpPopover.value = false; // [修改点] 点击全局关闭跳转弹窗
};
</script>

<style lang="scss">
page { height: 100%; overflow: hidden; font-family: "Times New Roman", "SimSun", "Songti SC", serif;}
.layout-shell { display: flex; width: 100%; height: 100vh; background-color: #ffffff; }

/* 选中标签行：强制垂直居中 + 强制加大顶部间距 */
.active-filters-row {
    display: flex; /* 确保是 flex 布局 */
    align-items: flex-start !important;
    
    /* 核心修改：加大间距，并使用 !important 防止被覆盖 */
    margin-top: 13px !important;    
    
    /* 确保宽度占满，防止布局塌陷 */
    width: 100%;
}

/* 【新增】专门控制选中标签的容器：开启换行 + 增加行距 */
.active-filters-row .f-tags {
    display: flex;
    flex-wrap: wrap;        /* 必须：允许换行 */
    gap: 10px;              /* 核心：设置 水平间距 和 垂直间距 都是 10px */
    width: 100%;            /* 占满宽度 */
}

/* 再次确认微调左侧“筛选:”标题的位置 */
.active-filters-row .f-label {
    margin-top: 1px !important; /* 往下推一点，对齐第一行标签的文字 */
    align-self: flex-start;     /* 确保自身顶端对齐 */
}

/* 蓝色气泡样式微调 (如果觉得气泡太大，可以稍微改小一点) */
/* 1. 标签气泡基础样式 */
.tag-chip {
    display: flex;          /* 【关键】开启Flex布局 */
    align-items: center;    /* 【关键】垂直居中，让文字和叉号对齐 */
    padding: 2px 8px;       /* 内边距 */
    border-radius: 4px;     /* 【要求】圆角 4px */
    font-size: 12px;
    margin-right: 8px;      /* 标签之间的间距 */
    border: 1px solid transparent; /* 预留边框位置 */
    height: 16px;           /* 固定高度，看起来更整齐 */
}

/* 2. 红色样式（知识点标签） */
.tag-chip.red {
    background: #fef2f2;    /* 淡红背景 */
    color: #ef4444;         /* 红色文字 */
    border-color: #fee2e2;  /* 红色边框 */
	border-radius: 4px;     /* 【要求】圆角 4px */
}

/* 3. 蓝色样式（用户标签/其他） */
.tag-chip.blue {
    background: #eff6ff;    /* 淡蓝背景 */
    color: #2563eb;         /* 蓝色文字 */
    border-color: #dbeafe;  /* 蓝色边框 */
	border-radius: 4px;     /* 【要求】圆角 4px */
}

/* 4. 叉号按钮样式 */
.x-btn {
    margin-left: 3px;       /* 叉号和文字拉开一点距离 */
    cursor: pointer;
    font-size: 10px;        /* 叉号稍微小一点 */
    font-weight: bold;
    display: flex;          /* 确保叉号自身也是居中的 */
    align-items: center;
    justify-content: center;
    padding-top: 2px;       /* 微调：有时候符号视觉上会偏上，往下压1px */
}

/* --- 侧边栏与动画核心 --- */
.app-sidebar { 
  width: 120px;       /* 展开时宽度 */
  background: #ffffff; 
  border-right: 1px solid #e2e8f0;
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  padding: 20px 0; 
  color: #334155; 
  flex-shrink: 0; 
  position: relative;
  /* 关键：更平滑的宽度过渡曲线，模仿物理缓动 */
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden; /* 防止折叠时内容溢出 */
}

.app-sidebar.collapsed {
  width: 60px; /* 折叠时宽度 */
}

/* --- 折叠按钮 --- */
.collapse-btn {
  margin-top: auto; 
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-top: 1px solid #f1f5f9;
  transition: background 0.2s;
}
.collapse-btn:hover {
  background: #f8fafc;
}
.collapse-icon {
  font-size: 18px;
  color: #94a3b8;
  transition: transform 0.3s;
}
.collapse-btn:hover .collapse-icon {
  color: #2563eb;
}

/* --- Logo 区域 --- */
.logo-area { 
  color: #334155; 
  font-weight: bold; 
  font-size: 18px; 
  margin-bottom: 30px; 
  white-space: nowrap;
  /* 保持高度稳定 */
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-txt {
    transition: opacity 0.3s;
}

/* --- 导航项布局 --- */
.nav-items { display: flex; flex-direction: column; gap: 5px; width: 100%; }

.nav-item { 
  position: relative;
  height: 55px; 
  display: flex; 
  flex-direction: row; 
  align-items: center; 
  justify-content: center; 
  cursor: pointer; 
  color: #64748b; 
  width: 98%; 
  transition: all 0.3s;
  border-radius: 10px; /* 设置圆角大小，10px 比较适中 */
}

/* 选中状态主体 */
.nav-item.active {
  background: transparent;
  color: #f97316; 
}

/* --- 左侧高斯光效 & 右侧竖条 --- */
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;  
  height: 90%;  
  background: radial-gradient(ellipse at left center, rgba(249, 115, 22, 0.6) 20%, rgba(249, 115, 22, 0) 70%);
  pointer-events: none;
  z-index: 0;
  /* 添加透明度过渡，而不是直接消失 */
  transition: opacity 0.2s; 
  opacity: 1;
}

/* --- 关键：折叠时隐藏光效和竖条 --- */
.app-sidebar.collapsed .nav-item.active::before,
.app-sidebar.collapsed .nav-item.active::after {
  opacity: 0; /* 变透明，而不是 display: none，保持渲染层稳定 */
}

/* --- 图标与文字 --- */
.nav-icon-img {
  width: 20px; 
  height: 20px;
  margin-bottom: 0; 
  margin-right: 8px; /* 默认右边距 */
  display: block;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* 图标移动也加缓动 */
}

/* 选中时图标放大发光（任何状态都保持） */
.nav-item.active .nav-icon-img {
  filter: drop-shadow(0 0 3px #f97316); 
  transform: scale(1.2);
  position: relative; 
  z-index: 1;
}

.nav-txt { 
  font-size: 14px; 
  color: #334155; 
  white-space: nowrap;
  opacity: 1;
  /* 关键优化：使用 max-width 实现文字滑入滑出，代替 display: none */
  max-width: 80px; 
  /* 文字淡入淡出和宽度变化 */
  transition: opacity 0.2s ease-in-out, max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), margin-right 0.3s;
  transform-origin: left center;
}

/* 选中时文字放大 */
.nav-item.active .nav-txt {
  font-weight: bold;
  transform: scale(1.1); /* 这里仅放大，不影响布局流 */
  color: #f97316;
}

/* --- 折叠时的特殊样式 (修改这里) --- */

/* 1. [新增] 强制折叠后的按钮变成正方形并自动居中 */
.app-sidebar.collapsed .nav-item {
  width: 40px;       /* 固定宽度，不要用百分比 */
  height: 40px;      /* 固定高度 */
  margin: 4px auto;  /* 关键：上下4px，左右 auto 实现绝对居中 */
  padding: 0;        /* 清除内边距干扰 */
  justify-content: center; /* 内部元素居中 */
}

/* 2. [修改] 强制去除图标右边距，防止偏移 */
.app-sidebar.collapsed .nav-icon-img {
  margin-right: 0 !important; /* 加 !important 确保生效 */
  margin-left: 0;
}

/* 3. [保持] 文字隐藏 */
.app-sidebar.collapsed .nav-txt {
  opacity: 0;
  max-width: 0; 
  margin-right: 0;
  overflow: hidden;
}

/* --- 其他通用样式保持不变 --- */
.main-workspace { flex: 1; display: flex; flex-direction: column; min-width: 0; height: 100%; overflow: hidden; }
.empty-state { display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; }
.empty-content { text-align: center; }
.empty-icon { font-size: 40px; margin-bottom: 10px; display: block; }
.empty-text { font-size: 18px; font-weight: bold; color: #64748b; margin-bottom: 5px; display: block; }
/* 1. 修改顶栏容器：变为圆角矩形，与周围有间距 */
.top-header { 
    height: 50px; /* 稍微增高一点，容纳输入框 */
    background: #f0f0f0; 
    /* 核心修改：圆角和边距 */
    margin: 12px 12px 0 12px; 
    border-radius: 4px; 
    box-shadow: 0 2px 6px rgba(0,0,0,0.02); /* 加一点淡淡的阴影更有质感 */
    
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 0 12px; 
    flex-shrink: 0; 
    /* 去掉原来的底边框，因为现在是悬浮卡片风格了 */
    border-bottom: none; 
}

/* 2. 新增：左侧筛选区样式 */
.header-left-filters {
    display: flex;
    align-items: center;
    gap: 10px;
}

/* 3. 新增：顶栏微型输入框样式 */
.mini-input {
    background: #ffffff;
    border: 1px solid transparent;
    height: 27px;
    line-height: 32px;
    border-radius: 6px;
    padding: 0 10px;
    font-size: 13px;
    color: #334155;
    width: 80px;
    transition: all 0.2s;
}
.mini-input:focus {
    background: white;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.1);
}
.mini-input.small { width: 60px; } /* 题号短一点 */
.mini-input.medium { width: 140px; } /* 来源长一点 */

/* [原有样式微调] 保持右侧样式不变，或者稍微优化 */
.header-right { 
    display: flex; 
    align-items: center; 
    gap: 20px; /* 稍微拉大间距 */
    font-size: 13px; 
    color: #64748b; 
}

/* 1. 总题数 */
.total-count-box {
    display: flex;
    align-items: baseline; /* 基线对齐，让数字更好看 */
    font-size: 13px;
    color: #64748b;
}
.tc-num {
    font-size: 18px;     /* 数字放大 */
    font-weight: bold;
    color: #334155;
    margin: 0 4px;
    font-family: monospace; /* 可选：等宽字体数字 */
}

/* 2. 每页数选择器 */
.page-size-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
}
.ps-label {
    color: #64748b;
}
.ps-box {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 4px;      /* 圆角矩形 */
    padding: 6px 6px;
    height: 25px;            /* 固定高度 */
    box-sizing: border-box;
    cursor: pointer;
    transition: all 0.2s;
}
.ps-box:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
}
.ps-icon {
    width: 10px;
    height: 10px;
    margin-left: 8px;       /* 图标在数字左边 */
    opacity: 0.6;
    transform: rotate(180deg);
    margin-bottom: 0.8px;
}
.ps-text {
    font-weight: 500;
    color: #334155;
}

/* --- [新增] 分页器样式 --- */
.pagination-bar {
    display: flex;
    align-items: center;
    gap: 8px; /* 元素之间的间距 */
    margin-left: 10px; /* 与左边每页条数的间距 */
}

/* 左右圆图标 */
.pg-circle-btn {
    width: 28px;
    height: 28px;
    cursor: pointer;
    opacity: 0.8;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.pg-circle-btn:hover {
    opacity: 1;
    transform: scale(1.1);
}
.pg-circle-btn.disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: none;
}

/* 页码数字容器 */
.pg-numbers {
    display: flex;
    align-items: center;
    gap: 6px;
}

/* 单个页码圆圈 */
.pg-num-circle {
    width: 28px;
    height: 28px;
    border-radius: 50%; /* 圆形 */
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #64748b;
    font-weight: 500;
    font-size: 13px;
    
    /* 核心：只对颜色变化做过渡，位置是不动的 */
    transition: background-color 0.2s ease, color 0.2s ease;
    
    /* 关键：防止数字变动时引起宽度抖动 */
    font-variant-numeric: tabular-nums;
}
.pg-num-circle:hover {
    background: #f1f5f9;
    color: #334155;
}

/* 选中状态：橙色背景 + 白字 */
.pg-num-circle.active {
    background: #F87F23; 
    color: white;
    box-shadow: 0 2px 4px rgba(248, 127, 35, 0.3);
    /* 稍微放大一点增加质感 */
    transform: scale(1.05); 
}

/* 更多图标区域 */
.pg-more-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.pg-more-icon {
    width: 20px;
    height: 20px;
    cursor: pointer;
    opacity: 0.6;
    margin: 0 4px;
}
.pg-more-icon:hover {
    opacity: 1;
}

/* 跳转弹窗 (显示在图标下方) */
.jump-popover {
    position: absolute;
    top: 32px; /* 图标高度下面 */
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-radius: 6px;
    padding: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    z-index: 999;
    
    /* 小三角 (指向上面) */
}
.jump-popover::before {
    content: '';
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 0 5px 5px 5px;
    border-style: solid;
    border-color: transparent transparent white transparent;
}

.jump-input {
    width: 50px;
    height: 26px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    text-align: center;
    font-size: 13px;
    background: #f8fafc;
}

.jump-go-btn {
    background: #F87F23;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
}

.pg-total-text {
    color: #94a3b8;
    margin: 0 4px;
    font-size: 13px;
}

.workspace-body { flex: 1; display: flex; overflow: hidden; height: 100%; }
.resource-sidebar-wrapper { width: 300px; padding: 12px; flex-shrink: 0; display: flex; flex-direction: column; }
.resource-sidebar { flex: 1; background: #F0F0F0; border-radius: 4px; display: flex; flex-direction: column; overflow: hidden; gap: 15px; padding-top: 15px;}
.res-header { padding: 0px 12px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; border-radius: 4px;}
.subject-wrapper { 
  position: relative; 
  width: auto;  /* 把原来的 width: 140px 改为 auto */
}
.subject-btn {
  background:#F87F23; /* 保持你的颜色，或者尝试 iOS 风格橙色 #FF9500 */
  color: white;
  
  font-size: 14px;
  
  /* --- 布局调整 --- */
  height: 32px;            /* 设定固定高度 */
  box-sizing: border-box;  /* 确保 padding 不会撑大高度 */
  padding: 0px 14px;  /* 稍微加大一点内边距，手指更好点 */
  width: fit-content; 
  max-width: 160px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  /* --- iPhone 风格核心 --- */
  /* 1. 更大的圆角，接近 iOS 的圆润感 */
  border-radius: 4px; /* 或者 10px，不要太方 */
  
  /* 2. 极其平滑的过渡动画 (贝塞尔曲线) */
  /* 这里的 cubic-bezier(0.25, 0.1, 0.25, 1) 是 iOS 默认动画曲线的一种模拟 */
  transition: transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), 
              opacity 0.2s cubic-bezier(0.25, 0.1, 0.25, 1),
              background-color 0.2s;

  /* 3. 去掉默认高光，增加质感（可选） */
  box-shadow: 0 0px 6px rgba(249, 115, 22, 0.5); /* 淡淡的同色系阴影 */
  
  /* 4. 防止点击高亮背景块（小程序/H5特有） */
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
  user-select: none;
}

/* --- 按下状态 (Active State) --- */
/* 这是 iOS 交互的灵魂：按下时瞬间变暗或缩小 */
.subject-btn:active {
  transform: scale(0.96); /* 微微缩小，模拟按压 */
  opacity: 0.85;          /* 微微变透明 */
}
.subject-btn text:first-child {
  flex: 1;                 /* 自动占据剩余空间 */
  overflow: hidden;        /* 超出隐藏 */
  text-overflow: ellipsis; /* 超出显示省略号 */
  white-space: nowrap;     /* 强制不换行 */
  min-width: 0;            /* 关键：允许 flex 子项压缩 */
  margin-right: 4px;       /* 和右边的箭头保持一点距离 */
}
/* 新增样式：控制箭头图标的大小和位置 */
.arrow-icon {
  width: 12px;
  height: 12px;
  
  /* 如果图标在文字右边，建议用 margin-left */
  margin-left: 4px; 
  /* margin-right: 6px; */ /* 如果图标在左边则保留这个 */

  flex-shrink: 0;
  display: block; /* 修正了之前的 display: -100px */

  /* --- 1. 设置为白色 --- */
  /* 如果是 image 标签，color 属性无效，需用滤镜将深色图片转为白色 */
  filter: brightness(0) invert(1);

  /* --- 2. 旋转180度 & 3. 往下移 --- */
  /* translateY 的值如果是正数，通常是向下；但旋转后可能需要反向调试 */
  /* 建议用 position 微调位置，比较直观 */
  transform: rotate(180deg);
  position: relative;
  top: 0.5px; /* 往下移 2px，根据实际视觉效果调整这个数字 */
}
.custom-subject-dropdown { position: absolute; top: 100%; left: 50%;transform: translateX(-50%);width: 100%; background: white; border: 1px ; border-radius: 4px; box-shadow: 0 0px 12px rgba(0, 0, 0, 0.12); z-index: 50; margin-top: 4px; }
.sub-item { padding: 8px 12px; font-size: 13px; cursor: pointer; text-align: center;}
.sub-item:hover { background: #f8fafc; }
.sub-item.active { color: #F87F23; font-weight: bold; background: #f87f231A; }
.setting-wrapper { position: relative; }
.setting-btn.custom-menu-icon {
  /* ...原有布局属性... */
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
  align-items: center; 
  width: 32px; 
  height: 32px; 
  gap: 4px;
  
  /* --- 新增质感 --- */
  border-radius: 4px; /* 与左侧保持一致 */
  background-color: transparent; /* 默认透明 */
  transition: background-color 0.2s, transform 0.2s;
  cursor: pointer;
}

/* 鼠标悬停（电脑端） */
.setting-btn.custom-menu-icon:hover {
  background-color: rgba(0, 0, 0, 0.05); /* 极淡的灰色背景 */
}

/* 按下状态（手机/点击） */
.setting-btn.custom-menu-icon:active {
  transform: scale(0.92); /* 同样缩小 */
  background-color: rgba(0, 0, 0, 0.1);
}
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
/* 修改筛选容器：变为圆角矩形卡片 */
/* 1. 筛选容器通用样式 */
.filter-bar { 
    background: white; 
    padding: 10px 20px; 
    margin: 12px; 
    border-radius: 4px; 
    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
    flex-shrink: 0; 
    
    /* 【修改点1】这里控制整个区域的字体大小 */
    font-size: 14px; /* 原来可能是13px，改大一点 */
}

/* 1. 调整左侧组合容器：让标题和按钮横向排列 */
.fh-left-group {
    display: flex;
    align-items: center;
    gap: 12px;  /* 标题和按钮之间的距离 */
}

/* 2. 定义清空按钮样式：红色圆角矩形 */
.clear-filter-btn {
    /* 红色圆角风格 */
    background-color: #fef2f2;
    color: #ef4444;
    border: 1px solid #fee2e2;
    border-radius: 4px;
    
    /* 尺寸调整 */
    font-size: 12px;
    padding: 2px 10px;
    height: 24px;        /* 固定高度 */
    display: flex;       /* 确保文字居中 */
    align-items: center;
    
    cursor: pointer;
    font-weight: normal; /* 防止继承标题的粗体 */
}

.clear-filter-btn:hover {
    background-color: #fee2e2;
}

/* 2. 筛选区标题（上部分） */
.filter-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    cursor: pointer; 
    user-select: none;
    
    /* 【修改点2】去掉了原来的 border-bottom (分割线) */
    /* border-bottom: 1px dashed #f1f5f9; */ 
    
    /* 【修改点3】这里控制上下两部分的间距 */
    margin-bottom: 0px; /* 原来是8px，觉得挤可以改大，觉得空可以改小 */
}

.fh-title { 
    font-weight: bold; 
    color: #334155;
    /* 如果想单独改标题字体大小，在这里改 */
    font-size: 14px; 
}

/* 3. 筛选区内容（下部分）及滑动动画核心 */
.filter-body { 
    display: flex; 
    flex-direction: column; 
    
    /* 【修改点4】实现滑动动画的关键属性 */
    overflow: hidden;         /* 必须：隐藏超出部分 */
    max-height: 1000px;       /* 设定一个足够大的最大高度，保证内容能完全显示 */
    opacity: 1;               /* 透明度全显 */
    transition: all 0.1s ease-in-out; /* 动画过渡时间，0.4s 比较顺滑 */
	margin-top: 20px;
}

/* 当添加了 collapsed 类时的状态（折叠状态） */
.filter-body.collapsed {
    max-height: 0;            /* 高度变为0 */
    opacity: 0;               /* 透明度变0 */
    margin: 0;                /* 去掉间距 */
    padding: 0;               /* 去掉内边距 */
}
.fh-icon { font-size: 12px; color: #94a3b8; }
.filter-header:hover .fh-icon { color: #2563eb; }
.f-row { display: flex; align-items: center; gap: 2px; font-size: 13px; }
.f-row.mt-2 { margin-top: 8px; }
.f-row.align-start { align-items: flex-start; }
.f-label { font-weight: bold; color: #64748b; width: 40px; flex-shrink: 0; margin-top: 4px; font-size: 14px;}
.f-tags { display: flex; flex-wrap: wrap; gap: 0px; flex: 1; }
/* 修改 .tag：去掉边框和圆角，变为纯文字 */
.tag { 
    padding: 4px 12px; 
    /* 去掉原来的 border 和 border-radius */
    border: none; 
    background: transparent; /* 确保无背景 */
    
    cursor: pointer; 
    color: #64748b; /* 未选中时的灰色 */
    position: relative; /* 为以后可能加下划线或其他效果留口子 */
	font-size: 14px;
}

/* 修改选中状态：蓝色、加粗、无背景 */
.tag.active { 
    background: transparent; /* 去掉原来的浅蓝背景 */
    color: #2563eb;          /* 蓝色 */
    font-weight: bold;       /* 加粗 */
    border: none;
}
.province-grid { display: grid; grid-template-columns: repeat(11, 1fr); gap: 0px 0px; flex: 1; }
.province-grid .tag { text-align: center; display: flex; justify-content: center; align-items: center; }
.extra-filters { display: flex; align-items: center; gap: 12px; width: 100%; }
.mini-filter-item { display: flex; align-items: center; gap: 6px; }
.mini-filter-item.flex-grow { flex: 1; }
.mf-label { color: #64748b; font-weight: bold; }
.mf-picker { border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 4px; background: #fff; min-width: 60px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: #334155; }
.mf-input { border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 4px; width: 80px; font-size: 13px; color: #334155; }
.mf-input.small { width: 50px; }
.mf-input.grow { width: 100%; }
.tag-chip { font-size: 12px; padding: 2px 8px; border-radius: 12px; display: flex; align-items: center; gap: 4px; }
/* 修改清空按钮：适配顶栏样式 */
.clear-link {
    display: flex;
    align-items: center;
    justify-content: center;
    
    /* 红色圆角矩形风格保持不变 */
    background-color: #fef2f2;
    color: #ef4444;
    border: 1px solid #fee2e2;
    border-radius: 6px;  /* 改为6px，和旁边的输入框保持一致 */
    
    padding: 0 12px;
    height: 32px;        /* 【关键】高度改为 32px，和旁边的输入框一样高 */
    font-size: 13px;     /* 字体稍微改大一点点适配 */
    cursor: pointer;
    white-space: nowrap; /* 防止文字换行 */
    
    /* 【关键修改】去掉 margin-left: auto，因为现在是紧跟在输入框后面 */
    margin-left: 0;      
    transition: all 0.2s;
}

.clear-link:hover {
    background-color: #fee2e2;
    border-color: #fca5a5;
}

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
.q-title { flex: 1; font-size: 15px; line-height: 1.6; color: #1e293b; }
.q-img { max-width: 100%; border: 1px solid #eee; border-radius: 4px; }
.opt-grid { display: grid; gap: 8px; font-size: 14px; margin-bottom: 10px; color: #334155; }
.opt-key { font-weight: bold; margin-right: 5px; flex-shrink: 0; font-size: 16px;}
.opt-item { display: flex; align-items: center; margin-bottom: 8px; }
.opt-item :deep(.latex-text-container) { flex: 1; width: auto; }
.answer-box { background: #f0f9ff; padding: 12px 15px; border-radius: 6px; border: 1px dashed #bae6fd; font-size: 14px; color: #0c4a6e; }
.ans-block { margin-bottom: 12px; }
.ans-block:last-child { margin-bottom: 0; }
.ans-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold; margin-bottom: 4px; }
.ans-tag.answer { background-color: #2563eb; }   /* 蓝色 */
.ans-tag.analysis { background-color: #f59e0b; } /* 橙色 */
.ans-tag.detailed { background-color: #10b981; } /* 绿色 */
.ans-content { font-size: 14px; line-height: 1.6; color: #334155; }
.q-footer { border-top: 1px solid #f1f5f9; margin-top: 10px; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.tags-row { display: flex; gap: 8px; align-items: center; flex: 1; }
.tag-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; cursor: pointer; }
.tag-badge.red { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
.tag-badge.blue { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
.tag-icon {
  width: 12px;
  height: 12px;
  margin-right: 4px; /* 图标和文字的间距 */
  display: block;
  /* 如果你的图标是黑色的，想变成红色/蓝色，可以用滤镜（可选） */
  /* filter: opacity(0.6); */ 
}

/* 确保 tag-badge 使用 Flex 布局垂直居中 */
.tag-badge {
  display: flex;       /* 必须加这个 */
  align-items: center; /* 垂直居中 */
  /* ...原有样式... */
}
.tag-badge text {
  line-height: 1;      /* 让行高紧贴文字高度 */
  position: relative;  /* 开启相对定位 */
  top: -0.1px;           /* 核心：强制往上提 1px (如果还不够可以改成 -2px) */
}
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
.right-toolbar { 
  width: 70px; 
  background: #f0f0f0;          /* [建议] 改为白色，配合阴影才有悬浮卡片感 */
  
  /* 圆角与间距 */
  border-radius: 4px;           
  margin: 12px 12px 12px 12px;     
  box-shadow: 0 2px 6px rgba(0,0,0,0.03); 

  display: flex; 
  flex-direction: column; 
  align-items: center; 
  padding: 20px 0; 
  flex-shrink: 0; 
}
.tool-head {
  font-size: 14px;  /* 设置为你想要的大小，例如 12px 或 13px */
  font-weight: bold;
  margin-bottom: 10px;
}

.tool-btn { 
  width: 48px; 
  height: 48px; 
  border-radius: 12px; 
  background: white; 
  border: 1px solid #e2e8f0; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  margin-bottom: 12px; 
  cursor: pointer; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  transition: all 0.2s;
}
.tool-btn.primary { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; }
.t-icon { font-size: 20px; margin-bottom: 2px; }
.tool-icon-img {
  width: 22px;    /* 图标大小 */
  height: 22px;
  margin-bottom: 1px; /* 图标和文字之间的微小间距 */
  display: block;
  
  /* 关键：清除所有边距，确保绝对居中 */
  margin-left: 0;
  margin-right: 0;
}
/* 按钮文字样式 */
.t-lbl { 
  font-size: 10px;       /* [修改] 字体改小一点 (推荐 10px 或 11px) */
  
  margin-top: 4px;       /* [关键] 增加上边距，让文字往下移，远离图标 */
  
  line-height: 1;        /* 保持行高紧凑 */
  font-weight: 500;      /* 字重 */
  color: #2563eb;        /* (可选) 确保文字颜色清晰 */
}
.divider { width: 40px; height: 1px; background: #e2e8f0; margin: 10px 0 20px; }
.basket-col { display: flex; flex-direction: column; gap: 8px; }
.basket-circle { width: 35px; height: 35px; border-radius: 4px; background: white; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; color: #64748b; font-weight: bold; margin-top: 10px;}
.basket-circle:hover { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
.badge { position: absolute; top: -2px; right: -2px; background: #ef4444; color: white; font-size: 9px; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.basket-scroll { max-height: 60vh; }
.basket-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
.trunc { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 90%; }
.del-x { color: #ef4444; cursor: pointer; font-weight: bold; }
.link-btn { color: #2563eb; font-size: 12px; cursor: pointer; }
.whiteboard-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
</style>