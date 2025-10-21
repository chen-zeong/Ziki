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
      :multi-select-mode="multiSelectMode"
      @add-files="$emit('add-files')"
      @files-selected="$emit('files-selected', $event)"
      @clear-all-tasks="handleClearAllTasks"
      @toggle-multi-select="toggleMultiSelect"
    />

    <div class="flex-1 overflow-y-auto px-4 pb-4 transition-all duration-200">
      <div v-if="tasks.length === 0" class="flex h-full items-center justify-center px-4">
        <div class="w-full max-w-lg rounded-2xl border border-dashed border-slate-300/70 px-10 py-14 text-center dark:border-white/15">
          <p class="text-2xl font-semibold tracking-wide text-slate-400 dark:text-slate-500">
            {{ $t('taskList.noTasks') }}
          </p>
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

    <div class="px-4 pb-4">
      <button
        class="start-button group relative inline-flex w-full items-center justify-center gap-3 px-6 py-3 rounded-2xl text-base font-semibold text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/60"
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
          <span
            v-if="multiSelectMode"
            class="start-button__badge"
          >
            {{ selectedTaskIds.length }}
          </span>
        </span>
        <span class="start-button__glow" aria-hidden="true"></span>
      </button>
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
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { Window as TauriWindow } from '@tauri-apps/api/window';
import { useTaskStore } from '../../stores/useTaskStore';
import TaskListToolbar from './TaskListToolbar.vue';
import TaskItem from './TaskItem.vue';
import TaskDetails from './TaskDetails.vue';
import { Loader2, Undo2, Play } from 'lucide-vue-next';
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
  (e: 'select-task', taskId: string | null): void;
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

// 状态管理
const selectedTaskIds = ref<string[]>([]);
const isDragOver = ref(false);
const multiSelectMode = ref(false);
const detailTaskId = ref<string | null>(null);
const detailAnchorElement = ref<HTMLElement | null>(null);
const detailAnchorRect = ref<DOMRect | null>(null);
const MotionGlow = motion.div;
const allowedMultiSelectStatuses = new Set<CompressionTask['status']>(['pending', 'queued']);
const getTaskById = (taskId: string) => tasks.value.find(task => task.id === taskId) || null;
const multiSelectPrimaryTask = computed(() => {
  const firstId = selectedTaskIds.value[0];
  return firstId ? getTaskById(firstId) : null;
});
const multiSelectLockedType = computed(() => multiSelectPrimaryTask.value?.type ?? null);

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
    const typeMap: Record<string, FileDropEventType> = {
      hover: 'hover',
      over: 'hover',
      enter: 'hover',
      drop: 'drop',
      cancel: 'cancel',
      leave: 'cancel'
    };
    const type = typeMap[rawType] ?? 'unknown';
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
const isQueuedButton = computed(() => !multiSelectMode.value && selectedTaskStatus.value === 'queued');

