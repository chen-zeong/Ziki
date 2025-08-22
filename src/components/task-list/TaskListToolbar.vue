<template>
  <div class="mt-4 mb-3 flex items-center justify-between flex-shrink-0">
    <!-- 左侧工具栏按钮 -->
    <div class="flex items-center space-x-3 pl-4">
      <button 
         class="flex items-center space-x-2 px-3 py-1 rounded-md text-sm text-white transition-colors"
         style="background-color: #578ae6;"
         @click="emit('addFiles')"
       >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        <span>添加</span>
      </button>
      
      <!-- 批量暂停/开始按钮 -->
      <button 
        class="flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
        :style="{
          background: hasProcessingTasks 
            ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)' 
            : 'linear-gradient(135deg, #558ee1 0%, #4a7bc8 100%)',
          color: 'white'
        }"
        :disabled="!hasControllableTasks"
        :title="hasProcessingTasks ? '暂停所有任务' : '开始所有任务'"
        @click="toggleBatchProcessing"
      >
        <!-- 暂停图标 -->
        <svg v-if="hasProcessingTasks" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
          <rect x="6" y="4" width="4" height="16" rx="2"/>
          <rect x="14" y="4" width="4" height="16" rx="2"/>
        </svg>
        <!-- 播放图标 -->
        <svg v-else class="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
    </div>
    
    <!-- 右侧状态筛选器 -->
     <div class="flex items-center space-x-2 mr-3">
      <button
        v-for="status in statusFilters"
        :key="status.key"
        @click="toggleStatusFilter(status.key)"
        class="w-4 h-4 rounded-full transition-all duration-200 relative flex items-center justify-center"
        :style="{
          border: '1.5px solid white',
          boxShadow: selectedStatuses.size === 0 || selectedStatuses.has(status.key) 
            ? '0 0 0 1.5px #ccc, inset 0 1px 2px rgba(0, 0, 0, 0.2)' 
            : '0 0 0 0.5px #ccc, inset 0 1px 2px rgba(0, 0, 0, 0.2)',
          opacity: selectedStatuses.size === 0 || selectedStatuses.has(status.key) ? 1 : 0.3
        }"
        :title="status.label"
      >
        <div 
          class="w-full h-full rounded-full"
          :style="{
            background: status.gradient,
            boxShadow: `inset 0 0 0 0.5px ${status.innerBorder}`
          }"
        ></div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CompressionTask } from '../../types';

interface Props {
  tasks: CompressionTask[];
  selectedStatuses: Set<string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  addFiles: [];
  pauseAllTasks: [];
  startAllTasks: [];
  toggleStatusFilter: [status: string];
}>();

// 状态筛选器配置
const statusFilters = computed(() => [
  {
    key: 'pending',
    label: '未开始',
    bgColor: '#dbebfd',
    borderColor: '#dbebfd',
    textColor: '#1e40af',
    gradient: 'linear-gradient(to top, #4981f9, #87a9ff)',
    innerBorder: '#4275d1'
  },
  {
    key: 'queued',
    label: '等待中',
    bgColor: '#fff5dc',
    borderColor: '#fff5dc',
    textColor: '#d97706',
    gradient: 'linear-gradient(to top, #ffa500, #ffc96b)',
    innerBorder: '#d99a26'
  },
  {
    key: 'processing',
    label: '压缩中',
    bgColor: '#f3e8ff',
    borderColor: '#f3e8ff',
    textColor: '#7c3aed',
    gradient: 'linear-gradient(to top, #8a2be2, #d6a4ff)',
    innerBorder: '#813cc9'
  },
  {
    key: 'completed',
    label: '完成',
    bgColor: '#dcfce7',
    borderColor: '#dcfce7',
    textColor: '#16a34a',
    gradient: 'linear-gradient(to top, #2e8b57, #8fbc8f)',
    innerBorder: '#388e61'
  }
]);

// 批量控制相关计算属性
const hasProcessingTasks = computed(() => {
  return props.tasks.some(task => task.status === 'processing');
});

const hasControllableTasks = computed(() => {
  return props.tasks.some(task => 
    task.status === 'processing' || 
    task.status === 'pending' || 
    task.status === 'queued' ||
    task.status === 'paused'
  );
});

// 批量暂停/开始处理
const toggleBatchProcessing = () => {
  if (hasProcessingTasks.value) {
    // 暂停所有正在处理的任务
    emit('pauseAllTasks');
  } else {
    // 开始所有等待中的任务
    emit('startAllTasks');
  }
};

// 切换状态筛选
const toggleStatusFilter = (status: string) => {
  emit('toggleStatusFilter', status);
};
</script>

<style scoped>
.status-filter {
  transition: all 0.2s ease;
}

.status-filter:hover {
  transform: translateY(-1px);
}

.status-filter.active {
  transform: scale(1.05);
}
</style>