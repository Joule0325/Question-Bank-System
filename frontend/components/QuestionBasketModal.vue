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
                
                <view v-for="(q, idx) in groupList" :key="q.id" class="mini-card">
                    <view class="mc-top">
                        <text class="mc-idx">#{{ idx + 1 }}</text>
                        <text class="mc-del" @click="$emit('remove', q.id)">✕ 移出</text>
                    </view>
                    
                    <view class="mc-content" @click="toggleAnswer(q.id)">
                        <view v-if="q.image && q.imgPosCode.startsWith('u')" class="mc-img" :class="q.imgAlign">
                            <image :src="q.image" mode="widthFix" />
                        </view>
                        
                        <view class="mc-text"><LatexText :text="q.title" /></view>
                        
                        <view v-if="q.image && q.imgPosCode.startsWith('m')" class="mc-img" :class="q.imgAlign">
                            <image :src="q.image" mode="widthFix" />
                        </view>
                        
                        <view v-if="q.subQuestions && q.subQuestions.length > 0" class="mc-sub-list">
                            <view v-for="(subQ, sIdx) in q.subQuestions" :key="sIdx" class="mc-sub-item">
                                <view class="mc-sub-text">
                                    <LatexText :text="subQ.content" />
                                </view>
                                
                                <view v-if="subQ.options && Object.keys(subQ.options).length > 0" 
                                      class="mc-opts mt-1" 
                                      :style="'grid-template-columns: repeat('+(subQ.optionLayout||4)+',1fr)'">
                                    <view v-for="(val, k) in subQ.options" :key="k" class="mc-opt-item">
                                        <text class="b">{{k}}.</text><LatexText :text="val" />
                                    </view>
                                </view>

                                <view v-if="showAnswerMap[q.id] && subQ.answer" class="mc-sub-ans">
                                    <text class="tag">小题答案</text>
                                    <LatexText :text="subQ.answer" />
                                </view>
                            </view>
                        </view>

                        <view v-else-if="q.options && typeof q.options === 'object'" class="mc-opts" :style="'grid-template-columns: repeat('+(q.optionLayout||4)+',1fr)'">
                            <view v-for="(val, k) in q.options" :key="k" class="mc-opt-item">
                                <text class="b">{{k}}.</text><LatexText :text="val" />
                            </view>
                        </view>

                        <view v-if="q.image && q.imgPosCode.startsWith('b')" class="mc-img" :class="q.imgAlign">
                            <image :src="q.image" mode="widthFix" />
                        </view>
                        <view v-if="q.image && q.imgPosCode === 'r'" class="mc-img center">
                            <image :src="q.image" mode="widthFix" />
                        </view>

                        <view v-if="showAnswerMap[q.id]" class="mc-ans-box">
                             <view v-if="q.answer" class="mb-1"><text class="tag">参考答案</text><LatexText :text="q.answer"/></view>
                             <view v-if="q.analysis" class="mb-1"><text class="tag orange">解析</text><LatexText :text="q.analysis"/></view>
                             <view v-if="q.detailed"><text class="tag green">详解</text><LatexText :text="q.detailed"/></view>
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
</script>

<style lang="scss" scoped>
/* 遮罩 */
.drawer-mask {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.4); z-index: 999;
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

.mini-card { background: white; border-radius: 6px; padding: 12px; margin-bottom: 10px;margin-right: 18px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.mc-top { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; border-bottom: 1px dashed #f1f5f9; padding-bottom: 5px; }
.mc-idx { font-weight: bold; color: #94a3b8; }
.mc-del { color: #ef4444; cursor: pointer; }
.mc-content { cursor: pointer; }
.mc-text { font-size: 14px; line-height: 1.5; color: #1e293b; }
.mc-img { margin: 5px 0; display: flex; }
.mc-img.center { justify-content: center; }
.mc-img image { max-width: 100%; border-radius: 4px; border: 1px solid #eee; }
.mc-opts { display: grid; gap: 8px; margin-top: 8px; font-size: 14px; color: #334155; }
.mc-opt-item { display: flex; align-items: center; }
.mc-opt-item .b { font-weight: bold; margin-right: 4px; }
.mc-ans-box { margin-top: 10px; padding: 10px; background: #f0f9ff; border-radius: 4px; font-size: 13px; color: #0c4a6e; }
.mb-1 { margin-bottom: 5px; }
.tag { display: inline-block; background: #2563eb; color: white; font-size: 10px; padding: 1px 4px; border-radius: 3px; margin-right: 5px; }
.tag.orange { background: #f59e0b; }
.tag.green { background: #10b981; }

/* 新增：子题目样式 */
.mc-sub-list { margin-top: 10px; border-top: 1px dashed #eee; padding-top: 8px; }
.mc-sub-item { margin-bottom: 12px; }
.mc-sub-text { font-size: 13px; color: #334155; display: flex; gap: 4px; }
.sub-idx { font-weight: bold; flex-shrink: 0; }
.mc-sub-ans { margin-top: 5px; font-size: 12px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; color: #64748b; }
.mt-1 { margin-top: 4px; }

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