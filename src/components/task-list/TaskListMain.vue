<template>
  <div
    class="h-full flex flex-col bg-gray-50 dark:bg-[#2d2d2d]"
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
          @delete="deleteTask"
          @toggle-expand="toggleTaskExpansion"
          @pause="pauseTask"
          @resume="resumeTask"
          @select="emit('select-task', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useTaskStore } from '../../stores/useTaskStore';
import { useGlobalSettingsStore } from '../../stores/useGlobalSettingsStore';
import TaskListToolbar from './TaskListToolbar.vue';
import TaskItem from './TaskItem.vue';
import type { CompressionTask } from '../../types';

// 使用任务store
const taskStore = useTaskStore();

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
}

const props = defineProps<Props>();

// 使用store中的任务数据，如果props中有tasks则使用props（向后兼容）
const tasks = computed(() => props.tasks || taskStore.tasks);
const selectedTaskId = computed(() => props.selectedTaskId || taskStore.selectedTaskId);
const emit = defineEmits<Emits>();
const { t } = useI18n();

// 状态管理
const selectedStatuses = ref(new Set<string>());
const expandedTasks = ref(new Set<string>());
const selectedTasks = ref(new Set<string>());
const isDragOver = ref(false);

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
      } catch (pauseError) {
        const errorMessage = String(pauseError);
        if (errorMessage.includes('Process was interrupted') || errorMessage.includes('not found')) {
          console.log('System task already interrupted/not found:', taskId);
        } else {
          console.warn('Failed to cancel system task, proceeding with deletion:', pauseError);
        }
      }
    }

    // 调用后端删除任务
    await invoke('delete_task', { taskId });
    
    // 如果启用了删除压缩文件选项，在前端删除压缩文件
    const globalSettings = useGlobalSettingsStore();
    if (globalSettings.deleteCompressedFileOnTaskDelete) {
      const task = tasks.value.find(t => t.id === taskId);
      if (task?.file.compressedPath) {
        try {
          await invoke('remove_file', { path: task.file.compressedPath });
        } catch (error) {
          console.error('Failed to delete compressed file:', error);
        }
      }
    }
    
    // 通知父组件删除任务
    emit('delete-task', taskId);
    
    // 清理本地状态
    expandedTasks.value.delete(taskId);
    selectedTasks.value.delete(taskId);
    
    console.log('Task deleted successfully:', taskId);
  } catch (error) {
    console.error('Failed to delete task:', error);
  }
};

const pauseTask = async (taskId: string) => {
  try {
    const task = tasks.value.find(t => t.id === taskId);
    console.log('Pause task called for:', taskId, 'Task found:', task, 'Task status:', task?.status);
    if (task && task.status === 'processing') {
      // 上抛给父组件处理暂停（统一由控制器/上层管理）
      emit('pause-task', taskId);
    } else {
      console.log('Task not in processing state or not found:', taskId, task?.status);
    }
  } catch (error) {
    console.error('Failed to pause task:', error);
  }
};

const resumeTask = async (taskId: string) => {
  try {
    const task = tasks.value.find(t => t.id === taskId);
    console.log('Resume task called for:', taskId, 'Task found:', task, 'Task status:', task?.status);
    if (task && (task.status === 'paused' || task.status === 'queued')) {
      console.log('Resuming task by restarting compression:', taskId);
      // 触发重新压缩
      emit('resume-compression', taskId);
    } else {
      console.log('Task not in paused/queued state or not found:', taskId, task?.status);
    }
  } catch (error) {
    console.error('Failed to resume task:', error);
  }
};

const handleClearAllTasks = () => {
  emit('clear-all-tasks');
};

