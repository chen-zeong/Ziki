<template>
  <div class="bg-gray-50 dark:bg-[#1e1e1e] p-3 rounded-lg overflow-visible max-h-full">
    <div class="space-y-4">

      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="font-medium text-sm text-slate-600 dark:text-dark-secondary">画质</label>
          <!-- Tab 切换 -->
          <div class="relative flex bg-gray-100 dark:bg-dark-border rounded-md p-1 h-8">
            <!-- 滑动背景 -->
            <div 
              class="absolute top-1 bottom-1 dark:bg-gray-300 rounded-md transition-all duration-300 ease-out shadow-md"
              :style="{
                width: 'calc(50% - 4px)',
                left: qualityMode === 'crf' ? '4px' : 'calc(50% + 2px)',
                transform: qualityMode === 'crf' ? 'translateX(0)' : 'translateX(-2px)',
                backgroundColor: 'var(--slider-bg-color, #b1b1b1)'
              }"
            ></div>
            
            <button
              type="button"
              class="flex-1 px-4 py-1 text-xs font-medium transition-all duration-300 ease-out rounded-md relative z-10 whitespace-nowrap"
              :class="qualityMode === 'crf' ? 'text-white dark:text-gray-800' : 'text-gray-600 dark:text-dark-secondary hover:text-gray-800 dark:hover:text-dark-text'"
              @click="qualityMode = 'crf'"
            >
              CRF
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-1 text-xs font-medium transition-all duration-300 ease-out rounded-md relative z-10 whitespace-nowrap"
              :class="qualityMode === 'bitrate' ? 'text-white dark:text-gray-800' : 'text-gray-600 dark:text-dark-secondary hover:text-gray-800 dark:hover:text-dark-text'"
              @click="qualityMode = 'bitrate'"
            >
              码率
            </button>
          </div>
        </div>
        
        <!-- Tab 内容 -->
        <div v-if="qualityMode === 'crf'" class="transition-all duration-200">
          <div class="flex items-center space-x-2">
            <div class="w-2/3">
              <CustomNumberInput
                v-model="crfValue"
                :min="0"
                :max="51"
                placeholder="CRF值 (0-51)"
              />
            </div>
            <span 
              class="px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap"
              :class="crfColorClass"
            >
              {{ crfQualityText }}
            </span>
          </div>
          <div v-if="crfValidationError" class="text-xs text-red-500 dark:text-red-400 mt-1">
            {{ crfValidationError }}
          </div>
          <div v-else class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            推荐值：18-28，数值越小质量越高
          </div>
        </div>
        
        <div v-if="qualityMode === 'bitrate'" class="transition-all duration-200">
          <div class="flex items-center space-x-2">
            <div class="flex-1">
              <CustomNumberInput
                v-model="bitrateValue"
                :min="100"
                :max="50000"
                placeholder="码率 (kbps)"
              />
            </div>
            <span class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              kbps
            </span>
            <span 
              class="px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap"
              :class="bitrateQualityClass"
            >
              {{ bitrateQualityText }}
            </span>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ resolutionBitrateHint }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, withDefaults } from 'vue';
import CustomNumberInput from '../common/CustomNumberInput.vue';
import CustomSelect from '../common/CustomSelect.vue';
import type { CompressionSettings } from '../../types';

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

const settings = ref<Partial<CompressionSettings>>({
  qualityType: 'crf',
  crfValue: 23,
  ...props.modelValue
});

const qualityMode = ref('crf');
const bitrateValue = ref(5000);



// 标记是否正在更新，避免循环
const isUpdating = ref(false);

const emitUpdate = () => {
  if (isUpdating.value) return;
  
  const updatedSettings = {
    ...settings.value,
    bitrate: settings.value.qualityType === 'bitrate' ? `${bitrateValue.value}k` : undefined
  };
  emit('update:modelValue', updatedSettings);
};

// 为CRF值创建computed属性
const crfValue = computed({
  get: () => settings.value.crfValue ?? 23,
  set: (value: number) => {
    if (isUpdating.value) return;
    settings.value = { ...settings.value, crfValue: value };
    emitUpdate();
  }
});

const crfColorClass = computed(() => {
  const crf = settings.value.crfValue;
  if (crf === undefined || crf === null) {
    return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
  }
  if (crf < 0 || crf > 51) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  }
  if (crf >= 18 && crf <= 28) {
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
  }
  if (crf < 18) {
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
  }
  if (crf > 40) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  }
  return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
});

const crfQualityText = computed(() => {
  const crf = settings.value.crfValue;
  if (crf === undefined || crf === null) return '默认质量';
  if (crf < 0 || crf > 51) return '无效值';
  if (crf < 18) return '大体积';
  if (crf >= 18 && crf < 28) return '高质量';
  if (crf >= 28 && crf <= 40) return '中等质量';
  if (crf > 40) return '极低质量';
  return '可接受';
});

const crfValidationError = computed(() => {
  const crf = settings.value.crfValue;
  if (crf === undefined || crf === null) return '';
  if (crf < 0 || crf > 51) {
    return 'CRF值必须在0-51范围内';
  }
  return '';
});

// 根据分辨率获取推荐码率范围
const getRecommendedBitrateRange = (resolution: string) => {
  const resolutionMap: Record<string, { min: number; max: number; label: string }> = {
    '3840x2160': { min: 15000, max: 25000, label: '4K' },
    '2560x1440': { min: 8000, max: 16000, label: '1440p' },
    '1920x1080': { min: 5000, max: 8000, label: '1080p' },
    '1280x720': { min: 2500, max: 5000, label: '720p' },
    '854x480': { min: 1000, max: 2500, label: '480p' },
    '640x360': { min: 500, max: 1000, label: '360p' }
  };
  
  return resolutionMap[resolution] || { min: 2000, max: 6000, label: '标准' };
};

// 码率质量提示文本
const bitrateQualityText = computed(() => {
  const currentBitrate = bitrateValue.value;
  const resolution = props.resolution || '1920x1080';
  const range = getRecommendedBitrateRange(resolution);
  
  if (currentBitrate < range.min * 0.7) {
    return '低质量';
  } else if (currentBitrate >= range.min && currentBitrate <= range.max) {
    return '高质量';
  } else if (currentBitrate > range.max) {
    return '超高质量';
  } else {
    return '中等质量';
  }
});

// 码率质量提示样式
const bitrateQualityClass = computed(() => {
  const currentBitrate = bitrateValue.value;
  const resolution = props.resolution || '1920x1080';
  const range = getRecommendedBitrateRange(resolution);
  
  if (currentBitrate < range.min * 0.7) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  } else if (currentBitrate >= range.min && currentBitrate <= range.max) {
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
  } else if (currentBitrate > range.max) {
    return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
  } else {
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
  }
});

// 分辨率码率提示
const resolutionBitrateHint = computed(() => {
  const resolution = props.resolution || '1920x1080';
  const range = getRecommendedBitrateRange(resolution);
  return `推荐码率范围（${range.label}）：${range.min}-${range.max} kbps`;
});

// 监听外部modelValue变化，避免双向绑定冲突
watch(() => props.modelValue, (newVal) => {
  isUpdating.value = true;
  settings.value = { ...settings.value, ...newVal };
  isUpdating.value = false;
}, { deep: true });

// 监听画质模式变化
watch(qualityMode, () => {
  settings.value = { ...settings.value, qualityType: qualityMode.value as 'crf' | 'bitrate' };
  emitUpdate();
});

// 监听码率值变化
watch(bitrateValue, () => {
  emitUpdate();
});



</script>