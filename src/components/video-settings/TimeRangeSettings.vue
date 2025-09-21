<template>
  <div class="time-range-settings">
    <div class="space-y-4">
      <!-- 标题和启用开关 -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ $t('videoSettings.customTimeRange') }}</h3>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            @click="clearTimeRange"
          >
            {{ $t('common.reset') }}
          </button>
        </div>
        <button
          type="button"
          class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :class="enableTimeRange ? 'bg-[#518dd6] dark:bg-[#518dd6]' : 'bg-gray-200 dark:bg-gray-600'"
          @click="enableTimeRange = !enableTimeRange"
        >
          <span
            class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
            :class="enableTimeRange ? 'translate-x-5' : 'translate-x-1'"
          ></span>
        </button>
      </div>
        
        <!-- 快速选择按钮 -->
        <div class="mb-4" :class="{ 'opacity-50 pointer-events-none': !enableTimeRange }">
          <div class="flex gap-2 mb-3">
            <button
              type="button"
              class="flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors"
              :class="[
                selectedQuickOption === 'random30s' ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                isRandomButtonDisabled('random30s') ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              @click="selectQuickOption('random30s')"
              :disabled="!enableTimeRange || isRandomButtonDisabled('random30s')"
            >
              {{ $t('videoSettings.random30s') }}
            </button>
            <button
              type="button"
              class="flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors"
              :class="[
                selectedQuickOption === 'random1m' ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                isRandomButtonDisabled('random1m') ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              @click="selectQuickOption('random1m')"
              :disabled="!enableTimeRange || isRandomButtonDisabled('random1m')"
            >
              {{ $t('videoSettings.random1min') }}
            </button>
            <button
              type="button"
              class="flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors"
              :class="[
                selectedQuickOption === 'random5m' ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                isRandomButtonDisabled('random5m') ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              @click="selectQuickOption('random5m')"
              :disabled="!enableTimeRange || isRandomButtonDisabled('random5m')"
            >
              {{ $t('videoSettings.random5min') }}
            </button>
          </div>
        </div>
        
        <!-- 时间设置 -->
        <div class="space-y-3" :class="{ 'opacity-50 pointer-events-none': !enableTimeRange }">
          <div class="flex gap-3">
            <input
              v-model="timeRange.start"
              type="time"
              step="1"
              placeholder="00:00:00"
              class="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#222221] text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              @input="validateTimeInput('start', $event)"
            />
            <input
              v-model="timeRange.end"
              type="time"
              step="1"
              :placeholder="metadata ? formatDuration(metadata.duration) : $t('videoSettings.endTimePlaceholder')"
              class="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#222221] text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              @input="validateTimeInput('end', $event)"
            />
          </div>
          
          <!-- 验证错误提示 -->
          <div v-if="!timeValidation.isValid" class="text-xs text-red-500 dark:text-red-400">
            {{ timeValidation.message }}
          </div>
        </div>
      
        
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useGlobalSettingsStore } from '../../stores/useGlobalSettingsStore';

interface TimeRangeData {
  start: string;
  end: string;
}

interface Props {
  modelValue: {
    enabled: boolean;
    timeRange: TimeRangeData;
  };
  metadata?: {
    duration: number;
    [key: string]: any;
  };
}

interface Emits {
  (e: 'update:modelValue', value: { enabled: boolean; timeRange: TimeRangeData }): void;
  (e: 'validationChange', isValid: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const globalSettings = useGlobalSettingsStore();
// 移除弹出框相关代码，改为一级页面设置
const selectedQuickOption = ref<string | null>(null);

// 使用本地状态管理设置
const settings = ref({
  enabled: props.modelValue.enabled,
  timeRange: {
    start: props.modelValue.timeRange.start,
    end: props.modelValue.timeRange.end
  }
});

// 启用时间段的计算属性
const enableTimeRange = computed({
  get: () => settings.value.enabled,
  set: (value: boolean) => {
    settings.value.enabled = value;
  }
});

// 时间范围的计算属性
const timeRange = computed({
  get: () => settings.value.timeRange,
  set: (value: TimeRangeData) => {
    settings.value.timeRange = value;
  }
});

// 标记是否正在内部更新，避免递归
let isInternalUpdate = false;

// 监听设置变化并发射事件
watch(settings, (newSettings) => {
  if (isInternalUpdate) return;
  
  emit('update:modelValue', {
    enabled: newSettings.enabled,
    timeRange: {
      start: newSettings.timeRange.start,
      end: newSettings.timeRange.end
    }
  });
}, { deep: true });

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  isInternalUpdate = true;
  settings.value = {
    enabled: newValue.enabled,
    timeRange: {
      start: newValue.timeRange.start,
      end: newValue.timeRange.end
    }
  };
  
  // 根据时间设置推断快速选项状态
  updateQuickOptionFromTimeRange();
  
  // 重置标记
  nextTick(() => {
    isInternalUpdate = false;
  });
}, { deep: true });

