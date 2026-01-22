<template>
  <view class="whiteboard-container">
    <!-- Toolbar: 使用 scroll-view 容纳更多选项 -->
    <scroll-view scroll-x class="wb-toolbar" @click.stop>
      <view class="tool-section">
        
        <!-- 1. 基础设置 Group -->
        <view class="control-group">
            <text class="group-title">基础 (Basic)</text>
            <view class="control-row">
                <text class="label">大小 {{ options.size }}</text>
                <slider class="slider" :value="options.size" :min="1" :max="50" @change="e => options.size = e.detail.value" block-size="12" activeColor="#2563eb" />
            </view>
            <view class="control-row">
                <text class="label">稀疏 {{ options.thinning }}</text>
                <slider class="slider" :value="options.thinning" :min="-0.99" :max="0.99" :step="0.01" @change="e => options.thinning = e.detail.value" block-size="12" activeColor="#2563eb" />
            </view>
        </view>

        <!-- 2. 平滑与流线 Group -->
        <view class="control-group">
            <text class="group-title">手感 (Feel)</text>
            <view class="control-row">
                <text class="label">平滑 {{ options.smoothing }}</text>
                <slider class="slider" :value="options.smoothing" :min="0" :max="0.99" :step="0.01" @change="e => options.smoothing = e.detail.value" block-size="12" activeColor="#2563eb" />
            </view>
            <view class="control-row">
                <text class="label">流线 {{ options.streamline }}</text>
                <slider class="slider" :value="options.streamline" :min="0" :max="0.99" :step="0.01" @change="e => options.streamline = e.detail.value" block-size="12" activeColor="#2563eb" />
            </view>
        </view>

        <!-- 3. 缓动函数 (Easing) - 新增 -->
        <view class="control-group">
            <text class="group-title">曲线 (Easing)</text>
            <view class="easing-selector">
                <view 
                    v-for="(fn, name) in easings" 
                    :key="name" 
                    class="easing-btn" 
                    :class="{active: currentEasingName === name}"
                    @click="currentEasingName = name"
                >
                    {{ name }}
                </view>
            </view>
        </view>

        <!-- 4. 笔锋设置 Group -->
        <view class="control-group">
            <text class="group-title">笔锋 (Taper)</text>
            <view class="control-row">
                <text class="label">起笔 {{ options.start.taper }}</text>
                <slider class="slider" :value="options.start.taper" :min="0" :max="100" @change="e => options.start.taper = e.detail.value" block-size="12" activeColor="#2563eb" />
            </view>
            <view class="control-row">
                <text class="label">收笔 {{ options.end.taper }}</text>
                <slider class="slider" :value="options.end.taper" :min="0" :max="100" @change="e => options.end.taper = e.detail.value" block-size="12" activeColor="#2563eb" />
            </view>
        </view>

        <!-- 5. 样式开关 Group -->
        <view class="control-group">
            <text class="group-title">样式 (Style)</text>
             <view class="control-row toggle-row" @click="options.start.cap = !options.start.cap">
                <view class="checkbox" :class="{checked: options.start.cap}">✓</view>
                <text class="label-sm">圆头起笔</text>
            </view>
             <view class="control-row toggle-row" @click="options.end.cap = !options.end.cap">
                <view class="checkbox" :class="{checked: options.end.cap}">✓</view>
                <text class="label-sm">圆头收笔</text>
            </view>
             <view class="control-row toggle-row" @click="options.simulatePressure = !options.simulatePressure">
                <view class="checkbox" :class="{checked: options.simulatePressure}">✓</view>
                <text class="label-sm">模拟压感</text>
            </view>
        </view>

        <!-- 6. 颜色选择 Group -->
        <view class="control-group">
             <text class="group-title">颜色 (Color)</text>
             <view class="colors">
                <view 
                    v-for="c in colors" 
                    :key="c" 
                    class="color-dot" 
                    :style="{backgroundColor: c}"
                    :class="{active: currentColor === c}"
                    @click="currentColor = c"
                ></view>
            </view>
        </view>
      </view>
    </scroll-view>
    
    <!-- 操作按钮栏 -->
    <view class="wb-actions">
        <view class="undo-redo">
            <button class="icon-btn" @click="undo" :disabled="historyIndex <= 0">↩️ 撤销</button>
            <button class="icon-btn" @click="redo" :disabled="historyIndex >= history.length - 1">↪️ 重做</button>
        </view>
        <button class="btn-clear" @click="clearCanvas">🗑️ 清空白板</button>
    </view>

    <!-- 画布区域 -->
    <view 
      class="canvas-area" 
      id="canvas-area"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <svg class="svg-layer" viewBox="0 0 100% 100%" :style="{ width: '100%', height: '100%' }">
        <!-- 历史笔画 -->
        <path 
          v-for="(path, index) in paths" 
          :key="index" 
          :d="path.d" 
          :fill="path.color"
        />
        <!-- 当前正在画的笔画 -->
        <path 
          v-if="currentStrokePath" 
          :d="currentStrokePath" 
          :fill="currentColor"
        />
      </svg>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { getStroke } from 'perfect-freehand';

