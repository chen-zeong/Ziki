<template>
  <div class="mt-1">
    <!-- 压缩完成状态 -->
    <div v-if="task.status === 'completed' && task.compressedSize" class="flex items-center space-x-3">
      <!-- 完成状态信息条 -->
      <div class="relative h-8 bg-green-50 dark:bg-green-900/30 rounded-lg overflow-hidden px-3 inline-flex items-center">
        <!-- 完成状态背景 -->
        <div class="absolute inset-0 bg-green-100 dark:bg-green-800/50 rounded-lg"></div>
        
        <!-- 完成状态文字覆盖层 -->
        <div class="relative flex items-center">
          <svg class="w-3 h-3 mr-2 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span class="text-xs font-medium text-green-700 dark:text-green-200">
            {{ getCompressionRatio(task) }}
          </span>
          <!-- 压缩/膨胀箭头图标 -->
          <svg v-if="getCompressionText(task) === '压缩'" class="w-4 h-4 ml-1 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/>
          </svg>
          <svg v-else class="w-4 h-4 ml-1 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
          </svg>
        </div>
      </div>
      
      <!-- 操作按钮组 -->
      <div class="flex items-center space-x-1 flex-shrink-0">
        <!-- 打开文件夹按钮 -->
          <button
            @click="$emit('open-folder')"
            class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200"
            :title="$t('taskList.openOutputFolder')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
            </svg>
          </button>
        
        <!-- 删除按钮 -->
        <button
          @click="$emit('delete', task.id)"
          class="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
          :title="$t('taskList.delete')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
        
        <!-- 展开信息按钮 -->
        <button
          v-if="task.file.metadata"
          @click="$emit('toggle-expand', task.id)"
          class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
          :title="$t('taskList.showDetails')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- 压缩中状态 -->
    <div v-else-if="task.status === 'processing'" class="flex items-center space-x-3">
      <!-- 进度条容器 -->
      <div class="flex-1 relative h-6 rounded-full overflow-hidden bg-[#eeeaf7] dark:bg-[#39305a]">
         <!-- 进度条填充 -->
         <div 
           class="h-full bg-purple-400 dark:bg-[#6c52a1] rounded-full transition-all duration-300 ease-linear"
           :style="{ width: `${Math.max(task.progress || 0, 2)}%` }"
         ></div>
         
         <!-- 进度文字覆盖层 -->
         <div class="absolute inset-0 flex items-center justify-between px-3 text-xs font-semibold text-purple-500 dark:text-[#d9c8f5] tracking-wide">
           <span>压缩中 {{ Math.round(task.progress || 0) }}%</span>
          <span v-if="getEstimatedTimeRemaining(task)" class="text-xs opacity-80">
            剩余 {{ getEstimatedTimeRemaining(task) }}
          </span>
        </div>
      </div>
      
      <!-- 操作按钮组 -->
      <div class="flex items-center space-x-1 flex-shrink-0">
        <!-- 暂停按钮 -->
        <button
          @click="$emit('pause', task.id)"
          class="p-1 text-gray-400 hover:text-orange-500 dark:text-gray-500 dark:hover:text-orange-400 transition-colors duration-200"
          :title="'暂停任务'"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        </button>
        
        <!-- 删除按钮 -->
        <button
          @click="$emit('delete', task.id)"
          class="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
          :title="$t('taskList.delete')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
        
        <!-- 展开信息按钮 -->
        <button
          v-if="task.file.metadata"
          @click="$emit('toggle-expand', task.id)"
          class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
          :title="$t('taskList.showDetails')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </div>
    </div>
      
      <!-- 压缩失败状态 -->
      <div v-else-if="task.status === 'failed'" 
           class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
           :title="task.error || '压缩失败'">
        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
        </svg>
        失败{{ task.error ? ': ' + (task.error.length > 20 ? task.error.substring(0, 20) + '...' : task.error) : '' }}
      </div>
      
      <!-- 等待中状态 -->
      <div v-else-if="task.status === 'pending'" 
           class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
           :style="{ backgroundColor: '#dbebfd', color: '#1e40af' }">
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        等待中
      </div>
      
      <!-- 排队中状态 -->
      <div v-else-if="task.status === 'queued'" 
           class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
           :style="{ backgroundColor: '#fff5dc', color: '#d97706' }">
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        排队中
      </div>
      
      <!-- 暂停状态 -->
    <div v-else-if="task.status === 'paused'" class="flex items-center space-x-3">
      <!-- 进度条容器 -->
      <div class="flex-1 relative h-6 rounded-full overflow-hidden bg-orange-50 dark:bg-orange-900/30 shadow-lg">
        <!-- 进度条填充 -->
        <div 
          class="h-full rounded-full transition-all duration-300 ease-linear bg-orange-500 dark:bg-orange-500"
          :style="{ width: `${Math.max(task.progress || 0, 2)}%` }"
        ></div>
        
        <!-- 进度文字覆盖层 -->
        <div class="absolute inset-0 flex items-center justify-between px-3 text-xs font-semibold text-orange-700 dark:text-orange-100 tracking-wide">
          <span>已暂停 {{ Math.round(task.progress || 0) }}%</span>
          <span v-if="getEstimatedTimeRemaining(task)" class="text-xs opacity-80">
            {{ getEstimatedTimeRemaining(task) }}
          </span>
        </div>
      </div>
        
        <!-- 操作按钮组 -->
        <div class="flex items-center space-x-1 flex-shrink-0">
          <!-- 恢复按钮 -->
          <button
            @click="$emit('resume', task.id)"
            class="p-1 text-gray-400 hover:text-green-500 dark:text-gray-500 dark:hover:text-green-400 transition-colors duration-200"
            title="恢复任务"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          
          <!-- 删除按钮 -->
          <button
            @click="$emit('delete', task.id)"
            class="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
            :title="$t('taskList.delete')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
          
          <!-- 展开信息按钮 -->
          <button
            v-if="task.file.metadata"
            @click="$emit('toggle-expand', task.id)"
            class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
            :title="$t('taskList.showDetails')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import type { CompressionTask } from '../../types';

