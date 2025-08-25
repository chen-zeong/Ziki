<template>
  <div class="mt-1">
    <!-- 压缩完成状态 -->
    <div v-if="task.status === 'completed' && task.compressedSize" class="flex items-center justify-between">
      <!-- 完成状态信息条 -->
      <div class="relative h-8 bg-green-50 dark:bg-green-900/30 rounded-lg overflow-hidden px-3 inline-flex items-center">
        <!-- 完成状态背景 -->
        <div class="absolute inset-0 bg-green-100 dark:bg-green-800/50 rounded-lg"></div>
        
        <!-- 完成状态文字覆盖层 -->
        <div class="relative flex items-center">
          <CheckCircle class="w-3 h-3 mr-2 text-green-600 dark:text-green-300" />
          <span class="text-xs font-medium text-green-700 dark:text-green-200">
            {{ getCompressionRatio(task) }}
          </span>
          <!-- 压缩/膨胀箭头图标 -->
          <ArrowDown v-if="getCompressionText(task) === '压缩'" class="w-4 h-4 ml-1 text-green-600 dark:text-green-300" />
          <ArrowUp v-else class="w-4 h-4 ml-1 text-green-600 dark:text-green-300" />
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
            <Folder class="w-4 h-4" />
          </button>
        
        <!-- 删除按钮 -->
        <button
          @click="$emit('delete', task.id)"
          class="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
          :title="$t('taskList.delete')"
        >
          <Trash class="w-4 h-4" />
        </button>
        
        <!-- 展开信息按钮 -->
        <button
          v-if="task.file.metadata"
          @click="$emit('toggle-expand', task.id)"
          class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
          :title="$t('taskList.showDetails')"
        >
          <ChevronDown class="w-4 h-4" />
        </button>
      </div>
    </div>
    
    <!-- 压缩中状态 -->
    <div v-else-if="task.status === 'processing'" class="flex items-center justify-between">
      <!-- 进度条容器 -->
      <div class="flex-1 relative h-6 rounded-full overflow-hidden bg-[#eeeaf7] dark:bg-[#39305a] mr-3">
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
          <Pause class="w-4 h-4" />
        </button>
        
        <!-- 删除按钮 -->
        <button
          @click="$emit('delete', task.id)"
          class="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
          :title="$t('taskList.delete')"
        >
          <Trash class="w-4 h-4" />
        </button>
        
        <!-- 展开信息按钮 -->
        <button
          v-if="task.file.metadata"
          @click="$emit('toggle-expand', task.id)"
          class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
          :title="$t('taskList.showDetails')"
        >
          <ChevronDown class="w-4 h-4" />
        </button>
      </div>
    </div>
      
      <!-- 压缩失败状态 -->
      <div v-else-if="task.status === 'failed'" class="flex items-center justify-between">
        <div class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
             :title="task.error || '压缩失败'">
          <X class="w-3 h-3 mr-1" />
          失败{{ task.error ? ': ' + (task.error.length > 20 ? task.error.substring(0, 20) + '...' : task.error) : '' }}
        </div>
        
        <!-- 操作按钮组 -->
        <div class="flex items-center space-x-1 flex-shrink-0">
          <!-- 删除按钮 -->
          <button
            @click="$emit('delete', task.id)"
            class="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
            :title="$t('taskList.delete')"
          >
            <Trash class="w-4 h-4" />
          </button>
          
          <!-- 展开信息按钮 -->
          <button
            v-if="task.file.metadata"
            @click="$emit('toggle-expand', task.id)"
            class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
            :title="$t('taskList.showDetails')"
          >
            <ChevronDown class="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <!-- 等待中状态 -->
      <div v-else-if="task.status === 'pending'" class="flex items-center justify-between">
        <div class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
          <Clock class="w-3 h-3 mr-1" />
          等待中
        </div>
        
        <!-- 操作按钮组 -->
        <div class="flex items-center space-x-1 flex-shrink-0">
          <!-- 删除按钮 -->
          <button
            @click="$emit('delete', task.id)"
            class="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
            :title="$t('taskList.delete')"
          >
            <Trash class="w-4 h-4" />
          </button>
          
          <!-- 展开信息按钮 -->
          <button
            v-if="task.file.metadata"
            @click="$emit('toggle-expand', task.id)"
            class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
            :title="$t('taskList.showDetails')"
          >
            <ChevronDown class="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <!-- 排队中状态 -->
      <div v-else-if="task.status === 'queued'" class="flex items-center justify-between">
        <div class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
             :style="{ backgroundColor: '#fff5dc', color: '#d97706' }">
          <Clock class="w-3 h-3 mr-1" />
          排队中
        </div>
        
        <!-- 操作按钮组 -->
        <div class="flex items-center space-x-1 flex-shrink-0">
          <!-- 开始按钮（让排队任务立即开始） -->
          <button
            @click="$emit('resume', task.id)"
            class="p-1 text-gray-400 hover:text-green-500 dark:text-gray-500 dark:hover:text-green-400 transition-colors duration-200"
            title="开始任务"
          >
            <Play class="w-4 h-4" />
          </button>
          
          <!-- 删除按钮 -->
          <button
            @click="$emit('delete', task.id)"
            class="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
            :title="$t('taskList.delete')"
          >
            <Trash class="w-4 h-4" />
          </button>
          
          <!-- 展开信息按钮 -->
          <button
            v-if="task.file.metadata"
            @click="$emit('toggle-expand', task.id)"
            class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
            :title="$t('taskList.showDetails')"
          >
            <ChevronDown class="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <!-- 暂停状态 -->
    <div v-else-if="task.status === 'paused'" class="flex items-center justify-between">
      <!-- 进度条容器 -->
      <div class="flex-1 relative h-6 rounded-full overflow-hidden bg-orange-50/50 dark:bg-orange-900/20 mr-3">
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
            <Play class="w-4 h-4" />
          </button>
          
          <!-- 删除按钮 -->
          <button
            @click="$emit('delete', task.id)"
            class="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
            :title="$t('taskList.delete')"
          >
            <Trash class="w-4 h-4" />
          </button>
          
          <!-- 展开信息按钮 -->
          <button
            v-if="task.file.metadata"
            @click="$emit('toggle-expand', task.id)"
            class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
            :title="$t('taskList.showDetails')"
          >
            <ChevronDown class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { CheckCircle, ArrowDown, ArrowUp, Folder, Trash, Info, Pause, Play, ChevronDown, Clock, X, Zap } from 'lucide-vue-next';
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