<template>
  <div class="h-full flex flex-col bg-white/80 dark:bg-[#161821]/70 rounded-2xl border border-white/60 dark:border-white/10 backdrop-blur-md shadow-[0_18px_40px_rgba(15,23,42,0.12)] p-5 transition-all duration-300">
    <!-- 参数设置内容 -->
    <div class="flex-grow overflow-hidden text-sm">
      <div class="h-full relative">
        <!-- 已完成任务时的交互遮罩 -->
        <div v-if="isSettingsLocked" class="absolute inset-0 z-10 cursor-not-allowed" style="background: transparent;"></div>
        <!-- 基础设置内容 -->
        <div class="grid grid-cols-2 gap-x-6 gap-y-4 h-full" :class="{ 'opacity-60': isSettingsLocked }">
          <!-- 左侧：格式 + 分辨率（单独卡片） -->
          <div class="space-y-4">
            <div class="p-4 rounded-2xl bg-white/85 dark:bg-[#1e1e1e] border border-white/60 dark:border-white/10 backdrop-blur-md shadow-[0_12px_26px_rgba(15,23,42,0.08)] overflow-visible max-h-full min-h-[220px] flex flex-col transition-all duration-300">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="font-semibold text-sm text-slate-700 dark:text-dark-secondary opacity-90">{{ t('videoSettings.format') }}</label>
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
                  <label class="font-semibold text-sm text-slate-700 dark:text-dark-secondary opacity-90">{{ t('videoSettings.resolution') }}</label>
                   <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-slate-600 dark:text-dark-secondary opacity-80">{{ t('videoSettings.custom') }}</span>
                     <button
                       type="button"
                       class="relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-primary)]"
                       :style="{ backgroundColor: isCustomResolution ? 'var(--brand-primary)' : '' }"
                       :class="isCustomResolution ? '' : 'bg-slate-200/80 dark:bg-dark-border'"
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
                      :placeholder="t('videoSettings.width')"
                    />
                    <button
                      type="button"
                      class="flex-shrink-0 p-2 rounded-lg transition-all duration-200 text-slate-400 hover:bg-white/80 dark:hover:bg-white/10"
                      :style="{ color: isAspectRatioLocked ? 'var(--brand-primary)' : '' }"
                      @click="toggleAspectRatioLock"
                      :title="t('videoSettings.lockAspectRatio')"
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
                      :placeholder="t('videoSettings.height')"
                    />
                  </div>

                  <CustomSelect 
                    v-else
                    v-model="resolutionValue"
                    :options="resolutionOptions.filter((opt: any) => opt.value !== 'custom')"
                    :placeholder="originalResolutionText || t('videoSettings.selectResolution')"
                    dropdown-direction="down"
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
            <div class="p-4 rounded-2xl bg-white/85 dark:bg-[#1e1e1e] border border-white/60 dark:border-white/10 backdrop-blur-md shadow-[0_12px_26px_rgba(15,23,42,0.08)] overflow-visible max-h-full quality-slider-container transition-all duration-300">
              <div class="space-y-4">
                <!-- 标题和质量等级 -->
                <div class="flex justify-between items-center mb-4">
                  <label class="font-semibold text-sm text-slate-700 dark:text-dark-secondary opacity-90">{{ t('videoSettings.quality') }}</label>
                  <div class="text-right">
                    <span class="font-medium text-slate-600 dark:text-slate-200 px-2 py-0.5 rounded-full text-xs bg-white/80 dark:bg-white/10 border border-white/60 dark:border-white/15">{{ qualityText }}</span>
                  </div>
                </div>

                <!-- 滑动条 -->
                <div class="relative mb-2">
                  <!-- 滑动条轨道和自定义UI -->
                  <div class="relative h-8 flex items-center">
                    <!-- 轨道背景 -->
                    <div class="absolute w-full h-3 bg-slate-200/80 dark:bg-slate-700/70 rounded-full shadow-inner z-0"></div>

                    <!-- 默认值平衡点 -->
                    <div
                      class="absolute top-1/2 -translate-y-1/2 w-[3px] h-3 rounded-[1px] overflow-hidden bg-white/95 dark:bg-white/85 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] pointer-events-none z-30 before:content-[''] before:absolute before:left-1/2 before:-translate-x-1/2 before:top-0 before:border-l-[1.5px] before:border-r-[1.5px] before:border-b-[4px] before:border-l-transparent before:border-r-transparent before:border-b-white dark:before:border-b-white after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-0 after:border-l-[1.5px] after:border-r-[1.5px] after:border-t-[4px] after:border-l-transparent after:border-r-transparent after:border-t-white dark:after:border-t-white"
                      :style="{ left: `calc(${defaultImageSliderPosition}% - 1.5px)` }"
                      aria-hidden="true"
                    ></div>

                    <!-- 已填充的进度条 -->
                    <div
                      class="absolute h-3 rounded-full shadow-[0_4px_10px_rgba(81,98,255,0.25)] z-10"
                      :style="{ width: qualityValue + '%', background: 'linear-gradient(90deg, rgba(81,98,255,0.9), rgba(79,227,193,0.9))' }"
                    ></div>

                    <!-- 自定义的滑块 -->
                    <div
                      class="absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full cursor-pointer transition-transform duration-120 ease-out hover:scale-105 z-30"
                      :class="{ 'scale-105': showTooltip }"
                      :style="{ left: `calc(${qualityValue}% - 14px)`, background: 'radial-gradient(circle at 30% 30%, #ffffff, rgba(255,255,255,0.65))', boxShadow: '0 10px 24px rgba(81,98,255,0.28)', border: '3px solid rgba(81,98,255,0.5)' }"
                    >
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
                    class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-40"
                    @input="updateQualityState"
                    @mouseenter="showTooltip = true"
                    @mouseleave="showTooltip = false"
                    @mousedown="showTooltip = true"
                    @mouseup="showTooltip = false"
                  />
                </div>
                
                <!-- 画质提示：只在需要时显示 PNG 色彩缺失的提示 -->
                <div class="text-xs text-slate-500 dark:text-slate-300 space-y-1">
                  <div v-if="qualityHintText.colorWarning" class="flex items-start gap-2 px-3 py-2 rounded-md border shadow-sm bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-[#34260f] dark:to-[#3b2a12] border-amber-200/80 dark:border-amber-700/60 text-amber-800 dark:text-amber-200">
                    <svg class="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-7.5 13A1 1 0 003.62 19h16.76a1 1 0 00.87-1.5l-7.5-13a1 1 0 00-1.76 0z" />
                    </svg>
                    <div class="leading-snug">
                      <span class="font-medium">{{ t('common.tip') }}</span>{{ qualityHintText.colorWarning }}
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
import { computed, inject, watch, nextTick, ref, onMounted } from 'vue';
import CustomSelect from '../common/CustomSelect.vue';
import CustomNumberInput from '../common/CustomNumberInput.vue';
import { useTaskSettingsStore } from '../../stores/useTaskSettingsStore';
import type { CompressionSettings } from '../../types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Props {
  isProcessing?: boolean;
  taskStatus?: string;
  isProcessingBatch?: boolean;
}