// --- Easing Functions (对应官方 Demo) ---
const easings = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
};

const currentEasingName = ref('easeOut'); // 官方默认通常是 easeOut 体验较好

// --- 全面的参数配置 ---
const options = reactive({
  size: 10,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  start: { cap: true, taper: 0 },
  end: { cap: true, taper: 0 },
  simulatePressure: false, // 开启后，在没有压感设备上会根据速度模拟压感
});

const colors = ['#000000', '#ef4444', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ffffff'];
const currentColor = ref('#000000');

// 绘图状态
const points = ref([]);
const history = ref([[]]);
const historyIndex = ref(0);
const isDrawing = ref(false);
const rect = ref({ left: 0, top: 0 });

// 计算属性
const paths = computed(() => history.value[historyIndex.value] || []);

// 动态计算当前的 stroke options
const strokeOptions = computed(() => ({
    ...options,
    easing: easings[currentEasingName.value], // 动态绑定 Easing 函数
}));

const currentStrokePath = computed(() => {
  if (points.value.length === 0) return '';
  // 使用动态计算的 strokeOptions
  const stroke = getStroke(points.value, strokeOptions.value);
  return getSvgPathFromStroke(stroke);
});

// 生命周期
onMounted(() => {
  updateRect();
  uni.onWindowResize(updateRect);
});

const updateRect = () => {
  const query = uni.createSelectorQuery().in(this);
  query.select('#canvas-area').boundingClientRect(data => {
    if (data) {
      rect.value = { left: data.left, top: data.top };
    }
  }).exec();
};

// --- 坐标获取 (兼容鼠标和触摸) ---
const getPoint = (e) => {
    let clientX, clientY, pressure = undefined; // 默认为 undefined，让库自己处理或使用模拟
    
    // 如果设备支持压感 (PointerEvent / TouchEvent with force)
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        if (e.touches[0].force > 0) pressure = e.touches[0].force;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
        if (e.changedTouches[0].force > 0) pressure = e.changedTouches[0].force;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
        // 鼠标事件通常没有 force，留空让 simulatePressure 生效
    }

    const x = clientX - rect.value.left;
    const y = clientY - rect.value.top;

    // 返回格式 [x, y, pressure]
    // 如果 pressure 是 undefined, perfect-freehand 会自动处理 (如果开启了 simulatePressure)
    return pressure !== undefined ? [x, y, pressure] : [x, y];
};

// --- 绘图逻辑 ---
const startDrawing = (e) => {
    isDrawing.value = true;
    const pt = getPoint(e);
    // 这里传入 pressure 确保如果硬件支持，直接使用硬件数据
    points.value = [pt];
};

const moveDrawing = (e) => {
    if (!isDrawing.value) return;
    const pt = getPoint(e);
    // perfect-freehand 推荐追加点，而不是替换整个数组，但在 Vue 响应式中替换数组触发更新更稳妥
    // 注意：不要去重点，perfect-freehand 需要密集点来计算速度
    points.value = [...points.value, pt];
};

const endDrawing = () => {
    if (!isDrawing.value) return;
    isDrawing.value = false;
    
    if (points.value.length > 0) {
        // 生成最终路径
        const stroke = getStroke(points.value, strokeOptions.value);
        const pathData = getSvgPathFromStroke(stroke);
        
        // 存入历史
        const newPaths = [...paths.value, { d: pathData, color: currentColor.value }];
        const newHistory = history.value.slice(0, historyIndex.value + 1);
        newHistory.push(newPaths);
        history.value = newHistory;
        historyIndex.value = newHistory.length - 1;
        
        points.value = [];
    }
};

