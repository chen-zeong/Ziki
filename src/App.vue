<template>
  <AppLayout
    ref="appLayoutRef"
    :current-file="currentFile"
    :is-uploader-visible="isUploaderVisible"
    :selected-files="selectedFiles"
    :is-processing="isProcessing"
    :is-processing-batch="isProcessingBatch"
    :output-path="outputPath"
    :time-range-settings="timeRangeSettings"
    :show-output-folder-popup="showOutputFolderPopup"
    :show-time-range-popup="showTimeRangePopup"

    @files-selected="onFilesSelected"
    @compress="onCompress"
    @reset="onReset"
    @update-images="onUpdateImages"
    @update-task="updateTask"
    @delete-task="deleteTask"
    @resume-compression="handleResumeCompression"
    @pause-task="handlePauseTask"
    @select-task="selectTask"
    @clear-all-tasks="handleClearAllTasks"
    @toggle-output-folder-popup="toggleOutputFolderPopup"
    @toggle-time-range-popup="toggleTimeRangePopup"
    @output-path-update="handleOutputPathUpdate"
    @time-validation-change="handleTimeValidationChange"
    @batch-compress="handleBatchCompress"
    @bottom-compress="handleBottomCompress"
    @undo-compress="handleUndoCompress"
    @update:timeRangeSettings="handleTimeRangeSettingsUpdate"
  />
</template>