interface Props {
  task: CompressionTask;
}

const props = defineProps<Props>();

defineEmits<{
  'delete': [id: string];
  'toggle-expand': [id: string];
  'open-folder': [];
  'pause': [id: string];
  'resume': [id: string];
}>();

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getCompressionRatio = (task: CompressionTask): string => {
  const originalSize = task.file.size || task.originalSize;
  if (!task.compressedSize || !originalSize || isNaN(task.compressedSize) || isNaN(originalSize)) return '0%';
  const ratio = ((originalSize - task.compressedSize) / originalSize) * 100;
  return Math.round(Math.abs(ratio)) + '%';
};

const getCompressionText = (task: CompressionTask): string => {
  if (!task.compressedSize || !task.originalSize || isNaN(task.compressedSize) || isNaN(task.originalSize)) return '压缩';
  const ratio = ((task.originalSize - task.compressedSize) / task.originalSize) * 100;
  return ratio >= 0 ? '压缩' : '膨胀';
};

// 计算预估剩余时间
const getEstimatedTimeRemaining = (task: CompressionTask): string | null => {
  if (task.status !== 'processing' || task.progress <= 0) {
    return null;
  }
  
  // 如果没有开始时间或完成时间信息，无法计算
  if (!task.startedAt) {
    return null;
  }
  
  const now = new Date().getTime();
  const startTime = task.startedAt.getTime();
  const elapsedTime = (now - startTime) / 1000; // 已用时间（秒）
  
  // 计算平均处理速度（进度/时间）
  const progressRate = task.progress / elapsedTime;
  
  if (progressRate <= 0) {
    return null;
  }
  
  // 计算剩余进度和预估剩余时间
  const remainingProgress = 100 - task.progress;
  const estimatedRemainingSeconds = remainingProgress / progressRate;
  
  // 格式化时间显示
  if (estimatedRemainingSeconds < 60) {
    return `${Math.round(estimatedRemainingSeconds)}秒`;
  } else if (estimatedRemainingSeconds < 3600) {
    const minutes = Math.floor(estimatedRemainingSeconds / 60);
    const seconds = Math.round(estimatedRemainingSeconds % 60);
    return `${minutes}分${seconds}秒`;
  } else {
    const hours = Math.floor(estimatedRemainingSeconds / 3600);
    const minutes = Math.floor((estimatedRemainingSeconds % 3600) / 60);
    const seconds = Math.round(estimatedRemainingSeconds % 60);
    return `${hours}小时${minutes}分${seconds}秒`;
  }
};
</script>