const primaryActionEnabled = computed(() => {
  if (multiSelectMode.value) {
    return selectedTaskIds.value.length > 0;
  }
  if (isQueuedButton.value) {
    return false;
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
    return t('taskList.batchCompress') || '批量压缩';
  }
  if (showUndoButton.value) {
    return t('videoSettings.undo') || '撤销';
  }
  if (isQueuedButton.value) {
    return t('taskList.statusQueued') || '排队中';
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
  selectedTaskIds.value = [];
};

const isTaskEligibleForMultiSelect = (
  taskId: string,
  constrainedType: CompressionTask['type'] | null = null
) => {
  const task = getTaskById(taskId);
  if (!task) return false;
  if (!allowedMultiSelectStatuses.has(task.status)) return false;
  const typeConstraint = constrainedType ?? multiSelectLockedType.value;
  if (typeConstraint && task.type !== typeConstraint) return false;
  return true;
};

const filterEligibleMultiSelectIds = (ids: string[]) => {
  const firstValidTask = ids
    .map(id => getTaskById(id))
    .find((task): task is CompressionTask => !!task && allowedMultiSelectStatuses.has(task.status));
  const lockedType = firstValidTask?.type ?? multiSelectLockedType.value ?? null;
  return ids.filter(id => isTaskEligibleForMultiSelect(id, lockedType));
};

const activeDetailTask = computed(() => {
  return tasks.value.find(task => task.id === detailTaskId.value) || null;
});

 const onSelectTask = (taskId: string) => {
   emit('select-task', taskId);
 };

const toggleTaskCheck = (taskId: string) => {
  if (!multiSelectMode.value) return;
  if (!isTaskEligibleForMultiSelect(taskId)) return;
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
    const current = selectedTaskId.value;
    if (current && isTaskEligibleForMultiSelect(current)) {
      selectedTaskIds.value = [current];
    } else {
      selectedTaskIds.value = [];
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
  const providedAnchor = typeof payload === 'string' ? null : payload.trigger;
  if (providedAnchor) {
    detailAnchorElement.value = providedAnchor;
  } else if (typeof window !== 'undefined') {
    detailAnchorElement.value = document.querySelector(`.task-stack .task-card[data-task-id="${taskId}"]`) as HTMLElement | null;
  } else {
    detailAnchorElement.value = null;
  }
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
let unlistenDragDrop: UnlistenFn | null = null;
let unlistenDragEnter: UnlistenFn | null = null;
let unlistenDragOver: UnlistenFn | null = null;
let unlistenDragLeave: UnlistenFn | null = null;
let unlistenWindowDragDrop: UnlistenFn | null = null;

// 计算属性
const deleteTask = async (taskId: string) => {
  try {
    const task = tasks.value.find(t => t.id === taskId);
     if (!task) {
       console.error('Task not found:', taskId);
       return;
     }

     // 若在 Tauri 环境下，确保同时删除底层系统任务
     if (isTauri) {
       try {
         await invoke('delete_task', { taskId });
         console.log('System task deleted successfully:', taskId);
       } catch (err) {
         console.warn('Failed to delete system task:', err);
       }
     }

    taskStore.deleteTask(taskId);
    if (detailTaskId.value === taskId) {
      detailTaskId.value = null;
      detailAnchorElement.value = null;
      detailAnchorRect.value = null;
    }
    selectedTaskIds.value = selectedTaskIds.value.filter(id => id !== taskId);
    const nextSelectedId = taskStore.selectedTaskId || null;
    emit('select-task', nextSelectedId);
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
  emit('clear-all-tasks');
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
  if (isTauri) {
    // 在 Tauri 环境下由底层事件负责派发，避免重复导入
    return;
  }
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

    let dragDropRegistered = false;

    try {
      unlistenDragDrop = await listen('tauri://drag-drop', (event) => {
        const { paths } = normalizeDropPayload((event as any)?.payload);
        if (paths.length > 0) {
          isDragOver.value = false;
          void handleTauriFileDrop(paths);
        }
      });
      dragDropRegistered = true;
    } catch (err) {
      console.warn('[DD] Failed to register tauri://drag-drop listener:', err);
      unlistenDragDrop = null;
    }

    try {
      unlistenDragEnter = await listen('tauri://drag-enter', (event) => {
        const { type } = normalizeDropPayload((event as any)?.payload);
        if (type === 'cancel') {
          isDragOver.value = false;
          return;
        }
        isDragOver.value = true;
      });
    } catch (err) {
      console.warn('[DD] Failed to register tauri://drag-enter listener:', err);
      unlistenDragEnter = null;
    }

    try {
      unlistenDragOver = await listen('tauri://drag-over', () => {
        isDragOver.value = true;
      });
    } catch (err) {
      console.warn('[DD] Failed to register tauri://drag-over listener:', err);
      unlistenDragOver = null;
    }

    try {
      unlistenDragLeave = await listen('tauri://drag-leave', () => {
        isDragOver.value = false;
      });
    } catch (err) {
      console.warn('[DD] Failed to register tauri://drag-leave listener:', err);
      unlistenDragLeave = null;
    }

    const shouldUseWindowFallback = !dragDropRegistered;

    if (shouldUseWindowFallback) {
      try {
        const winAny = appWindow
          ? (appWindow as unknown as { onDragDropEvent?: (cb: (e: any) => void) => Promise<() => void> })
          : null;
        if (winAny && typeof winAny.onDragDropEvent === 'function') {
          unlistenWindowDragDrop = await winAny.onDragDropEvent((e: any) => {
            console.log('[DD] appWindow.onDragDropEvent:', e);
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
          console.log('[DD] Registered window-level drag-drop listener (fallback)');
        } else {
          console.log('[DD] appWindow.onDragDropEvent not available in this Tauri version');
        }
      } catch (werr) {
        console.warn('[DD] Failed to register window-level drag-drop listener:', werr);
      }
    } else {
      console.log('[DD] Window-level drag-drop fallback not required');
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
    const funcs = [unlistenDragDrop, unlistenDragEnter, unlistenDragOver, unlistenDragLeave, unlistenWindowDragDrop];
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
  if (newTasks.length === 0) {
    exitMultiSelectMode();
  }
  if (!multiSelectMode.value) return;
  selectedTaskIds.value = filterEligibleMultiSelectIds(selectedTaskIds.value);
}, { deep: true });
</script>

<style scoped>
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
.dark .task-stack__glow {
  background: radial-gradient(120% 120% at 50% -12%, rgba(148, 163, 184, 0.22), transparent 68%);
  opacity: 0.1;
  filter: saturate(0.8);
}
.start-button {
  position: relative;
  border-radius: 0.9rem;
  --button-bg: #6366f1;
  --button-bg-hover: #4f46e5;
  --button-bg-active: #4338ca;
  --button-shadow: 0 20px 44px -24px rgba(99, 102, 241, 0.45);
  --button-shadow-hover: 0 22px 48px -24px rgba(79, 70, 229, 0.52);
  background: var(--button-bg);
  box-shadow: var(--button-shadow);
  transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
  overflow: hidden;
}
.start-button:hover {
  transform: translateY(-1px);
  box-shadow: var(--button-shadow-hover);
  background: var(--button-bg-hover);
}
.start-button:active {
  transform: translateY(0);
  background: var(--button-bg-active);
}
.start-button__glow {
  position: absolute;
  inset: -45% -25%;
  background: radial-gradient(125% 125% at 30% 15%, rgba(255, 255, 255, 0.35), transparent 68%);
  opacity: 0.42;
  transition: opacity 0.25s ease;
  pointer-events: none;
}
.start-button:hover .start-button__glow {
  opacity: 0.6;
}
.start-button__content {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.start-button__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  opacity: 0.95;
}
.start-button__label {
  font-size: 1rem;
  letter-spacing: 0.02em;
}
.start-button__badge {
  margin-left: 0.45rem;
  padding: 0 0.6rem;
  min-height: 1.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.55rem;
  background: rgba(255, 255, 255, 0.4);
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 600;
  backdrop-filter: blur(8px);
}
.dark .start-button__badge {
  background: rgba(255, 255, 255, 0.5);
  color: #ffffff;
}
.start-button--processing {
  --button-bg: #4f46e5;
  --button-bg-hover: #4338ca;
  --button-bg-active: #3730a3;
  --button-shadow: 0 22px 48px -24px rgba(79, 70, 229, 0.5);
  --button-shadow-hover: 0 24px 52px -24px rgba(67, 56, 202, 0.56);
}
.start-button--processing .start-button__glow {
  background: radial-gradient(130% 130% at 35% 20%, rgba(255, 255, 255, 0.32), transparent 68%);
  opacity: 0.52;
}
.start-button--processing::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: 0 auto;
  width: 80%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0));
  opacity: 0.7;
  pointer-events: none;
  animation: start-button-ripple 1.8s ease-in-out infinite alternate;
}
.start-button--undo {
  --button-bg: rgba(233, 168, 59, 1);
  --button-bg-hover: rgba(233, 168, 59, 1);
  --button-bg-active: rgba(205, 132, 44, 1);
  --button-shadow: 0 20px 42px -24px rgba(246, 196, 79, 0.42);
  --button-shadow-hover: 0 22px 46px -24px rgba(233, 168, 59, 0.46);
}
.start-button--undo .start-button__icon {
  opacity: 1;
}
.start-button--undo .start-button__label {
  letter-spacing: 0.025em;
}
:global(.dark) .start-button:not(.start-button--undo) {
  --button-bg: var(--button-bg-hover);
  background: var(--button-bg-hover);
}
:global(.dark) .start-button:not(.start-button--undo):hover {
  background: var(--button-bg-active);
}

@keyframes start-button-ripple {
  0% {
    transform: translateX(-35%);
  }
  100% {
    transform: translateX(35%);
  }
}
</style>
