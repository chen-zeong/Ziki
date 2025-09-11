<template>
  <div class="h-full flex flex-col">
    <!-- 参数设置内容 -->
    <div class="flex-grow overflow-hidden text-sm">
      <div class="h-full relative">
        <!-- 已完成任务时的交互遮罩 -->
        <div v-if="isSettingsLocked" class="absolute inset-0 z-10 cursor-not-allowed" style="background: transparent;"></div>
        <!-- 基础设置内容 -->
        <div class="grid grid-cols-2 gap-x-6 gap-y-4 h-full" :class="{ 'opacity-60': isSettingsLocked }">
          <!-- 左侧：格式 + 分辨率（单独卡片） -->
          <div class="space-y-4">
            <div class="bg-gray-50 dark:bg-[#1e1e1e] p-3 rounded-lg overflow-visible max-h-full min-h-[220px] flex flex-col">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="font-medium text-sm text-slate-600 dark:text-dark-secondary">输出格式</label>
                </div>
                <CustomSelect
                  :options="formatOptions"
                  v-model="formatValue"
                  :max-visible-options="4"
                />
              </div>

              <!-- 分辨率区域 -->
              <div class="mt-4">
                <div class="flex items-center justify-between mb-2">
                  <label class="font-medium text-sm text-slate-600 dark:text-dark-secondary">分辨率</label>
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-600 dark:text-dark-secondary">自定义</span>
                    <button
                      type="button"
                      class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                      :style="{ backgroundColor: isCustomResolution ? '#5492dc' : '' }"
                      :class="isCustomResolution ? '' : 'bg-gray-200 dark:bg-dark-border'"
                      @click="toggleCustomResolution"
                    >
                      <span
                        class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
                        :class="isCustomResolution ? 'translate-x-5' : 'translate-x-1'"
                      ></span>
                    </button>
                  </div>
                </div>

                <div class="space-y-2">
                  <div v-if="isCustomResolution" class="flex gap-1 items-center">
                    <CustomNumberInput
                      v-model="customWidth"
                      :min="8"
                      :max="8192"
                      :step="2"
                      placeholder="宽度"
                    />
                    <button
                      type="button"
                      class="flex-shrink-0 p-2 text-gray-500 hover:text-orange-500 transition-colors duration-200 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border"
                      :class="{ 'hover:bg-blue-50': isAspectRatioLocked }"
                      :style="{ color: isAspectRatioLocked ? '#5492dc' : '' }"
                      @click="toggleAspectRatioLock"
                      title="等比例缩放"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                    <CustomNumberInput
                      v-model="customHeight"
                      :min="8"
                      :max="8192"
                      :step="2"
                      placeholder="高度"
                    />
                  </div>

                  <CustomSelect 
                    v-else
                    v-model="resolutionValue"
                    :options="resolutionOptions.filter(opt => opt.value !== 'custom')"
                    :placeholder="originalResolutionText || '选择分辨率'"
                    dropdown-direction="up"
                    strict-direction
                    :teleport-to-body="true"
                    :max-visible-options="5"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：画质（单独卡片） -->
          <div class="space-y-4">
            <div class="bg-gray-50 dark:bg-[#1e1e1e] p-3 rounded-lg overflow-visible max-h-full quality-slider-container">
              <div class="space-y-4">
                <!-- 标题和质量等级 -->
                <div class="flex justify-between items-center mb-4">
                  <label class="font-medium text-sm text-slate-600 dark:text-dark-secondary">画质</label>
                  <div class="text-right">
                    <span class="font-medium text-gray-600 dark:text-dark-primary px-1.5 py-0.5 rounded text-xs" style="background-color: #f3f4f6;">{{ qualityText }}</span>
                  </div>
                </div>

                <!-- 滑动条 -->
                <div class="relative mb-2">
                  <!-- 滑动条轨道和自定义UI -->
                  <div class="relative h-8 flex items-center">
                    <!-- 轨道背景 -->
                    <div class="absolute w-full h-3 bg-slate-300 dark:bg-slate-600 rounded-full shadow-inner"></div>
                    
                    <!-- 已填充的进度条 -->
                    <div 
                      class="absolute h-3 rounded-full shadow-sm"
                      :style="{ width: qualityValue + '%', background: 'linear-gradient(90deg, #4f89db, #558ee1)' }"
                    ></div>
                    
                    <!-- 自定义的滑块 -->
                    <div 
                      class="absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-white dark:bg-gray-100 rounded-full shadow-lg border-4 cursor-pointer transition-transform duration-100 ease-out hover:scale-105"
                      :class="{ 'scale-105': showTooltip }"
                      :style="{ left: `calc(${qualityValue}% - 14px)`, willChange: 'transform', borderColor: '#558ee1' }"
                    >
                       <!-- 滑块内部高光效果 -->
                       <div class="absolute inset-1 bg-gradient-to-br from-white to-gray-100 dark:from-gray-50 dark:to-gray-200 rounded-full opacity-60"></div>
                     </div>
                    
                    <!-- 气泡提示框（显示参数提示，如 -q:v / 色彩位数 / 无损） -->
                    <div 
                      class="absolute bottom-full mb-2 pointer-events-none transform -translate-x-1/2 z-10 transition duration-150 ease-out"
                      :class="{ 
                        'opacity-100 translate-y-0 scale-100': showTooltip, 
                        'opacity-0 -translate-y-1 scale-95': !showTooltip
                      }"
                      :style="{ left: qualityValue + '%', willChange: 'transform, opacity' }"
                    >
                      <div class="tooltip-bubble">
                        {{ qualityHintText.paramHint }}
                      </div>
                    </div>
                  </div>

                  <!-- 透明的 range input 处理逻辑 -->
                  <input 
                    type="range" 
                    id="image-quality-slider" 
                    v-model.number="qualityValue"
                    min="2" 
                    max="98" 
                    step="1" 
                    class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                    @input="updateQualityState"
                    @mouseenter="showTooltip = true"
                    @mouseleave="showTooltip = false"
                    @mousedown="showTooltip = true"
                    @mouseup="showTooltip = false"
                  />
                </div>
                
                <!-- 画质提示：只在需要时显示 PNG 色彩缺失的提示 -->
                <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div v-if="qualityHintText.colorWarning" class="flex items-start gap-2 px-3 py-2 rounded-md border shadow-sm bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-[#34260f] dark:to-[#3b2a12] border-amber-200/80 dark:border-amber-700/60 text-amber-800 dark:text-amber-200">
                    <svg class="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-7.5 13A1 1 0 003.62 19h16.76a1 1 0 00.87-1.5l-7.5-13a1 1 0 00-1.76 0z" />
                    </svg>
                    <div class="leading-snug">
                      <span class="font-medium">提示：</span>{{ qualityHintText.colorWarning }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部操作（由父组件触发 startCompression）-->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, computed, inject, watch, nextTick, ref, onMounted } from 'vue';
