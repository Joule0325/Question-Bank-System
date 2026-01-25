<template>
  <view class="latex-text-container">
    <mp-html :content="htmlContent" :copy-link="false" />
  </view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  text: {
    type: String,
    default: ''
  }
});

const processText = (raw) => {
  if (!raw) return '';
  let content = raw;

  // --- 1. 解析 Markdown 表格 ---
  content = content.replace(/((?:^\|.*\|\r?\n?)+)/gm, (match) => {
    const rows = match.trim().split(/\r?\n/);
    if (rows.length < 2) return match;

    let html = '<div class="table-wrapper"><table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse; width:auto; max-width:100%; border:1px solid #e2e8f0; margin:10px 0;">';
    
    let hasHeader = false;
    if (rows.length >= 2 && rows[1].includes('---')) {
      hasHeader = true;
    }

    rows.forEach((row, index) => {
      if (hasHeader && index === 1) return;

      let rowContent = row.trim().replace(/^\||\|$/g, '');
      const cols = rowContent.split('|');
      
      html += '<tr>';
      cols.forEach(col => {
        const cellTag = (hasHeader && index === 0) ? 'th' : 'td';
        const bgStyle = (cellTag === 'th') ? 'background-color:#f1f5f9; font-weight:bold;' : '';
        html += `<${cellTag} style="border:1px solid #cbd5e1; padding:6px 10px; text-align:center; min-width:40px; ${bgStyle}">${col.trim()}</${cellTag}>`;
      });
      html += '</tr>';
    });
    html += '</table></div>';
    return html;
  });

  // --- 2. 解析图片占位符 [img:CONTENT] ---
  content = content.replace(/\[img:([^\]]+)\]/g, (match, innerContent) => {
    if (!innerContent) return '';
    
    const parts = innerContent.split(':');
    
    let width = null;
    let align = null; // l, m, r
    
    if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
        width = parts.pop();
    }

    if (parts.length > 1 && /^[lmr]$/.test(parts[parts.length - 1])) {
        align = parts.pop();
    }

    const src = parts.join(':');

    if (!src) return '';

    const widthVal = width ? `${width}%` : 'auto'; 
    // 重点：vertical-align: middle 让图片与同行文字垂直居中
    // margin-bottom: 2px 微调基线，防止图片显得偏高
    let baseStyle = `max-width:100%; height:auto; vertical-align: middle; margin: 0 4px; border-radius: 4px;`;
    
    if (width) {
        baseStyle += `width:${widthVal};`;
    }

    // --- 对齐逻辑 ---

    if (align === 'm') {
        const imgTag = `<img src="${src}" style="${baseStyle}" class="inline-q-img" />`;
        return `<div style="text-align: center; margin: 8px 0; clear: both;">${imgTag}</div>`;
    } 
    
    else if (align === 'r') {
        const floatStyle = baseStyle + `float: right; margin-left: 10px; margin-bottom: 4px;`;
        return `<img src="${src}" style="${floatStyle}" class="inline-q-img" />`;
    }

    else {
        return `<img src="${src}" style="${baseStyle}" class="inline-q-img" />`;
    }
  });

  return content;
};

const htmlContent = computed(() => {
  return processText(props.text);
});
</script>

<style lang="scss" scoped>
.latex-text-container {
  width: 100%;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-all;
  color: #333;
  
  /* 确保容器内的文字垂直居中基准 */
  vertical-align: middle;

  &::after {
    content: "";
    display: table;
    clear: both;
  }
}
</style>