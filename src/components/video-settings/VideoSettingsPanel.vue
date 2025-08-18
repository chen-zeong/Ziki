<template>
  <div class="space-y-6">
    
    <!-- 两列布局 -->
    <div class="flex gap-6">
      <!-- 左列：视频设置 -->
      <div class="flex-1" :class="{ 'opacity-50 pointer-events-none': isAudioOnly }">
        <!-- 视频格式和画质设置 -->
        <VideoFormatSettings v-model="formatSettings" :metadata="currentVideoMetadata" :quality-settings="qualitySettings" @update:quality-settings="handleQualitySettingsUpdate" />
      </div>
      
      <!-- 右列：音频设置和控制 -->
      <div class="flex-1 space-y-6">
        <!-- 音频设置 -->
        <AudioSettings v-model="audioSettings" :metadata="currentVideoMetadata" />
        
        <!-- 时间段和硬件加速设置 -->
         <div class="flex gap-1">
           <div class="flex-1">
             <TimeRangeSettings 
               v-model="timeRangeSettings" 
               :metadata="currentVideoMetadata"
               @validation-change="handleTimeValidationChange"
             />
           </div>
           
           <div class="flex justify-end">
             <HardwareAccelerationSettings 
               v-model="hardwareSettings" 
               :current-video-codec="formatSettings.videoCodec"
             />
           </div>
         </div>
        
        <!-- 开始压缩按钮 -->
        <button 
          class="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-green-500/20 dark:shadow-green-800/20 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800 transition-all duration-300 text-lg flex items-center justify-center gap-3 transform hover:scale-[1.03]"
          :class="isProcessing || !isTimeValid ? 'bg-gray-400 text-gray-200 cursor-not-allowed shadow-none hover:bg-gray-400 hover:scale-100' : ''"
          :disabled="isProcessing || !isTimeValid"
          @click="startCompression"
        >
          <i class="ph-bold ph-rocket-launch text-2xl"></i>
          <span>{{ isProcessing ? $t('videoSettings.compressing') : $t('videoSettings.compress') }}</span>
        </button>
      </div>
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
  audioSettings.value = {
    audioCodec: 'aac',
    sampleRate: '44100'
  };
  qualitySettings.value = {
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

const audioSettings = shallowRef<Partial<CompressionSettings>>({
  audioCodec: 'aac',
  sampleRate: '44100'
});

const qualitySettings = shallowRef<Partial<CompressionSettings>>({
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

// 处理画质设置更新，避免循环依赖
const handleQualitySettingsUpdate = (newQualitySettings: Partial<CompressionSettings>) => {
  // 使用Object.assign来更新，避免直接赋值
  Object.assign(qualitySettings.value, newQualitySettings);
};

// 监听仅保留音频状态
const isAudioOnly = computed(() => {
  return audioSettings.value.audioOnly || false;
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

// 开始压缩
const startCompression = () => {
  // 合并所有设置
  const compressionSettings: CompressionSettings = {
    ...formatSettings.value,
    ...audioSettings.value,
    ...qualitySettings.value,
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