<template>
  <div class="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
    <div class="mb-4">
      <h3 class="font-bold text-xl text-gray-800 dark:text-gray-100 tracking-wide">任务列表</h3>
    </div>
    
    <ul class="space-y-4">
      <li 
        v-for="task in tasks" 
        :key="task.id"
        class="flex items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <img 
          :src="task.file.thumbnailUrl || task.file.originalUrl || getPlaceholderImage(task.file.name)" 
          :alt="task.file.name"
          class="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-gray-200 dark:bg-gray-700"
          loading="lazy"
        >
        <div class="flex-grow ml-4">
          <p class="text-gray-800 dark:text-gray-100 font-medium truncate" :title="task.file.name">
            {{ task.file.name }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatFileSize(task.file.size || task.originalSize) }} 
            <span v-if="task.compressedSize">→ {{ formatFileSize(task.compressedSize) }}</span>
            <span v-if="task.status === 'completed' && task.compressedSize" :class="getCompressionRatioClass(task)" class="ml-1">
              ({{ getCompressionRatio(task) }} {{ getCompressionText(task) }})
            </span>
          </p>
          <div v-if="task.status === 'processing'" class="mt-1">
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                class="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                :style="{ width: `${task.progress}%` }"
              ></div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ task.progress }}%</p>
          </div>
        </div>
        <div class="ml-4 flex-shrink-0">
          <!-- Status Icons -->
          <div v-if="task.status === 'completed'" class="h-6 w-6 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div v-else-if="task.status === 'processing'" class="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
          <div v-else-if="task.status === 'failed'" class="h-6 w-6 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
            </svg>
          </div>
          <div v-else class="h-6 w-6 text-gray-400 dark:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </li>
      
      <!-- Empty state -->
      <li v-if="tasks.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg class="mx-auto h-12 w-12 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026C6.154 9.75 8.25 11.846 8.25 14.25c0 2.404-2.096 4.5-4.156 4.5-.117 0-.232-.009-.344-.026m4.156-8.474a8.25 8.25 0 018.25 8.25c0 1.194-.25 2.33-.705 3.358-.07.16-.155.313-.249.456l-.077.105c-.616.85-1.539 1.406-2.594 1.406-1.98 0-3.594-1.64-3.594-3.75 0-.859.285-1.65.762-2.286C3.008 15.337 1.5 13.15 1.5 10.5c0-4.556 3.694-8.25 8.25-8.25z" />
        </svg>
        <p>暂无任务</p>
        <p class="text-sm mt-1">上传文件开始压缩</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { CompressionTask } from '../types';

interface Props {
  tasks: CompressionTask[];
}

defineProps<Props>();

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getCompressionRatio = (task: CompressionTask): string => {
  const originalSize = task.file.size || task.originalSize;
  if (!task.compressedSize || !originalSize || isNaN(task.compressedSize) || isNaN(originalSize)) return '0%';
  const ratio = ((originalSize - task.compressedSize) / originalSize) * 100;
  return Math.round(Math.abs(ratio)) + '%';
};

const getCompressionRatioClass = (task: CompressionTask): string => {
  const originalSize = task.file.size || task.originalSize;
  if (!task.compressedSize || !originalSize || isNaN(task.compressedSize) || isNaN(originalSize)) return 'text-gray-500 dark:text-gray-400';
  const ratio = ((originalSize - task.compressedSize) / originalSize) * 100;
  return ratio >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
};

const getCompressionText = (task: CompressionTask): string => {
  if (!task.compressedSize || !task.originalSize || isNaN(task.compressedSize) || isNaN(task.originalSize)) return '压缩';
  const ratio = ((task.originalSize - task.compressedSize) / task.originalSize) * 100;
  return ratio >= 0 ? '压缩' : '膨胀';
};

const getPlaceholderImage = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext || '');
  const color = isVideo ? '0ea5e9' : 'ef4444';
  const text = isVideo ? 'Video' : 'Image';
  return `https://placehold.co/100x100/${color}/ffffff?text=${text}`;
};
</script>