<script setup lang="ts">
import { ref, computed, provide, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { confirm } from '@tauri-apps/plugin-dialog';
import AppLayout from './layouts/AppLayout.vue';
import { useTaskStore } from './stores/useTaskStore';
import { useTaskSettingsStore } from './stores/useTaskSettingsStore';
import { useGlobalSettingsStore } from './stores/useGlobalSettingsStore';
import { useFileHandler } from './composables/useFileHandler';
import { useBatchProcessor } from './composables/useBatchProcessor';
import type { CompressionSettings, CompressionTask } from './types';
import { useI18n } from 'vue-i18n';
import { useTaskStateController } from './composables/useTaskStateController';
const { t } = useI18n();

// Tauri 环境检测与对话框兜底
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
const safeConfirm = async (message: string, options?: { title?: string; okLabel?: string; cancelLabel?: string }) => {
  if (isTauri) {
    try { return await confirm(message, options); } catch { /* ignore */ }
  }
  return Promise.resolve(window.confirm(message));
};
// 全局缓存清理函数
const clearAllCaches = () => {
  // 清理VideoPreview组件的全局缓存
  if ((window as any).globalTaskCache) {
    (window as any).globalTaskCache.clear();
  }
  
  taskSettingsStore.clearAllSettings();
};


const taskStore = useTaskStore();
const taskSettingsStore = useTaskSettingsStore();
const globalSettingsStore = useGlobalSettingsStore();

const {
  currentFile,
  isUploaderVisible,
  selectedFiles,
  isProcessing,
  handleFiles,
  resetUploader,
  startCompression,
  switchToTask,
  deleteTask: originalDeleteTask,
  resumeCompression
} = useFileHandler();


const tasks = computed(() => taskStore.tasks);

// 初始化任务状态控制器（用于统一调度与暂停后的续航）
const taskController = useTaskStateController({
  startCompression,
  resumeCompression,
  getOutputDirectory: () => outputPath.value,
  switchToTask,
});

// 包装deleteTask方法，添加缓存清理
const deleteTask = (taskId: string) => {
  const task = tasks.value.find(t => t.id === taskId);
  if (task && appLayoutRef.value) {
    appLayoutRef.value.clearTaskCache(task.file.path);
    // 同时尝试清理压缩后的视频路径缓存（若存在）
    const compressedPath = (task as any).file?.compressedPath;
    if (compressedPath) {
      appLayoutRef.value.clearTaskCache(compressedPath);
    }
  }
  // 调用原始的deleteTask方法
  originalDeleteTask(taskId);
  // 删除后强制刷新当前预览帧，确保 UI 不使用任何残留缓存
  nextTick(() => {
    if (appLayoutRef.value && (appLayoutRef.value as any).refreshPreview) {
      (appLayoutRef.value as any).refreshPreview();
    }
  });
};

// 处理暂停单个任务（集中处理，避免子组件直接调用后端）
const handlePauseTask = async (taskId: string) => {
  const task = tasks.value.find(t => t.id === taskId);
  if (!task || task.status !== 'processing') return;
  try {
    if (isTauri) {
      await invoke('pause_task', { taskId });
    }
  } catch (e) {
    const msg = String(e);
    if (msg.includes('Process was interrupted') || msg.includes('not found')) {
      // 进程已中断/不存在，视为已暂停
    } else {
      console.warn('Failed to pause task:', e);
    }
  } finally {
    // 同步前端状态为 paused，并尝试调度下一个
    taskStore.updateTaskStatus(taskId, 'paused');
    // 若有排队任务，继续调度
    void taskController.scheduleNext();
  }
};

// 批量处理器
const {
  isProcessingBatch,
  startBatchCompression,
  stopBatchCompression,
  resumeBatchCompression,
  getBatchCachedSettings,
  clearBatchSettingsCache,
} = useBatchProcessor();

// 当前选中任务
const selectedTask = computed<CompressionTask | null>(() => {
  return taskStore.selectedTask;
});

// 提供当前文件信息给子组件
provide('currentFile', currentFile);
provide('currentTaskId', computed(() => currentFile.value?.id || null));

// 提供“当前任务的设置”和“更新方法”给右侧设置面板
const currentTaskSettings = computed<CompressionSettings | null>(() => selectedTask.value ? selectedTask.value.settings : null);
provide('currentTaskSettings', currentTaskSettings);
provide('updateCurrentTaskSettings', (updates: Partial<CompressionSettings>) => {
  if (!selectedTask.value) return;
  
  // 更新任务设置store
  taskSettingsStore.updateTaskSettings(selectedTask.value.id, updates);
  
  // 保持原有逻辑，更新任务store中的设置
  const idx = tasks.value.findIndex(t => t.id === selectedTask.value!.id);
  if (idx !== -1) {
    tasks.value[idx] = {
      ...tasks.value[idx],
      settings: {
        ...tasks.value[idx].settings,
        ...updates
      }
    } as CompressionTask;
  }
});

const showOutputFolderPopup = ref(false);
const outputPath = ref('');
const showTimeRangePopup = ref(false);
const timeRangeSettings = ref({
  enabled: false,
  timeRange: {
    start: '00:00:00',
    end: '00:00:00'
  }
});



const toggleOutputFolderPopup = () => {
  showOutputFolderPopup.value = !showOutputFolderPopup.value;
};

const toggleTimeRangePopup = () => {
  showTimeRangePopup.value = !showTimeRangePopup.value;
};

const handleTimeValidationChange = (isValid: boolean) => {
  // 处理时间验证状态变化
};

const handleTimeRangeSettingsUpdate = (newSettings: any) => {
  timeRangeSettings.value = newSettings;
  // 同步到当前选中任务的设置（以秒为单位存储）
  if (selectedTask.value) {
    const tr = newSettings.enabled ? {
      start: timeToSeconds(newSettings.timeRange.start),
      end: timeToSeconds(newSettings.timeRange.end)
    } : undefined;
    const idx = tasks.value.findIndex(t => t.id === selectedTask.value!.id);
    if (idx !== -1) {
      tasks.value[idx] = {
        ...tasks.value[idx],
        settings: {
          ...tasks.value[idx].settings,
          timeRange: tr
        }
      } as CompressionTask;
    }
  }
};



const handleOutputPathUpdate = (path: string) => {
  outputPath.value = path;
};

const onFilesSelected = async (files: FileList) => {
  console.log('[DD] App.vue onFilesSelected received length:', files?.length, files);
  await handleFiles(files);
  console.log('[DD] App.vue onFilesSelected finished handleFiles');
};

const onCompress = async (settings: CompressionSettings) => {
  if (!currentFile.value) {
    return;
  }
  const taskTimeRange = selectedTask.value?.settings?.timeRange;

  const compressionSettings = {
    ...settings,
    timeRange: taskTimeRange !== undefined ? taskTimeRange : undefined
  } as CompressionSettings;

  try {
    await startCompression(compressionSettings, outputPath.value);
  } catch (error) {
    // Compression failed
  }
};

// 时间格式转换：HH:MM:SS 转换为秒数
const timeToSeconds = (timeStr: string): number | null => {
  if (!timeStr || timeStr === '00:00:00') return null;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  return hours * 3600 + minutes * 60 + seconds;
};

const secondsToTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00:00';
  }
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// 根据任务设置应用时间段到UI
const applyTaskTimeRangeToUI = (task: CompressionTask | null) => {
  if (!task || !task.settings || !task.settings.timeRange) {
    timeRangeSettings.value.enabled = false;
    timeRangeSettings.value.timeRange.start = '00:00:00';
    // 如果有视频文件，使用视频时长作为默认结束时间
    const duration = task?.file?.metadata?.duration || currentFile.value?.metadata?.duration;
    timeRangeSettings.value.timeRange.end = duration ? secondsToTime(duration) : '00:00:00';
    return;
  }
  const { start, end } = task.settings.timeRange;
  timeRangeSettings.value.enabled = start !== null || end !== null;
  timeRangeSettings.value.timeRange.start = start ? secondsToTime(start) : '00:00:00';
  timeRangeSettings.value.timeRange.end = end ? secondsToTime(end) : (task?.file?.metadata?.duration ? secondsToTime(task.file.metadata.duration) : '00:00:00');
};

