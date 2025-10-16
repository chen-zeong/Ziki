<template>
  <div
    class="h-full flex flex-col rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-[#161920]/80 backdrop-blur-sm transition-colors duration-300"
    :class="isDragOver ? 'ring-1 ring-offset-2 ring-offset-transparent ring-[var(--brand-primary)]/40' : ''"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop="handleDrop"
  >
    <TaskListToolbar
      :tasks="tasks"
      @add-files="$emit('add-files')"
      @files-selected="$emit('files-selected', $event)"
      @clear-all-tasks="handleClearAllTasks"
    />

    <div class="flex-1 overflow-y-auto px-5 pb-4 transition-all duration-200">
      <div v-if="tasks.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-lg font-medium mb-2">{{ $t('taskList.noTasks') }}</p>
        <p class="text-sm text-center max-w-md">{{ $t('taskList.noTasksDescription') }}</p>
      </div>

      <div v-else class="space-y-2.5">
        <TaskItem
          v-for="task in tasks"
          :key="task.id"
          :task="task"
          :is-selected="selectedTaskId === task.id"
          :is-multi-select="multiSelectMode"
          :is-checked="selectedTaskIds.includes(task.id)"
          @delete="deleteTask"
          @pause="pauseTask"
          @resume="resumeTask"
          @select="onSelectTask($event)"
          @toggle-check="toggleTaskCheck($event)"
          @show-details="openDetailPanel($event)"
        />
      </div>
    </div>

    <div class="flex items-center justify-between px-5 py-4 border-t border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5">
      <div class="flex items-center gap-3">
        <button
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border border-slate-200/80 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"
          :class="multiSelectMode ? 'bg-[var(--brand-primary)] text-white border-transparent hover:text-white' : ''"
          @click="toggleMultiSelect"
        >
          <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor">
            <path d="M9 11l3 3L22 4l2 2-12 12-5-5 2-2z" />
          </svg>
          <span>{{ t('taskList.multiSelect') || '多选' }}</span>
        </button>
        <span v-if="multiSelectMode" class="text-xs text-slate-500 dark:text-slate-300 tracking-wide">
          {{ t('taskList.selectedCount') || '已选择' }}: {{ selectedTaskIds.length }}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full text-base font-semibold transition-transform duration-150 bg-[var(--brand-primary)] text-white hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/60"
          :class="{ 'cursor-not-allowed opacity-60 pointer-events-none': !canStart }"
          :disabled="!canStart"
          @click="handleStart"
        >
          {{ t('videoSettings.compress') || '开始压缩' }}
        </button>
      </div>
    </div>

    <TaskDetailsPanel
      v-if="activeDetailTask"
      :task="activeDetailTask"
      @close="closeDetailPanel"
    />
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
import TaskDetailsPanel from './TaskDetailsPanel.vue';
 
 import type { CompressionTask } from '../../types';
 
 // 使用任务store
const taskStore = useTaskStore();
 // Tauri 窗口实例（仅在 Tauri 环境下使用）
 let appWindow: TauriWindow | null = null;
// 新增：环境检测，避免在 Web 端注册 Tauri 事件
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

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
  (e: 'start-compress'): void;
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
const selectedTaskIds = ref<string[]>([]);
const isDragOver = ref(false);
const multiSelectMode = ref(false);
const detailTaskId = ref<string | null>(null);

 // 底部操作区相关：是否可开始、选择与多选切换
const canStart = computed(() => {
  return multiSelectMode.value ? selectedTaskIds.value.length > 0 : !!selectedTaskId.value;
});

const activeDetailTask = computed(() => {
  return tasks.value.find(task => task.id === detailTaskId.value) || null;
});

 const onSelectTask = (taskId: string) => {
   emit('select-task', taskId);
 };

const toggleTaskCheck = (taskId: string) => {
  if (selectedTaskIds.value.includes(taskId)) {
    selectedTaskIds.value = selectedTaskIds.value.filter(id => id !== taskId);
  } else {
    selectedTaskIds.value = [...selectedTaskIds.value, taskId];
  }
};

const handleStart = () => {
  emit('start-compress');
};

const toggleMultiSelect = () => {
  multiSelectMode.value = !multiSelectMode.value;
  if (!multiSelectMode.value) {
    selectedTaskIds.value = [];
  }
};

const openDetailPanel = (taskId: string) => {
  detailTaskId.value = taskId;
};

const closeDetailPanel = () => {
  detailTaskId.value = null;
};

 // Tauri drag-drop listeners
 let unlistenDragDrop: UnlistenFn | null = null;
 let unlistenDragEnter: UnlistenFn | null = null;
 let unlistenDragLeave: UnlistenFn | null = null;
 let unlistenDragOver: UnlistenFn | null = null;
 let unlistenFileDrop: UnlistenFn | null = null;

 // 计算属性
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
         if (isTauri) {
           await invoke('pause_task', { taskId });
         }
         console.log('System task cancelled successfully:', taskId);
       } catch (err) {
         console.warn('Failed to cancel system task:', err);
       }
     }

    taskStore.deleteTask(taskId);
    if (detailTaskId.value === taskId) {
      detailTaskId.value = null;
    }
    selectedTaskIds.value = selectedTaskIds.value.filter(id => id !== taskId);
  } catch (error) {
    console.error('Delete task failed:', error);
  }
};

 const pauseTask = async (taskId: string) => {
   try {
     if (isTauri) {
       await invoke('pause_task', { taskId });
     }
     taskStore.updateTaskStatus(taskId, 'paused');
   } catch (error) {
     console.error('Pause task failed:', error);
   }
 };

 const resumeTask = async (taskId: string) => {
   try {
     if (isTauri) {
       await invoke('resume_task', { taskId });
     }
     taskStore.updateTaskStatus(taskId, 'processing');
   } catch (error) {
     console.error('Resume task failed:', error);
   }
 };

const handleClearAllTasks = () => {
  try {
    taskStore.clearAllTasks();
    detailTaskId.value = null;
    selectedTaskIds.value = [];
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
   if (!isTauri) {
     // Web 环境不注册 Tauri 事件
     return;
   }
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
   if (!isTauri) return;
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

watch(tasks, (newTasks) => {
  if (!detailTaskId.value) return;
  const stillExists = newTasks.some(task => task.id === detailTaskId.value);
  if (!stillExists) {
    detailTaskId.value = null;
  }
});
 </script>
