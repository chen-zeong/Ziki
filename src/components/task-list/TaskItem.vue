<template>
  <div 
    class="task-card block p-2 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-[#2a2a2a] cursor-pointer transition-all duration-200"
    :class="{
      'bg-[#f8fafc] dark:bg-[#1a1a1a] ring-1 ring-gray-200 dark:ring-transparent is-selected': isSelected,
      'bg-white dark:bg-[#1e1e1e]': !isSelected,
      'multi-select-active': isMultiSelect
    }"
    @click="$emit('select', task.id)"
  >
    <div class="task-card-grid items-center gap-3">
      <!-- 多选 Checkbox 动画包裹 -->
      <div class="checkbox-wrapper flex items-center justify-center">
        <input
          v-if="isMultiSelect"
          type="checkbox"
          class="task-checkbox hidden"
          :checked="isChecked"
          @click.stop="$emit('toggle-check', task.id)"
        />
        <div v-if="isMultiSelect" class="custom-checkbox h-5 w-5 rounded-md border-2 border-gray-300 dark:border-[#3a3a3a] grid place-content-center flex-shrink-0 bg-white dark:bg-[#1e1e1e]">
          <svg class="h-3.5 w-3.5" :class="isChecked ? 'text-[#4f46e5]' : 'hidden'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
      </div>

      <!-- 缩略图与文件信息 -->
      <div class="flex items-center gap-3 p-1">
        <div class="flex-shrink-0">
          <div class="h-12 w-12 rounded-md overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center">
            <img 
              v-if="task.file.thumbnailUrl || task.type === 'image'"
              :src="task.file.thumbnailUrl || task.file.originalUrl"
              :alt="task.file.name"
              class="w-full h-full object-cover"
              @error="handleThumbnailError"
            />
            <Video v-else class="h-6 w-6 text-white" />
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" :title="task.file.name">{{ task.file.name }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ formatFileSize(task.file.size || task.originalSize) }}
            <span v-if="task.status === 'completed' && task.compressedSize" class="ml-2">
              → {{ formatFileSize(task.compressedSize) }}
            </span>
          </p>
        </div>
        <!-- 状态图标块（可选）-->
      </div>
    </div>

    <!-- 状态显示区 -->
    <div class="w-full">
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
import { useGlobalSettingsStore } from '../../stores/useGlobalSettingsStore';
import { useTaskStore } from '../../stores/useTaskStore';
import TaskStatusDisplay from './TaskStatusDisplay.vue';
import TaskDetails from './TaskDetails.vue';
import { Video } from 'lucide-vue-next';
import type { CompressionTask } from '../../types';

interface Props {
  task: CompressionTask;
  isExpanded: boolean;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  isChecked?: boolean;
}

interface Emits {
  (e: 'delete', taskId: string): void;
  (e: 'toggle-expand', taskId: string): void;
  (e: 'pause', taskId: string): void;
  (e: 'resume', taskId: string): void;
  (e: 'select', taskId: string): void;
  (e: 'toggle-check', taskId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();
const globalSettings = useGlobalSettingsStore();
const taskStore = useTaskStore();

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const openOutputFolder = async (task: CompressionTask) => {
  try {
    let folderPath = task.outputDirectory;
    if (!folderPath && task.file.compressedPath) {
      const path = task.file.compressedPath;
      const lastSlashIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
      if (lastSlashIndex !== -1) {
        folderPath = path.substring(0, lastSlashIndex);
      }
    }
    if (!folderPath) {
      folderPath = await invoke<string>('get_desktop_path');
    }
    await invoke('open_output_folder', { folderPath });
  } catch (error) {
    console.error('Failed to open output folder:', error);
  }
};

const handleThumbnailError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};
</script>

<style scoped>
.task-card-grid { display: grid; grid-template-columns: 0fr auto; transition: grid-template-columns 0.3s ease-in-out; }
.multi-select-active .task-card-grid { grid-template-columns: 1fr auto; }
.checkbox-wrapper { min-width: 0; opacity: 0; transform: scale(0.8); transition: opacity 0.3s ease, transform 0.3s ease; }
.multi-select-active .checkbox-wrapper { opacity: 1; transform: scale(1); }
.task-card.is-selected { background-color: hsla(244, 65%, 59%, 0.06); }
.dark .task-card.is-selected { background-color: hsla(240, 65%, 65%, 0.06); }
</style>