// 监听当前文件变化，以验证和调整时间范围
watch(currentFile, (newFile) => {
  if (newFile && newFile.metadata && timeRangeSettings.value.enabled) {
    const duration = newFile.metadata.duration;
    const startSeconds = timeToSeconds(timeRangeSettings.value.timeRange.start);
    const endSeconds = timeToSeconds(timeRangeSettings.value.timeRange.end);

    // 如果结束时间超过新视频时长，则调整为新视频时长
    if (endSeconds === null || endSeconds === 0 || endSeconds > duration) {
      timeRangeSettings.value.timeRange.end = secondsToTime(duration);
    }
    
    // 如果开始时间超过新视频时长，则重置为0
    if (startSeconds !== null && startSeconds > duration) {
      timeRangeSettings.value.timeRange.start = '00:00:00';
    }
  }
}, { deep: true });

const onUpdateImages = (images: { beforeImage?: string; afterImage?: string }) => {
  if (!currentFile.value) return;
  
  // 检查是否真的需要更新，避免不必要的响应式更新
  const needsUpdate = (
    (images.beforeImage && images.beforeImage !== currentFile.value.originalUrl) ||
    (images.afterImage && images.afterImage !== currentFile.value.compressedUrl)
  );
  
  if (!needsUpdate) return;
  
  // 使用nextTick确保更新在下一个tick中进行，避免递归
  nextTick(() => {
    if (!currentFile.value) return;
    
    // 创建新的文件对象
    const updatedFile = { ...currentFile.value };
    
    if (images.beforeImage && images.beforeImage !== updatedFile.originalUrl) {
      updatedFile.originalUrl = images.beforeImage;
    }
    
    // 注意：afterImage是压缩后的帧图片，不应该覆盖compressedUrl（压缩视频路径）
    // compressedUrl应该保持为压缩后的视频文件路径
    
    // 更新当前文件
    currentFile.value = updatedFile;
    
    // 同时更新selectedFiles中的对应文件
    const fileIndex = selectedFiles.value.findIndex((f: any) => f.id === updatedFile.id);
    if (fileIndex !== -1) {
      selectedFiles.value[fileIndex] = updatedFile;
    }
  });
};

