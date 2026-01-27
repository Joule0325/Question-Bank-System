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

  // ============================================================
  // 第一步：【核心修复】保护 LaTeX 公式中的小于号
  // ============================================================
  // 原理：找到所有 $...$ 和 $$...$$ 的内容，把里面的 < 替换为 &lt;
  // 这样 mp-html 就不会把 <x 当作标签吞掉了，同时保留了 LaTeX 原始格式供后续编译
  
  content = content.replace(/(\$\$[\s\S]*?\$\$)|((?<!\\)\$[^\n$]*?(?<!\\)\$)/g, (match) => {
      // 只替换公式内部的 < 和 >，其他保持不变
      return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });

  // ============================================================
  // 第二步：解析 Markdown 表格 (保留原有逻辑)
  // ============================================================
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

  // ============================================================
  // 第三步：解析图片占位符 [img:CONTENT] (保留原有逻辑)
  // ============================================================
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
    let baseStyle = `max-width:100%; height:auto; vertical-align: middle; margin: 0 4px; border-radius: 4px;`;
    
    if (width) {
        baseStyle += `width:${widthVal};`;
    }

    if (align === 'm') {
        const imgTag = `<img src="${src}" style="${baseStyle}" class="inline-q-img" />`;
        return `<div style="text-align: center; margin: 8px 0; clear: both;">${imgTag}</div>`;
    } 
    
    else if (align === 'r') {
        const floatStyle = baseStyle + `float: right; margin-left: 10px; margin-bottom: 4px;`;
        return `<img src="${src}" style="${floatStyle}" class="img-right" />`;
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
  
  vertical-align: middle;

  &::after {
    content: "";
    display: table;
    clear: both;
  }
}
</style>