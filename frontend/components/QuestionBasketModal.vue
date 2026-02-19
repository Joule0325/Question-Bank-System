<template>
  <view class="drawer-mask" v-if="isOpen" @click="close">
    <view class="drawer-content" @click.stop>
      
      <view class="drawer-header">
        <text class="dh-title">试题栏预览</text>
        <view class="dh-controls">
          <view class="basket-select-wrap">
            <text class="bs-label">当前：</text>
            <view class="bs-picker-trigger">
                <picker 
                    mode="selector" 
                    :range="[1,2,3,4,5,6,7]" 
                    :value="(currentBasketId || 1) - 1"
                    @change="handleBasketChange"
                >
                    <text class="bs-val">试题篮 {{ currentBasketId }} ▾</text>
                </picker>
            </view>
          </view>
          <view class="dh-btn clear" @click="handleClear">清空该试题栏</view>
        </view>
      </view>

      <scroll-view scroll-y class="drawer-body">
        <view v-if="!currentList || currentList.length === 0" class="empty-tip">
           <text>当前试题篮为空</text>
        </view>

        <view v-else>
            <view v-for="(groupList, groupName) in groupedQuestions" :key="groupName" class="q-group">
                <view class="group-label">{{ groupName }} ({{ groupList.length }})</view>
                
                <view v-for="(q, idx) in groupList" :key="q.id" class="q-card">
                    <view class="q-header">
                        <text class="mc-idx">#{{ idx + 1 }}</text>
                        <text class="mc-del" @click="$emit('remove', q.id)">✕ 移出</text>
                    </view>
                    
                    <view class="q-body" @click="toggleAnswer(q.id)">
                        <view class="content-wrapper" :style="dynamicFontStyle">
                            <view v-if="q.image && q.imgPosCode.startsWith('u')" class="img-container" :class="'align-'+(q.imgAlign||'center')">
                                <image :src="q.image" mode="widthFix" class="q-image" />
                            </view>
                            
                            <view class="q-title"><LatexText :text="q.title" /></view>
                            
                            <view v-if="q.image && q.imgPosCode.startsWith('m')" class="img-container" :class="'align-'+(q.imgAlign||'center')">
                                <image :src="q.image" mode="widthFix" class="q-image" />
                            </view>
                            
                            <view v-if="q.subQuestions && q.subQuestions.length > 0" class="sub-q-list-view">
                                <view v-for="(subQ, sIdx) in q.subQuestions" :key="sIdx" class="sub-q-row">
                                    <view class="sub-q-txt">
                                        <text class="sub-idx">{{ formatSubIndex(sIdx + 1) }}</text>
                                        <view style="flex:1;"><LatexText :text="subQ.content" /></view>
                                    </view>
                                    
                                    <view v-if="subQ.options && Object.keys(subQ.options).length > 0" 
                                          class="opt-grid mt-2 sub-indent" 
                                          :style="'grid-template-columns: repeat('+(subQ.optionLayout||4)+',1fr)'">
                                        <view v-for="(val, k) in subQ.options" :key="k" class="opt-item" :style="{ marginTop: globalConfig.optionMargin + 'px' }">
                                            <text class="opt-key">{{ formatOptionLabel(k) }}</text>
                                            <view class="opt-val"><LatexText :text="val" /></view>
                                        </view>
                                    </view>

                                    <view v-if="showAnswerMap[q.id] && subQ.answer" class="sub-q-ans-box">
                                        <text class="ans-label">小题答案</text>
                                        <LatexText :text="subQ.answer" />
                                    </view>
                                </view>
                            </view>

                            <view v-else-if="q.options && typeof q.options === 'object'" class="opt-grid" :style="'grid-template-columns: repeat('+(q.optionLayout||4)+',1fr)'">
                                <view v-for="(val, k) in q.options" :key="k" class="opt-item" :style="{ marginTop: globalConfig.optionMargin + 'px' }">
                                    <text class="opt-key">{{ formatOptionLabel(k) }}</text>
                                    <view class="opt-val"><LatexText :text="val" /></view>
                                </view>
                            </view>

                            <view v-if="q.image && q.imgPosCode.startsWith('b')" class="img-container" :class="'align-'+(q.imgAlign||'center')">
                                <image :src="q.image" mode="widthFix" class="q-image" />
                            </view>
                            <view v-if="q.image && q.imgPosCode === 'r'" class="img-container align-center">
                                <image :src="q.image" mode="widthFix" class="q-image" />
                            </view>

                            <view v-if="showAnswerMap[q.id]" class="answer-box mt-2">
                                 <view v-if="q.answer" class="ans-block"><view class="ans-tag answer">答案</view><view class="ans-content" :style="dynamicFontStyle"><LatexText :text="q.answer"/></view></view>
                                 <view v-if="q.analysis" class="ans-block"><view class="ans-tag analysis">解析</view><view class="ans-content" :style="dynamicFontStyle"><LatexText :text="q.analysis"/></view></view>
                                 <view v-if="q.detailed" class="ans-block"><view class="ans-tag detailed">详解</view><view class="ans-content" :style="dynamicFontStyle"><LatexText :text="q.detailed"/></view></view>
                            </view>
                        </view>
                    </view>
                </view>
            </view>
        </view>
      </scroll-view>

      <view class="drawer-footer">
        <view class="df-left">
            <text class="df-label">排序方式:</text>
            <picker mode="selector" :range="sortOptions" :value="sortOptions.indexOf(currentSortMode)" @change="handleSortChange">
                <view class="sort-select">{{ currentSortMode }} ▴</view>
            </picker>
        </view>
        <view class="df-right">
            <view class="export-btn pdf" @click="$emit('export-pdf')">导出 PDF</view>
            <view class="export-btn word" @click="$emit('export-word')">导出 Word</view>
        </view>
      </view>

    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import LatexText from './LatexText.vue';