import CustomSelect from '../common/CustomSelect.vue';
import CustomNumberInput from '../common/CustomNumberInput.vue';
import type { CompressionSettings } from '../../types';

interface Props {
  isProcessing?: boolean;
  taskStatus?: string;
}

interface Emits {
  compress: [settings: CompressionSettings];
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false,
  taskStatus: 'pending'
});

const emit = defineEmits<Emits>();

// 注入来自父组件的"当前任务设置"和"更新方法"
const injectedTaskSettings = inject<{ value: CompressionSettings | null }>('currentTaskSettings');
const updateCurrentTaskSettings = inject<((updates: Partial<CompressionSettings>) => void) | null>('updateCurrentTaskSettings', null);
const currentFile = inject<{ value: any }>('currentFile');

// 是否锁定设置（任务已完成时）
const isSettingsLocked = computed(() => props.taskStatus === 'completed');

// 气泡提示框显示状态
const showTooltip = ref(false);

// 选项
const formatOptions = [
  { value: 'jpeg', label: 'JPEG（体积中等）' },
  { value: 'png', label: 'PNG（体积最大）' },
  { value: 'webp', label: 'WebP（体积最小）' }
];

// 原始分辨率（从图片自然尺寸读取）
const originalWidth = ref<number | null>(null);
const originalHeight = ref<number | null>(null);
const originalResolutionText = computed(() => {
  if (originalWidth.value && originalHeight.value) {
    return `${originalWidth.value}x${originalHeight.value} (原始)`;
  }
  return '';
});

