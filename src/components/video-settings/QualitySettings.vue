<template>
  <div class="bg-gray-50 dark:bg-[#1e1e1e] p-3 rounded-lg overflow-visible max-h-full quality-slider-container">
    <div class="space-y-4">
      <!-- 标题和质量等级 -->
      <div class="flex justify-between items-center mb-4">
        <label class="font-medium text-sm text-slate-600 dark:text-dark-secondary">画质</label>
        <div class="text-right">
          <span class="font-medium text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-600">{{ qualityText }}</span>
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
          
          <!-- 气泡提示框 -->
          <div 
            class="absolute bottom-full mb-2 pointer-events-none transform -translate-x-1/2 z-10 transition duration-150 ease-out"
            :class="{ 'opacity-100 translate-y-0 scale-100': showTooltip, 'opacity-0 -translate-y-1 scale-95': !showTooltip }"
            :style="{ left: qualityValue + '%', willChange: 'transform, opacity' }"
          >
            <div class="tooltip-bubble">
              {{ currentParamDisplay }}
            </div>
          </div>
        </div>

        <!-- 透明的 range input 处理逻辑 -->
        <input 
          type="range" 
          id="quality-slider" 
          v-model="qualityValue"
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
      </div>
      
      <!-- 高bit率选项 -->
      <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-center mb-3">
          <label class="font-medium text-sm text-slate-600 dark:text-dark-secondary">色彩深度</label>
          <div class="text-right">
            <span class="font-medium text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-600">{{ bitDepthText }}</span>
          </div>
        </div>
        
        <div class="flex gap-1.5">
          <!-- 8bit按钮（默认） -->
          <button
            @click="setBitDepth(8)"
            :class="[
              'flex-1 h-8 px-3 rounded-md text-xs font-medium transition-all duration-150 border',
              selectedBitDepth === 8
                ? 'text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm active:scale-[0.98]'
            ]"
            :style="selectedBitDepth === 8 ? { backgroundColor: '#558ee1', borderColor: '#558ee1' } : {}"
          >
            8bit
          </button>
          
          <!-- 10bit按钮 -->
          <button
            @click="setBitDepth(10)"
            :disabled="!canUse10bit"
            :title="!canUse10bit ? '源视频位深不足，无法升到10bit（仅支持向下转换）' : ''"
            :class="[
              'flex-1 h-8 px-3 rounded-md text-xs font-medium transition-all duration-150 border',
              selectedBitDepth === 10
                ? 'text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm active:scale-[0.98]',
              !canUse10bit ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            ]"
            :style="selectedBitDepth === 10 ? { backgroundColor: '#558ee1', borderColor: '#558ee1' } : {}"
          >
            10bit
          </button>
          
          <!-- 12bit按钮 -->
          <button
            @click="setBitDepth(12)"
            :disabled="!canUse12bit"
            :title="!canUse12bit ? '源视频位深不足，无法升到12bit（仅支持向下转换）' : ''"
            :class="[
              'flex-1 h-8 px-3 rounded-md text-xs font-medium transition-all duration-150 border',
              selectedBitDepth === 12
                ? 'text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-sm active:scale-[0.98]',
              !canUse12bit ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            ]"
            :style="selectedBitDepth === 12 ? { backgroundColor: '#558ee1', borderColor: '#558ee1' } : {}"
          >
            12bit
          </button>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, withDefaults, onMounted, inject, nextTick } from 'vue';
import type { CompressionSettings } from '../../types';
import { 
  getQualityLevelIndex, 
  getEncoderQualityParam, 
  getDefaultQualityParam,
  QUALITY_LEVELS 
} from '../../config/qualityMappings';
// 注入当前文件信息
const currentFile = inject<{ value: any }>('currentFile');

interface Props {
  modelValue: Partial<CompressionSettings>;
  resolution?: string;
  isHardwareAccelerated?: boolean;
  currentVideoCodec?: string;
}

interface Emits {
  'update:modelValue': [value: Partial<CompressionSettings>];
}

const props = withDefaults(defineProps<Props>(), {
  isHardwareAccelerated: false,
  currentVideoCodec: ''
});
const emit = defineEmits<Emits>();

// 质量滑动条值 (0-100)
const qualityValue = ref(80);

// 由滑块驱动更新的标志，避免循环
const isUpdatingFromSlider = ref(false);

// 气泡提示框显示状态
const showTooltip = ref(false);

// bit深度相关
const selectedBitDepth = ref<8 | 10 | 12>(8);

// bit深度文本显示
const bitDepthText = computed(() => {
  return `${selectedBitDepth.value}bit`;
});