// 根据时间范围推断快速选项
const updateQuickOptionFromTimeRange = () => {
  if (!settings.value.enabled) {
    selectedQuickOption.value = null;
    return;
  }
  
  const startTime = settings.value.timeRange.start;
  const endTime = settings.value.timeRange.end;
  
  // 如果开始时间是00:00:00，检查结束时间是否匹配快速选项
  if (startTime === '00:00:00') {
    const endSeconds = timeToSeconds(endTime);
    if (endSeconds === 30) {
      selectedQuickOption.value = 'random30s';
    } else if (endSeconds === 60) {
      selectedQuickOption.value = 'random1m';
    } else if (endSeconds === 300) {
      selectedQuickOption.value = 'random5m';
    } else {
      selectedQuickOption.value = null;
    }
  } else {
    selectedQuickOption.value = null;
  }
};

// 在组件初始化时调用一次
onMounted(() => {
  updateQuickOptionFromTimeRange();
});

// 时间转换函数
const timeToSeconds = (timeStr: string): number | null => {
  if (!timeStr || timeStr === '00:00:00') return null;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  return hours * 3600 + minutes * 60 + seconds;
};

// 秒数转时间字符串
const secondsToTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 判断随机时间按钮是否应该禁用
const isRandomButtonDisabled = (option: string): boolean => {
  if (!props.metadata?.duration) return false;
  
  const videoDuration = props.metadata.duration;
  
  switch (option) {
    case 'random30s':
      return videoDuration < 30;
    case 'random1m':
      return videoDuration < 60;
    case 'random5m':
      return videoDuration < 300;
    default:
      return false;
  }
};

// 快速选择时间段
const selectQuickOption = (option: string) => {
  // 如果按钮被禁用，不执行任何操作
  if (isRandomButtonDisabled(option)) return;
  
  // 如果点击的是已选中的选项，则取消选择
  if (selectedQuickOption.value === option) {
    selectedQuickOption.value = null;
    clearTimeRange();
    return;
  }
  
  selectedQuickOption.value = option;
  
  if (!props.metadata?.duration) return;
  
  const videoDuration = props.metadata.duration;
  let duration: number;
  
  switch (option) {
    case 'random30s':
      duration = 30;
      break;
    case 'random1m':
      duration = 60;
      break;
    case 'random5m':
      duration = 300;
      break;
    default:
      return;
  }
  
  // 确保时间段不超过视频时长
  const maxStartTime = Math.max(0, videoDuration - duration);
  const randomStartTime = Math.floor(Math.random() * (maxStartTime + 1));
  const endTime = Math.min(randomStartTime + duration, videoDuration);
  
  // 启用时间段并设置随机时间
  settings.value = {
    enabled: true,
    timeRange: {
      start: secondsToTime(randomStartTime),
      end: secondsToTime(endTime)
    }
  };
};

// 验证时间输入
const validateTimeInput = (type: 'start' | 'end', event: Event) => {
  const input = event.target as HTMLInputElement;
  const timeValue = input.value;
  
  if (!timeValue || !props.metadata) return;
  
  const timeSeconds = timeToSeconds(timeValue);
  const videoDurationSeconds = Math.floor(props.metadata.duration);
  
  if (timeSeconds !== null && timeSeconds > videoDurationSeconds) {
    // 如果输入的时间超过视频时长，设置为视频时长
    const maxTime = secondsToTime(videoDurationSeconds);
    if (type === 'start') {
      timeRange.value.start = maxTime;
    } else {
      timeRange.value.end = maxTime;
    }
  }
};

// 时间验证
const timeValidation = computed(() => {
  if (!settings.value.enabled) return { isValid: true, message: '' };
  
  const startTime = settings.value.timeRange.start;
  const endTime = settings.value.timeRange.end;
  
  if (!props.metadata) return { isValid: true, message: '' };
  
  const videoDurationSeconds = Math.floor(props.metadata.duration);
  
  // 验证开始时间不能超过视频时长
  const startSeconds = timeToSeconds(startTime || '00:00:00');
  if (startSeconds !== null && startSeconds >= videoDurationSeconds) {
    return { isValid: false, message: '开始时间不能超过视频时长' };
  }
  
  // 验证结束时间
  if (endTime && endTime !== '00:00:00') {
    const endSeconds = timeToSeconds(endTime);
    
    if (endSeconds !== null) {
      // 结束时间不能超过视频时长
      if (endSeconds > videoDurationSeconds) {
        return { isValid: false, message: '结束时间不能超过视频时长' };
      }
      
      // 结束时间必须大于开始时间
      if (startSeconds !== null && endSeconds <= startSeconds) {
        return { isValid: false, message: '结束时间必须大于开始时间' };
      }
    }
  }
  
  return { isValid: true, message: '' };
});