// 使用shallowRef避免深度响应式导致的循环更新
const formatSettings = shallowRef<Partial<CompressionSettings>>({
  format: 'jpeg',
  resolution: 'original',
  customResolution: undefined
});

const qualitySettings = shallowRef<Partial<CompressionSettings>>({
  qualityType: 'crf',
  crfValue: 80
});

// 自定义分辨率交互
const isCustomResolution = computed(() => (formatSettings.value.resolution as any) === 'custom');
const isAspectRatioLocked = ref(true);
const aspectRatio = computed(() => {
  if (originalWidth.value && originalHeight.value && originalHeight.value !== 0) {
    return originalWidth.value / originalHeight.value;
    }
  return 0;
});

const toggleCustomResolution = () => {
  if (isCustomResolution.value) {
    // 关闭自定义，退回到原始或第一个推荐项
    const options = resolutionOptions.value.filter(o => o.value !== 'custom');
    const fallback = originalWidth.value ? 'original' : (options[0]?.value || '1920x1080');
    formatSettings.value = { ...formatSettings.value, resolution: fallback as any };
  } else {
    formatSettings.value = { ...formatSettings.value, resolution: 'custom' as any };
    // 初始化为原始尺寸或常规1080p比例
    if (originalWidth.value && originalHeight.value) {
      formatSettings.value.customResolution = { width: makeEven(originalWidth.value), height: makeEven(originalHeight.value) };
    } else {
      formatSettings.value.customResolution = { width: 1920, height: 1080 };
    }
  }
};

const toggleAspectRatioLock = () => {
  isAspectRatioLocked.value = !isAspectRatioLocked.value;
};

// 将滑动条值映射到质量描述文本
const qualityValue = computed({
  get: () => Number(qualitySettings.value.crfValue ?? 80),
  set: (v: number | string) => { 
    const num = typeof v === 'string' ? parseInt(v, 10) : v; 
    qualitySettings.value = { ...qualitySettings.value, crfValue: isNaN(num as number) ? 0 : (num as number) }; 
  }
});

// 质量文本（按新文案：极高画质、高画质、中等画质、低画质、极低画质 + 无损）
const qualityText = computed(() => {
  const v = qualityValue.value;
  const format = formatValue.value;
  
  if (v === 100) {
    if (format === 'png') {
      return '无损';
    }
  }
  
  // 根据质量值返回对应文案
  if (v >= 90) return '极高画质';
  if (v >= 75) return '高画质';
  if (v >= 60) return '中等画质';
  if (v >= 30) return '低画质';
  return '极低画质';
});

// 质量提示信息（含参数和色彩警告）
const qualityHintText = computed(() => {
  const v = qualityValue.value;
  const format = formatValue.value;
  
  let paramHint = '';
  let colorWarning = '';
  
  // 参数提示
  if (format === 'jpeg') {
    // JPEG：显示 -q:v 值（2-31，数值越小画质越高）
    const qv = Math.round(31 - (v * 29 / 100));
    paramHint = `-q:v ${qv}`;
  } else if (format === 'webp') {
    // WebP：显示 -q:v 值（0-100，数值越大画质越高）
    paramHint = `-q:v ${v}`;
  } else if (format === 'png') {
    if (v === 100) {
      paramHint = '无损';
    } else {
      // PNG：显示色彩位数
      const colors = v >= 80 ? 256 : v >= 60 ? 128 : v >= 40 ? 96 : 64;
      paramHint = `${colors} 色`;
      
      // PNG 画质 80 以下警告
      if (v < 80) {
        colorWarning = '使用调色板压缩，可能缺失部分色彩';
      }
    }
  }
  
  return { paramHint, colorWarning };
});