interface Emits {
  compress: [settings: CompressionSettings];
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false,
  taskStatus: 'pending'
});

const emit = defineEmits<Emits>();

// 使用任务设置store
const taskSettingsStore = useTaskSettingsStore();

// 注入来自父组件的"当前任务设置"和"更新方法"（保持兼容性）
const injectedTaskSettings = inject<{ value: CompressionSettings | null }>('currentTaskSettings');
const updateCurrentTaskSettings = inject<((updates: Partial<CompressionSettings>) => void) | null>('updateCurrentTaskSettings', null);
const currentFile = inject<{ value: any }>('currentFile');

// 注入当前任务ID
const currentTaskId = inject<{ value: string | null }>('currentTaskId', { value: null });

// 是否锁定设置（仅在任务为 排队/压缩中/完成 状态时）
const isSettingsLocked = computed(() => {
  const status = props.taskStatus;
  return status === 'queued' || status === 'processing' || status === 'completed';
});

// 气泡提示框显示状态
const showTooltip = ref(false);

// 防止递归/交叉覆盖的标志（对齐视频面板行为）
const isUpdatingFromTask = ref(false);

// 选项（根据语言动态生成标签）
const formatOptions = computed(() => [
  { value: 'jpeg', label: 'JPEG', tags: [t('videoSettings.tagMediumSize')] },
  { value: 'png', label: 'PNG', tags: [t('videoSettings.tagLargestSize')] },
  { value: 'webp', label: 'WebP', tags: [t('videoSettings.tagGoogleDeveloped'), t('videoSettings.tagSmallestSize')] }
]);

// 提前派生当前格式，避免在其他计算属性中访问尚未初始化的 formatValue
const currentFormat = computed(() => (formatSettings.value.format ?? 'jpeg'));

// 原始分辨率（从图片自然尺寸读取）
const originalWidth = ref<number | null>(null);
const originalHeight = ref<number | null>(null);
const originalResolutionText = computed(() => {
  if (originalWidth.value && originalHeight.value) {
    return `${originalWidth.value}x${originalHeight.value}`;
  }
  return '';
});

// 获取当前任务设置
const getCurrentSettings = (): CompressionSettings => {
  if (currentTaskId.value) {
    return taskSettingsStore.getTaskSettings(currentTaskId.value, 'image');
  }
  return taskSettingsStore.getDefaultImageSettings();
};

