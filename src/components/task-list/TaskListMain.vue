<template>
  <div
    class="h-full flex flex-col bg-[#f8fafc] dark:bg-[#2d2d2d]"
    :class="isDragOver ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent' : ''"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 工具栏 -->
    <TaskListToolbar
      :tasks="tasks"
      :selected-statuses="selectedStatuses"
      @add-files="$emit('add-files')"
      @files-selected="$emit('files-selected', $event)"
      @clear-all-tasks="handleClearAllTasks"
      @toggle-status-filter="toggleStatusFilter"
    />
    
    <!-- 任务列表 -->
    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="filteredTasks.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-lg font-medium mb-2">{{ $t('taskList.noTasks') }}</p>
        <p class="text-sm text-center max-w-md">{{ $t('taskList.noTasksDescription') }}</p>
      </div>
      
      <div v-else class="space-y-3">
        <TaskItem
          v-for="task in filteredTasks"
          :key="task.id"
          :task="task"
          :is-expanded="expandedTasks.has(task.id)"
          :is-selected="selectedTaskId === task.id"
          :is-multi-select="multiSelectMode"
          :is-checked="selectedTasks.has(task.id)"
          @delete="deleteTask"
          @toggle-expand="toggleTaskExpansion"
          @pause="pauseTask"
          @resume="resumeTask"
          @select="onSelectTask($event)"
          @toggle-check="toggleTaskCheck($event)"
        />
      </div>
    </div>
    
    <!-- 底部操作区：多选与开始压缩 -->
    <div class="flex items-center justify-between px-4 py-3">
      <div class="flex items-center gap-3">
        <button
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all duration-200 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#303030] shadow-sm"
          :class="multiSelectMode ? 'ring-2 ring-blue-300 bg-blue-50 dark:bg-[#252525]' : ''"
          @click="multiSelectMode = !multiSelectMode"
        >
          <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M9 11l3 3L22 4l2 2-12 12-5-5 2-2z"/></svg>
          <span>{{ t('taskList.multiSelect') || '多选' }}</span>
        </button>
        <span v-if="multiSelectMode" class="text-xs text-gray-500">{{ t('taskList.selectedCount') || '已选择' }}: {{ selectedTasks.size }}</span>
        <!-- 输出文件夹按钮：移动到多选按钮右边 -->
        <button
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all duration-200 border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#303030] shadow-sm"
          @click="emit('toggle-output-folder')"
        >
          <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
          </svg>
          <span>{{ $t('outputFolder.title') || '输出文件夹' }}</span>
        </button>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="text-white text-base font-semibold rounded-lg transition-colors px-5 py-2 shadow-sm"
          :style="canStart ? { backgroundColor: '#578ae6' } : {}"
          :class="{ 'bg-gray-400 text-gray-200 cursor-not-allowed': !canStart }"
          :disabled="!canStart"
          @click="handleStart"
        >
          {{ t('videoSettings.compress') || '开始压缩' }}
        </button>
      </div>
    </div>
   </div>
 </template>

 <script setup lang="ts">
 import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
 import { useI18n } from 'vue-i18n';
 import { invoke } from '@tauri-apps/api/core';
 import { listen, type UnlistenFn } from '@tauri-apps/api/event';
 import { Window as TauriWindow } from '@tauri-apps/api/window';
 import { useTaskStore } from '../../stores/useTaskStore';
 import { useGlobalSettingsStore } from '../../stores/useGlobalSettingsStore';
 import TaskListToolbar from './TaskListToolbar.vue';
 import TaskItem from './TaskItem.vue';
 
 import type { CompressionTask } from '../../types';
 
 // 使用任务store
 const taskStore = useTaskStore();
 // Tauri 窗口实例（仅在 Tauri 环境下使用）
 let appWindow: TauriWindow | null = null;

 interface Props {
   // 保持props接口兼容性，但内部使用store
   tasks?: CompressionTask[];
   selectedTaskId?: string | null;
 }

 interface Emits {
   (e: 'add-files'): void;
   (e: 'files-selected', files: FileList): void;
   (e: 'update-task', task: CompressionTask): void;
   (e: 'delete-task', taskId: string): void;
   (e: 'resume-compression', taskId: string): void;
   (e: 'pause-task', taskId: string): void;
   (e: 'select-task', taskId: string): void;
   (e: 'clear-all-tasks'): void;
   // 新增：开始压缩事件（单个/多选）
   (e: 'start-compress'): void;
   (e: 'start-multi-compress', ids: string[]): void;
   // 新增：切换输出文件夹弹窗
   (e: 'toggle-output-folder'): void;
 }

 const props = defineProps<Props>();

 // 使用store中的任务数据，如果props中有tasks则使用props（向后兼容）
 const tasks = computed(() => props.tasks || taskStore.tasks);
 const selectedTaskId = computed(() => props.selectedTaskId || taskStore.selectedTaskId);
 const emit = defineEmits<Emits>();
 const { t } = useI18n();
 const globalSettings = useGlobalSettingsStore();

 // 状态管理
 const selectedStatuses = ref(new Set<string>());
 const expandedTasks = ref(new Set<string>());
 const selectedTasks = ref(new Set<string>());
 const isDragOver = ref(false);
 const multiSelectMode = ref(false);

 // 底部操作区相关：是否可开始、选择与多选切换
 const canStart = computed(() => {
   return multiSelectMode.value ? selectedTasks.value.size > 0 : !!selectedTaskId.value;
 });

 const onSelectTask = (taskId: string) => {
   emit('select-task', taskId);
 };

 const toggleTaskCheck = (taskId: string) => {
   if (selectedTasks.value.has(taskId)) {
     selectedTasks.value.delete(taskId);
   } else {
     selectedTasks.value.add(taskId);
   }
 };

 const handleStart = () => {
   if (multiSelectMode.value) {
     emit('start-multi-compress', Array.from(selectedTasks.value));
   } else {
     emit('start-compress');
   }
 };

 // Tauri drag-drop listeners
 let unlistenDragDrop: UnlistenFn | null = null;
 let unlistenDragEnter: UnlistenFn | null = null;
 let unlistenDragLeave: UnlistenFn | null = null;
 let unlistenDragOver: UnlistenFn | null = null;
 let unlistenFileDrop: UnlistenFn | null = null;

 // 计算属性
 const filteredTasks = computed(() => {
   if (selectedStatuses.value.size === 0) {
     return tasks.value;
   }
   return tasks.value.filter(task => selectedStatuses.value.has(task.status));
 });

 // 方法
 const toggleStatusFilter = (status: string) => {
   if (selectedStatuses.value.has(status)) {
     // 如果当前状态已选中，移除它
     selectedStatuses.value.delete(status);
     // 如果移除后没有选中任何状态，则进入全选状态（清空Set）
     if (selectedStatuses.value.size === 0) {
       selectedStatuses.value.clear();
     }
   } else {
     // 如果当前状态未选中，清空其他选择并只选中当前状态
     selectedStatuses.value.clear();
     selectedStatuses.value.add(status);
   }
 };

 const toggleTaskExpansion = (taskId: string) => {
   if (expandedTasks.value.has(taskId)) {
     expandedTasks.value.delete(taskId);
   } else {
     expandedTasks.value.add(taskId);
   }
 };

 const deleteTask = async (taskId: string) => {
   try {
     const task = tasks.value.find(t => t.id === taskId);
     if (!task) {
       console.error('Task not found:', taskId);
       return;
     }

     // 如果任务正在压缩或已暂停（FFmpeg已开始），需要先取消系统任务
     if (task.status === 'processing' || task.status === 'paused') {
       console.log('Cancelling system task before deletion:', taskId);
       try {
         await invoke('pause_task', { taskId });
         console.log('System task cancelled successfully:', taskId);
       } catch (err) {
         console.warn('Failed to cancel system task:', err);
       }
     }

     // 从store中删除任务
     taskStore.deleteTask(taskId);
   } catch (error) {
     console.error('Delete task failed:', error);
   }
 };

 const pauseTask = async (taskId: string) => {
   try {
     await invoke('pause_task', { taskId });
     taskStore.updateTaskStatus(taskId, 'paused');
   } catch (error) {
     console.error('Pause task failed:', error);
   }
 };

 const resumeTask = async (taskId: string) => {
   try {
     await invoke('resume_task', { taskId });
     taskStore.updateTaskStatus(taskId, 'processing');
   } catch (error) {
     console.error('Resume task failed:', error);
   }
 };

 const handleClearAllTasks = () => {
   try {
     taskStore.clearAllTasks();
   } catch (error) {
     console.error('Clear all tasks failed:', error);
   }
 };

 // DOM Drag handlers
 const handleDragOver = (event: DragEvent) => {
   event.preventDefault();
   isDragOver.value = true;
 };

 const handleDragLeave = (event: DragEvent) => {
   event.preventDefault();
   isDragOver.value = false;
 };

 const handleDrop = (event: DragEvent) => {
   event.preventDefault();
   isDragOver.value = false;
   const files = event.dataTransfer?.files;
   if (files && files.length > 0) {
     console.log('[DD] DOM drop: emitting files-selected with length:', files.length);
     emit('files-selected', files);
   }
 };

 // Tauri FileDrop handlers
 const handleTauriFileDrop = async (paths: string[]) => {
   try {
     console.log('[DD] Emitting files-selected with length:', paths.length);
     // 将路径转换为 FileList（仿造）
     const fileList = await Promise.all(paths.map(async (filePath) => {
       const fileName = filePath.split(/\\\\|\//).pop() || 'unknown';
       const extension = (fileName.split('.').pop() || '').toLowerCase();
       let mimeType = 'application/octet-stream';
       const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'flv', 'm4v', 'm4s', 'm4p', 'mpg', 'mpeg', 'mpe', 'mpv', 'mp2', 'mts', 'm2ts', 'ts', '3gp', '3g2', 'asf', 'vob', 'ogv', 'ogg', 'rm', 'rmvb', 'f4v', 'f4p', 'f4a', 'f4b', 'mod', 'mxf', 'qt', 'yuv', 'amv', 'svi', 'roq', 'nsv'];
       const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'heic', 'heif', 'avif', 'jxl'];
       if (videoExts.includes(extension)) {
         mimeType = `video/${extension === 'mov' ? 'quicktime' : extension === 'wmv' ? 'x-ms-wmv' : extension === 'avi' ? 'x-msvideo' : extension === '3gp' ? '3gpp' : extension === 'ogv' ? 'ogg' : extension}`;
       } else if (imageExts.includes(extension)) {
         mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
       }
       const mockFile = new File([], fileName, { type: mimeType });
       (mockFile as any).path = filePath;
       return mockFile;
     }));
     emit('files-selected', fileList as unknown as FileList);
   } catch (error) {
     console.error('[DD] handleTauriFileDrop failed:', error);
   }
 };

 // Lifecycle: register/unregister Tauri listeners
 let unlistenWindowFileDrop: UnlistenFn | null = null;
 onMounted(async () => {
   try {
     const ddEnter = await listen('tauri://file-drop', (event) => {
       const paths = (event as any).payload as string[];
       if (Array.isArray(paths)) {
         isDragOver.value = true;
       }
     });
     const ddLeave = await listen('tauri://file-drop-cancelled', () => {
       isDragOver.value = false;
     });
     const ddOver = await listen('tauri://file-drop-hover', () => {
       isDragOver.value = true;
     });
     const ddDrop = await listen('tauri://file-drop', (event) => {
       const paths = (event as any).payload as string[];
       if (Array.isArray(paths) && paths.length > 0) {
         isDragOver.value = false;
         handleTauriFileDrop(paths);
       }
     });
     unlistenDragEnter = ddEnter;
     unlistenDragLeave = ddLeave;
     unlistenDragOver = ddOver;
     unlistenFileDrop = ddDrop;

     // 额外后备：窗口级别文件拖拽事件（如果可用）
     try {
       const winAny = appWindow as unknown as { onFileDropEvent?: (cb: (e: any) => void) => Promise<() => void> };
       if (winAny.onFileDropEvent) {
         unlistenWindowFileDrop = await winAny.onFileDropEvent((e: any) => {
           console.log('[DD] appWindow.onFileDropEvent:', e);
           const ty = e?.payload?.type;
           const paths = e?.payload?.paths || e?.payload || [];
           if (ty === 'hover') {
             isDragOver.value = true;
           } else if (ty === 'cancel') {
             isDragOver.value = false;
           } else if (ty === 'drop') {
             isDragOver.value = false;
             if (Array.isArray(paths)) handleTauriFileDrop(paths);
           }
         });
         console.log('[DD] Registered window-level file-drop listener');
       } else {
         console.log('[DD] appWindow.onFileDropEvent not available in this Tauri version');
       }
     } catch (werr) {
       console.warn('[DD] Failed to register window-level file-drop listener:', werr);
     }

     console.log('[DD] Registered Tauri drag-drop listeners');

     // 监听窗口焦点变化，失焦时清理拖拽样式（若可用）
    if (appWindow && 'onFocusChanged' in appWindow) {
      (appWindow as any).onFocusChanged(({ payload }: { payload: boolean }) => {
        console.log('[DD] window focus changed:', payload);
        if (!payload) {
          isDragOver.value = false;
        }
      });
    }
   } catch (error) {
     console.error('Register drag-drop listeners failed:', error);
   }
 });

 onUnmounted(async () => {
   try {
     const funcs = [unlistenDragEnter, unlistenDragLeave, unlistenDragOver, unlistenFileDrop, unlistenWindowFileDrop];
     for (const fn of funcs) {
       if (fn) await fn();
     }
     console.log('[DD] Unregistered Tauri drag-drop listeners');
   } catch (error) {
     console.error('Unregister drag-drop listeners failed:', error);
   }
 });
 </script>