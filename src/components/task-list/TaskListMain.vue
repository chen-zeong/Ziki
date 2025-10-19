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

    <div class="flex-1 overflow-y-auto px-4 pb-4 transition-all duration-200">
      <div v-if="tasks.length === 0" class="flex h-full items-center justify-center px-4">
        <div class="w-full max-w-lg rounded-2xl border border-dashed border-slate-300/70 bg-white/90 px-10 py-12 text-center shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/12 dark:bg-white/[0.04] dark:shadow-[0_24px_55px_rgba(4,9,20,0.55)]">
          <div class="flex flex-col items-center gap-6 text-slate-600 dark:text-slate-300">
            <div class="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200/80 bg-white text-[var(--brand-primary)] shadow-sm dark:border-white/15 dark:bg-white/[0.03]">
              <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div class="space-y-2">
              <h3 class="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                {{ $t('taskList.noTasks') }}
              </h3>
              <p class="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {{ $t('taskList.noTasksDescription') }}
              </p>
            </div>
            <div class="flex flex-col items-center gap-3">
              <button
                class="inline-flex items-center gap-2 rounded-full border border-slate-200/70 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)] dark:border-white/12 dark:text-slate-300 dark:hover:border-[var(--brand-primary)]/40"
                @click="$emit('add-files')"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
                </svg>
                {{ $t('toolbar.addFiles') }}
              </button>
              <span class="text-xs font-medium uppercase tracking-[0.32em] text-slate-400 dark:text-slate-500">
                {{ $t('taskList.uploadHint') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <div class="task-stack relative" :class="{ 'task-stack--multi': multiSelectMode }">
          <MotionGlow
            class="task-stack__glow"
            aria-hidden="true"
            :initial="false"
            :animate="multiSelectMode ? { opacity: 0.32, scale: 1.02 } : { opacity: 0.12, scale: 1 }"
            :transition="{ duration: 0.32, easing: 'ease-out' }"
          />
          <TransitionGroup
            name="task-stagger"
            tag="div"
            move-class="task-stagger-no-move"
            class="relative z-10 space-y-3 py-2"
          >
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
          </TransitionGroup>
        </div>
      </template>
    </div>

    <div class="flex items-center gap-3 px-4 py-2 bg-transparent">
      <div class="flex items-center gap-3 flex-[1] min-w-0">
        <button
          type="button"
          class="inline-flex w-full justify-center items-center px-3 py-2 rounded-full transition-colors duration-200"
          :class="multiSelectMode ? multiSelectActiveClasses : multiSelectInactiveClasses"
          @click="toggleMultiSelect"
          :aria-pressed="multiSelectMode"
          :aria-label="t('taskList.multiSelect') || 'Multi-select'"
        >
          <div class="flex h-4 items-center justify-center gap-1.5">
            <template v-if="showMultiSelectDots">
              <span
                v-for="index in 3"
                :key="index"
                :class="['multi-select-dot', multiSelectMode && !isDarkMode ? 'multi-select-dot--light' : '']"
                :style="{ animationDelay: ((index - 1) * 0.22) + 's' }"
                aria-hidden="true"
              ></span>
            </template>
            <ListPlus v-else class="w-4 h-4" aria-hidden="true" />
          </div>
          <span class="sr-only">{{ t('taskList.multiSelect') }}</span>
        </button>
        <MotionIndicator
          v-if="multiSelectMode"
          class="multi-select-flare"
          :initial="{ opacity: 0, scale: 0.9 }"
          :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.28, easing: 'ease-out' }"
        />
      </div>
      <div class="flex items-center gap-3 flex-[3] min-w-0 justify-end">
        <button
          class="start-button relative inline-flex w-full max-w-md items-center justify-center px-10 py-3 rounded-lg text-base font-semibold transition-all duration-200 ease-out bg-[var(--brand-primary)] text-white hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/60 overflow-hidden"
          :class="{
            'cursor-not-allowed opacity-60 pointer-events-none': !primaryActionEnabled,
            'start-button--processing': isProcessingButton,
            'start-button--undo': showUndoButton
          }"
          :disabled="!primaryActionEnabled"
          :aria-busy="isProcessingButton"
          :aria-label="primaryButtonLabel"
          @click="handlePrimaryAction"
        >
          <span class="start-button__content">
            <Loader2
              v-if="isProcessingButton"
              class="start-button__icon animate-spin"
              aria-hidden="true"
            />
            <Undo2
              v-else-if="showUndoButton"
              class="start-button__icon"
              aria-hidden="true"
            />
            <Play
              v-else
              class="start-button__icon"
              aria-hidden="true"
            />
            <span class="start-button__label">{{ primaryButtonLabel }}</span>
          </span>
          <span
            v-if="multiSelectMode"
            class="start-button__badge"
          >
            {{ selectedTaskIds.length }}
          </span>
        </button>
      </div>
    </div>

    <TaskDetails
      :task="activeDetailTask"
      :open="!!activeDetailTask"
      :anchor-rect="detailAnchorRect"
      @close="closeDetailPanel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
 import { invoke } from '@tauri-apps/api/core';
 import { listen, type UnlistenFn } from '@tauri-apps/api/event';
 import { Window as TauriWindow } from '@tauri-apps/api/window';
