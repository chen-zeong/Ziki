<template>
  <div
    class="h-full flex flex-col transition-colors duration-300"
    :class="isDragOver ? 'ring-1 ring-inset ring-[var(--brand-primary)]/40' : ''"
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

    <div class="flex-1 overflow-y-auto px-4 pb-1 transition-all duration-200">
      <div v-if="tasks.length === 0" class="flex h-full items-center justify-center">
        <div class="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-dashed border-slate-300/70 dark:border-white/15 bg-white/80 dark:bg-[#141927]/85 shadow-[0_32px_70px_rgba(15,23,42,0.16)] px-12 py-14 text-center">
          <div class="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
            <div class="absolute -top-28 right-10 h-48 w-48 rounded-full bg-[var(--brand-primary)]/15 blur-[90px]"></div>
            <div class="absolute -bottom-32 left-0 h-52 w-52 rounded-full bg-sky-200/25 dark:bg-sky-500/15 blur-[110px]"></div>
          </div>
          <div class="relative flex flex-col items-center gap-6 text-slate-600 dark:text-slate-300">
            <div class="grid place-items-center rounded-2xl bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-[#1c2435] dark:via-[#182031] dark:to-[#111623] border border-white/70 dark:border-white/10 shadow-[0_20px_42px_rgba(15,23,42,0.18)] h-20 w-20">
              <svg class="w-9 h-9 text-[var(--brand-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div class="space-y-3 max-w-lg">
              <h3 class="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">{{ $t('taskList.noTasks') }}</h3>
              <p class="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {{ $t('taskList.noTasksDescription') }}
              </p>
            </div>
            <div class="flex flex-col sm:flex-row items-center gap-3 text-sm">
              <button
                class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--brand-primary)] text-white font-medium shadow-[0_18px_36px_rgba(81,98,255,0.32)] hover:translate-y-[-2px] transition-transform"
                @click="$emit('add-files')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
                </svg>
                {{ $t('toolbar.addFiles') }}
              </button>
              <div class="text-xs uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">
                {{ $t('taskList.uploadHint') }}
              </div>
            </div>
          </div>
        </div>
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

    <div class="flex items-center gap-3 px-4 py-2 bg-transparent">
      <div class="flex items-center gap-3 flex-[1] min-w-0">
        <button
          class="inline-flex w-full justify-center items-center px-3 py-2 rounded-full transition-all duration-200 border border-slate-200/80 dark:border-white/15 bg-white dark:bg-white/5 gap-0"
          :class="multiSelectMode
            ? 'bg-[var(--brand-primary)] text-white/95 hover:bg-[var(--brand-primary)]/90 shadow-[0_10px_30px_rgba(81,98,255,0.25)]'
            : 'text-slate-700 dark:text-slate-200 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]'"
          @click="toggleMultiSelect"
          :aria-pressed="multiSelectMode"
          :aria-label="t('taskList.multiSelect') || 'Multi-select'"
        >
          <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor">
            <path d="M9 11l3 3L22 4l2 2-12 12-5-5 2-2z" />
          </svg>
        </button>
      </div>
      <div class="flex items-center gap-3 flex-[3] min-w-0 justify-end">
        <button
          class="relative inline-flex w-full max-w-md items-center justify-center px-10 py-3 rounded-full text-base font-semibold transition-all duration-200 ease-out bg-[var(--brand-primary)] text-white hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/60 overflow-hidden"
          :class="{
            'cursor-not-allowed opacity-60 pointer-events-none': !canStart,
            'start-button--processing': !multiSelectMode && selectedTaskStatus === 'processing'
          }"
          :disabled="!canStart"
          @click="handleStart"
        >
          <span>{{ t('videoSettings.compress') || '开始压缩' }}</span>
          <span
            v-if="multiSelectMode"
            class="absolute right-6 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/25 dark:bg-white/10 text-sm font-semibold transition-all duration-200 backdrop-blur-sm"
          >
            {{ selectedTaskIds.length }}
          </span>
        </button>
      </div>
    </div>

    <TaskDetails
      :task="activeDetailTask"
      :open="!!activeDetailTask"
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
import TaskDetails from './TaskDetails.vue';
 
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

const selectedTaskStatus = computed(() => {
  const current = selectedTaskId.value;
  if (!current) return null;
  return tasks.value.find(task => task.id === current)?.status || null;
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
  if (multiSelectMode.value) {
    const current = selectedTaskId.value;
    if (current && !selectedTaskIds.value.includes(current)) {
      selectedTaskIds.value = [current];
    }
  } else {
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
    try {
      if (!appWindow && typeof (TauriWindow as any)?.getCurrent === 'function') {
        appWindow = (TauriWindow as any).getCurrent();
      }
      if (
        !appWindow &&
        typeof window !== 'undefined' &&
        (window as any).__TAURI__?.window?.appWindow
      ) {
        appWindow = (window as any).__TAURI__.window.appWindow as TauriWindow;
      }
    } catch (resolveError) {
      console.warn('[DD] Failed to resolve appWindow instance:', resolveError);
      appWindow = null;
    }

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
      const winAny = appWindow
        ? (appWindow as unknown as { onFileDropEvent?: (cb: (e: any) => void) => Promise<() => void> })
        : null;
      if (winAny && typeof winAny.onFileDropEvent === 'function') {
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

<style scoped>
.start-button--processing::before,
.start-button--processing::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
}
.start-button--processing::before {
  width: 112%;
  height: 112%;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: transparent;
  border-left-color: transparent;
  transform: translate(-50%, -50%) rotate(0deg);
  animation: start-orbit 1.4s linear infinite;
}
.start-button--processing::after {
  width: 138%;
  height: 138%;
  border-radius: 999px;
  transform: translate(-50%, -50%) scale(0.7);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 65%);
  opacity: 0.75;
  animation: start-pulse 2.6s ease-out infinite;
}

@keyframes start-orbit {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes start-pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.65);
    opacity: 0.7;
  }
  55% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%) scale(0.65);
    opacity: 0;
  }
}
</style>
