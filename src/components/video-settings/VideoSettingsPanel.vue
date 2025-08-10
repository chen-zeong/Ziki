<template>
  <div class="space-y-6">
    <!-- 原始视频信息显示 -->
    <!-- <VideoInfoDisplay :metadata="currentVideoMetadata" /> -->
    
    <!-- 视频格式设置和音频设置 -->
    <div class="flex gap-6">
      <div class="flex-1">
        <VideoFormatSettings v-model="formatSettings" :metadata="currentVideoMetadata" />
      </div>
      <div class="flex-1">
        <AudioSettings v-model="audioAndQualitySettings" :metadata="currentVideoMetadata" />
      </div>
    </div>
    
    <!-- 按钮行：自定义时间段 + 硬件加速 + 开始压缩 -->
    <div class="flex gap-3 mt-6">
      <!-- 自定义时间段按钮 -->
      <TimeRangeSettings 
        v-model="timeRangeSettings" 
        :metadata="currentVideoMetadata"
        @validation-change="handleTimeValidationChange"
      />
      
      <!-- 硬件加速选择按钮 -->
      <HardwareAccelerationSettings 
        v-model="hardwareSettings" 
        :current-video-codec="formatSettings.videoCodec"
      />
      
      <!-- 开始压缩按钮 -->
      <button 
        class="flex-1 font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
        :class="isProcessing || !isTimeValid ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500'"
        :disabled="isProcessing || !isTimeValid"
        @click="startCompression"
      >
        {{ isProcessing ? '压缩中...' : '开始压缩' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, shallowRef, computed, inject } from 'vue';
import VideoFormatSettings from './VideoFormatSettings.vue';
import AudioSettings from './AudioSettings.vue';
import TimeRangeSettings from './TimeRangeSettings.vue';
import HardwareAccelerationSettings from './HardwareAccelerationSettings.vue';
import VideoInfoDisplay from './VideoInfoDisplay.vue';
import type { CompressionSettings, VideoFile } from '../../types';

// 注入当前文件信息
const currentFile = inject<{ value: VideoFile | null }>('currentFile');

// 计算当前视频的元数据
const currentVideoMetadata = computed(() => {
  return currentFile?.value?.metadata;
});

interface Props {
  isProcessing?: boolean;
  videoPath?: string;
}

interface Emits {
  compress: [settings: CompressionSettings];
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false
});

// 重置所有设置
const resetAllSettings = () => {
  formatSettings.value = {
    format: 'mp4',
    videoCodec: 'libx264',
    resolution: 'original'
  };
  audioAndQualitySettings.value = {
    audioCodec: 'aac',
    sampleRate: '44100',
    qualityType: 'crf',
    crfValue: 23
  };
  timeRangeSettings.value = {
    enabled: false,
    timeRange: {
      start: '00:00:00',
      end: '00:00:00'
    }
  };
  hardwareSettings.value = {
    value: 'cpu',
    name: 'CPU编码'
  };
};

// 监听 videoPath 变化，并在变化时重置设置
watch(() => props.videoPath, (newPath, oldPath) => {
  if (newPath && newPath !== oldPath) {
    resetAllSettings();
  }
});

const emit = defineEmits<Emits>();

// 使用shallowRef避免深度响应式导致的循环更新
const formatSettings = shallowRef<Partial<CompressionSettings>>({
  format: 'mp4',
  videoCodec: 'libx264',
  resolution: 'original'
});

const audioAndQualitySettings = shallowRef<Partial<CompressionSettings>>({
  audioCodec: 'aac',
  sampleRate: '44100',
  qualityType: 'crf',
  crfValue: 23
});

const timeRangeSettings = shallowRef({
  enabled: false,
  timeRange: {
    start: '00:00:00',
    end: '00:00:00'
  }
});

const hardwareSettings = shallowRef({
  value: 'cpu',
  name: 'CPU编码'
});

const isTimeValid = ref(true);

// 处理时间验证状态变化
const handleTimeValidationChange = (isValid: boolean) => {
  isTimeValid.value = isValid;
};

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

// 开始压缩
const startCompression = () => {
  // 合并所有设置
  const compressionSettings: CompressionSettings = {
    ...formatSettings.value,
    ...audioAndQualitySettings.value,
    // 添加时间段信息
    timeRange: timeRangeSettings.value.enabled ? {
      start: timeToSeconds(timeRangeSettings.value.timeRange.start),
      end: timeToSeconds(timeRangeSettings.value.timeRange.end)
    } : undefined,
    // 添加硬件加速信息
    hardwareAcceleration: hardwareSettings.value.value as 'cpu' | 'gpu',
    videoPath: props.videoPath
  } as CompressionSettings;
  
  emit('compress', compressionSettings);
};
</script>