// 清除时间段设置
const clearTimeRange = () => {
  selectedQuickOption.value = null;
  settings.value = {
    enabled: false,
    timeRange: {
      start: '00:00:00',
      end: '00:00:00'
    }
  };
};

// 格式化时长
const formatDuration = (duration: number): string => {
  if (duration === 0) return 'Unknown';
  
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
};

// 监听启用状态变化
watch(enableTimeRange, (newValue) => {
  if (isInternalUpdate) return;
  
  if (!newValue) {
    // 禁用时重置时间范围
    timeRange.value = {
      start: '00:00:00',
      end: '00:00:00'
    };
  } else if (newValue) {
    // 启用时，设置默认值
    if (props.metadata) {
      const videoDurationSeconds = Math.floor(props.metadata.duration);
      
      // 如果开始时间为空或超过视频时长，设置为00:00:00
      const currentStartSeconds = timeToSeconds(timeRange.value.start);
      if (!currentStartSeconds || currentStartSeconds >= videoDurationSeconds) {
        timeRange.value.start = '00:00:00';
      }

      // 如果结束时间为空、为0或超过视频时长，设置为视频时长
        const currentEndSeconds = timeToSeconds(timeRange.value.end);
        if (!currentEndSeconds || currentEndSeconds === 0 || currentEndSeconds > videoDurationSeconds) {
          timeRange.value.end = secondsToTime(videoDurationSeconds);
        }
    } else {
      // 如果没有metadata，尝试从辅助函数设置
      setEndTimeFromMetadata();
    }
  }
});

// 监听metadata变化，自动设置结束时间默认值
watch(() => props.metadata, (newMetadata) => {
  if (newMetadata && enableTimeRange.value) {
    // 检查当前设置的结束时间是否超过新视频的时长
    const currentEndSeconds = timeToSeconds(timeRange.value.end);
    const videoDurationSeconds = Math.floor(newMetadata.duration);
    
    // 如果当前结束时间为空、为0或超过视频时长，则设置为视频时长
    if (!currentEndSeconds || currentEndSeconds === 0 || currentEndSeconds > videoDurationSeconds) {
      timeRange.value.end = secondsToTime(videoDurationSeconds);
    }
    
    // 同样检查开始时间
    const currentStartSeconds = timeToSeconds(timeRange.value.start);
    if (currentStartSeconds && currentStartSeconds >= videoDurationSeconds) {
      timeRange.value.start = '00:00:00';
    }
  }
});

// 监听验证状态变化
watch(timeValidation, (validation) => {
  emit('validationChange', validation.isValid);
}, { immediate: true });

// 全局metadata更新事件监听
const handleMetadataUpdate = (event: CustomEvent) => {
  const { metadata } = event.detail;
  if (metadata && metadata.duration) {
    console.log('TimeRangeSettings: 收到metadata更新事件', metadata);
    // 如果当前启用了时间段且结束时间为空或为00:00:00，自动设置为视频时长
    if (enableTimeRange.value && (!timeRange.value.end || timeRange.value.end === '00:00:00')) {
      const videoDurationSeconds = Math.floor(metadata.duration);
      timeRange.value.end = secondsToTime(videoDurationSeconds);
      console.log('TimeRangeSettings: 自动设置结束时间为', timeRange.value.end);
    }
  }
};

// 设置结束时间的辅助函数
const setEndTimeFromMetadata = () => {
  if (props.metadata && props.metadata.duration) {
    const videoDurationSeconds = Math.floor(props.metadata.duration);
    if (!timeRange.value.end || timeRange.value.end === '00:00:00') {
      timeRange.value.end = secondsToTime(videoDurationSeconds);
      console.log('TimeRangeSettings: 从props.metadata设置结束时间为', timeRange.value.end);
    }
  }
};

onMounted(() => {
  window.addEventListener('video-metadata-updated', handleMetadataUpdate as EventListener);
});

onUnmounted(() => {
  window.removeEventListener('video-metadata-updated', handleMetadataUpdate as EventListener);
});
</script>