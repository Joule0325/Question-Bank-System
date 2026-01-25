<template>
  <view class="layout-shell" @click="handleGlobalClick">
    <view class="app-sidebar">
      <view class="logo-area">题库</view>
      <view class="nav-items">
        <view class="nav-item" :class="{active: activeTab==='question_bank'}" @click="activeTab='question_bank'">
          <text class="nav-icon">📚</text><text class="nav-txt">题库</text>
        </view>
        <view class="nav-item" :class="{active: activeTab==='class'}" @click="activeTab='class'">
          <text class="nav-icon">👨‍🏫</text><text class="nav-txt">上课</text>
        </view>
        <view class="nav-item" :class="{active: activeTab==='resources'}" @click="activeTab='resources'"><text class="nav-icon">📂</text><text class="nav-txt">资源</text></view>
        <view class="nav-item"><text class="nav-icon">📖</text><text class="nav-txt">讲义</text></view>
        <view class="nav-item"><text class="nav-icon">👥</text><text class="nav-txt">学员</text></view>
        <view class="nav-item"><text class="nav-icon">📅</text><text class="nav-txt">排课</text></view>
      </view>
    </view>

    <view class="main-workspace" v-if="activeTab === 'question_bank'">
      <view class="top-header">
        <view></view>
        <view class="header-right">
          <text class="status-txt">共 {{ questions.length }} 条</text>
          <picker :range="[10, 20, 50]" @change="handlePageSizeChange">
            <text class="page-select">{{ itemsPerPage }}条/页 ▼</text>
          </picker>
          <view class="pagination">
            <button class="pg-btn" :disabled="currentPage===1" @click="changePage(-1)">&lt;</button>
            <text class="pg-num">{{ currentPage }} / {{ totalPages || 1 }}</text>
            <button class="pg-btn" :disabled="currentPage>=totalPages" @click="changePage(1)">&gt;</button>
          </view>
        </view>
      </view>

      <view class="workspace-body">
        
        <view class="resource-sidebar-wrapper">
          <view class="resource-sidebar">
            <view class="res-header">
              <view class="subject-wrapper" @click.stop="subjectDropdownOpen = !subjectDropdownOpen">
                <view class="subject-btn"><text>{{ currentSubjectName }}</text><text class="arrow">▼</text></view>
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
              <text class="fh-title">筛选条件</text>
              <text class="fh-icon">{{ isFilterExpanded ? '▲ 收起' : '▼ 展开' }}</text>
            </view>
          
            <view v-show="isFilterExpanded" class="filter-body">
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
          
              <view class="f-row mt-2 extra-filters">
                  <view class="mini-filter-item">
                      <text class="mf-label">年份:</text>
                      <input class="mf-input" v-model="filterYear" placeholder="如 2023" @input="debounceLoadQuestions" />
                  </view>
                  <view class="mini-filter-item">
                      <text class="mf-label">题号:</text>
                      <input class="mf-input small" v-model="filterQNumber" placeholder="数字" @input="debounceLoadQuestions" />
                  </view>
                  <view class="mini-filter-item flex-grow">
                      <text class="mf-label">来源:</text>
                      <input class="mf-input grow" v-model="filterSource" placeholder="输入关键词搜索..." @input="debounceLoadQuestions" />
                  </view>
              </view>
          
              <view class="f-row mt-2" v-if="allActiveFilters.length > 0">
                <text class="f-label">筛选:</text>
                <view class="f-tags">
                  <view v-for="item in allActiveFilters" :key="item.id" class="tag-chip blue">
                    {{ item.name }} <text class="x-btn" @click.stop="removeFilter(item)">✕</text>
                  </view>
                  <text class="clear-link" @click="clearAllFilters">清空</text>
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
                  <view v-for="tag in getKnowledgeTags(q.categoryIds)" :key="'k-'+(tag.id || tag.title)" class="tag-badge red" @click.stop="handleTagClick(tag.title || tag)">🏷️ {{ tag.title || tag }}</view>
                  <view v-for="tag in (q.tags||[])" :key="'t-'+tag" class="tag-badge blue" @click.stop="handleTagClick(tag)">🏷️ {{ tag }}</view>
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
          <view class="tool-btn primary" @click="openAddModal"><text class="t-icon">➕</text><text class="t-lbl">录题</text></view>
          <view class="tool-btn"><text class="t-icon">📄</text><text class="t-lbl">批量</text></view>
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

    <CommonModal :isOpen="activeBasketId!==null" :title="'试题篮 '+activeBasketId" maxWidth="600px" @close="activeBasketId=null">
      <view class="row-btw mb-2"><text>共 {{ baskets[activeBasketId]?.length||0 }} 题</text><text class="link-btn" @click="exportLatex">导出LaTeX</text></view>
      <scroll-view scroll-y class="basket-scroll">
        <view v-for="q in baskets[activeBasketId]||[]" :key="q.id" class="basket-row"><text class="trunc">#{{q.id}} {{q.title}}</text><text class="del-x" @click="removeFromBasket(activeBasketId, q.id)">✕</text></view>
      </scroll-view>
    </CommonModal>

  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { getSubjects, getCategories, getQuestions, deleteQuestion, getFilters } from '@/api/question.js';
