<template>
  <view class="layout-shell" @click="handleGlobalClick">
    <!-- Left Sidebar -->
    <view class="app-sidebar">
      <view class="logo-area">题库</view>
      <view class="nav-items">
        <!-- 1. Question Bank Tab -->
        <view class="nav-item" :class="{active: activeTab==='question_bank'}" @click="activeTab='question_bank'">
          <text class="nav-icon">📚</text><text class="nav-txt">题库</text>
        </view>
        <!-- 2. Class Tab -->
        <view class="nav-item" :class="{active: activeTab==='class'}" @click="activeTab='class'">
          <text class="nav-icon">👨‍🏫</text><text class="nav-txt">上课</text>
        </view>
        <!-- Other Tabs -->
        <view class="nav-item" :class="{active: activeTab==='resources'}" @click="activeTab='resources'"><text class="nav-icon">📂</text><text class="nav-txt">资源</text></view>
        <view class="nav-item"><text class="nav-icon">📖</text><text class="nav-txt">讲义</text></view>
        <view class="nav-item"><text class="nav-icon">👥</text><text class="nav-txt">学员</text></view>
        <view class="nav-item"><text class="nav-icon">📅</text><text class="nav-txt">排课</text></view>
      </view>
    </view>

    <!-- VIEW 1: Question Bank Workspace -->
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

      <!-- Workspace Body -->
      <view class="workspace-body">
        
        <!-- 1. Resource Sidebar -->
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
                  <view class="menu-item" @click="openSubjectModal">目录类型编辑</view>
                  <view class="menu-item" @click="openContentModal">目录内容管理</view>
                  <view class="divider-h"></view>
                  <view class="menu-item" @click="toggleExpandAll(true)">展开所有目录</view>
                  <view class="menu-item" @click="toggleExpandAll(false)">折叠所有目录</view>
                </view>
              </view>
            </view>

            <view class="search-bar-row">
              <view class="search-wrap">
                <input class="search-input" v-model="catSearch" placeholder="搜索知识点..." @confirm="handleCatSearch" />
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

        <!-- 2. Content Canvas -->
        <view class="content-canvas">
          <view class="filter-bar">
            <view class="f-row">
              <text class="f-label">题型:</text>
              <view class="f-tags">
                <text class="tag" :class="{active: selectedType==='全部'}" @click="selectedType='全部'">全部</text>
                <text class="tag" v-for="t in ['单选题','多选题','填空题','解答题']" :key="t" :class="{active: selectedType===t}" @click="selectedType=t">{{ t }}</text>
              </view>
            </view>
            <view class="f-row mt-2">
              <text class="f-label">难度:</text>
              <view class="f-tags">
                <text class="tag" :class="{active: selectedDiff==='全部'}" @click="selectedDiff='全部'">全部</text>
                <text class="tag" v-for="d in [1,2,3,4,5]" :key="d" :class="{active: selectedDiff===d}" @click="selectedDiff=d">{{ '★'.repeat(d) }}</text>
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

          <scroll-view scroll-y class="list-scroll">
            <view v-if="loading" class="state-txt">加载中...</view>
            <view v-else-if="questions.length===0" class="state-txt">暂无题目</view>
            <view v-for="q in displayedQuestions" :key="q.id" class="q-card">
              <view class="q-header">
                <view class="meta-left">
                  <text class="m-year">{{ q.year }}</text>
                  <text class="m-src">{{ q.source }}</text>
                  <text class="m-code">#{{ q.qNumber }}</text>
                  <text class="m-type">[{{ q.type }}]</text>
                  <text class="m-diff">{{ '★'.repeat(q.difficulty) }}</text>
                </view>
                <view class="meta-right">
                  <text class="op-btn blue" @click="openEditModal(q)">编辑</text>
                  <text class="op-btn red" @click="handleDelete(q.id)">删除</text>
                </view>
              </view>
              <view class="q-body" @click="toggleAnswer(q.id)">
                <view class="body-row">
                  <view class="q-title"><LatexText :text="q.title"></LatexText></view>
                  <image v-if="q.image" :src="q.image" mode="aspectFit" class="q-img" />
                </view>
                <view v-if="q.options && (q.type.includes('单选') || q.type.includes('多选'))" class="opt-grid" :class="'cols-'+(q.optionLayout||4)">
                  <view v-for="(val, key) in q.options" :key="key" class="opt-item"><text class="opt-key">{{ key }}.</text><LatexText :text="val"></LatexText></view>
                </view>
                <view v-if="showAnswerMap[q.id]" class="answer-box"><text class="ans-label">【答案】</text><LatexText :text="q.answer"></LatexText></view>
              </view>
              <view class="q-footer">
                <view class="tags-row">
                  <view v-for="tag in [...getKnowledgeTags(q.categoryIds), ...(q.tags||[])]" :key="tag.id || tag" class="tag-badge" @click.stop="handleTagClick(tag.title || tag)">🏷️ {{ tag.title || tag }}</view>
                  <text class="hash-code">#{{ q.code }}</text>
                </view>
                <view class="basket-add-btn" :class="{waiting: waitingBasketKey===q.id}" @click.stop="toggleWaiting(q.id)">+</view>
              </view>
            </view>
            <view style="height: 40px;"></view>
          </scroll-view>
        </view>

        <!-- 3. Right Toolbar -->
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

      </view> <!-- End Workspace Body -->
    </view> <!-- End Question Bank Workspace -->

    <!-- VIEW 2: Class/Whiteboard Workspace -->
    <view class="main-workspace" v-else-if="activeTab === 'class'">
        <view class="whiteboard-wrapper">
            <Whiteboard></Whiteboard>
        </view>
    </view>

    <!-- VIEW 3: Others (Empty) -->
    <view class="main-workspace empty-state" v-else>
      <view class="empty-content"><text class="empty-icon">🚧</text><text class="empty-text">功能开发中...</text></view>
    </view>

    <!-- MODALS -->
    <!-- 1. Subject Management Modal -->
    <CommonModal :isOpen="showSubjectModal" title="目录类型编辑 (科目)" maxWidth="500px" @close="showSubjectModal=false">
      <view class="list-editor">
        <view class="le-toolbar">
          <view class="tb-btn" @click="addSubjectRow"><text>➕ 添加</text></view>
          <view class="tb-btn red" @click="deleteSelectedSubjects"><text>🗑️ 删除</text></view>
          <view class="tb-divider"></view>
          <view class="tb-btn" @click="moveSubject('up')"><text>⬆️ 上移</text></view>
          <view class="tb-btn" @click="moveSubject('down')"><text>⬇️ 下移</text></view>
          <view class="tb-divider"></view>
          <view class="tb-btn" @click="listSelectAll(subjectList)"><text>☑️ 全选</text></view>
          <view class="tb-btn" @click="listInverseSelect(subjectList)"><text>🔄 反选</text></view>
        </view>
        <view class="le-header">
          <text class="col-chk">选</text>
          <text class="col-title">可编辑目录类型</text>
        </view>
        <scroll-view scroll-y class="le-body h-300">
          <view v-for="(item, idx) in subjectList" :key="item.id || idx" class="le-row" :class="{checked: item.checked}" @click="item.checked=!item.checked">
            <view class="col-chk"><text v-if="item.checked" class="chk-icon">✓</text></view>
            <input class="col-input" v-model="item.title" @click.stop placeholder="输入名称" />
          </view>
        </scroll-view>
        <view class="foot-btns">
          <button class="btn" @click="showSubjectModal=false">取消</button>
          <button class="btn primary" @click="saveSubjects">保存修改</button>
        </view>
      </view>
    </CommonModal>

    <!-- 2. Content Management Modal -->
    <CommonModal :isOpen="showContentModal" title="目录内容管理" maxWidth="900px" @close="showContentModal=false">
      <view class="content-manage-layout">
        <!-- Left Tree -->
        <view class="cm-left">
          <scroll-view scroll-y class="cm-tree-scroll">
            <CategoryTree 
              v-for="cat in manageTreeData" 
              :key="cat.id" 
              :node="cat" 
              :level="0"
              :selectedIds="manageSelectedId ? [manageSelectedId] : []"
              :defaultOpen="manageTreeExpandAll"
              @select="handleManageTreeSelect"
            ></CategoryTree>
            <view v-if="manageTreeData.length===0" class="empty-tip">暂无目录，请在右侧添加</view>
          </scroll-view>
        </view>

        <!-- Right Edit Area -->
        <view class="cm-right">
          <view class="cm-box mb-2">
            <view class="box-title">当前选择的目录</view>
            <view class="box-body" v-if="currentManageNode">
              <view class="form-row">
                <text class="lbl">名称</text>
                <input class="inp flex-1" v-model="currentManageNode.title" />
              </view>
              <view class="form-row mt-2">
                <text class="lbl">颜色</text>
                <view class="color-opts">
                  <view v-for="c in colorOptions" :key="c" class="c-circle" :style="{background: c}" 
                    :class="{active: currentManageNode.color === c}"
                    @click="currentManageNode.color = c"></view>
                  <view class="c-circle remove" @click="currentManageNode.color = ''">✕</view>
                </view>
              </view>
              <view class="row-end mt-2">
                <button class="btn sm red" @click="deleteCurrentNode">删除目录及其子目录</button>
                <button class="btn sm primary ml-2" @click="saveCurrentNodeInfo">保存信息</button>
              </view>
            </view>
            <view class="box-body center-txt" v-else>请在左侧选择一个目录 (或根目录)</view>
          </view>

          <!-- Bottom: Manage Children -->
          <view class="cm-box flex-1">
            <view class="box-title">{{ currentManageNode ? `[${currentManageNode.title}] 的子目录` : '一级目录管理' }}</view>
            <view class="list-editor flat">
              <view class="le-toolbar sm">
                <view class="tb-btn" @click="addManageChild"><text>➕ 添加</text></view>
                <view class="tb-btn red" @click="deleteManageChildren"><text>🗑️ 删除</text></view>
                <view class="tb-divider"></view>
                <view class="tb-btn" @click="moveManageChild('up')"><text>⬆️</text></view>
                <view class="tb-btn" @click="moveManageChild('down')"><text>⬇️</text></view>
                <view class="tb-divider"></view>
                <view class="tb-btn" @click="listSelectAll(currentChildrenList)"><text>All</text></view>
                <view class="tb-btn" @click="listInverseSelect(currentChildrenList)"><text>Inv</text></view>
              </view>
              <scroll-view scroll-y class="le-body flex-1">
                <view v-for="(item, idx) in currentChildrenList" :key="item.id || idx" class="le-row" :class="{checked: item.checked}" @click="item.checked=!item.checked">
                  <view class="col-chk"><text v-if="item.checked" class="chk-icon">✓</text></view>
                  <view class="col-color-dot" :style="{background: item.color || '#ccc'}"></view>
                  <input class="col-input" v-model="item.title" @click.stop />
                </view>
              </scroll-view>
              <view class="foot-btns">
                <button class="btn primary full" @click="saveChildrenList">保存子目录列表</button>
              </view>
            </view>
          </view>
        </view>
      </view>
    </CommonModal>

    <!-- 3. Add/Edit Modal -->
    <CommonModal :isOpen="showAddModal" :title="isEditing?'编辑题目':'录入题目'" maxWidth="800px" @close="showAddModal=false">
      <view class="form-layout" @click="closeKpDropdown">
        <view class="row-4">
          <view class="f-item"><text class="lbl">年份</text><input class="inp" v-model="formData.year" placeholder="2023年"/></view>
          <view class="f-item"><text class="lbl">来源</text><input class="inp" v-model="formData.source" placeholder="成都一诊"/></view>
          <view class="f-item"><text class="lbl">题号</text><input class="inp" v-model="formData.qNumber" placeholder="第1题"/></view>
          <view class="f-item"><text class="lbl">难度</text><input class="inp" type="number" v-model="formData.difficulty" /></view>
        </view>
        <view class="row-flex mt-2">
          <view class="f-item w-30"><text class="lbl">题型</text>
            <picker :range="['单选题','多选题','填空题','解答题']" @change="e => formData.type=['单选题','多选题','填空题','解答题'][e.detail.value]"><view class="picker-view">{{ formData.type }}</view></picker>
          </view>
          <view class="f-item flex-1 ml-2 rel" @click.stop>
            <text class="lbl">知识点 (搜)</text>
            <input class="inp" v-model="kpSearch" placeholder="输入搜索..." @input="handleKpSearch" @focus="handleKpSearch" />
            <view class="dropdown" v-if="kpSearch && kpSearchResults.length">
              <view class="dd-item" v-for="k in kpSearchResults" :key="k.id" @click="addCategory(k.id)">
                <view class="dd-col"><text class="dd-title">{{ k.title }}</text><text class="dd-path">{{ k.fullPath }}</text></view>
                <text class="chk" v-if="formData.categoryIds.includes(k.id)">✓</text>
              </view>
            </view>
          </view>
          <view class="f-item w-10 center justify-end pb-1"><text class="icon-btn" @click="showUploadModal=true">📷</text></view>
        </view>
        <view class="tags-input-area mt-2">
          <view v-for="k in getKnowledgeTags(formData.categoryIds)" :key="k.id" class="tag-chip blue">{{ k.title }} <text @click="removeCategory(k.id)">✕</text></view>
          <view v-for="(t,i) in formData.tags" :key="i" class="tag-chip white">{{ t }} <text @click="removeTag(i)">✕</text></view>
          <input class="inp-noborder" v-model="tagInput" placeholder="输入标签回车" @confirm="addTag" />
          <text class="add-txt" @click="addTag">添加</text>
        </view>
        <view class="f-item mt-2">
          <view class="row-btw"><text class="lbl">题干</text><text v-if="formData.image" class="sm-txt blue">已含图</text></view>
          <textarea class="txt-area h-24" v-model="formData.title" placeholder="支持 LaTeX" maxlength="-1"></textarea>
        </view>
        <view v-if="['单选题','多选题'].includes(formData.type)" class="opt-setting mt-2">
          <view class="row-btw mb-1"><text class="lbl">选项</text><picker :range="['1列','2列','4列']" @change="e => formData.optionLayout=[1,2,4][e.detail.value]"><text class="sm-txt">布局: {{ formData.optionLayout }}列</text></picker></view>
          <view class="grid-2"><view v-for="k in ['A','B','C','D']" :key="k" class="row-ac"><text class="bold mr-1">{{k}}.</text><input class="inp" v-model="formData.options[k]"/></view></view>
        </view>
        <view class="f-item mt-2"><text class="lbl">答案解析</text><textarea class="txt-area h-20" v-model="formData.answer" maxlength="-1"></textarea></view>
        <view class="foot-btns"><button class="btn" @click="showAddModal=false">取消</button><button class="btn primary" @click="handleSave">保存</button></view>
      </view>
    </CommonModal>

    <!-- 4. Upload Modal -->
    <CommonModal :isOpen="showUploadModal" title="上传配图" maxWidth="400px" @close="showUploadModal=false">
      <view class="upload-zone" @click="chooseImage">
        <text class="cam-icon">📷</text><text class="tip">点击选择图片上传</text>
        <image v-if="formData.image" :src="formData.image" mode="aspectFit" class="prev-img-lg" />
      </view>
      <button class="btn full mt-2" v-if="formData.image" @click="formData.image=''">清除图片</button>
    </CommonModal>

    <!-- 5. Basket Modal -->
    <CommonModal :isOpen="activeBasketId!==null" :title="'试题篮 '+activeBasketId" maxWidth="600px" @close="activeBasketId=null">
      <view class="row-btw mb-2"><text>共 {{ baskets[activeBasketId]?.length||0 }} 题</text><text class="link-btn" @click="exportLatex">导出LaTeX</text></view>
      <scroll-view scroll-y class="basket-scroll">
        <view v-for="q in baskets[activeBasketId]||[]" :key="q.id" class="basket-row"><text class="trunc">#{{q.id}} {{q.title}}</text><text class="del-x" @click="removeFromBasket(activeBasketId, q.id)">✕</text></view>
      </scroll-view>
    </CommonModal>

  </view> <!-- Close layout-shell -->
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { getSubjects, getCategories, getQuestions, saveQuestion, updateQuestion, deleteQuestion, manageCategory } from '@/api/question.js';
import { baseUrl } from '@/utils/request.js';
import CategoryTree from '@/components/CategoryTree.vue';
import CommonModal from '@/components/CommonModal.vue';
import LatexText from '@/components/LatexText.vue';
import Whiteboard from '@/components/Whiteboard.vue';

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
const treeExpandedIds = ref([]); // Store IDs to be expanded
const manageMenuOpen = ref(false);
const subjectDropdownOpen = ref(false);