// 使用 ref（而非 shallowRef）以确保嵌套属性变更能触发响应式更新
const formatSettings = ref<Partial<CompressionSettings>>({
  format: 'jpeg',
  resolution: 'original',
  customResolution: undefined
});

const qualitySettings = ref<Partial<CompressionSettings>>({
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
    // 开启自定义时，同步设置 resolution 与 customResolution，整体替换对象，确保更新
    const next: Partial<CompressionSettings> = { ...formatSettings.value, resolution: 'custom' as any };
    if (originalWidth.value && originalHeight.value) {
      next.customResolution = { width: makeEven(originalWidth.value), height: makeEven(originalHeight.value) };
    } else {
      next.customResolution = { width: 1920, height: 1080 };
    }
    formatSettings.value = next;
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

// 默认值位置（图片画质的“平衡点”）
const defaultImageSliderPosition = computed(() => 80);

// 质量文本（i18n）
const qualityText = computed(() => {
  const v = qualityValue.value;
  const format = currentFormat.value;
  
  if (format === 'png' && v >= 98) {
    return t('videoSettings.qualityLossless');
  }
  
  if (v >= 90) return t('videoSettings.qualityVeryHigh');
  if (v >= 75) return t('videoSettings.qualityHigh');
  if (v >= 60) return t('videoSettings.qualityMedium');
  if (v >= 30) return t('videoSettings.qualityLow');
  return t('videoSettings.qualityVeryLow');
});

// 质量提示信息（含参数和色彩警告）
const qualityHintText = computed(() => {
  const v = qualityValue.value;
  const format = currentFormat.value;
  
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
    if (v >= 98) {
      // 顶端近似无损：直接显示无损方法提示
      paramHint = t('videoSettings.qualityLossless');
    } else {
      // PNG：显示色彩位数
      const colors = v >= 80 ? 256 : v >= 60 ? 128 : v >= 40 ? 96 : 64;
      paramHint = `${colors} ${t('videoSettings.colors')}`;
      
      // 当选择 256 及以下色彩数时，增加更多提示
      if (colors <= 256) {
        colorWarning = t('videoSettings.pngPaletteWarning');
      }
    }
  }
  
  return { paramHint, colorWarning };
});

// 分辨率下拉选项（根据原始分辨率自动生成 1080p/720p/480p）
const resolutionOptions = computed(() => {
  const opts: { value: string; label: string; tags?: string[] }[] = [];
  if (originalWidth.value && originalHeight.value) {
    const w = originalWidth.value;
    const h = originalHeight.value;
    opts.push({ value: 'original', label: `${w}x${h}`, tags: [t('videoSettings.original')] });

    const presets = [
      { w: 1920, h: 1080, name: '1080p' },
      { w: 1280, h: 720, name: '720p' },
      { w: 854, h: 480, name: '480p' }
    ];
    for (const p of presets) {
      if (w >= p.w && h >= p.h) {
        const scaled = scaleToFit(w, h, p.w, p.h);
        opts.push({ value: `${scaled.width}x${scaled.height}`, label: `${scaled.width}x${scaled.height}`, tags: [p.name] });
      }
    }
  } else {
    opts.push({ value: '1920x1080', label: '1920x1080', tags: ['1080p'] });
    opts.push({ value: '1280x720', label: '1280x720', tags: ['720p'] });
    opts.push({ value: '854x480', label: '854x480', tags: ['480p'] });
  }
  opts.push({ value: 'custom', label: t('videoSettings.custom') });
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
      const next: Partial<CompressionSettings> = { ...formatSettings.value, resolution: 'custom' as any };
      if (!next.customResolution) {
        if (originalWidth.value && originalHeight.value) {
          next.customResolution = { width: makeEven(originalWidth.value), height: makeEven(originalHeight.value) };
        } else {
          next.customResolution = { width: 1920, height: 1080 };
        }
      }
      formatSettings.value = next;
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
    const width = makeEven((w ?? 0));
    if (isAspectRatioLocked.value && aspectRatio.value > 0) {
      const height = makeEven(Math.round(width / aspectRatio.value));
      formatSettings.value = { ...formatSettings.value, customResolution: { width, height } };
    } else {
      const prev = formatSettings.value.customResolution || { width: 1920, height: 1080 };
      formatSettings.value = { ...formatSettings.value, customResolution: { ...prev, width } };
    }
    emitSettings();
  }
});

