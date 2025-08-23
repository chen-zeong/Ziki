<template>
  <div class="mt-4 mb-3 flex items-center justify-between flex-shrink-0">
    <!-- 左侧工具栏按钮 -->
    <div class="flex items-center space-x-3 pl-4">
      <button 
         class="flex items-center space-x-2 px-3 py-1 rounded-md text-sm text-white transition-colors"
         style="background-color: #578ae6;"
         @click="handleAddFiles"
       >
        <BadgePlus class="w-4 h-4" />
        <span>{{ t('toolbar.addFiles') }}</span>
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
        :title="hasProcessingTasks ? t('taskList.pauseAllTasks') : t('taskList.startAllTasks')"
        @click="toggleBatchProcessing"
      >
        <!-- 暂停图标 -->
        <Pause v-if="hasProcessingTasks" class="w-3 h-3" />
        <!-- 播放图标 -->
        <Play v-else class="w-3 h-3 ml-0.5" />
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
import { BadgePlus, Play, Pause } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { CompressionTask } from '../../types';

const { t } = useI18n();

interface Props {
  tasks: CompressionTask[];
  selectedStatuses: Set<string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  addFiles: [];
  filesSelected: [files: FileList];
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

// 处理添加文件按钮点击
const handleAddFiles = async () => {
  try {
    // 使用 Tauri 的文件对话框选择文件
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Video and Image Files',
        extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'jpg', 'jpeg', 'png', 'gif']
      }]
    });
    
    if (selected && Array.isArray(selected)) {
      // 创建 File 对象
       const files: File[] = [];
       for (const filePath of selected) {
         const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
         const extension = fileName.split('.').pop()?.toLowerCase() || '';
         let mimeType = 'application/octet-stream';
         
         if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
           mimeType = `video/${extension === 'mov' ? 'quicktime' : extension}`;
         } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
           mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
         }
         
         // 获取文件大小
         let fileSize = 0;
         try {
           fileSize = await invoke<number>('get_file_size', { filePath });
         } catch (error) {
           console.warn('Failed to get file size:', error);
         }
         
         const mockFile = new File([], fileName, { type: mimeType });
         (mockFile as any).path = filePath;
         // 设置文件大小
         Object.defineProperty(mockFile, 'size', {
           value: fileSize,
           writable: false,
           enumerable: true,
           configurable: false
         });
         files.push(mockFile);
       }
      
      // 创建 FileList-like 对象
      const fileList = {
        length: files.length,
        item: (index: number) => files[index] || null,
        [Symbol.iterator]: function* () {
          for (let i = 0; i < files.length; i++) {
            yield files[i];
          }
        }
      } as FileList;
      
      // 添加数组式访问
      files.forEach((file, index) => {
        (fileList as any)[index] = file;
      });
      
      emit('filesSelected', fileList);
    }
  } catch (error) {
    console.error('Error selecting files:', error);
    // 如果 Tauri 对话框失败，回退到原来的事件
    emit('addFiles');
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