// 是否可以使用10bit
const canUse10bit = computed(() => {
  const depth = getOriginalBitDepth();
  return depth >= 10;
});

// 是否可以使用12bit
const canUse12bit = computed(() => {
  const depth = getOriginalBitDepth();
  return depth >= 12;
});



// 设置bit深度
const setBitDepth = (depth: 8 | 10 | 12) => {
  const originalDepth = getOriginalBitDepth();
  // 只能向下转换：禁止选择高于原始位深的目标位深
  if (depth > originalDepth) return;

  selectedBitDepth.value = depth;
  
  // 更新设置
  const newSettings: Partial<CompressionSettings> = {
    ...settings.value,
    bitDepth: depth
  };
  
  settings.value = newSettings;
  emit('update:modelValue', settings.value);
};

// 解析视频原始bit深度（兼容字符串/数字），默认返回8
const getOriginalBitDepth = (): number => {
  const val = currentFile?.value?.metadata?.colorDepth as unknown;
  if (typeof val === 'number') return val;
  if (!val) return 8;
  const s = String(val).toLowerCase();
  // 优先匹配更高位深
  if (s.includes('16')) return 16;
  if (s.includes('12')) return 12;
  if (s.includes('10')) return 10;
  if (s.includes('8')) return 8;
  // Regex兜底（提取第一个1-2位数字）
  const m = s.match(/(\d{1,2})/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n)) return n;
  }
  return 8;
};

// 初始化设置
const initializeSettings = () => {
  const defaultParam = getDefaultQualityParam(
    props.currentVideoCodec || 'h264',
    props.isHardwareAccelerated || false
  );
  
  const baseSettings: Partial<CompressionSettings> = {
    qualityType: defaultParam.paramType as 'crf' | 'qv' | 'profile'
  };
  
  // 根据参数类型设置对应的默认值
  if (defaultParam.paramType === 'crf') {
    baseSettings.crfValue = defaultParam.value as number;
  } else if (defaultParam.paramType === 'qv') {
    baseSettings.qvValue = defaultParam.value as number;
  } else if (defaultParam.paramType === 'profile') {
    baseSettings.profileValue = defaultParam.value as string;
  }
  
  // 初始化bit深度 - 根据视频原始bit深度自动选择
  const originalDepth = getOriginalBitDepth();
  let initialBitDepth: 8 | 10 | 12;
  if (originalDepth >= 12) {
    initialBitDepth = 12;
  } else if (originalDepth >= 10) {
    initialBitDepth = 10;
  } else {
    initialBitDepth = 8;
  }
  
  // 如果props中有指定的bitDepth，则使用props的值，否则使用初始化的值
  const finalBitDepth = props.modelValue.bitDepth ?? initialBitDepth;
  selectedBitDepth.value = finalBitDepth;
  
  return {
    ...baseSettings,
    bitDepth: finalBitDepth,
    ...props.modelValue
  };
};

const settings = ref<Partial<CompressionSettings>>(initializeSettings());

// 从现有设置推导滑块值（记忆与回填）
const deriveSliderFromModel = (): number => {
  const codec = props.currentVideoCodec || 'h264';
  const isHW = props.isHardwareAccelerated || false;
  const type = (props.modelValue.qualityType ?? getDefaultQualityParam(codec, isHW).paramType) as 'crf' | 'qv' | 'profile';

  // 取目标参数值
  let target: number | string | undefined;
  if (type === 'crf') target = props.modelValue.crfValue;
  else if (type === 'qv') target = props.modelValue.qvValue;
  else target = props.modelValue.profileValue;

  // 若无目标值，返回默认滑块
  if (target === undefined || target === null) {
    const d = getDefaultQualityParam(codec, isHW);
    return d.sliderValue;
  }

  // profile 离散映射
  if (type === 'profile') {
    const idx = ['proxy', 'lt', 'standard', 'hq', '4444'].indexOf(String(target).toLowerCase());
    const clamped = idx >= 0 ? idx : 3;
    const level = QUALITY_LEVELS[clamped];
    return Math.round((level.range[0] + level.range[1]) / 2);
  }

  // 数值型：遍历寻找最接近的滑块位置
  const targetNum = Number(target);
  if (Number.isNaN(targetNum)) {
    const d = getDefaultQualityParam(codec, isHW);
    return d.sliderValue;
  }

  let bestSlider = 60;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let s = 2; s <= 98; s++) {
    const p = getEncoderQualityParam(codec, isHW, s);
    if (p.paramType !== type) continue;
    const v = Number(p.value);
    const delta = Math.abs(v - targetNum);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestSlider = s;
      if (delta === 0) break;
    }
  }
  return bestSlider;
};