import { baseUrl } from '@/utils/request.js';
import CategoryTree from '@/components/CategoryTree.vue';
import CommonModal from '@/components/CommonModal.vue';
import LatexText from '@/components/LatexText.vue';
import Whiteboard from '@/components/Whiteboard.vue';
import AddQuestionModal from '@/components/AddQuestionModal.vue';
import ManageSubjectModal from '@/components/ManageSubjectModal.vue';
import ManageContentModal from '@/components/ManageContentModal.vue';

// [新增] 定义所有省份列表
const ALL_PROVINCES = [
    "北京", "天津", "上海", "重庆", "河北", "山西", "内蒙古", 
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

let debounceTimer = null;

const currentSubjectName = computed(() => subjects.value[currentSubjectIdx.value]?.title || '加载中');
const currentSubjectId = computed(() => subjects.value[currentSubjectIdx.value]?.id);
const totalPages = computed(() => Math.ceil(questions.value.length / itemsPerPage.value));
const displayedQuestions = computed(() => questions.value.slice((currentPage.value-1)*itemsPerPage.value, currentPage.value*itemsPerPage.value));

const provinceOptionsWithAll = computed(() => ['全部', ...provinceOptions.value]);

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
const exportLatex = () => uni.showToast({title:'导出成功'});
const getKnowledgeTags = (ids) => ids.map(id => flatLeaves.value.find(l => l.id === id) || {id, title:id}).filter(x=>x);
const toggleAnswer = (id) => showAnswerMap.value[id] = !showAnswerMap.value[id];
const handleGlobalClick = (e) => {
    manageMenuOpen.value = false;
    subjectDropdownOpen.value = false;
};
</script>

<style lang="scss">
page { height: 100%; overflow: hidden; font-family: "Times New Roman", "SimSun", "Songti SC", serif;}
.layout-shell { display: flex; width: 100%; height: 100vh; background-color: #f8fafc; }
.app-sidebar { width: 80px; background: #0f172a; display: flex; flex-direction: column; align-items: center; padding: 20px 0; color: #94a3b8; flex-shrink: 0; }
.logo-area { color: white; font-weight: bold; font-size: 18px; margin-bottom: 30px; }
.nav-items { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.nav-item { height: 70px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
.nav-item.active { background: #2563eb; color: white; }
.nav-icon { font-size: 24px; margin-bottom: 4px; }
.nav-txt { font-size: 12px; }
.main-workspace { flex: 1; display: flex; flex-direction: column; min-width: 0; height: 100%; overflow: hidden; }
.empty-state { display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; }
.empty-content { text-align: center; }
.empty-icon { font-size: 40px; margin-bottom: 10px; display: block; }
.empty-text { font-size: 18px; font-weight: bold; color: #64748b; margin-bottom: 5px; display: block; }
.top-header { height: 56px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; flex-shrink: 0; }
.header-right { display: flex; align-items: center; gap: 15px; font-size: 13px; color: #64748b; }
.page-select { cursor: pointer; }
.pagination { display: flex; gap: 8px; align-items: center; }
.pg-btn { padding: 0 10px; height: 26px; line-height: 24px; font-size: 12px; }
.workspace-body { flex: 1; display: flex; overflow: hidden; height: 100%; }
.resource-sidebar-wrapper { width: 300px; padding: 12px; flex-shrink: 0; display: flex; flex-direction: column; }
.resource-sidebar { flex: 1; background: #F0F0F0; border-radius: 4px; display: flex; flex-direction: column; overflow: hidden; gap: 10px; padding-top: 15px;}
.res-header { padding: 0 12px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.subject-wrapper { position: relative; width: 140px; }
.subject-btn { background: #dcfce7; color: #166534; padding: 5px 12px; border-radius: 6px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.custom-subject-dropdown { position: absolute; top: 100%; left: 0; width: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; margin-top: 4px; }
.sub-item { padding: 8px 12px; font-size: 13px; cursor: pointer; }
.sub-item:hover { background: #f8fafc; }
.sub-item.active { color: #166534; font-weight: bold; background: #f0fdf4; }
.setting-wrapper { position: relative; }
.setting-btn.custom-menu-icon { display: flex; flex-direction: column; justify-content: center; align-items: center; width: 30px; height: 30px; cursor: pointer; border-radius: 4px; gap: 4px; }
.setting-btn.custom-menu-icon:hover { background-color: #e2e8f0; }
.menu-line { width: 16px; height: 2px; background-color: #94a3b8; border-radius: 2px; }
.setting-wrapper:hover .menu-line { background-color: #2563eb; }
.popover-menu { position: absolute; top: 100%; right: 0; margin-top: 2px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; border-radius: 6px; width: 110px; text-align: center;}
.menu-item { padding: 8px 12px; font-size: 13px; cursor: pointer; &:hover { background: #f8fafc; } }
.menu-item.header { font-weight: bold; color: #94a3b8; font-size: 12px; border-bottom: 1px solid #eee; }
.divider-h { height: 1px; background: #f1f5f9; margin: 4px 0; }
.search-bar-row { display: flex; align-items: center; padding: 0 12px; gap: 8px; flex-shrink: 0; }
.search-wrap { flex: 1; }
.search-input { background: white; padding: 0 10px; border-radius: 4px; font-size: 13px; width: 100%; box-sizing: border-box; height: 36px; line-height: 36px; border: 1px solid #e2e8f0; }
.multi-switch { display: flex; align-items: center; gap: 4px; cursor: pointer; padding: 4px 8px; border-radius: 4px; user-select: none; }
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
.filter-bar { background: white; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
.filter-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; cursor: pointer; border-bottom: 1px dashed #f1f5f9; margin-bottom: 8px; user-select: none; }
.fh-title { font-size: 13px; font-weight: bold; color: #334155; }
.fh-icon { font-size: 12px; color: #94a3b8; }
.filter-header:hover .fh-icon { color: #2563eb; }
.filter-body { display: flex; flex-direction: column; }
.f-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.f-row.mt-2 { margin-top: 8px; }
.f-row.align-start { align-items: flex-start; }
.f-label { font-weight: bold; color: #64748b; width: 40px; flex-shrink: 0; margin-top: 4px; }
.f-tags { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; }
.tag { padding: 4px 12px; border-radius: 15px; border: 1px solid #e2e8f0; cursor: pointer; color: #64748b; }
.tag.active { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
.province-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 8px; flex: 1; }
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
.tag-chip.blue { background: #dbeafe; color: #1e40af; }
.x-btn { cursor: pointer; font-weight: bold; }
.clear-link { font-size: 12px; color: #94a3b8; text-decoration: underline; cursor: pointer; margin-left: auto; }
.list-scroll { flex: 1; padding: 20px; box-sizing: border-box; overflow-y: hidden; height: 0; }
.state-txt { text-align: center; margin-top: 50px; color: #94a3b8; }
.q-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.q-header { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 10px; }
.meta-left { display: flex; gap: 6px; flex-wrap: wrap; }
/* [优化] 头部信息圆角矩形样式 */
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
/* [优化] 答案/分析样式 */
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
.footer-right { display: flex; align-items: center; gap: 10px; }
.hash-code { font-family: monospace; color: #cbd5e1; font-size: 11px; }
/* [优化] 试题篮按钮改为圆角矩形 */
.basket-add-btn-rect { padding: 4px 10px; border-radius: 4px; border: 1px solid #2563eb; color: #2563eb; font-size: 11px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; font-weight: 500; }
.basket-add-btn-rect:hover { background: #eff6ff; }
.basket-add-btn-rect.waiting { background: #2563eb; color: white; animation: pulse 1s infinite; }
/* [优化] 图片布局样式 */
.img-container { margin: 10px 0; display: flex; width: 100%; }
.img-container.align-left { justify-content: flex-start; }
.img-container.align-center { justify-content: center; }
.img-container.align-right { justify-content: flex-end; }
.layout-side-right { display: flex; gap: 15px; align-items: flex-start; }
.layout-side-right .content-wrapper { flex: 1; }
.layout-side-right .side-img-container { width: 30%; max-width: 200px; flex-shrink: 0; }
.right-toolbar { width: 80px; background: #f8fafc; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; padding: 20px 0; flex-shrink: 0; }
.tool-head { font-size: 12px; font-weight: bold; color: #94a3b8; margin-bottom: 10px; }
.tool-btn { width: 48px; height: 48px; border-radius: 12px; background: white; border: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 10px; cursor: pointer; }
.tool-btn.primary { background: #eff6ff; color: #2563eb; border: none; }
.t-icon { font-size: 18px; margin-bottom: 2px; }
.t-lbl { font-size: 10px; }
.divider { width: 40px; height: 1px; background: #e2e8f0; margin: 10px 0 20px; }
.basket-col { display: flex; flex-direction: column; gap: 8px; }
.basket-circle { width: 48px; height: 40px; border-radius: 8px; background: white; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; color: #64748b; font-weight: bold; }
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