import { globalConfig, formatOptionLabel, formatSubIndex } from '@/utils/configStore.js';

const props = defineProps({
  isOpen: Boolean,
  basketId: [Number, String], // 当前选中的ID
  baskets: Object,            // 所有的试题篮数据 {1:[], 2:[], ...}
  knowledgeList: Array        // 用于把知识点ID转为名称
});

const emit = defineEmits(['close', 'update:basketId', 'clear', 'remove', 'export-pdf', 'export-word']);

const showAnswerMap = ref({});
const sortOptions = ['按题型排序', '按难度排序', '按知识点排序', '按年份排序', '按地区排序'];
const currentSortMode = ref('按题型排序');

const currentBasketId = computed(() => props.basketId ? parseInt(props.basketId) : 1);

// 获取当前篮子的题目列表
const currentList = computed(() => {
    if (!props.baskets || !props.basketId) return [];
    return props.baskets[props.basketId] || [];
});

// 核心：分组逻辑
const groupedQuestions = computed(() => {
    const list = currentList.value;
    const groups = {};
    const mode = currentSortMode.value;

    list.forEach(q => {
        let key = '其他';
        
        if (mode === '按题型排序') {
            key = q.type || '未分类';
        } 
        else if (mode === '按难度排序') {
            key = '难度 ' + (q.difficulty || '?') + '星';
        } 
        else if (mode === '按年份排序') {
            key = q.year ? q.year + '年' : '未知年份';
        } 
        else if (mode === '按地区排序') {
            key = q.province || '未知地区';
        } 
        else if (mode === '按知识点排序') {
            if (q.categoryIds && q.categoryIds.length > 0 && props.knowledgeList) {
                // 尝试匹配第一个知识点ID对应的名称
                // 注意：categoryIds 可能是字符串 "1,2,3" 也可能是数组
                let firstId = Array.isArray(q.categoryIds) ? q.categoryIds[0] : q.categoryIds.toString().split(',')[0];
                const tag = props.knowledgeList.find(k => k.id == firstId); // 使用 == 兼容字符串/数字
                key = tag ? tag.title : '未知知识点';
            } else {
                key = '无知识点';
            }
        }

        if (!groups[key]) groups[key] = [];
        groups[key].push(q);
    });
    
    // 如果需要对Key排序（例如年份倒序），可以在这里处理groups的顺序，目前保持插入顺序
    return groups;
});

const close = () => emit('close');
const toggleAnswer = (id) => showAnswerMap.value[id] = !showAnswerMap.value[id];

const handleBasketChange = (e) => {
    const newId = parseInt(e.detail.value) + 1;
    emit('update:basketId', newId);
};

const handleSortChange = (e) => {
    currentSortMode.value = sortOptions[e.detail.value];
};

const handleClear = () => {
    uni.showModal({
        title: '提示',
        content: `确定清空试题篮 ${currentBasketId.value} 吗？`,
        success: (res) => {
            if (res.confirm) emit('clear', currentBasketId.value);
        }
    });
};

const dynamicFontStyle = computed(() => {
  return {
    fontSize: `${globalConfig.fontSize}px`,
    lineHeight: globalConfig.lineHeight
  };
});
</script>

<style lang="scss" scoped>
/* 遮罩 */
.drawer-mask {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.4); z-index: 899;
    display: flex; justify-content: flex-end;
}
/* 抽屉主体 */
.drawer-content {
    width: 800px; height: 100%; background: white;
    display: flex; flex-direction: column;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    animation: slideIn 0.3s ease-out;
}
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