const isMultiSelect = ref(false);

const showAddModal = ref(false);
const showUploadModal = ref(false);
const activeBasketId = ref(null);
const isEditing = ref(false);

// New Modals State
const showSubjectModal = ref(false);
const showContentModal = ref(false);
const subjectList = ref([]); // For editing in modal
const manageTreeData = ref([]); // Tree in Content Modal
const manageSelectedId = ref(null);
const manageTreeExpandAll = ref(false);
const currentManageNode = ref(null);
const currentChildrenList = ref([]); // For right-bottom list editor
const colorOptions = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const formData = reactive({
id: '', year: '', source: '', difficulty: 1, type: '单选题', qNumber: '',
title: '', image: '', answer: '', optionLayout: 4,
options: { A: '', B: '', C: '', D: '' },
categoryIds: [], tags: []
});
const tagInput = ref('');
const kpSearch = ref('');
const kpSearchResults = ref([]);

const showAnswerMap = ref({});
const waitingBasketKey = ref(null);
const baskets = ref({1:[],2:[],3:[],4:[],5:[],6:[],7:[]});

const currentSubjectName = computed(() => subjects.value[currentSubjectIdx.value]?.title || '加载中');
const currentSubjectId = computed(() => subjects.value[currentSubjectIdx.value]?.id);
const totalPages = computed(() => Math.ceil(questions.value.length / itemsPerPage.value));
const displayedQuestions = computed(() => questions.value.slice((currentPage.value-1)*itemsPerPage.value, currentPage.value*itemsPerPage.value));

