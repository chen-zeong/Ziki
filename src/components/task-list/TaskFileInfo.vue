<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h3 class="font-bold text-gray-500 dark:text-gray-400 text-sm">
        {{ $t('taskList.fileInfo') }}
      </h3>
    </div>
    <div class="p-4">
      <div class="grid grid-cols-2 gap-4 text-xs">
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
          <div v-if="task.file.metadata?.bitrate !== 'unknown'" class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.bitrate') }}</span>
          </div>
          <div v-if="task.file.metadata?.duration" class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.duration') }}</span>
          </div>
          <div v-if="task.file.metadata?.fps" class="h-8 flex items-center">
            <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.frameRate') }}</span>
          </div>
        </div>
        
        <!-- 参数数值列 -->
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
          <div v-if="task.file.metadata?.bitrate !== 'unknown'" class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata?.bitrate || 'Unknown' }}</span>
          </div>
          <div v-if="task.file.metadata?.duration" class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ formatDuration(task.file.metadata.duration) }}</span>
          </div>
          <div v-if="task.file.metadata?.fps" class="h-8 flex items-center justify-end">
            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ Number(task.file.metadata.fps).toFixed(2) }} fps</span>
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
</script>