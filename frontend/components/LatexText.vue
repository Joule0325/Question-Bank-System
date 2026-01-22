<template>
  <view class="latex-text-container">
    <mp-html 
      :content="processedContent" 
      :selectable="true" 
      class="mp-html-box"
    />
  </view>
</template>

<script setup>
import { computed } from 'vue';
// UniApp 默认开启 easycom，通常不需要手动 import mpHtml from '@/components/mp-html/mp-html.vue'

const props = defineProps({
  text: {
    type: [String, Number],
    default: ''
  }
});

const processedContent = computed(() => {
  if (!props.text) return '';
  let content = String(props.text);

  // 1. 处理换行：将文本域中的回车 \n 换成 HTML 的换行标签 <br/>
  content = content.replace(/\n/g, '<br/>');

  // 2. 这里的 content 直接包含 $E=mc^2$ 即可，
  // mp-html 的 latex 插件会自动识别 $ 符号并渲染
  return content;
});
</script>

<style scoped>
.latex-text-container {
  width: 100%;
  /* 1. 确保容器的基础字体大小与外部一致 (例如 14px 或 15px) */
  font-size: 16px; 
  color: #334155;
  line-height: 1.8;
}

/* 2. 使用深度选择器精准控制公式大小 */
:deep(.katex) {
  /* 设置为 1em 即代表“和当前文字一样大” */
  font-size: 1em !important; 
  
  vertical-align: -1px !important;
  
  /* 如果觉得 1em 看起来还是偏小（因为数学字体通常显得比较细），
     可以微调成 1.1em 或 1.2em */
  /* font-size: 1.1em !important; */
}
</style>