// 分辨率下拉选项（根据原始分辨率自动生成 1080p/720p/480p）
const resolutionOptions = computed(() => {
  const opts: { value: string; label: string }[] = [];
  if (originalWidth.value && originalHeight.value) {
    const w = originalWidth.value;
    const h = originalHeight.value;
    opts.push({ value: 'original', label: `${w}x${h} (原始)` });

    // 常见等比例选项
    const presets = [
      { w: 1920, h: 1080, name: '1080p' },
      { w: 1280, h: 720, name: '720p' },
      { w: 854, h: 480, name: '480p' }
    ];
    for (const p of presets) {
      if (w >= p.w && h >= p.h) {
        const scaled = scaleToFit(w, h, p.w, p.h);
        opts.push({ value: `${scaled.width}x${scaled.height}`, label: `${p.name}（${scaled.width}x${scaled.height}）` });
      }
    }
  } else {
    // 没有原始尺寸时提供通用选项
    opts.push({ value: '1920x1080', label: '1080p（1920x1080）' });
    opts.push({ value: '1280x720', label: '720p（1280x720）' });
    opts.push({ value: '854x480', label: '480p（854x480）' });
  }
  // 自定义选项
  opts.push({ value: 'custom', label: '自定义' });
  return opts;
});

// 统一的 v-model 接口（供 CustomSelect 使用）
const formatValue = computed({
  get: () => formatSettings.value.format ?? 'jpeg',
  set: (v: string) => {
    formatSettings.value = { ...formatSettings.value, format: v as any };
    emitSettings();
  }
});

const resolutionValue = computed({
  get: () => formatSettings.value.resolution as any,
  set: (v: string) => {
    if (v === 'custom') {
      formatSettings.value = { ...formatSettings.value, resolution: 'custom' as any };
      if (!formatSettings.value.customResolution) {
        if (originalWidth.value && originalHeight.value) {
          formatSettings.value.customResolution = { width: makeEven(originalWidth.value), height: makeEven(originalHeight.value) };
        } else {
          formatSettings.value.customResolution = { width: 1920, height: 1080 };
        }
      }
    } else if (v === 'original') {
      formatSettings.value = { ...formatSettings.value, resolution: 'original' as any, customResolution: undefined };
    } else {
      const [wStr, hStr] = v.split('x');
      const w = makeEven(parseInt(wStr));
      const h = makeEven(parseInt(hStr));
      formatSettings.value = { ...formatSettings.value, resolution: v as any, customResolution: { width: w, height: h } };
    }
    emitSettings();
  }
});

// 自定义输入联动
const customWidth = computed({
  get: () => formatSettings.value.customResolution?.width ?? undefined,
  set: (w: number | undefined) => {
    if (!formatSettings.value.customResolution) {
      formatSettings.value.customResolution = { width: 1920, height: 1080 };
    }
    const width = makeEven((w ?? 0));
    if (isAspectRatioLocked.value && aspectRatio.value > 0) {
      const height = makeEven(Math.round(width / aspectRatio.value));
      formatSettings.value.customResolution = { width, height };
    } else {
      formatSettings.value.customResolution = { ...formatSettings.value.customResolution, width };
    }
    emitSettings();
  }
});

