<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h3 class="font-bold text-gray-500 dark:text-gray-400 text-sm">
        {{ $t('taskList.compressionComparison') }}
      </h3>
    </div>
    <div class="p-4">
      <div class="grid grid-cols-3 gap-4 text-xs">
        <!-- 参数名称列 -->
        <div class="space-y-2">
          <div class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.fileSize') }}</span>
          </div>
          <div class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.format') }}</span>
          </div>
          <div class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.videoCodec') }}</span>
          </div>
          <div class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.resolution') }}</span>
          </div>
          <div v-if="task.file.metadata?.bitrate !== 'unknown' || getActualBitrate(task)" class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.bitrate') }}</span>
          </div>
          <div v-if="task.file.metadata?.duration" class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.duration') }}</span>
          </div>
          <div v-if="task.file.metadata?.fps" class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.frameRate') }}</span>
          </div>
          <div v-if="task.file.metadata?.audioCodec" class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.audioCodec') }}</span>
          </div>
          <div v-if="task.file.metadata?.sampleRate" class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.audioSampleRate') }}</span>
          </div>
          <div v-if="task.file.metadata?.colorDepth" class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.colorDepth') }}</span>
          </div>
        </div>
        
        <!-- 压缩前数值列 -->
        <div class="space-y-2 text-right">
          <div class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ formatFileSize(task.file.size || task.originalSize) }}</span>
          </div>
          <div class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata?.format?.toUpperCase() || 'UNKNOWN' }}</span>
          </div>
          <div class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata?.videoCodec || 'Unknown' }}</span>
          </div>
          <div class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata?.resolution || 'Unknown' }}</span>
          </div>
          <div v-if="task.file.metadata?.bitrate !== 'unknown' || getActualBitrate(task)" class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata?.bitrate || $t('common.unknown') }}</span>
          </div>
          <div v-if="task.file.metadata?.duration" class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ formatDuration(task.file.metadata.duration) }}</span>
          </div>
          <div v-if="task.file.metadata?.fps" class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ Number(task.file.metadata.fps).toFixed(2) }} fps</span>
          </div>
          <div v-if="task.file.metadata?.audioCodec" class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.audioCodec || 'Unknown' }}</span>
          </div>
          <div v-if="task.file.metadata?.sampleRate" class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.sampleRate || 'Unknown' }}</span>
          </div>
          <div v-if="task.file.metadata?.colorDepth" class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.colorDepth || 'Unknown' }}</span>
          </div>
        </div>
        
        <!-- 压缩后数值列 -->
        <div class="space-y-2 text-right">
          <div class="h-8 flex items-center justify-end">
            <span :class="getComparisonClass((task.compressedSize || 0), (task.file.size || task.originalSize))" class="px-2 py-1 rounded">{{ formatFileSize(task.compressedSize || 0) }}</span>
          </div>
          <div class="h-8 flex items-center justify-end">
            <span :class="getValueComparisonClass(task.file.metadata?.format?.toUpperCase() || 'UNKNOWN', task.settings.format.toUpperCase())" class="px-2 py-1 rounded">{{ task.settings.format.toUpperCase() }}</span>
          </div>
          <div class="h-8 flex items-center justify-end">
            <span :class="getValueComparisonClass(task.file.metadata?.videoCodec || 'Unknown', task.settings.videoCodec)" class="px-2 py-1 rounded">{{ task.settings.videoCodec }}</span>
          </div>
          <div class="h-8 flex items-center justify-end">
            <span :class="getValueComparisonClass(task.file.metadata?.resolution || 'Unknown', getActualResolution(task))" class="px-2 py-1 rounded">{{ getActualResolution(task) }}</span>
          </div>
          <div v-if="task.file.metadata?.bitrate !== 'unknown' || getActualBitrate(task)" class="h-8 flex items-center justify-end">
            <span :class="getValueComparisonClass(task.file.metadata?.bitrate || $t('common.unknown'), getActualBitrate(task) || $t('common.unknown'))" class="px-2 py-1 rounded">{{ getActualBitrate(task) || $t('common.unknown') }}</span>
          </div>
          <div v-if="task.file.metadata?.duration" class="h-8 flex items-center justify-end">
            <span :class="getValueComparisonClass(formatDuration(task.file.metadata.duration), formatDuration(getActualDuration(task) || 0))" class="px-2 py-1 rounded">{{ formatDuration(getActualDuration(task) || 0) }}</span>
          </div>
          <div v-if="task.file.metadata?.fps" class="h-8 flex items-center justify-end">
            <span :class="getValueComparisonClass(Number(task.file.metadata.fps).toFixed(2) + ' fps', Number(task.file.metadata.fps).toFixed(2) + ' fps')" class="px-2 py-1 rounded">{{ Number(task.file.metadata.fps).toFixed(2) }} fps</span>
          </div>
          <div v-if="task.file.metadata?.audioCodec" class="h-8 flex items-center justify-end">
            <span :class="getValueComparisonClass(task.file.metadata.audioCodec || 'Unknown', getActualAudioCodec(task))" class="px-2 py-1 rounded">{{ getActualAudioCodec(task) }}</span>
          </div>
          <div v-if="task.file.metadata?.sampleRate" class="h-8 flex items-center justify-end">
            <span :class="getValueComparisonClass(task.file.metadata.sampleRate || 'Unknown', getActualSampleRate(task))" class="px-2 py-1 rounded">{{ getActualSampleRate(task) }}</span>
          </div>
          <div v-if="task.file.metadata?.colorDepth" class="h-8 flex items-center justify-end">
            <span :class="getValueComparisonClass(task.file.metadata.colorDepth || 'Unknown', getActualColorDepth(task))" class="px-2 py-1 rounded">{{ getActualColorDepth(task) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { CompressionTask } from '../../types';

interface Props {
  task: CompressionTask;
}

const props = defineProps<Props>();
const { t } = useI18n();

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getTargetResolution = (task: CompressionTask): string => {
  if (task.settings.resolution === 'custom' && task.settings.customResolution) {
    return `${task.settings.customResolution.width}x${task.settings.customResolution.height}`;
  }
  return task.settings.resolution;
};

// 获取压缩后的实际分辨率
const getActualResolution = (task: CompressionTask): string => {
  if (task.compressedMetadata?.resolution) {
    return task.compressedMetadata.resolution;
  }
  return getTargetResolution(task);
};

// 获取压缩后的实际码率
const getActualBitrate = (task: CompressionTask): string | null => {
  if (task.compressedMetadata?.bitrate && task.compressedMetadata.bitrate !== 'unknown') {
    return task.compressedMetadata.bitrate;
  }
  return null;
};

// 获取压缩后的实际时长
const getActualDuration = (task: CompressionTask): number | null => {
  if (task.compressedMetadata?.duration) {
    return task.compressedMetadata.duration;
  }
  return task.file.metadata?.duration || null;
};

// 获取压缩后的实际音频编码
const getActualAudioCodec = (task: CompressionTask): string => {
  if (task.compressedMetadata?.audioCodec) {
    return task.compressedMetadata.audioCodec;
  }
  return task.file.metadata?.audioCodec || 'Unknown';
};

// 获取压缩后的实际音频采样率
const getActualSampleRate = (task: CompressionTask): string => {
  if (task.compressedMetadata?.sampleRate) {
    return task.compressedMetadata.sampleRate;
  }
  return task.file.metadata?.sampleRate || 'Unknown';
};

// 获取压缩后的实际色彩深度
const getActualColorDepth = (task: CompressionTask): string => {
  if (task.compressedMetadata?.colorDepth) {
    return task.compressedMetadata.colorDepth;
  }
  return task.file.metadata?.colorDepth || 'Unknown';
};

// 格式化时长显示
const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

const getComparisonClass = (afterValue: number, beforeValue: number): string => {
  if (afterValue < beforeValue) {
    return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
  } else if (afterValue > beforeValue) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
  } else {
    return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
  }
};

const getValueComparisonClass = (beforeValue: string, afterValue: string): string => {
  if (beforeValue === afterValue) {
    return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100';
  } else {
    return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
  }
};
</script>