// DOM drag handlers for visual feedback
const handleDragOver = (event: DragEvent) => {
  console.log('[DD] DOM dragover');
  if (event && event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
  isDragOver.value = true;
};
 const handleDragLeave = () => {
   console.log('[DD] DOM dragleave');
   isDragOver.value = false;
 };
 const handleDrop = (event: DragEvent) => {
   console.log('[DD] DOM drop captured');
   isDragOver.value = false;
   const dt = event.dataTransfer;
   if (!dt) {
     console.log('[DD] DOM drop: no dataTransfer');
     return;
   }
   console.log('[DD] DOM drop: types=', dt.types);
   if (dt.files && dt.files.length > 0) {
     const files = Array.from(dt.files);
     console.log('[DD] DOM drop: files length=', files.length, files.map(f => ({ name: f.name, type: f.type, size: f.size })));
     // Convert File[] to FileList-like object
     const indexed = Object.fromEntries(files.map((f, i) => [i, f]));
     const fileList = {
       ...indexed,
       length: files.length,
       item: (index: number) => files[index] || null,
       [Symbol.iterator]: function* () {
         for (let i = 0; i < files.length; i++) {
           yield files[i];
         }
       }
     } as unknown as FileList;
     console.log('[DD] DOM drop: emitting files-selected with length:', fileList.length);
     emit('files-selected', fileList);
   } else {
     console.log('[DD] DOM drop: no files in dataTransfer');
   }
 };

// Handle Tauri file drop events (global)
const handleTauriFileDrop = async (filePaths: string[]) => {
  console.log('[DD] handleTauriFileDrop payload:', filePaths);
  if (filePaths && Array.isArray(filePaths)) {
    const files: File[] = [];
    for (const filePath of filePaths) {
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      let mimeType = 'application/octet-stream';
  
      // 对齐 FileUploader 的扩展名与 MIME 映射，确保拖拽与点击选择一致
      const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'flv', 'm4v', 'm4s', 'm4p', 'mpg', 'mpeg', 'mpe', 'mpv', 'mp2', 'mts', 'm2ts', 'ts', '3gp', '3g2', 'asf', 'vob', 'ogv', 'ogg', 'rm', 'rmvb', 'f4v', 'f4p', 'f4a', 'f4b', 'mod', 'mxf', 'qt', 'yuv', 'amv', 'svi', 'roq', 'nsv'];
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'heic', 'heif', 'avif', 'jxl'];
  
      if (videoExts.includes(extension)) {
        mimeType = `video/${extension === 'mov' ? 'quicktime' : extension === 'wmv' ? 'x-ms-wmv' : extension === 'avi' ? 'x-msvideo' : extension === '3gp' ? '3gpp' : extension === 'ogv' ? 'ogg' : extension}`;
      } else if (imageExts.includes(extension)) {
        mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      }
  
      let fileSize = 0;
      try {
        fileSize = await invoke<number>('get_file_size', { filePath });
      } catch (error) {
        console.warn('Failed to get file size:', error);
      }
      const mockFile = new File([], fileName, { type: mimeType });
      (mockFile as any).path = filePath;
      // 注意：不要强行覆盖 File.size（该属性为只读且不可重新定义），否则会在某些 WebView 中抛出错误，
      // 从而导致整个拖拽回调静默失败。实际的文件大小会在后续 handleFiles 中通过 Tauri 获取。
      // Object.defineProperty(mockFile, 'size', { value: fileSize, writable: false, enumerable: true });
      files.push(mockFile);
    }
    console.log('[DD] Prepared files for emission:', files.map(f => ({ name: f.name, type: f.type, path: (f as any).path })));
    // 构造一个 FileList-like 对象，避免与数组的 length 冲突
    const indexed = Object.fromEntries(files.map((f, i) => [i, f]));
    const fileList = {
      ...indexed,
      length: files.length,
      item: (index: number) => files[index] || null,
      [Symbol.iterator]: function* () {
        for (let i = 0; i < files.length; i++) {
          yield files[i];
        }
      }
    } as unknown as FileList;
    console.log('[DD] Emitting files-selected with length:', fileList.length);
    emit('files-selected', fileList);
  } else {
    console.log('[DD] handleTauriFileDrop called with non-array payload');
  }
};

// 文档级别后备监听器，避免组件未能捕获到 drop
let unlistenWindowFileDrop: (() => void) | null = null;

onMounted(async () => {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    // 注册 Tauri 原生拖拽事件（全局）
    unlistenDragDrop = await listen('tauri://drag-drop', (event) => {
      console.log('[DD] tauri://drag-drop event fired with payload:', event?.payload);
      const payload: any = (event as any)?.payload;
      const filePaths: string[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.paths)
          ? payload.paths
          : [];
      if (filePaths.length) {
        handleTauriFileDrop(filePaths);
      } else {
        console.log('[DD] drag-drop payload does not include paths, skipping');
      }
    });
    // 兼容旧版事件名（某些平台/打包环境可能仍发出 tauri://file-drop）
    unlistenFileDrop = await listen('tauri://file-drop', (event) => {
      console.log('[DD] tauri://file-drop event fired with payload:', event?.payload);
      const payload: any = (event as any)?.payload;
      const filePaths: string[] = Array.isArray(payload) ? payload : [];
      if (filePaths.length) {
        handleTauriFileDrop(filePaths);
      } else {
        console.log('[DD] file-drop payload not array, skipping');
      }
    });
    unlistenDragEnter = await listen('tauri://drag-enter', () => {
      console.log('[DD] tauri://drag-enter');
      isDragOver.value = true;
    });
    unlistenDragLeave = await listen('tauri://drag-leave', () => {
      console.log('[DD] tauri://drag-leave');
      isDragOver.value = false;
    });
    unlistenDragOver = await listen('tauri://drag-over', () => {
      console.log('[DD] tauri://drag-over');
      isDragOver.value = true;
    });

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

    // 监听窗口焦点变化，失焦时清理拖拽样式
    appWindow.onFocusChanged(({ payload }: { payload: boolean }) => {
      console.log('[DD] window focus changed:', payload);
      if (!payload) {
        isDragOver.value = false;
      }
    });
  } catch (error) {
    console.warn('Failed to register Tauri drag-drop listeners:', error);
  }
});

onUnmounted(() => {
  try { unlistenDragDrop && unlistenDragDrop(); } catch {}
  try { unlistenDragEnter && unlistenDragEnter(); } catch {}
  try { unlistenDragLeave && unlistenDragLeave(); } catch {}
  try { unlistenDragOver && unlistenDragOver(); } catch {}
  try { unlistenFileDrop && unlistenFileDrop(); } catch {}
  if (unlistenWindowFileDrop) try { unlistenWindowFileDrop(); } catch {}
});

</script>