import { useTaskStore } from '../../stores/useTaskStore';
import { useGlobalSettingsStore } from '../../stores/useGlobalSettingsStore';
import TaskListToolbar from './TaskListToolbar.vue';
import TaskItem from './TaskItem.vue';
import TaskDetails from './TaskDetails.vue';
import { ListPlus, Loader2, Undo2, Play } from 'lucide-vue-next';
import { motion } from 'motion-v';
 
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

type StartCompressPayload = { mode: 'single' } | { mode: 'batch'; taskIds: string[] };

interface Emits {
  (e: 'add-files'): void;
  (e: 'files-selected', files: FileList): void;
  (e: 'update-task', task: CompressionTask): void;
  (e: 'delete-task', taskId: string): void;
  (e: 'resume-compression', taskId: string): void;
   (e: 'pause-task', taskId: string): void;
  (e: 'select-task', taskId: string): void;
  (e: 'clear-all-tasks'): void;
  (e: 'start-compress', payload?: StartCompressPayload): void;
  (e: 'undo-compress'): void;
  (e: 'toggle-output-folder'): void;
}

 const props = defineProps<Props>();

 // 使用store中的任务数据，如果props中有tasks则使用props（向后兼容）
 const tasks = computed(() => props.tasks || taskStore.tasks);
const selectedTaskId = computed(() => props.selectedTaskId || taskStore.selectedTaskId);
const emit = defineEmits<Emits>();
const { t } = useI18n();
const globalSettings = useGlobalSettingsStore();
const { isDarkMode } = storeToRefs(globalSettings);

 // 状态管理
const selectedTaskIds = ref<string[]>([]);
const showMultiSelectDots = ref(false);
const isDragOver = ref(false);
const multiSelectMode = ref(false);
const detailTaskId = ref<string | null>(null);
const detailAnchorElement = ref<HTMLElement | null>(null);
const detailAnchorRect = ref<DOMRect | null>(null);
const MotionGlow = motion.div;
const MotionIndicator = motion.div;
const multiSelectInactiveClasses =
  'border border-slate-200/80 bg-white text-slate-700 hover:border-[var(--brand-primary)]/45 hover:text-[var(--brand-primary)] dark:border-white/12 dark:bg-[#1a2132] dark:text-slate-200 dark:hover:border-[var(--brand-primary)]/40 dark:hover:text-[var(--brand-primary)]';
const multiSelectActiveClasses = computed(
  () => 'border border-transparent bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-secondary)] hover:text-white'
);

type FileDropEventType = 'hover' | 'drop' | 'cancel' | 'unknown';

