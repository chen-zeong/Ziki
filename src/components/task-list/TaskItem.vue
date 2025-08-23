<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
    <!-- 主要任务信息 -->
    <div class="p-3 space-y-3">
      <!-- 第一行：缩略图、标题和体积大小 -->
      <div class="flex items-center space-x-3">
        <!-- 文件缩略图 -->
        <div class="flex-shrink-0">
          <div class="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <img 
              v-if="task.file.thumbnailUrl"
              :src="task.file.thumbnailUrl"
              :alt="task.file.name"
              class="w-full h-full object-cover"
              @error="handleThumbnailError"
            />
            <svg v-else class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </div>
        </div>
        
        <!-- 文件信息 -->
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" :title="task.file.name">
            {{ task.file.name }}
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ formatFileSize(task.file.size || task.originalSize) }}
            <span v-if="task.status === 'completed' && task.compressedSize" class="ml-2">
              → {{ formatFileSize(task.compressedSize) }}
            </span>
          </p>
        </div>
      </div>
      
      <!-- 第二行：状态显示 -->
      <div>
        <TaskStatusDisplay 
          :task="task" 
          :is-expanded="isExpanded"
          @delete="$emit('delete', task.id)"
          @toggle-expand="$emit('toggle-expand', task.id)"
          @open-folder="openOutputFolder(task)"
          @pause="$emit('pause', task.id)"
          @resume="$emit('resume', task.id)"
        />
      </div>
    </div>
    
    <!-- 详细信息展开区域 -->
    <TaskDetails 
      :task="task" 
      :is-expanded="isExpanded" 
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';
import TaskStatusDisplay from './TaskStatusDisplay.vue';
import TaskDetails from './TaskDetails.vue';
import type { CompressionTask } from '../../types';

interface Props {
  task: CompressionTask;
  isExpanded: boolean;
}

interface Emits {
  (e: 'delete', taskId: string): void;
  (e: 'toggle-expand', taskId: string): void;
  (e: 'pause', taskId: string): void;
  (e: 'resume', taskId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const openOutputFolder = async (task: CompressionTask) => {
  try {
    await invoke('open_output_folder', { taskId: task.id });
  } catch (error) {
    console.error('Failed to open output folder:', error);
  }
};

const handleThumbnailError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};
</script>