const onReset = () => {
  resetUploader();
};

// 批量压缩处理函数
const handleBatchCompress = async (taskIds?: string[]) => {
  if (isProcessingBatch.value) {
    // 如果正在批量处理，则停止
    stopBatchCompression();
    return;
  }

  let filteredTasks: CompressionTask[] = [];
  if (Array.isArray(taskIds) && taskIds.length > 0) {
    const idSet = new Set(taskIds);
    filteredTasks = tasks.value.filter(t => idSet.has(t.id));
  } else {
    // 获取当前选中任务类型
    const currentFileTask = currentFile.value && tasks.value.find(t => t.file.id === currentFile.value?.id);
    const targetType = currentFileTask?.type || null;
    if (!targetType) {
      return;
    }
    filteredTasks = tasks.value.filter(t => t.type === targetType);
  }

  if (filteredTasks.length === 0) {
    return;
  }

  const resolvedTargetType = Array.isArray(taskIds) && taskIds.length > 0
    ? filteredTasks[0]?.type || null
    : (selectedTask.value?.type || filteredTasks[0]?.type || null);
  if (resolvedTargetType) {
    filteredTasks = filteredTasks.filter(t => t.type === resolvedTargetType);
  }

  // 仅当存在 pending 时才启动批量
  const hasPending = filteredTasks.some(t => t.status === 'pending');
  if (!hasPending) {
    return;
  }

  // 暂停队列调度，避免在批量开始前由 scheduleNext 启动排队任务导致并发/重复启动
  taskController.pauseQueue();
  try {
    await startBatchCompression(
      filteredTasks,
      startCompression,
      switchToTask,
      outputPath.value,
      currentTaskSettings.value
    );
  } finally {
    // 批量完成或中断后恢复队列调度
    taskController.resumeQueue();
  }
};

// AppLayout组件引用
const appLayoutRef = ref<InstanceType<typeof AppLayout> | null>(null);

// 底部按钮的压缩处理
const handleBottomCompress = () => {
  if (appLayoutRef.value) {
    appLayoutRef.value.triggerCompress();
  }
};

// 撤销压缩处理
const handleUndoCompress = async () => {
  if (!selectedTask.value || selectedTask.value.status !== 'completed') {
    return;
  }

  const task = selectedTask.value;

  try {
    const defaultSettings: CompressionSettings = task.type === 'video'
      ? taskSettingsStore.getDefaultVideoSettings()
      : taskSettingsStore.getDefaultImageSettings();

    // 1. 删除压缩后的文件(如果存在)
    if (task.file.compressedPath) {
      try {
        await invoke('remove_file', { path: task.file.compressedPath });
      } catch (error) {
        console.warn('删除压缩文件失败:', error);
      }
    }

    // 2. 清理视频预览缓存
    if (appLayoutRef.value) {
      if (task.file.path) {
        appLayoutRef.value.clearTaskCache(task.file.path);
      }
      if (task.file.compressedPath) {
        appLayoutRef.value.clearTaskCache(task.file.compressedPath);
      }
    }

    // 3. 重置任务状态为pending
    const updatedTask: CompressionTask = {
      ...task,
      status: 'pending',
      progress: 0,
      compressedSize: 0,
      startedAt: undefined,
      completedAt: undefined,
      settings: { ...defaultSettings },
      file: {
        ...task.file,
        compressedPath: undefined,
        compressedUrl: undefined
      }
    };

    // 4. 更新任务store
    taskStore.updateTask(updatedTask);
    taskSettingsStore.setTaskSettings(task.id, updatedTask.settings);

    // 5. 更新当前文件的显示
    if (currentFile.value && currentFile.value.id === task.file.id) {
      currentFile.value = {
        ...currentFile.value,
        compressedPath: undefined,
        compressedUrl: undefined
      };
    }

    const selectedIndex = selectedFiles.value.findIndex((file: any) => file.id === task.file.id);
    if (selectedIndex !== -1) {
      const targetFile = selectedFiles.value[selectedIndex];
      selectedFiles.value[selectedIndex] = {
        ...targetFile,
        compressedPath: undefined,
        compressedUrl: undefined
      };
    }

    // 6. 刷新预览
    await nextTick();
    if (appLayoutRef.value && (appLayoutRef.value as any).refreshPreview) {
      (appLayoutRef.value as any).refreshPreview();
    }
  } catch (error) {
    console.error('撤销压缩失败:', error);
  }
};