const normalizeDropPayload = (payload: unknown): { type: FileDropEventType; paths: string[] } => {
  if (Array.isArray(payload)) {
    return {
      type: 'drop',
      paths: payload.filter((item): item is string => typeof item === 'string')
    };
  }
  if (typeof payload === 'string') {
    return { type: 'drop', paths: [payload] };
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const rawType = typeof record.type === 'string' ? record.type.toLowerCase() : 'unknown';
    const type: FileDropEventType =
      rawType === 'hover' || rawType === 'over'
        ? 'hover'
        : rawType === 'drop'
          ? 'drop'
          : rawType === 'cancel' || rawType === 'leave'
            ? 'cancel'
            : 'unknown';
    const maybePaths = record.paths;
    const paths = Array.isArray(maybePaths)
      ? (maybePaths as unknown[]).filter((item): item is string => typeof item === 'string')
      : [];
    return { type, paths };
  }
  return { type: 'unknown', paths: [] };
};

// 底部操作区相关：按钮状态与标签
const selectedTaskStatus = computed(() => {
  const current = selectedTaskId.value;
  if (!current) return null;
  return tasks.value.find(task => task.id === current)?.status || null;
});

const isProcessingButton = computed(() => !multiSelectMode.value && selectedTaskStatus.value === 'processing');
const showUndoButton = computed(() => !multiSelectMode.value && selectedTaskStatus.value === 'completed');
const isResumeButton = computed(() => !multiSelectMode.value && selectedTaskStatus.value === 'paused');

const primaryActionEnabled = computed(() => {
  if (multiSelectMode.value) {
    return selectedTaskIds.value.length > 0;
  }
  if (showUndoButton.value) {
    return !!selectedTaskId.value;
  }
  if (isProcessingButton.value) {
    return false;
  }
  if (isResumeButton.value) {
    return !!selectedTaskId.value;
  }
  return !!selectedTaskId.value;
});

const primaryButtonLabel = computed(() => {
  if (multiSelectMode.value) {
    return t('videoSettings.compress') || '开始压缩';
  }
  if (showUndoButton.value) {
    return t('videoSettings.undo') || '撤销';
  }
  if (isProcessingButton.value) {
    return t('videoSettings.compressing') || '压缩中...';
  }
  if (isResumeButton.value) {
    return t('videoSettings.resumeCompress') || '继续压缩';
  }
  return t('videoSettings.compress') || '开始压缩';
});

const exitMultiSelectMode = () => {
  multiSelectMode.value = false;
  showMultiSelectDots.value = false;
  selectedTaskIds.value = [];
};

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
  if (multiSelectMode.value) {
    const ids = selectedTaskIds.value.filter(Boolean);
    if (ids.length === 0) {
      exitMultiSelectMode();
      return;
    }
    emit('start-compress', { mode: 'batch', taskIds: ids });
    exitMultiSelectMode();
    return;
  }
  emit('start-compress', { mode: 'single' });
};

const handlePrimaryAction = () => {
  if (!primaryActionEnabled.value) return;
  if (isResumeButton.value) {
    const currentId = selectedTaskId.value;
    if (currentId) {
      emit('resume-compression', currentId);
    }
    return;
  }
  if (showUndoButton.value) {
    emit('undo-compress');
    return;
  }
  handleStart();
};

const toggleMultiSelect = () => {
  multiSelectMode.value = !multiSelectMode.value;
  if (multiSelectMode.value) {
    showMultiSelectDots.value = true;
    const current = selectedTaskId.value;
    if (current && !selectedTaskIds.value.includes(current)) {
      selectedTaskIds.value = [current];
    }
  } else {
    exitMultiSelectMode();
  }
};

const updateDetailAnchorRect = () => {
  if (detailAnchorElement.value) {
    detailAnchorRect.value = detailAnchorElement.value.getBoundingClientRect();
  } else {
    detailAnchorRect.value = null;
  }
};

