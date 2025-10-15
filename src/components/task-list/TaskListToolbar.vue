<template>
  <div class="px-5 pt-5 pb-4 flex items-center justify-between flex-shrink-0">
    <!-- 左侧工具栏按钮 -->
    <div class="flex items-center space-x-2">
      <!-- 添加文件按钮 -->
      <button 
         class="flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium transition-all duration-200 bg-white/90 dark:bg-white/10 border border-white/60 dark:border-white/10 text-slate-700 dark:text-slate-100 shadow-[0_6px_14px_rgba(15,23,42,0.08)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/40"
         @click="handleAddFiles"
         :title="t('toolbar.addFiles')"
       >
        <Plus class="w-4 h-4" />
        <span>{{ t('toolbar.addFiles') }}</span>
      </button>
      
      <!-- 清空任务按钮 -->
      <button 
        class="flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium transition-all duration-200 text-red-500 border border-red-200/70 dark:border-red-400/20 bg-white/85 dark:bg-white/5 hover:bg-red-50/90 dark:hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
        @click="handleClearAllTasks"
        :disabled="tasks.length === 0"
        :title="t('taskList.clearAllTasks')"
      >
        <BrushCleaning class="w-4 h-4" />
        <span>{{ t('taskList.clear') }}</span>
      </button>
    </div>
    
    <!-- 右侧状态筛选器 -->
     <div class="flex items-center space-x-2">
      <button
        v-for="status in statusFilters"
        :key="status.key"
        @click="toggleStatusFilter(status.key)"
        class="px-3 h-8 rounded-full transition-all duration-200 flex items-center text-xs font-medium border"
        :style="getStatusStyle(status.key)"
        :title="status.label"
      >
        <span>{{ status.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Plus, BrushCleaning } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useTaskStore } from '../../stores/useTaskStore';
import type { CompressionTask } from '../../types';

const { t } = useI18n();
const taskStore = useTaskStore();

interface Props {
  // 保持props接口兼容性，但内部使用store
  tasks?: CompressionTask[];
  selectedStatuses: Set<string>;
}

const props = defineProps<Props>();

// 使用store中的任务数据，如果props中有tasks则使用props（向后兼容）
const tasks = computed(() => props.tasks || taskStore.tasks);
const selectedStatuses = computed<Set<string>>(() => props.selectedStatuses ?? new Set<string>());

const emit = defineEmits<{
  addFiles: [];
  filesSelected: [files: FileList];
  'clear-all-tasks': [];
  toggleStatusFilter: [status: string];
}>();

// 状态筛选器配置（标签使用 i18n）
const statusFilters = computed(() => [
  {
    key: 'pending',
    label: t('taskList.statusPending'),
    fg: 'rgba(59, 130, 246, 0.9)',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.35)'
  },
  {
    key: 'queued',
    label: t('taskList.statusQueued'),
    fg: 'rgba(234, 179, 8, 0.95)',
    bg: 'rgba(253, 224, 71, 0.15)',
    border: 'rgba(234, 179, 8, 0.32)'
  },
  {
    key: 'processing',
    label: t('taskList.statusProcessing'),
    fg: 'rgba(129, 140, 248, 0.95)',
    bg: 'rgba(129, 140, 248, 0.18)',
    border: 'rgba(129, 140, 248, 0.32)'
  },
  {
    key: 'completed',
    label: t('taskList.statusCompleted'),
    fg: 'rgba(16, 185, 129, 0.95)',
    bg: 'rgba(16, 185, 129, 0.18)',
    border: 'rgba(16, 185, 129, 0.28)'
  }
]);

const getStatusStyle = (key: string) => {
  const target = statusFilters.value.find(status => status.key === key);
  const isActive = selectedStatuses.value.size === 0 || selectedStatuses.value.has(key);
  return {
    color: isActive ? target?.fg : 'rgba(99,102,241,0.45)',
    borderColor: isActive ? target?.border : 'rgba(148,163,184,0.18)',
    background: isActive ? target?.bg : 'rgba(248,250,252,0.6)',
    opacity: isActive ? 1 : 0.5
  };
};

// 清空所有任务
const handleClearAllTasks = () => {
  console.log('清空任务按钮被点击');
  emit('clear-all-tasks');
};

// 处理添加文件按钮点击
const handleAddFiles = async () => {
  try {
    // 使用 Tauri 的文件对话框选择文件
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Video and Image Files',
        extensions: ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'flv', 'm4v', 'm4s', 'm4p', 'mpg', 'mpeg', 'mpe', 'mpv', 'mp2', 'mts', 'm2ts', 'ts', '3gp', '3g2', 'asf', 'vob', 'ogv', 'ogg', 'rm', 'rmvb', 'f4v', 'f4p', 'f4a', 'f4b', 'mod', 'mxf', 'qt', 'yuv', 'amv', 'svi', 'roq', 'nsv', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'heic', 'heif', 'avif', 'jxl']
      }]
    });
    
    if (selected && Array.isArray(selected)) {
      // 创建 File 对象
       const files: File[] = [];
       for (const filePath of selected) {
         const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
         const extension = fileName.split('.').pop()?.toLowerCase() || '';
         let mimeType = 'application/octet-stream';
         
         if (['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'flv', 'm4v', 'm4s', 'm4p', 'mpg', 'mpeg', 'mpe', 'mpv', 'mp2', 'mts', 'm2ts', 'ts', '3gp', '3g2', 'asf', 'vob', 'ogv', 'ogg', 'rm', 'rmvb', 'f4v', 'f4p', 'f4a', 'f4b', 'mod', 'mxf', 'qt', 'yuv', 'amv', 'svi', 'roq', 'nsv'].includes(extension)) {
           mimeType = `video/${extension === 'mov' ? 'quicktime' : extension === 'wmv' ? 'x-ms-wmv' : extension === 'avi' ? 'x-msvideo' : extension === '3gp' ? '3gpp' : extension === 'ogv' ? 'ogg' : extension}`;
         } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'heic', 'heif', 'avif', 'jxl'].includes(extension)) {
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