const allActiveFilters = computed(() => {
const list = [];
    // Fix: Show categories in filter list regardless of isMultiSelect state
selectedCategoryIds.value.forEach(id => {
        const n = findNode(categories.value, id);
// 修复3：标签筛选行只显示最后一级知识点
        if(n && (!n.children || n.children.length === 0)) {
list.push({ type: 'cat', id: id, name: n.title }); 
}
    });
selectedTags.value.forEach(tag => { list.push({ type: 'tag', id: tag, name: tag }); });
return list;
});

watch([selectedType, selectedDiff, selectedTags, selectedCategoryIds], () => {
currentPage.value = 1;
loadQuestions();
}, { deep: true });

onMounted(async () => {
const subData = await getSubjects();
subjects.value = subData || [];
if(subjects.value.length) {
await loadCategories();
await loadQuestions();
}
window.addEventListener('keydown', handleKeyBasket);
window.addEventListener('click', handleGlobalClick);
});

onUnmounted(() => {
window.removeEventListener('keydown', handleKeyBasket);
window.removeEventListener('click', handleGlobalClick);
});

// --- Logic ---

// Toggle Expand All (Passed down via defaultOpen prop)
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

// Recursive helper to find path to a node
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

// pages/index/index.vue

const loadQuestions = async () => {
    if (!currentSubjectId.value) return;
    loading.value = true;
    
    // ... 构建 params 的代码保持不变 ...
    const params = { subjectId: currentSubjectId.value };
    if (selectedType.value !== '全部') params.type = selectedType.value;
    if (selectedDiff.value !== '全部') params.difficulty = selectedDiff.value;
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
        
        // ★★★ 核心修复：解析 options ★★★
        questions.value = (res.data || []).map(q => {
            let parsedOptions = q.options;
            
            // 如果后端返回的是字符串（JSON string），则手动解析
            if (typeof parsedOptions === 'string') {
                try {
                    parsedOptions = JSON.parse(parsedOptions);
                } catch (e) {
                    console.error('选项解析失败:', e);
                    parsedOptions = {}; // 解析失败则给空对象，防止报错
                }
            }
            
            // 如果是 null 或 undefined，初始化为空对象
            if (!parsedOptions) {
                parsedOptions = { A: '', B: '', C: '', D: '' };
            }

            return {
                ...q,
                options: parsedOptions, // 使用处理后的对象
                tags: q.tags || [],
                code: q.code || 'A' + q.id.toString().substr(-4)
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

const removeFilter = (item) => {
if (item.type === 'cat') selectedCategoryIds.value = selectedCategoryIds.value.filter(id => id !== item.id);
else selectedTags.value = selectedTags.value.filter(tag => tag !== item.name);
};

const clearAllFilters = () => { selectedCategoryIds.value = []; selectedTags.value = []; loadQuestions(); };

const selectSubject = (index) => { currentSubjectIdx.value = index; subjectDropdownOpen.value = false; reloadAll(); };
const reloadAll = () => { loadCategories(); loadQuestions(); };

const handleTreeSelect = (e, node) => {
// 修复2：任意级别可选；多选模式下非叶子节点变为单选（清空其他），只有叶子节点可以多选累加
    const id = node.id;
const isLeaf = !node.children || node.children.length === 0;

if(isMultiSelect.value) { 
if (isLeaf) {
// 如果点击的是叶子节点，支持多选
// 为了防止 “父节点+叶子节点” 混选（造成逻辑冲突），如果当前已选中有父节点，可以考虑清空或保留。
// 这里根据提示 “其他级别不能多选”，理解为非叶子节点互斥。
// 我们先剔除掉已选中的非叶子节点，保证当前全是叶子节点，方便多选
const leavesOnly = selectedCategoryIds.value.filter(sid => {
const n = findNode(categories.value, sid);
return n && (!n.children || n.children.length === 0);
});
// 如果有被剔除的（说明之前选了父节点），则重置为纯叶子列表（如果需要）
// 这里直接用 leavesOnly 继续操作即可
let newSelection = [...leavesOnly];
if(newSelection.includes(id)) {
newSelection = newSelection.filter(x => x !== id);
} else {
newSelection.push(id);
}
selectedCategoryIds.value = newSelection;
} else {
// 修改这里：多选模式下点击其他级别目录，提示禁止选择，且不清空已有选择
uni.showToast({title: '不能选择其他级别目录', icon: 'none'});
}
} else {
// 单选模式，任意节点可选
if(selectedCategoryIds.value.length === 1 && selectedCategoryIds.value[0] === id) {
selectedCategoryIds.value = [];
} else {
selectedCategoryIds.value = [id];
}
}
};

const changePage = (delta) => {
const newVal = currentPage.value + delta;
if(newVal >= 1 && newVal <= totalPages.value) currentPage.value = newVal;
};
const handlePageSizeChange = (e) => { itemsPerPage.value = [10,20,50][e.detail.value]; currentPage.value = 1; loadQuestions(); }

// --- New Features Logic ---

// 1. Subject Modal
const openSubjectModal = () => {
    // Deep copy to local state for editing
    subjectList.value = JSON.parse(JSON.stringify(subjects.value)).map(s => ({...s, checked: false}));
    showSubjectModal.value = true;
    manageMenuOpen.value = false;
};

const addSubjectRow = () => {
    subjectList.value.push({ id: 'new_' + Date.now(), title: '', checked: false });
};

const deleteSelectedSubjects = () => {
    subjectList.value = subjectList.value.filter(s => !s.checked);
};

const moveSubject = (dir) => {
    const list = subjectList.value;
    for (let i = 0; i < list.length; i++) {
        if (dir === 'up') {
            if (i > 0 && list[i].checked && !list[i-1].checked) {
                [list[i], list[i-1]] = [list[i-1], list[i]];
            }
        } else {
            // Down: iterate reverse
            const idx = list.length - 1 - i;
            if (idx < list.length - 1 && list[idx].checked && !list[idx+1].checked) {
                [list[idx], list[idx+1]] = [list[idx+1], list[idx]];
            }
        }
    }
};

const saveSubjects = async () => {
    // Call backend to save
    try {
        await uni.request({
            url: baseUrl + '/api/subjects/manage',
            method: 'POST',
            data: { action: 'update_list', list: subjectList.value }
        });
        showSubjectModal.value = false;

        // 1. 在更新列表前，先记录当前选中的科目ID
        // 因为 subjects 更新后，currentSubjectIdx 指向的可能是别的科目
        const lastSelectedId = currentSubjectId.value;

        // 2. 重新加载科目列表
        const subData = await getSubjects();
   subjects.value = subData || [];

        // 3. 尝试找回刚才选中的科目
        const newIdx = subjects.value.findIndex(s => s.id === lastSelectedId);
        if (newIdx !== -1) {
            currentSubjectIdx.value = newIdx;
        } else {
            // 如果刚才的科目被删了，重置为第一个
            currentSubjectIdx.value = 0;
        }

        // 4. 关键点：无论如何都触发一次重新加载，刷新左侧树状结构
        reloadAll();
        
        uni.showToast({title: '保存成功', icon: 'success'});
    } catch(e) {
        uni.showToast({title: '保存失败', icon: 'none'});
    }
};

// 2. Content Manage Modal
const openContentModal = async () => {
    manageTreeData.value = JSON.parse(JSON.stringify(categories.value));
    manageSelectedId.value = null;
    currentManageNode.value = null;
    currentChildrenList.value = [];
    
    // Load root nodes into currentChildrenList by default (as if "Root" is selected)
    currentChildrenList.value = JSON.parse(JSON.stringify(manageTreeData.value)).map(c => ({...c, checked: false}));
    
    showContentModal.value = true;
    manageMenuOpen.value = false;
};

const handleManageTreeSelect = (e, node) => {
    manageSelectedId.value = node.id;
    // Deep clone for editing
    currentManageNode.value = JSON.parse(JSON.stringify(node));
    currentChildrenList.value = (node.children || []).map(c => ({...c, checked: false}));
};

// Fix 1: Update local tree state instead of refreshing from server, preserving unsaved children list
const saveCurrentNodeInfo = async () => {
    if (!currentManageNode.value) return;
    try {
        await manageCategory({
            action: 'rename', // reused for basic update
            id: currentManageNode.value.id,
            title: currentManageNode.value.title
        });
        
        // Update Local Tree Data
        const nodeInTree = findNode(manageTreeData.value, currentManageNode.value.id);
        if(nodeInTree) {
            nodeInTree.title = currentManageNode.value.title;
            nodeInTree.color = currentManageNode.value.color;
        }
        
        uni.showToast({title:'已保存信息', icon:'success'});
        // DO NOT call refreshManageTree() here
    } catch(e) { uni.showToast({title:'保存失败', icon:'none'}); }
};

const deleteCurrentNode = async () => {
    if(!currentManageNode.value) return;
    uni.showModal({
        content: `确定删除 [${currentManageNode.value.title}] 及其所有子目录吗？`,
        success: async (res) => {
            if(res.confirm) {
                await manageCategory({ action: 'delete', id: currentManageNode.value.id });
                currentManageNode.value = null;
                currentChildrenList.value = []; // Reset
                refreshManageTree();
            }
        }
    });
};

const addManageChild = () => {
    currentChildrenList.value.push({ id: 'new_' + Date.now(), title: '', checked: false });
};

const deleteManageChildren = () => {
    currentChildrenList.value = currentChildrenList.value.filter(c => !c.checked);
};

const moveManageChild = (dir) => {
    const list = currentChildrenList.value;
    for (let i = 0; i < list.length; i++) {
        if (dir === 'up') {
            if (i > 0 && list[i].checked && !list[i-1].checked) {
                [list[i], list[i-1]] = [list[i-1], list[i]];
            }
        } else {
            const idx = list.length - 1 - i;
            if (idx < list.length - 1 && list[idx].checked && !list[idx+1].checked) {
                [list[idx], list[idx+1]] = [list[idx+1], list[idx]];
            }
        }
    }
};

const saveChildrenList = async () => {
    try {
        const parentId = currentManageNode.value ? currentManageNode.value.id : null;
        await manageCategory({
            action: 'update_list',
            subjectId: currentSubjectId.value,
            parentId: parentId,
            children: currentChildrenList.value
        });
        uni.showToast({title:'列表保存成功', icon:'success'});
        refreshManageTree();
    } catch(e) {
        uni.showToast({title:'保存失败', icon:'none'});
    }
};

const refreshManageTree = async () => {
    // Reload categories
    await loadCategories();
    // Update manageTreeData
    manageTreeData.value = JSON.parse(JSON.stringify(categories.value));
    
    // If a node was selected, re-select it to update view
    if (manageSelectedId.value) {
        const node = findNode(manageTreeData.value, manageSelectedId.value);
        if (node) {
            handleManageTreeSelect(null, node);
        } else {
            // Node might be deleted
            currentManageNode.value = null;
            // Show roots
            currentChildrenList.value = JSON.parse(JSON.stringify(manageTreeData.value)).map(c => ({...c, checked: false}));
        }
    } else {
        // Roots
        currentChildrenList.value = JSON.parse(JSON.stringify(manageTreeData.value)).map(c => ({...c, checked: false}));
    }
};

// Utils
const listSelectAll = (list) => list.forEach(i => i.checked = true);
const listInverseSelect = (list) => list.forEach(i => i.checked = !i.checked);

const handleGlobalClick = (e) => {
manageMenuOpen.value = false;
    subjectDropdownOpen.value = false;
if(e.target.tagName !== 'INPUT') {
kpSearchResults.value = [];
}
};

// Fix 3: Handle Search Expansion
const handleCatSearch = () => { 
    if(!catSearch.value) return;
    const keyword = catSearch.value;
    // Find leaves matching keyword
    const matchedLeaves = flatLeaves.value.filter(l => l.title.includes(keyword));
    
    if(matchedLeaves.length) {
        const ids = matchedLeaves.map(l => l.id);
        selectedCategoryIds.value = ids;

        // Calculate all parent IDs for expansion
        const parentsToExpand = new Set();
        matchedLeaves.forEach(leaf => {
            const path = findPathToNode(categories.value, leaf.id);
            if (path) {
                // Add all IDs in path except the leaf itself (although expanding leaf doesn't hurt)
                path.forEach(pid => parentsToExpand.add(pid));
            }
        });
        
        treeExpandedIds.value = Array.from(parentsToExpand);
        
    } else {
        uni.showToast({title:'未找到', icon:'none'});
    }
    
    loadQuestions(); 
};

const handleKpSearch = () => { if(!kpSearch.value) return kpSearchResults.value = []; const keyword = kpSearch.value.toLowerCase(); kpSearchResults.value = flatLeaves.value.filter(l => l.title.toLowerCase().includes(keyword)); };
const closeKpDropdown = () => kpSearchResults.value = [];
const handleSave = async () => { if(!formData.title) return uni.showToast({title:'请输入题干', icon:'none'}); const payload = { ...formData, subjectId: currentSubjectId.value }; if(isEditing.value) await updateQuestion(formData.id, payload); else await saveQuestion(payload); showAddModal.value = false; loadQuestions(); };
const handleDelete = async (id) => { uni.showModal({ content: '确定删除?', success: async (res) => { if(res.confirm) { await deleteQuestion(id); loadQuestions(); } } }); };
const openAddModal = () => { isEditing.value = false; Object.assign(formData, { id:'', year:'2023', source:'', difficulty:1, type:'单选题', title:'', image:'', answer:'', options:{A:'',B:'',C:'',D:''}, categoryIds:[], tags:[] }); kpSearch.value = ''; kpSearchResults.value = []; tagInput.value = ''; showAddModal.value = true; };
const openEditModal = (q) => {
    isEditing.value = true;
    // 使用 Object.assign 时，确保数组字段即使是 null 也被初始化为 []
    Object.assign(formData, {
        ...JSON.parse(JSON.stringify(q)),
        categoryIds: q.categoryIds || [], // 关键修复：防止为 null
        tags: q.tags || [],               // 关键修复：防止为 null
        options: q.options || { A: '', B: '', C: '', D: '' } // 防止 options 结构丢失
    });
    showAddModal.value = true;
};
const addCategory = (id) => !formData.categoryIds.includes(id) && formData.categoryIds.push(id);
const removeCategory = (id) => formData.categoryIds = formData.categoryIds.filter(x => x!==id);
const addTag = () => { if(tagInput.value) { formData.tags.push(tagInput.value); tagInput.value=''; } };
const removeTag = (idx) => formData.tags.splice(idx, 1);
const chooseImage = () => { uni.chooseImage({ count: 1, success: (res) => { uni.uploadFile({ url: baseUrl + '/api/upload', filePath: res.tempFilePaths[0], name: 'file', success: (upRes) => { const d = JSON.parse(upRes.data); if(d.url) formData.image = d.url; } }); } }); };
const toggleWaiting = (id) => waitingBasketKey.value = waitingBasketKey.value === id ? null : id;
const handleKeyBasket = (e) => { if(waitingBasketKey.value && e.key >= '1' && e.key <= '7') { const k = parseInt(e.key); const q = questions.value.find(x => x.id === waitingBasketKey.value); if(q && !baskets.value[k].find(x => x.id === q.id)) baskets.value[k].push(q); waitingBasketKey.value = null; } if(e.key === 'Escape') waitingBasketKey.value = null; };
const removeFromBasket = (bid, qid) => baskets.value[bid] = baskets.value[bid].filter(x => x.id !== qid);
const exportLatex = () => uni.showToast({title:'导出成功'});
const getKnowledgeTags = (ids) => ids.map(id => flatLeaves.value.find(l => l.id === id) || {id, title:id}).filter(x=>x);
const toggleAnswer = (id) => showAnswerMap.value[id] = !showAnswerMap.value[id];
</script>

<style lang="scss">
/* Reuse existing styles, add new ones */
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
.resource-sidebar { 
    flex: 1; 
    background: #F0F0F0; 
    border-radius: 4px; 
    display: flex; 
    flex-direction: column; 
    overflow: hidden; 
    
    /* ★ 新增：这里设置 15px，那么 顶部、中间、底部 之间的距离就都是 15px */
    gap: 10px; 
    /* 给整个大盒子上下也加点空隙，看起来不顶头 */
    padding-top: 15px;
}
.res-header { 
    padding: 0 12px; /* 只保留左右内边距 */
    /* border-bottom: 1px solid #F0F0F0;  <-- 删掉或注释掉这行，用 gap 代替分割线更清爽 */
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    flex-shrink: 0; /* 防止被挤压 */
}
.subject-wrapper { position: relative; width: 140px; }
.subject-btn { background: #dcfce7; color: #166534; padding: 5px 12px; border-radius: 6px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.custom-subject-dropdown { position: absolute; top: 100%; left: 0; width: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; margin-top: 4px; }
.sub-item { padding: 8px 12px; font-size: 13px; cursor: pointer; }
.sub-item:hover { background: #f8fafc; }
.sub-item.active { color: #166534; font-weight: bold; background: #f0fdf4; }

.setting-wrapper { position: relative; }
/* 自定义菜单按钮容器 */
.setting-btn.custom-menu-icon {
    display: flex;
    flex-direction: column; /* 垂直排列 */
    justify-content: center; /* 垂直居中 */
    align-items: center;   /* ★ 靠右对齐，或者 center 居中，看你喜好 */
    
    width: 30px;  /* 按钮点击热区宽度 */
    height: 30px; /* 按钮点击热区高度 */
    cursor: pointer;
    border-radius: 4px;
    
    /* ★ 核心：这里控制三条线之间的间距 */
    gap: 4px; 
}

/* 鼠标放上去的背景色 */
.setting-btn.custom-menu-icon:hover {
    background-color: #e2e8f0;
}

/* 画每一条横线 */
.menu-line {
    /* ★ 核心：这里控制线的长度，想短一点就把 18px 改小 */
    width: 16px; 
    
    /* 线的高度（粗细） */
    height: 2px; 
    
    /* 线的颜色 */
    background-color: #94a3b8; 
    border-radius: 2px;
}

/* 如果你想让激活状态变色 */
.setting-wrapper:hover .menu-line {
    background-color: #2563eb;
}
.setting-btn.active { background-color: #dbeafe; color: #2563eb; }
.popover-menu { position: absolute; top: 100%; right: 0; margin-top: 2px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; border-radius: 6px; width: 110px; text-align: center;}
.menu-item { padding: 8px 12px; font-size: 13px; cursor: pointer; &:hover { background: #f8fafc; } }
.menu-item.header { font-weight: bold; color: #94a3b8; font-size: 12px; border-bottom: 1px solid #eee; }
.divider-h { height: 1px; background: #f1f5f9; margin: 4px 0; }

.search-bar-row { 
    display: flex; 
    align-items: center; 
    padding: 0 12px; /* ★ 修改：去掉了原来的 bottom 10px */
    gap: 8px; 
    flex-shrink: 0; /* 防止被挤压 */
}
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
.tree-scroll { 
    flex: 1; 
    /* 核心修改开始 */
    width: 100%;             /* 强制宽度占满父容器 */
    overflow-y: auto; 
    box-sizing: border-box;  /* 包含 padding 在宽度内，防止撑开 */
    white-space: nowrap;     /* 防止内容换行导致的布局错乱（可选，视你的树组件内部实现而定）*/
    /* 核心修改结束 */
    
    padding: 0 4px 10px 13px; 
}
/* 1. 设置滚动条整体宽度 */
.tree-scroll::-webkit-scrollbar {
	-webkit-appearance: none;
    width: 4px;  /* 纵向滚动条的宽度 */
    height: 6px; /* 横向滚动条的高度 */
}

/* 2. 设置滚动条滑块（中间移动的那部分）的样式 */
.tree-scroll::-webkit-scrollbar-thumb {
    background-color: #cbd5e1; /* 颜色：使用淡灰色，不要太抢眼 */
    border-radius: 3px;        /* 圆角：让两端变圆 */
}

/* 3. 设置滑块悬停时的样式（可选，提升交互感） */
.tree-scroll::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8; /* 鼠标放上去变深一点 */
}

/* 4. 设置滚动条轨道（背景）的样式 */
.tree-scroll::-webkit-scrollbar-track {
    background: transparent; /* 背景透明，看起来更简洁 */
    /* 或者 background: #f1f5f9; 如果你想要浅色背景 */
}
.content-canvas { flex: 1; background: #f8fafc; display: flex; flex-direction: column; min-width: 0; height: 100%; overflow: hidden; }
.filter-bar { background: white; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
.f-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.f-label { font-weight: bold; color: #64748b; width: 40px; }
.f-tags { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; }
.tag { padding: 4px 12px; border-radius: 15px; border: 1px solid #e2e8f0; cursor: pointer; color: #64748b; }
.tag.active { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
.tag-chip { font-size: 12px; padding: 2px 8px; border-radius: 12px; display: flex; align-items: center; gap: 4px; }
.tag-chip.blue { background: #dbeafe; color: #1e40af; }
.tag-chip.white { background: white; border: 1px solid #e2e8f0; }
.x-btn { cursor: pointer; font-weight: bold; }
.clear-link { font-size: 12px; color: #94a3b8; text-decoration: underline; cursor: pointer; margin-left: auto; }
.list-scroll { flex: 1; padding: 20px; box-sizing: border-box; overflow-y: hidden; height: 0; }
.state-txt { text-align: center; margin-top: 50px; color: #94a3b8; }
.q-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.q-header { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 10px; }
.meta-left text { margin-right: 8px; }
.m-type { color: #2563eb; font-weight: bold; }
.m-diff { color: #f59e0b; }
.op-btn { margin-left: 10px; cursor: pointer; font-weight: bold; }
.op-btn.blue { color: #2563eb; }
.op-btn.red { color: #ef4444; }
.q-body { cursor: pointer; }
.body-row { display: flex; margin-bottom: 10px; }
.q-title { flex: 1; font-size: 15px; line-height: 1.6; color: #1e293b; }
.q-img { width: 120px; height: 80px; border: 1px solid #eee; margin-left: 10px; }
.opt-grid { display: grid; gap: 8px; font-size: 14px; margin-bottom: 10px; color: #334155; }
.cols-1 { grid-template-columns: 1fr; }
.cols-2 { grid-template-columns: 1fr 1fr; }
.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
.opt-key { font-weight: bold; margin-right: 5px; }
.answer-box { background: #f0f9ff; padding: 10px; border-radius: 4px; border: 1px dashed #bae6fd; font-size: 14px; color: #0c4a6e; }
.ans-label { font-weight: bold; margin-right: 5px; }
.q-footer { border-top: 1px solid #f1f5f9; margin-top: 10px; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.tags-row { display: flex; gap: 8px; align-items: center; }
.tag-badge { font-size: 11px; background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; cursor: pointer; }
.hash-code { font-family: monospace; color: #cbd5e1; font-size: 11px; }
.basket-add-btn { width: 28px; height: 28px; border: 1px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; }
.basket-add-btn.waiting { background: #2563eb; color: white; border-color: #2563eb; animation: pulse 1s infinite; }
.right-toolbar { width: 80px; background: #f8fafc; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; padding: 20px 0; flex-shrink: 0; }
.tool-head { font-size: 12px; font-weight: bold; color: #94a3b8; margin-bottom: 10px; }
.tool-btn { width: 48px; height: 48px; border-radius: 12px; background: white; border: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 10px; cursor: pointer; }
.tool-btn.primary { background: #eff6ff; color: #2563eb; border: none; }
.t-icon { font-size: 18px; margin-bottom: 2px; }
.t-lbl { font-size: 10px; }
.divider { width: 40px; height: 1px; background: #e2e8f0; margin: 10px 0 20px; }
.basket-col { display: flex; flex-direction: column; gap: 8px; }
.basket-circle { width: 40px; height: 40px; border-radius: 50%; background: white; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; color: #64748b; font-weight: bold; }
.basket-circle:hover { border-color: #2563eb; color: #2563eb; }
.badge { position: absolute; top: -2px; right: -2px; background: #ef4444; color: white; font-size: 9px; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

/* Modal List Editor Styles */
.list-editor { display: flex; flex-direction: column; height: 400px; }
.list-editor.flat { height: 100%; border: 1px solid #e2e8f0; border-radius: 4px; }
.le-toolbar { display: flex; gap: 8px; padding-bottom: 10px; align-items: center; }
.le-toolbar.sm { padding: 8px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.tb-btn { padding: 4px 8px; background: #f1f5f9; border-radius: 4px; font-size: 12px; cursor: pointer; border: 1px solid #e2e8f0; }
.tb-btn:hover { background: #e2e8f0; }
.tb-btn.red { color: #ef4444; }
.tb-divider { width: 1px; height: 16px; background: #cbd5e1; margin: 0 4px; }
.le-header { display: flex; background: #f1f5f9; padding: 8px 10px; font-weight: bold; font-size: 12px; color: #64748b; border-radius: 4px 4px 0 0; }
.le-body { flex: 1; border: 1px solid #e2e8f0; border-top: none; overflow-y: hidden; background: white; }
.le-row { display: flex; align-items: center; padding: 8px 10px; border-bottom: 1px solid #f8fafc; cursor: pointer; }
.le-row:hover { background: #f8fafc; }
.le-row.checked { background: #eff6ff; }
.col-chk { width: 30px; text-align: center; }
.chk-icon { color: #2563eb; font-weight: bold; }
.col-title { flex: 1; }
.col-input { flex: 1; font-size: 13px; padding: 4px; border: 1px solid transparent; background: transparent; }
.col-input:focus { background: white; border-color: #bfdbfe; }
.col-color-dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; border: 1px solid rgba(0,0,0,0.1); }
.h-300 { height: 300px; }

/* Content Manage Layout */
.content-manage-layout { display: flex; height: 500px; gap: 16px; }
.cm-left { width: 260px; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; flex-direction: column; background: #f8fafc; }
.cm-tree-scroll { flex: 1; padding: 10px; overflow-y: hidden; }
.empty-tip { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px; }
.cm-right { flex: 1; display: flex; flex-direction: column; }
.cm-box { background: white; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }
.box-title { background: #f1f5f9; padding: 8px 12px; font-weight: bold; font-size: 13px; color: #475569; border-bottom: 1px solid #e2e8f0; }
.box-body { padding: 12px; }
.center-txt { text-align: center; color: #94a3b8; font-size: 13px; margin-top: 10px; }
.form-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.color-opts { display: flex; gap: 8px; }
.c-circle { width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
.c-circle:hover { transform: scale(1.1); }
.c-circle.active { border-color: #333; box-shadow: 0 0 0 2px white inset; }
.c-circle.remove { border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; }
.row-end { display: flex; justify-content: flex-end; }
.btn.sm { padding: 4px 12px; font-size: 12px; }

/* Reuse form styles */
.form-layout { font-size: 14px; color: #334155; }
.row-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.f-item { display: flex; flex-direction: column; }
.lbl { font-weight: bold; margin-bottom: 5px; font-size: 12px; }
.inp { border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; font-size: 13px; }
.inp-noborder { flex: 1; font-size: 13px; }
.picker-view { border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; background: white; }
.row-flex { display: flex; gap: 10px; }
.w-30 { width: 30%; } .w-10 { width: 10%; } .flex-1 { flex: 1; } .center { align-items: center; } .justify-end { justify-content: flex-end; } .pb-1 { padding-bottom: 4px; }
.icon-btn { font-size: 20px; cursor: pointer; }
.tags-input-area { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; align-items: center; }
.add-txt { color: #2563eb; font-size: 12px; cursor: pointer; }
.txt-area { border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; width: 100%; box-sizing: border-box; font-size: 13px; }
.h-24 { height: 96px; } .h-20 { height: 80px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.row-ac { display: flex; align-items: center; }
.row-btw { display: flex; justify-content: space-between; align-items: center; }
.bold { font-weight: bold; } .mr-1 { margin-right: 5px; } .mb-1 { margin-bottom: 5px; } .mt-2 { margin-top: 10px; } .ml-2 { margin-left: 10px; } .rel { position: relative; }
.sm-txt { font-size: 11px; color: #64748b; } .blue { color: #2563eb; }
.dropdown { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-height: 150px; overflow-y: hidden; z-index: 50; }
.dd-item { padding: 8px; font-size: 12px; cursor: pointer; border-bottom: 1px solid #f8fafc; display: flex; justify-content: space-between; }
.dd-item:hover { background: #eff6ff; }
.dd-col { display: flex; flex-direction: column; }
.dd-path { font-size: 10px; color: #94a3b8; margin-top: 2px; }
.chk { color: #2563eb; font-weight: bold; }
.foot-btns { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 10px; border-top: 1px solid #f1f5f9; }
.btn { padding: 6px 20px; border-radius: 4px; font-size: 13px; background: #f1f5f9; color: #64748b; border: none; cursor: pointer; }
.btn.primary { background: #2563eb; color: white; }
.btn.full { width: 100%; }
.upload-zone { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 30px; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
.upload-zone:hover { border-color: #2563eb; background: #eff6ff; }
.cam-icon { font-size: 30px; margin-bottom: 10px; }
.prev-img-lg { height: 100px; margin-top: 10px; }
.basket-scroll { max-height: 60vh; }
.basket-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
.trunc { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 90%; }
.del-x { color: #ef4444; cursor: pointer; font-weight: bold; }
.link-btn { color: #2563eb; font-size: 12px; cursor: pointer; }
.whiteboard-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
/* 1. 确保父容器开启 Flex 顶部对齐 */
.opt-item {
    display: flex;
    align-items: flex-start; /* 顶部对齐 */
    margin-bottom: 8px;
}

/* 2. 修改选项标签样式，使其参数与 LatexText 保持一致 */
.opt-key {
    /* 必须与 LatexText.vue 中的设置一致 */
    font-size: 16px;   
    line-height: 1.8;  
    
    font-weight: bold;
    margin-right: 6px;
    flex-shrink: 0; /* 防止被挤压 */
    
    margin-top: 3px; 
}

/* 如果 LatexText 组件支持透传 class，或者你可以直接控制它 */
/* 这里假设我们通过父级控制 LatexText 的容器 */
.opt-item :deep(.latex-text-container) {
  flex: 1;                 /* 让内容占据剩余宽度 */
  width: auto;             /* 覆盖原本可能设置的 width: 100% */
}
</style>