const customHeight = computed({
  get: () => formatSettings.value.customResolution?.height ?? undefined,
  set: (h: number | undefined) => {
    const height = makeEven((h ?? 0));
    if (isAspectRatioLocked.value && aspectRatio.value > 0) {
      const width = makeEven(Math.round(height * aspectRatio.value));
      formatSettings.value = { ...formatSettings.value, customResolution: { width, height } };
    } else {
      const prev = formatSettings.value.customResolution || { width: 1920, height: 1080 };
      formatSettings.value = { ...formatSettings.value, customResolution: { ...prev, height } };
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
    timeRange: undefined,
    videoCodec: 'image'
  } as CompressionSettings;
  
  // 更新到store
  if (currentTaskId.value) {
    taskSettingsStore.updateTaskSettings(currentTaskId.value, s);
  }
  
  // 保持与父组件的兼容性
  updateCurrentTaskSettings?.(s);
};

// 初始化设置从store加载
const initializeSettings = () => {
  if (currentTaskId.value) {
    const settings = taskSettingsStore.getTaskSettings(currentTaskId.value, 'image');
    isUpdatingFromTask.value = true;
    applySettingsFromTask(settings);
    nextTick(() => {
      isUpdatingFromTask.value = false;
    });
  } else {
    resetAllSettings();
  }
};

// 监听任务ID变化，重新加载设置
watch(() => currentTaskId.value, () => {
  initializeSettings();
}, { immediate: true });

// 从注入的任务设置恢复（当没有taskId时用于兼容，否则优先使用store，避免跨任务覆盖）
watch(() => injectedTaskSettings?.value, (s) => {
  if (!s) return;
  if (currentTaskId.value) return; // 有 taskId 时以 store 为准，避免覆盖
  isUpdatingFromTask.value = true;
  applySettingsFromTask(s);
  nextTick(() => {
    isUpdatingFromTask.value = false;
  });
}, { deep: true });

// 读取原始图片尺寸：监听 currentFile.originalUrl
onMounted(async () => {
  await nextTick();
  tryLoadOriginalDimensions();
  // 初次挂载时根据当前质量值刷新滑条UI
  updateQualitySliderUI();
  // 确保首次导入时格式有选中默认值
  if (!formatSettings.value.format) {
    formatSettings.value = { ...formatSettings.value, format: 'jpeg' };
    emitSettings();
  }
});

// 将面板中的更改持久化到当前任务设置（通过 emitSettings 已处理，此处仅防止意外程序化更新漏写）
watch([formatSettings, qualitySettings], () => {
  if (isUpdatingFromTask.value) return;
  emitSettings();
}, { deep: true });

// 应用设置到UI
function applySettingsFromTask(s: CompressionSettings) {
  // 格式
  if (s.format) formatSettings.value = { ...formatSettings.value, format: s.format };
  // 分辨率
  if (s.resolution) {
    if (s.resolution === 'custom' && s.customResolution) {
      formatSettings.value = { ...formatSettings.value, resolution: 'custom' as any, customResolution: { ...s.customResolution } };
    } else {
      formatSettings.value = { ...formatSettings.value, resolution: s.resolution as any, customResolution: undefined };
    }
  }
  // 质量（使用整体替换，避免浅响应导致的UI不同步）
  if (s.crfValue != null) {
    qualitySettings.value = { ...qualitySettings.value, crfValue: Number(s.crfValue) };
  }
  // 应用到滑条UI（确保首次加载或任务切换时UI正确）
  nextTick(() => updateQualitySliderUI());
}

// 重置所有设置为默认值
const resetAllSettings = () => {
  const defaults = taskSettingsStore.getDefaultImageSettings();
  formatSettings.value = {
    format: defaults.format,
    resolution: defaults.resolution,
    customResolution: defaults.customResolution
  };
  qualitySettings.value = {
    qualityType: defaults.qualityType,
    crfValue: defaults.crfValue
  };
  nextTick(() => updateQualitySliderUI());
};

// 读取原始图片尺寸：监听 currentFile.originalUrl（保持在此处）
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

// 辅助：仅更新滑条UI样式（不改变状态）
const updateQualitySliderUI = (val?: number) => {
  const percentage = typeof val === 'number' ? val : Number(qualitySettings.value.crfValue ?? 80);
  const slider = document.getElementById('image-quality-slider') as HTMLInputElement | null;
  if (slider) {
    slider.style.setProperty('--value-percent', `${percentage}%`);
  }
};

// 监听 quality 值变化，保持UI同步（包括从store回填的场景）
watch(() => qualitySettings.value.crfValue, (v) => {
  nextTick(() => updateQualitySliderUI(typeof v === 'number' ? v : undefined));
});

// 更新质量状态（更新样式并同步值+持久化）
const updateQualityState = () => {
  const percentage = qualityValue.value;
  updateQualitySliderUI(percentage);
  qualitySettings.value = { ...qualitySettings.value, crfValue: percentage };
  // 将更改持久化到store/父组件，开启记忆
  emitSettings();
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