// 初始化滑动条值（优先根据已存在的modelValue推导）
const initializeQualityValue = () => {
  qualityValue.value = deriveSliderFromModel();
};

// 初始化
initializeQualityValue();



// 将滑动条值映射到质量描述文本
const qualityText = computed(() => {
  const value = qualityValue.value;
  if (value <= 20) return '极低质量'; // 2-20
  if (value <= 40) return '低质量';   // 21-40
  if (value <= 60) return '中等质量'; // 41-60
  if (value <= 85) return '高质量';   // 61-85
  return '极高质量';                  // 86-98
});

// 当前参数显示（用于气泡提示框）
const currentParamDisplay = computed(() => {
  const param = getEncoderQualityParam(
    props.currentVideoCodec || 'h264',
    props.isHardwareAccelerated || false,
    qualityValue.value
  );
  
  if (param.paramType === 'crf') {
    return `CRF: ${param.value}`;
  } else if (param.paramType === 'qv') {
    return `-q:v ${param.value}`;
  } else if (param.paramType === 'profile') {
    return `Profile: ${param.value}`;
  }
  
  return `${param.paramType}: ${param.value}`;
});



// 更新质量状态
const updateQualityState = () => {
  isUpdatingFromSlider.value = true;
  // 更新滑动条填充百分比
  const percentage = qualityValue.value;
  const slider = document.getElementById('quality-slider') as HTMLInputElement;
  if (slider) {
    slider.style.setProperty('--value-percent', `${percentage}%`);
  }
  
  // 获取当前编码器的质量参数（连续调节）
  const param = getEncoderQualityParam(
    props.currentVideoCodec || 'h264',
    props.isHardwareAccelerated || false,
    qualityValue.value
  );
  

  
  // 更新设置
  const newSettings: Partial<CompressionSettings> = {
    ...settings.value,
    qualityType: param.paramType as 'crf' | 'qv' | 'profile'
  };
  
  // 根据参数类型设置对应的值
  if (param.paramType === 'crf') {
    newSettings.crfValue = param.value as number;
  } else if (param.paramType === 'qv') {
    newSettings.qvValue = param.value as number;
  } else if (param.paramType === 'profile') {
    newSettings.profileValue = param.value as string;
  }
  
  // 确保保留bitDepth字段
  newSettings.bitDepth = settings.value.bitDepth || selectedBitDepth.value;
  
  settings.value = newSettings;
  

  
  // 发送更新事件
  emit('update:modelValue', settings.value);

  // 下一帧再清除标志，避免本轮 props 回流触发二次推导
  nextTick(() => { isUpdatingFromSlider.value = false; });
};

// 监听外部modelValue变化
watch(() => props.modelValue, (newVal) => {
  // 合并到内部设置
  settings.value = { ...settings.value, ...newVal };
  // 更新bit深度状态
  if (newVal.bitDepth !== undefined) {
    selectedBitDepth.value = newVal.bitDepth as 8 | 10 | 12;
  }
  // 若不是滑块主动触发的更新，则根据新的模型值推导滑块位置，实现“记忆”
  if (!isUpdatingFromSlider.value) {
    const derived = deriveSliderFromModel();
    if (derived !== qualityValue.value) {
      qualityValue.value = derived;
    }
  }
}, { deep: true, immediate: true });

// 监听当前文件位深变化，智能默认选择（仅当外部未指定bitDepth时）
watch(() => currentFile?.value?.metadata?.colorDepth, () => {
  if (props.modelValue.bitDepth !== undefined) return;
  const d = getOriginalBitDepth();
  const auto = d >= 12 ? 12 : d >= 10 ? 10 : 8;
  if (auto !== selectedBitDepth.value) {
    selectedBitDepth.value = auto;
    settings.value = { ...settings.value, bitDepth: auto };
    emit('update:modelValue', settings.value);
  }
});

// 监听编码器和硬件加速变化，重新初始化参数
watch([() => props.currentVideoCodec, () => props.isHardwareAccelerated], () => {
  // 重新初始化设置
  settings.value = initializeSettings();
  // 根据最新的（可能来自外部记忆的）值推导滑块
  const derived = deriveSliderFromModel();
  qualityValue.value = derived;
  // 同步一次状态
  updateQualityState();
}, { immediate: false });

// 监听质量值变化
watch(qualityValue, updateQualityState);

// 组件挂载时初始化滑动条状态
onMounted(() => {
  updateQualityState();
});



</script>

<style scoped>
/* 隐藏原生 range 输入框的滑块 */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none; 
  width: 0;
  height: 0;
}

input[type="range"]::-moz-range-thumb {
  width: 0;
  height: 0;
  border: 0;
}
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
  white-space: nowrap;
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