const customHeight = computed({
  get: () => formatSettings.value.customResolution?.height ?? undefined,
  set: (h: number | undefined) => {
    if (!formatSettings.value.customResolution) {
      formatSettings.value.customResolution = { width: 1920, height: 1080 };
    }
    const height = makeEven((h ?? 0));
    if (isAspectRatioLocked.value && aspectRatio.value > 0) {
      const width = makeEven(Math.round(height * aspectRatio.value));
      formatSettings.value.customResolution = { width, height };
    } else {
      formatSettings.value.customResolution = { ...formatSettings.value.customResolution, height };
    }
    emitSettings();
  }
});

// 工具函数：等比例缩放到目标框内
function scaleToFit(ow: number, oh: number, tw: number, th: number) {
  const scale = Math.min(tw / ow, th / oh);
  return { width: makeEven(Math.floor(ow * scale)), height: makeEven(Math.floor(oh * scale)) };
}

// 工具函数：宽高取偶，避免编解码器限制
function makeEven(n: number) { return Math.max(2, n - (n % 2)); }

// 同步到父级任务设置
const emitSettings = () => {
  const s = {
    ...formatSettings.value,
    ...qualitySettings.value,
    // 图片任务无时间段
    timeRange: undefined
  } as CompressionSettings;
  // 不自动开始压缩，仅同步设置到父级
  updateCurrentTaskSettings?.(s);
};

// 从注入的任务设置恢复（图片任务切换时）
watch(() => injectedTaskSettings?.value, (s) => {
  if (!s) return;
  // 格式
  if (s.format) formatSettings.value = { ...formatSettings.value, format: s.format };
  // 分辨率
  if (s.resolution) {
    formatSettings.value = { ...formatSettings.value, resolution: s.resolution } as any;
    if (s.resolution === 'custom' && s.customResolution) {
      formatSettings.value.customResolution = { ...s.customResolution };
    }
  }
  // 质量
  if (s.crfValue != null) qualitySettings.value.crfValue = Number(s.crfValue);
}, { deep: true });

// 读取原始图片尺寸：监听 currentFile.originalUrl
onMounted(async () => {
  await nextTick();
  tryLoadOriginalDimensions();
});

watch(() => currentFile?.value?.originalUrl, () => {
  tryLoadOriginalDimensions();
});

function tryLoadOriginalDimensions() {
  const url = currentFile?.value?.originalUrl;
  if (!url) return;
  const img = new Image();
  img.onload = () => {
    originalWidth.value = img.naturalWidth || (img as any).width || null;
    originalHeight.value = img.naturalHeight || (img as any).height || null;
  };
  img.onerror = () => {
    originalWidth.value = null;
    originalHeight.value = null;
  };
  img.src = url;
}

// 开始压缩（由父组件调用）
const startCompression = () => {
  const compressionSettings: CompressionSettings = {
    ...formatSettings.value,
    ...qualitySettings.value,
    timeRange: undefined, // 图片任务忽略时间段
    videoCodec: 'image'
  } as CompressionSettings;
  emit('compress', compressionSettings);
};

// 暴露方法供父组件调用
defineExpose({ startCompression });

// 更新质量状态（更新样式并同步值）
const updateQualityState = () => {
  const percentage = qualityValue.value;
  const slider = document.getElementById('image-quality-slider') as HTMLInputElement | null;
  if (slider) {
    slider.style.setProperty('--value-percent', `${percentage}%`);
  }
  qualitySettings.value = { ...qualitySettings.value, crfValue: percentage };
};
</script>

<style scoped>
.tooltip-bubble {
  position: relative;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96));
  color: white;
  font-size: 11px;
  line-height: 1;
  padding: 6px 8px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.15);
  border: 1px solid rgba(148, 163, 184, 0.25);
  white-space: nowrap; /* 强制单行显示 */
}
.tooltip-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(30, 41, 59, 0.96);
}
:deep(.dark) .tooltip-bubble {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96));
  border-color: rgba(100, 116, 139, 0.25);
}
:deep(.dark) .tooltip-bubble::after {
  border-top-color: rgba(15, 23, 42, 0.96);
}
</style>