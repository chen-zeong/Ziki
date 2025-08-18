<template>
  <div class="relative time-range-dropdown">
    <!-- 自定义时间段按钮 -->
    <button
      type="button"
      class="flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
      :class="hasTimeRange ? 'bg-amber-500 text-white hover:bg-amber-600' : 'text-gray-700 dark:text-gray-300'"
      :style="hasTimeRange ? {} : { backgroundColor: '#e5e7eb !important' }"
      @click="showTimeRangeModal = !showTimeRangeModal"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span class="text-sm">{{ $t('videoSettings.timeRange') }}</span>
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>
    
    <!-- 时间段设置悬浮面板 -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-2"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-2"
    >
      <div v-if="showTimeRangeModal" class="absolute bottom-full right-0 mb-2 w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-700/50 z-50">
        <div class="p-4">
          <!-- 标题和启用开关 -->
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ $t('videoSettings.customTimeRange') }}</h3>
            <button
              type="button"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              :class="enableTimeRange ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-600'"
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
                  selectedQuickOption === 'random30s' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
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
                  selectedQuickOption === 'random1m' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
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
                  selectedQuickOption === 'random5m' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
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
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('videoSettings.startTime') }}</label>
              <input
                v-model="timeRange.start"
                type="time"
                step="1"
                placeholder="00:00:00"
                class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                :style="{ backgroundColor: isDark ? '#222221' : 'white' }"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('videoSettings.endTime') }}</label>
              <input
                v-model="timeRange.end"
                type="time"
                step="1"
                :placeholder="metadata ? formatDuration(metadata.duration) : $t('videoSettings.endTimePlaceholder')"
                class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                :style="{ backgroundColor: isDark ? '#222221' : 'white' }"
              />
            </div>
            
            <!-- 验证错误提示 -->
            <div v-if="!timeValidation.isValid" class="text-xs text-red-500 dark:text-red-400">
              {{ timeValidation.message }}
            </div>
          </div>
        
          <!-- 按钮组 -->
          <div class="flex gap-2 mt-4">
            <button
              type="button"
              class="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              @click="clearTimeRange"
            >
              {{ $t('common.clear') }}
            </button>
            <button
              type="button"
              class="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              :class="timeValidation.isValid ? 'text-white bg-amber-500 hover:bg-amber-600' : 'text-gray-400 bg-gray-200 dark:bg-gray-600 cursor-not-allowed'"
              :disabled="!timeValidation.isValid"
              @click="timeValidation.isValid && (showTimeRangeModal = false)"
            >
              {{ $t('common.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTheme } from '../../composables/useTheme';

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
  'update:modelValue': [value: { enabled: boolean; timeRange: TimeRangeData }];
  'validationChange': [isValid: boolean];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { isDark } = useTheme();
const showTimeRangeModal = ref(false);
const selectedQuickOption = ref<string | null>(null);

const settings = computed({
  get() {
    return props.modelValue;
  },
  set(newValue) {
    emit('update:modelValue', newValue);
  }
});

const enableTimeRange = computed({
  get() {
    return settings.value.enabled;
  },
  set(enabled) {
    settings.value = { ...settings.value, enabled };
  }
});

const timeRange = computed({
  get() {
    return settings.value.timeRange;
  },
  set(newTimeRange) {
    settings.value = { ...settings.value, timeRange: newTimeRange };
  }
});

// 计算属性：是否设置了时间段
const hasTimeRange = computed(() => {
  return settings.value.enabled;
});

// 时间格式转换：HH:MM:SS 转换为秒数
const timeToSeconds = (timeStr: string): number | null => {
  if (!timeStr || timeStr === '00:00:00') return null
  const parts = timeStr.split(':')
  if (parts.length !== 3) return null
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  const seconds = parseInt(parts[2], 10)
  return hours * 3600 + minutes * 60 + seconds
}

// 秒数转换为时间格式：HH:MM:SS
const secondsToTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

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
    selectedQuickOption.value = null
    clearTimeRange()
    return
  }
  
  selectedQuickOption.value = option
  
  let duration: number
  switch (option) {
    case 'random30s':
      duration = 30
      break
    case 'random1m':
      duration = 60
      break
    case 'random5m':
      duration = 300
      break
    default:
      return
  }
  
  // 启用时间段并设置随机时间
  settings.value = {
    enabled: true,
    timeRange: {
      start: '00:00:00', // 这里可以后续改为随机开始时间
      end: secondsToTime(duration)
    }
  }
}

// 时间验证
const timeValidation = computed(() => {
  if (!settings.value.enabled) return { isValid: true, message: '' }
  
  const startTime = settings.value.timeRange.start
  const endTime = settings.value.timeRange.end
  
  // 如果结束时间不是00:00:00且不为空，需要验证
  if (endTime && endTime !== '00:00:00') {
    const startSeconds = timeToSeconds(startTime || '00:00:00')
    const endSeconds = timeToSeconds(endTime)
    
    if (startSeconds !== null && endSeconds !== null && endSeconds <= startSeconds) {
      return { isValid: false, message: 'End time must be greater than start time' }
    }
  }
  
  return { isValid: true, message: '' }
})

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
  if (!newValue) {
    // 禁用时重置时间范围
    timeRange.value = {
      start: '00:00:00',
      end: '00:00:00'
    };
  } else if (newValue && props.metadata) {
    // 启用时设置结束时间为视频时长
    timeRange.value.end = secondsToTime(Math.floor(props.metadata.duration));
  }
  
  // 发射更新事件
  emit('update:modelValue', {
    enabled: newValue,
    timeRange: timeRange.value
  });
});

// 监听metadata变化，自动设置结束时间默认值
watch(() => props.metadata, (newMetadata) => {
  if (newMetadata && enableTimeRange.value) {
    // 当有新的metadata时，更新结束时间为视频实际时长
    timeRange.value.end = secondsToTime(Math.floor(newMetadata.duration));
  }
});

// 监听验证状态变化
watch(timeValidation, (validation) => {
  emit('validationChange', validation.isValid);
}, { immediate: true });
</script>