// 处理任务状态更新
const updateTask = (updatedTask: CompressionTask) => {
  const taskIndex = tasks.value.findIndex(t => t.id === updatedTask.id);
  if (taskIndex !== -1) {
    tasks.value[taskIndex] = updatedTask;
  }
};

// 处理任务选中
const selectTask = (taskId: string) => {
  taskStore.selectTask(taskId);
  switchToTask(taskId);
  // 将该任务的时间段设置应用到右下角时间段UI
  const t = tasks.value.find(t => t.id === taskId) || null;
  applyTaskTimeRangeToUI(t as CompressionTask | null);
};

// 处理恢复单个任务（支持 paused 与 queued）
const handleResumeCompression = async (taskId: string) => {
  const task = tasks.value.find(t => t.id === taskId);
  if (!task) return;

  try {
    if (task.status === 'paused') {
      await resumeCompression(taskId);
      return;
    }

    if (task.status === 'queued' || task.status === 'pending') {
      if (isProcessingBatch.value) {
        const processingTask = tasks.value.find(t => t.status === 'processing');
        if (processingTask) {
          try { if (isTauri) { await invoke('pause_task', { taskId: processingTask.id }); } } catch {}
          const updatedTask = { ...processingTask, status: 'paused' as const };
          updateTask(updatedTask);
        }
        stopBatchCompression();
      }

      // 优先使用批量缓存的参数（统一性）
      const cached = getBatchCachedSettings(taskId);

      // 切到该任务以确保 startCompression 针对正确的 currentFile
      taskStore.selectTask(taskId);
      switchToTask(taskId);
      applyTaskTimeRangeToUI(task);

      const fallbackDefaults: CompressionSettings = task.type === 'video'
        ? taskSettingsStore.getDefaultVideoSettings()
        : taskSettingsStore.getDefaultImageSettings();

      // 如果缓存存在，用缓存；否则回退到任务自身或默认
      const baseSettings = (cached
        ? { ...cached }
        : (task.settings ? { ...task.settings } : { ...fallbackDefaults })) as CompressionSettings;

      const effectiveSettings: CompressionSettings = { ...baseSettings } as CompressionSettings;
      const taskTimeRange = task.settings?.timeRange;
      if (taskTimeRange !== undefined) {
        (effectiveSettings as any).timeRange = taskTimeRange as any;
      }

      const liveTask = taskStore.getTaskById(taskId);
      if (liveTask) {
        taskStore.updateTask({ ...liveTask, settings: effectiveSettings });
        taskSettingsStore.setTaskSettings(taskId, effectiveSettings);
      }

      await startCompression(effectiveSettings, outputPath.value, false);

      const remainingPending = tasks.value.filter(t => t.status === 'pending');
      const hasProcessing = tasks.value.some(t => t.status === 'processing');
      if (remainingPending.length > 0 && !hasProcessing && !isProcessingBatch.value) {
        taskController.pauseQueue();
        try {
          await startBatchCompression(
            tasks.value,
            startCompression,
            switchToTask,
            outputPath.value,
            currentTaskSettings.value
          );
        } finally {
          taskController.resumeQueue();
        }
      }
    }
  } catch (e) {
    // handleResumeCompression error
  }
};

// 初始化输出路径（从全局设置中获取并保持同步）
watch(
  () => globalSettingsStore.outputPath,
  (newPath) => {
    if (typeof newPath === 'string') {
      outputPath.value = newPath;
    }
  },
  { immediate: true }
);