/* 头部 */
.drawer-header {
    height: 60px; border-bottom: 1px solid #e2e8f0;
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 20px; flex-shrink: 0; background: #f8fafc;
}
.dh-title { font-size: 18px; font-weight: bold; color: #1e293b; }
.dh-controls { display: flex; gap: 15px; align-items: center; }
.basket-select-wrap { display: flex; align-items: center; font-size: 14px; }
.bs-label { color: #64748b; }
.bs-picker-trigger { cursor: pointer; background: white; padding: 4px 10px; border: 1px solid #cbd5e1; border-radius: 4px; }
.bs-val { color: #2563eb; font-weight: bold; }
.dh-btn.clear { 
    font-size: 13px; color: #ef4444; cursor: pointer; 
    padding: 4px 12px; background: white; border: 1px solid #fecaca; border-radius: 4px; 
    transition: background 0.2s;
}
.dh-btn.clear:hover { background: #fef2f2; }

/* 中间内容 */
.drawer-body { flex: 1; background: #f1f5f9; padding: 15px; box-sizing: border-box; overflow-y: auto; }
.empty-tip { height: 100%; display: flex; justify-content: center; align-items: center; color: #94a3b8; }

.q-group { margin-bottom: 20px; }
.group-label { 
    font-size: 14px; font-weight: bold; color: #334155; 
    padding-left: 10px; border-left: 4px solid #2563eb; margin-bottom: 10px; 
}

/* Question Card Styles - Standardized */
.q-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; margin-right: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.q-header { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; border-bottom: 1px dashed #f1f5f9; padding-bottom: 5px; }
.mc-idx { font-weight: bold; color: #94a3b8; }
.mc-del { color: #ef4444; cursor: pointer; }
.q-body { cursor: pointer; color: #1e293b; }
.q-title { margin-bottom: 8px; line-height: 1.6; }

.img-container { margin: 10px 0; display: flex; width: 100%; }
.img-container.align-left { justify-content: flex-start; }
.img-container.align-center { justify-content: center; }
.img-container.align-right { justify-content: flex-end; }
.q-image { max-width: 100%; border-radius: 4px; border: 1px solid #eee; }

.opt-grid { display: grid; gap: 8px; margin-top: 8px; color: #334155; }
.opt-item { display: flex; align-items: baseline; }
.opt-key { font-weight: bold; margin-right: 5px; flex-shrink: 0; }
.opt-val { flex: 1; word-break: break-all; }
.opt-item :deep(.latex-text-container) { flex: 1; width: auto; }

.sub-q-list-view { margin-top: 10px; border-top: 1px dashed #eee; padding-top: 8px; }
.sub-q-row { margin-bottom: 12px; }
.sub-q-txt { display: flex; align-items: baseline; gap: 4px; color: #334155; }
.sub-idx { font-weight: bold; margin-right: 5px; flex-shrink: 0; }
.sub-indent { margin-left: 22px; }
.sub-q-ans-box { margin-top: 5px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; color: #64748b; }
.ans-label { font-weight: bold; color: #2563eb; margin-right: 4px; }

.mt-2 { margin-top: 8px; }

/* Answer Box Styles */
.answer-box { background: #f0f9ff; padding: 12px 15px; border-radius: 6px; border: 1px dashed #bae6fd; color: #0c4a6e; margin-top: 10px; }
.ans-block { margin-bottom: 0.8em; display: flex; align-items: baseline; }
.ans-block:last-child { margin-bottom: 0; }
.ans-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 0.9em; font-weight: bold; margin-right: 8px; flex-shrink: 0; line-height: 1.2 !important; }
.ans-tag.answer { background-color: #2563eb; } 
.ans-tag.analysis { background-color: #f59e0b; } 
.ans-tag.detailed { background-color: #10b981; } 
.ans-content { color: #334155; flex: 1; }

/* 底部 */
.drawer-footer {
    height: 60px; border-top: 1px solid #e2e8f0; background: white;
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 20px; flex-shrink: 0;
}
.df-left { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #64748b; }
.sort-select { color: #0f172a; font-weight: bold; cursor: pointer; border: 1px solid #e2e8f0; padding: 5px 10px; border-radius: 4px; min-width: 100px; text-align: center; }
.df-right { display: flex; gap: 12px; }
.export-btn { 
    padding: 6px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: bold; color: white; 
    transition: opacity 0.2s;
}
.export-btn:active { opacity: 0.8; }
.export-btn.pdf { background: #ef4444; } /* Red for PDF */
.export-btn.word { background: #2563eb; } /* Blue for Word */
</style>