const openDetailPanel = (payload: string | { taskId: string; trigger: HTMLElement | null }) => {
  const taskId = typeof payload === 'string' ? payload : payload.taskId;
  detailTaskId.value = taskId;
  detailAnchorElement.value = typeof payload === 'string' ? null : payload.trigger;
  nextTick(updateDetailAnchorRect);
};

const closeDetailPanel = () => {
  detailTaskId.value = null;
  detailAnchorElement.value = null;
  detailAnchorRect.value = null;
};

const handleDetailViewportChange = () => {
  if (!detailTaskId.value) return;
  updateDetailAnchorRect();
};

onMounted(() => {
  window.addEventListener('resize', handleDetailViewportChange);
  window.addEventListener('scroll', handleDetailViewportChange, true);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleDetailViewportChange);
  window.removeEventListener('scroll', handleDetailViewportChange, true);
});

// Tauri drag-drop listeners
let unlistenFileDropPrimary: UnlistenFn | null = null;
let unlistenFileDropHover: UnlistenFn | null = null;
let unlistenFileDropCancelled: UnlistenFn | null = null;
let unlistenWindowFileDrop: UnlistenFn | null = null;

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
      detailAnchorElement.value = null;
      detailAnchorRect.value = null;
    }
    selectedTaskIds.value = selectedTaskIds.value.filter(id => id !== taskId);
  } catch (error) {
    console.error('Delete task failed:', error);
  }
};

const pauseTask = (taskId: string) => {
  emit('pause-task', taskId);
};

const resumeTask = (taskId: string) => {
  emit('resume-compression', taskId);
};

