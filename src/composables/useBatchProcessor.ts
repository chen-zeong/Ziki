import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { CompressionTask, CompressionSettings } from '../types';
import { useTaskStore } from '../stores/useTaskStore';

export function useBatchProcessor() {
  const isProcessingBatch = ref(false);
  const currentBatchIndex = ref(0);
  const batchQueue = ref<CompressionTask[]>([]);
  const taskStore = useTaskStore();

  // 批量参数缓存：taskId -> 生效设置（来源于批量启动时右侧面板参数）
  const batchSettingsCache = ref<Record<string, CompressionSettings>>({});
  const cacheSettingsForTasks = (tasks: CompressionTask[], base: CompressionSettings) => {
    const next: Record<string, CompressionSettings> = { ...batchSettingsCache.value };
    for (const t of tasks) {
      const eff: CompressionSettings = { ...base } as CompressionSettings;
      const tr = t.settings?.timeRange;
      if (tr !== undefined) {
        (eff as any).timeRange = tr as any;
      }
      next[t.id] = eff;
    }
    batchSettingsCache.value = next;
  };
  const getBatchCachedSettings = (taskId: string): CompressionSettings | undefined => {
    return batchSettingsCache.value[taskId];
  };
  const clearBatchSettingsCache = () => {
    batchSettingsCache.value = {};
  };

  // 批量处理状态
  const batchProgress = computed(() => {
    if (batchQueue.value.length === 0) return 0;
    return Math.round((currentBatchIndex.value / batchQueue.value.length) * 100);
  });

  // 辅助方法：延时
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 等待某个任务进入终止状态（completed/failed/paused）
  const waitUntilTaskSettled = async (taskId: string) => {
    return new Promise<void>((resolve) => {
      const checkStatus = () => {
        if (!isProcessingBatch.value) {
          resolve();
          return;
        }

        const t = taskStore.getTaskById(taskId);
        const status = t?.status;
        if (!t || status === 'completed' || status === 'failed' || status === 'paused') {
          resolve();
          return;
        }

        // 使用 setTimeout 而不是 while 循环，避免阻塞主线程
        setTimeout(checkStatus, 150);
      };

      checkStatus();
    });
  };

  // 开始批量压缩
  const startBatchCompression = async (
    tasks: CompressionTask[],
    startCompressionFn: (settings: CompressionSettings, outputDirectory?: string, isBatchMode?: boolean) => Promise<void>,
    switchToTaskFn: (taskId: string | null) => void,
    outputDirectory?: string,
    overrideSettings?: CompressionSettings | null
  ) => {
    // 检查是否已经在批量处理中
    if (isProcessingBatch.value) {
      console.log('Batch processing already in progress, skipping start');
      return;
    }

    // 仅压缩等待中的任务（pending）
    const candidates: CompressionTask[] = tasks.filter(t => t.status === 'pending');

    if (candidates.length === 0) {
      console.log('No pending tasks to process');
      return;
    }

    // 计算批量基准设置：优先使用传入的 overrideSettings；否则使用第一个候选任务的设置
    const batchBaseSettings: CompressionSettings = overrideSettings || { ...candidates[0].settings } as CompressionSettings;

    console.log(`Starting batch compression for ${candidates.length} tasks, using base settings from ${overrideSettings ? 'overrideSettings' : 'first task'}`);

    isProcessingBatch.value = true;

    // 在批量开始时，为所有候选任务缓存一份基准设置（并覆盖各自 timeRange）
    cacheSettingsForTasks(candidates, batchBaseSettings);

    // 构建批量队列：不包含当前 processing 任务
    batchQueue.value = [...candidates];
    currentBatchIndex.value = 0;

    // 使用最新的 store 状态来检测是否已有 processing，避免使用调用方传入的快照导致的竞态
    const currentProcessing = taskStore.tasks.find(t => t.status === 'processing');
    if (currentProcessing) {
      // 标记所有候选为排队
      batchQueue.value.forEach(task => taskStore.updateTaskStatus(task.id, 'queued'));
      // 等待当前任务结束（完成/失败/暂停）
      await waitUntilTaskSettled(currentProcessing.id);
    } else {
      // 若没有 processing，则除首个之外其余设为排队，便于 UI 提示
      if (batchQueue.value.length > 1) {
        batchQueue.value.slice(1).forEach(task => taskStore.updateTaskStatus(task.id, 'queued'));
      }
    }

    try {
      // 依次处理每个任务
      for (let i = 0; i < batchQueue.value.length; i++) {
        const task = batchQueue.value[i];
        currentBatchIndex.value = i;

        console.log(`[BATCH_LOG] startBatchCompression: Processing task ${i + 1}/${batchQueue.value.length}: ${task.file.name}`);

        // 如存在其它 processing 任务，等待其结束（不强制暂停）
        const others = taskStore.tasks.filter(t => t.status === 'processing' && t.id !== task.id);
        if (others.length > 0) {
          await waitUntilTaskSettled(others[0].id);
        }

        // 切换到当前任务
        switchToTaskFn(task.id);
        // 等待一小段时间确保切换完成
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          // 如果任务已在其他地方启动（例如自动调度），则不再重复启动
          const latest = taskStore.getTaskById(task.id);
          if (latest?.status === 'processing') {
            console.log(`[BATCH_LOG] Task already processing, skip duplicate start: ${task.file.name}`);
          } else {
            // 将当前任务设为 processing
            taskStore.updateTaskStatus(task.id, 'processing');

            // 如果有下一个任务，将其设置为排队状态（幂等）
            if (i + 1 < batchQueue.value.length) {
              taskStore.updateTaskStatus(batchQueue.value[i + 1].id, 'queued');
            }

            // 从缓存中读取本次生效设置（保证与手动播放一致）
            const liveTask = taskStore.getTaskById(task.id);
            const cached = getBatchCachedSettings(task.id);
            const effectiveSettings: CompressionSettings = (cached ? { ...cached } : { ...batchBaseSettings }) as CompressionSettings;

            // 优先使用每条任务自身的 timeRange（如有）；否则沿用缓存/基准的 timeRange
            const taskTimeRange = liveTask?.settings?.timeRange;
            if (taskTimeRange !== undefined) {
              (effectiveSettings as any).timeRange = taskTimeRange as any;
            }

            // 同步更新 store 中该任务的 settings（便于 UI 显示与后续恢复一致）
            if (liveTask) {
              taskStore.updateTask({ ...liveTask, settings: effectiveSettings });
            }

            // 启动压缩（批量模式）
            startCompressionFn(effectiveSettings, outputDirectory, true).catch((error) => {
              console.error(`startCompressionFn error for ${task.file.name}:`, error);
              const t = taskStore.getTaskById(task.id);
              if (t && t.status !== 'paused' && t.status !== 'completed') {
                taskStore.updateTaskStatus(task.id, 'failed');
              }
            });
          }

          // 等待任务进入终止状态（完成/失败/暂停），再处理下一个
          await waitUntilTaskSettled(task.id);
          console.log(`[BATCH_LOG] startBatchCompression: task settled for ${task.file.name}. Final status: ${taskStore.getTaskById(task.id)?.status}`);
        } catch (error) {
          console.error(`Task ${task.file.name} failed:`, error);
          taskStore.updateTaskStatus(task.id, 'failed');
        }

        // 等待一小段时间再处理下一个任务
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      console.log('Batch compression completed');
    } catch (error) {
      console.error('Batch compression error:', error);
    } finally {
      isProcessingBatch.value = false;
      currentBatchIndex.value = 0;
      batchQueue.value = [];
    }
  };

  // 停止批量处理（不清空参数缓存，保证手动播放一致性）
  const stopBatchCompression = () => {
    isProcessingBatch.value = false;
    currentBatchIndex.value = 0;
    batchQueue.value = [];
    console.log('Batch compression stopped');
  };

  // 恢复批量处理（处理剩余的排队任务）
  const resumeBatchCompression = async (
    tasks: CompressionTask[],
    startCompressionFn: (settings: CompressionSettings, outputDirectory?: string, isBatchMode?: boolean) => Promise<void>,
    switchToTaskFn: (taskId: string | null) => void,
    outputDirectory?: string,
    overrideSettings?: CompressionSettings | null
  ) => {
    // 为保证逻辑一致性，直接复用 startBatchCompression（它会处理 pending 状态）
    return startBatchCompression(tasks, startCompressionFn, switchToTaskFn, outputDirectory, overrideSettings);
  };

  // 获取批量处理统计信息
  const getBatchStats = (tasks: CompressionTask[]) => {
    const pending = tasks.filter(t => t.status === 'pending').length;
    const processing = tasks.filter(t => t.status === 'processing').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const paused = tasks.filter(t => t.status === 'paused').length;

    return {
      pending,
      processing,
      completed,
      failed,
      paused,
      total: tasks.length
    };
  };

  return {
    // 状态
    isProcessingBatch,
    currentBatchIndex,
    batchQueue,
    batchProgress,

    // 批量控制
    startBatchCompression,
    stopBatchCompression,
    resumeBatchCompression,

    // 统计
    getBatchStats,

    // 参数缓存 API
    getBatchCachedSettings,
    clearBatchSettingsCache,
  };
}
