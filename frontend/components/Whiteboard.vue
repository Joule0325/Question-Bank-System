<template>
  <view class="whiteboard-container">
    <view class="wb-actions">
      <button class="icon-btn" @click="undo">↩️ 撤销</button>
      <button class="icon-btn" @click="clear">🗑️ 清空</button>
      <text class="status-tip">rnote 引擎：已启用种子锁定与建模平滑</text>
    </view>

    <view class="canvas-area" id="canvas-area">
      <canvas 
        canvas-id="whiteboard"
        id="whiteboard"
        ref="whiteboardCanvas"
        class="drawing-canvas"
        @touchstart="handleStart"
        @touchmove="handleMove"
        @touchend="handleEnd"
        @mousedown="handleStart"
        @mousemove="handleMove"
        @mouseup="handleEnd"
        style="width: 100%; height: 100%; touch-action: none; background-color: #fff;"
      ></canvas>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { getStroke } from 'perfect-freehand';
import rough from 'roughjs';

// --- 状态管理 ---
const isDrawing = ref(false);
const points = ref([]);
const strokes = ref([]); // 存储格式: { points: [], seed: number }
const rect = ref({ left: 0, top: 0, width: 0, height: 0 });

let canvasElement = null;
let ctx = null;
let rc = null;

// --- 初始化 (参考你的成功逻辑) ---
onMounted(() => {
  nextTick(() => {
    const query = uni.createSelectorQuery();
    query.select('#canvas-area').boundingClientRect(data => {
      if (data) {
        rect.value = data;
        canvasElement = document.querySelector('#whiteboard canvas') || document.querySelector('#whiteboard');
        if (canvasElement) {
          canvasElement.width = data.width;
          canvasElement.height = data.height;
          ctx = canvasElement.getContext('2d');
          // 初始化 RoughJS 引擎 (对应 rnote 的 roughr 渲染器)
          rc = rough.canvas(canvasElement);
          drawAll();
        }
      }
    }).exec();
  });
});

// --- 坐标获取 ---
const getPoint = (e) => {
  let clientX, clientY, pressure = 0.5;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
    pressure = e.touches[0].force || 0.5;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  return [clientX - rect.value.left, clientY - rect.value.top, pressure];
};

// --- 事件监听 ---
const handleStart = (e) => {
  isDrawing.value = true;
  points.value = [getPoint(e)];
};

const handleMove = (e) => {
  if (!isDrawing.value) return;
  points.value.push(getPoint(e));
  drawAll(); // 实时刷新
};

const handleEnd = () => {
  if (!isDrawing.value) return;
  isDrawing.value = false;
  
  if (points.value.length > 1) {
    // 关键修复 1：模仿 rnote 的 Seed 机制
    // 每一笔结束后，生成并保存一个唯一的随机种子。
    strokes.value.push({
      points: [...points.value],
      seed: Math.floor(Math.random() * 2147483647) 
    });
  }
  points.value = [];
  drawAll();
};

// --- 核心渲染算法 (深度模仿 rnote) ---
const drawStroke = (strokePoints, seed) => {
  if (strokePoints.length < 2) return;

  // 1. 模拟 rnote 的建模平滑算法
  // 增大 streamline 和 smoothing 以消除锯齿
  const outline = getStroke(strokePoints, {
    size: 6,           // 线条基础粗细
    thinning: 0.5,     // 压感灵敏度
    smoothing: 0.7,    // 增加平滑度 (消除锯齿)
    streamline: 0.6,   // 增加建模预测 (对应 rnote 的 modeler)
    last: true         // 闭合路径
  });

  // 2. 将点集转为闭合路径字符串
  const pathData = getSvgPathFromStroke(outline);

  // 3. 使用 RoughJS 绘制 (对应 rnote 的 rough-piet 逻辑)
  // 通过 seed 参数锁定手绘偏移，通过 fillStyle 解决自交白块
  rc.path(pathData, {
    stroke: 'none',       // 线条轮廓由填充展现
    fill: '#1a1a1a',      // 线条颜色
    fillStyle: 'solid',   // 必须使用 solid，解决重叠变白问题
    roughness: 0.3,       // 手绘感强度 (模拟 rnote)
    bowing: 1,            // 线条微弯度
    seed: seed            // 核心：锁定种子，线条不再随重绘而抖动
  });
};

const drawAll = () => {
  if (!ctx || !rc) return;
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
  // 绘制已完成的笔画
  strokes.value.forEach(s => drawStroke(s.points, s.seed));
  
  // 绘制当前笔画 (使用固定种子 1，保证书写过程不晃动)
  if (points.value.length > 0) {
    drawStroke(points.value, 1);
  }
};

// --- 辅助函数：精准构建 SVG Path ---
function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return "";
  const d = stroke.reduce(
    (acc, [x0, y0], i, _arr) => {
      const [x1, y1] = _arr[(i + 1) % _arr.length];
      // 修复了之前的数学平均值错误：(y0 + y1) / 2
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );
  d.push("Z");
  return d.join(" ");
}

const undo = () => { strokes.value.pop(); drawAll(); };
const clear = () => { strokes.value = []; drawAll(); };
</script>

<style scoped>
.whiteboard-container { width: 100%; height: 100vh; display: flex; flex-direction: column; background-color: #f8f8f8; }
.canvas-area { flex: 1; position: relative; overflow: hidden; background: #fff; }
.wb-actions { padding: 10px; background: #fff; border-bottom: 1px solid #eee; display: flex; gap: 10px; align-items: center; }
.icon-btn { font-size: 14px; padding: 4px 12px; border: 1px solid #ddd; background: #fff; border-radius: 4px; }
.status-tip { font-size: 11px; color: #aaa; margin-left: auto; }
.drawing-canvas { display: block; }
</style>