const handleClearAllTasks = () => {
  try {
    taskStore.clearAllTasks();
    detailTaskId.value = null;
    detailAnchorElement.value = null;
    detailAnchorRect.value = null;
    exitMultiSelectMode();
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

    unlistenFileDropPrimary = await listen('tauri://file-drop', (event) => {
      const { type, paths } = normalizeDropPayload((event as any)?.payload);
      if (type === 'hover') {
        isDragOver.value = true;
        return;
      }
      if (type === 'cancel') {
        isDragOver.value = false;
        return;
      }
      if (paths.length > 0) {
        isDragOver.value = false;
        void handleTauriFileDrop(paths);
      }
    });
    unlistenFileDropCancelled = await listen('tauri://file-drop-cancelled', () => {
      isDragOver.value = false;
    });
    unlistenFileDropHover = await listen('tauri://file-drop-hover', (event) => {
      const { type } = normalizeDropPayload((event as any)?.payload);
      if (type === 'hover') {
        isDragOver.value = true;
      }
    });

    // 额外后备：窗口级别文件拖拽事件（如果可用）
    try {
      const winAny = appWindow
        ? (appWindow as unknown as { onFileDropEvent?: (cb: (e: any) => void) => Promise<() => void> })
        : null;
      if (winAny && typeof winAny.onFileDropEvent === 'function') {
        unlistenWindowFileDrop = await winAny.onFileDropEvent((e: any) => {
          console.log('[DD] appWindow.onFileDropEvent:', e);
          const { type, paths } = normalizeDropPayload(e?.payload);
          if (type === 'hover') {
            isDragOver.value = true;
          } else if (type === 'cancel') {
            isDragOver.value = false;
          } else if (paths.length > 0) {
            isDragOver.value = false;
            void handleTauriFileDrop(paths);
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
    const funcs = [unlistenFileDropPrimary, unlistenFileDropHover, unlistenFileDropCancelled, unlistenWindowFileDrop];
    for (const fn of funcs) {
      if (fn) await fn();
    }
    console.log('[DD] Unregistered Tauri drag-drop listeners');
  } catch (error) {
     console.error('Unregister drag-drop listeners failed:', error);
   }
});

watch(tasks, (newTasks) => {
  if (detailTaskId.value) {
    const stillExists = newTasks.some(task => task.id === detailTaskId.value);
    if (!stillExists) {
      detailTaskId.value = null;
    }
  }
  if (!multiSelectMode.value) return;
  const processingIds = newTasks
    .filter(task => selectedTaskIds.value.includes(task.id) && task.status === 'processing')
    .map(task => task.id);
  const isSameLength = processingIds.length === selectedTaskIds.value.length;
  const isSameSet = isSameLength && processingIds.every((id, idx) => id === selectedTaskIds.value[idx]);
  if (!isSameSet) {
    selectedTaskIds.value = processingIds;
  }
  if (processingIds.length === 0) {
    showMultiSelectDots.value = true;
  }
});
</script>

<style scoped>
.multi-select-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.85;
  animation: multi-select-bounce 1.4s ease-in-out infinite;
}

.multi-select-dot--light {
  background: #ffffff;
}

@keyframes multi-select-bounce {
  0% {
    transform: translateY(0);
    opacity: 0.4;
  }
  40% {
    transform: translateY(-4px);
    opacity: 1;
  }
  80% {
    transform: translateY(0);
    opacity: 0.7;
  }
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
}

.task-stagger-enter-from,
.task-stagger-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
.task-stagger-enter-active,
.task-stagger-leave-active {
  transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
.task-stagger-leave-active {
  position: absolute;
}
.task-stagger-move {
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.task-stagger-no-move {
  transition: none !important;
}
.task-stack__glow {
  position: absolute;
  inset: -18px -8px;
  border-radius: 36px;
  background: radial-gradient(120% 120% at 40% -10%, rgba(99, 102, 241, 0.22), transparent 70%);
  pointer-events: none;
  opacity: 0.12;
  transform-origin: center;
  filter: saturate(1);
}
.task-stack--multi .task-stack__glow {
  filter: saturate(1.3);
}
.multi-select-flare {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(120% 120% at 50% 50%, rgba(255, 255, 255, 0.28), transparent 68%);
  mix-blend-mode: screen;
}
.start-button {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}
.start-button__content {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  position: relative;
  z-index: 1;
}
.start-button__icon {
  width: 18px;
  height: 18px;
  opacity: 0.92;
  flex-shrink: 0;
}
.start-button__label {
  letter-spacing: 0.01em;
}
.start-button__badge {
  position: absolute;
  right: 1.4rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.75rem;
  min-width: 1.75rem;
  padding: 0 0.4rem;
  border-radius: 0.9rem;
  background: rgba(255, 255, 255, 0.26);
  color: #0f172a;
  font-size: 0.85rem;
  font-weight: 600;
  backdrop-filter: blur(10px);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}
.dark .start-button__badge {
  background: rgba(15, 23, 42, 0.38);
  color: #e2e8f0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
.start-button--processing {
  background: linear-gradient(135deg, rgba(76, 106, 255, 1) 0%, rgba(37, 99, 235, 0.98) 52%, rgba(14, 165, 233, 0.96) 100%);
  box-shadow: 0 18px 36px -18px rgba(59, 130, 246, 0.55);
}
.start-button--processing::before {
  content: '';
  position: absolute;
  inset: -16%;
  background: radial-gradient(circle at 22% 15%, rgba(255, 255, 255, 0.42), transparent 58%);
  opacity: 0.75;
  z-index: 0;
}
.start-button--processing::after {
  content: '';
  position: absolute;
  inset: -18%;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.58) 48%, rgba(255, 255, 255, 0) 82%);
  transform: translateX(-120%);
  animation: start-button-sheen 1.8s ease-in-out infinite;
  z-index: 0;
  opacity: 0.85;
}
.start-button--undo {
  background: linear-gradient(135deg, rgba(14, 116, 144, 0.92) 0%, rgba(59, 130, 246, 0.95) 100%);
  box-shadow: 0 16px 32px -18px rgba(39, 123, 192, 0.42);
}
.start-button--undo .start-button__icon {
  opacity: 1;
}
.start-button--undo .start-button__label {
  letter-spacing: 0.02em;
}

@keyframes start-button-sheen {
  0% {
    transform: translateX(-120%);
  }
  55% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(120%);
  }
}
</style>