// 事件绑定
const handleTouchStart = (e) => { startDrawing(e); }
const handleTouchMove = (e) => { moveDrawing(e); }
const handleTouchEnd = (e) => { endDrawing(e); }
const handleMouseDown = (e) => { startDrawing(e); }
const handleMouseMove = (e) => { moveDrawing(e); }
const handleMouseUp = (e) => { endDrawing(e); }

// --- 操作 ---
const clearCanvas = () => {
    const newHistory = history.value.slice(0, historyIndex.value + 1);
    newHistory.push([]); // 压入空状态
    history.value = newHistory;
    historyIndex.value = newHistory.length - 1;
};

const undo = () => { if (historyIndex.value > 0) historyIndex.value--; };
const redo = () => { if (historyIndex.value < history.value.length - 1) historyIndex.value++; };

// --- 辅助函数 ---
function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y1 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}
</script>

<style scoped>
.whiteboard-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  background: white;
}

/* --- 工具栏样式优化 --- */
.wb-toolbar {
  height: 110px; /* 增加高度以容纳更多控件 */
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  white-space: nowrap; /* 允许横向滚动 */
}

.tool-section {
    display: flex;
    padding: 10px;
    align-items: flex-start;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-right: 15px;
    margin-right: 15px;
    border-right: 1px solid #e2e8f0;
    min-width: 150px;
}
.control-group:last-child {
    border-right: none;
    margin-right: 0;
}

.group-title {
    font-size: 11px;
    font-weight: bold;
    color: #94a3b8;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
}

.label {
  font-size: 11px;
  color: #64748b;
  width: 60px;
  text-align: right;
  overflow: hidden;
  white-space: nowrap;
}
.label-sm {
    font-size: 11px;
    color: #475569;
    margin-left: 6px;
}

.slider {
  width: 90px;
  margin: 0;
}

/* Easing Selector */
.easing-selector {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.easing-btn {
    font-size: 11px;
    padding: 3px 8px;
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    text-align: center;
    cursor: pointer;
    color: #475569;
    transition: all 0.2s;
}
.easing-btn:hover { background: #f1f5f9; }
.easing-btn.active {
    background: #eff6ff;
    color: #2563eb;
    border-color: #2563eb;
    font-weight: bold;
}

/* 开关样式 */
.toggle-row {
    cursor: pointer;
    justify-content: flex-start;
    padding-left: 5px;
}
.toggle-row:hover .label-sm {
    color: #2563eb;
}
.checkbox {
    width: 14px;
    height: 14px;
    border: 1px solid #cbd5e1;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: white;
    background: white;
    transition: all 0.2s;
}
.checkbox.checked {
    background: #2563eb;
    border-color: #2563eb;
}

/* 颜色选择 */
.colors {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    width: 130px;
}
.color-dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 0 0 1px #e2e8f0;
    cursor: pointer;
    transition: transform 0.1s;
}
.color-dot.active {
    transform: scale(1.15);
    box-shadow: 0 0 0 2px #2563eb;
    z-index: 1;
}

/* 操作栏 */
.wb-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 15px;
    background: white;
    border-bottom: 1px solid #f1f5f9;
}

.undo-redo {
    display: flex;
    gap: 8px;
}

.icon-btn {
    font-size: 12px;
    padding: 4px 12px;
    background: #f8fafc;
    color: #475569;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    line-height: 1.5;
    transition: all 0.1s;
}
.icon-btn:active { background: #e2e8f0; transform: translateY(1px); }
.icon-btn[disabled] { opacity: 0.5; background: #f8fafc; cursor: not-allowed; }

.btn-clear {
  font-size: 12px;
  padding: 4px 12px;
  background: #fee2e2;
  color: #ef4444;
  border: 1px solid #fecaca;
  border-radius: 6px;
  cursor: pointer;
}
.btn-clear:active { background: #fca5a5; }

/* 画布 */
.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: #ffffff;
  background-image: radial-gradient(#e2e8f0 1px, transparent 1px);
  background-size: 20px 20px;
  touch-action: none;
}

.svg-layer {
  display: block;
  width: 100%;
  height: 100%;
}
</style>