// 删除压缩文件的公共函数
const deleteCompressedFile = async (task: CompressionTask) => {
  if (globalSettingsStore.deleteCompressedFileOnTaskDelete && task.file.compressedPath) {
    try {
      if (isTauri) {
        await invoke('remove_file', { path: task.file.compressedPath });
      }
    } catch (error) {
      console.error('Failed to delete compressed file:', error);
    }
  }
};

// 清空所有任务
const handleClearAllTasks = async () => {
  const activeTasks = tasks.value.filter(task => 
    task.status === 'processing' || task.status === 'queued' || task.status === 'paused'
  );
  
  if (activeTasks.length > 0) {
    // 如果有活跃任务，显示确认对话框
    const confirmed = await safeConfirm(
      t('taskList.clearAllTasksConfirmActive', { count: activeTasks.length }),
      {
        title: t('common.confirm'),
        okLabel: t('common.confirm'),
        cancelLabel: t('common.cancel')
      }
    );

    if (!confirmed) {
      return;
    }
  } else if (tasks.value.length > 0) {
    // 如果只有已完成或失败的任务，简单确认
    const confirmed = await safeConfirm(
      t('taskList.clearAllTasksConfirmSimple'),
      {
        title: t('common.confirm'),
        okLabel: t('common.confirm'),
        cancelLabel: t('common.cancel')
      }
    );

    if (!confirmed) {
      return;
    }
  }
  
  // 停止所有活跃任务
  for (const task of activeTasks) {
    try {
      if (isTauri && (task.status === 'processing' || task.status === 'paused')) {
        await invoke('pause_task', { taskId: task.id });
      }
    } catch (error) {
      const errorMessage = String(error);
      if (errorMessage.includes('Process was interrupted') || errorMessage.includes('not found')) {
        // Task already stopped
      }
    }
  }
  
  // 清空所有任务
  const allTaskIds = [...tasks.value.map(t => t.id)];
  for (const taskId of allTaskIds) {
    try {
      if (isTauri) {
        await invoke('delete_task', { taskId });
      }
      
      // 删除压缩文件
      const task = tasks.value.find(t => t.id === taskId);
      if (task) {
        await deleteCompressedFile(task);
      }
      
      deleteTask(taskId);
    } catch (error) {
      // Failed to delete task during clear all
    }
  }
  
  // 重置选中状态
  taskStore.selectedTaskId = null;
};

// 组件挂载时初始化
onMounted(async () => {
  // 初始化全局设置（其中包含从 localStorage 加载 outputPath）
  await globalSettingsStore.initialize();
  
  // 预加载硬件编码器支持，避免后续切换视频时卡顿
  if (isTauri) {
    try { await invoke('get_hardware_encoder_support'); } catch {}
  }
  
  // 添加应用关闭时的缓存清理
  window.addEventListener('beforeunload', clearAllCaches);
});

// 组件卸载时清理
onUnmounted(() => {
  // 移除事件监听器
  window.removeEventListener('beforeunload', clearAllCaches);
  // 清理缓存
  clearAllCaches();
});

// 监听任务变化，确保不超过99个，同时在首次有任务时默认选中第一个
watch(tasks, (newTasks) => {
  if (newTasks.length > 99) {
    // 删除最老的任务（按创建时间排序）
    const sortedTasks = [...newTasks].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const tasksToRemove = sortedTasks.slice(0, newTasks.length - 99);
    
    tasksToRemove.forEach(task => {
      deleteTask(task.id);
    });
  }

  // 如果当前没有选中任务且有任务，则默认选中第一个
  if (!taskStore.selectedTaskId && newTasks.length > 0) {
    taskStore.selectTask(newTasks[0].id);
    switchToTask(newTasks[0].id);
    applyTaskTimeRangeToUI(newTasks[0]);
  }
}, { deep: true });


</script>


// 在窗口关闭时清空批量参数缓存
onUnmounted(() => {
  try { clearBatchSettingsCache(); } catch {}
});
