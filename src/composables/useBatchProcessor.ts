import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { CompressionTask, CompressionSettings } from '../types';

export function useBatchProcessor() {
  const isProcessingBatch = ref(false);
  const currentBatchIndex = ref(0);
  const batchQueue = ref<CompressionTask[]>([]);

  // 批量处理状态
  const batchProgress = computed(() => {
    if (batchQueue.value.length === 0) return 0;
    return Math.round((currentBatchIndex.value / batchQueue.value.length) * 100);
  });

  // 辅助方法：延时
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 等待某个任务进入终止状态（completed/failed/paused）
  const waitUntilTaskSettled = async (allTasks: CompressionTask[], taskId: string) => {
    while (isProcessingBatch.value) {
      const t = allTasks.find(t => t.id === taskId);
      const status = t?.status;
      if (!t || status === 'completed' || status === 'failed' || status === 'paused') {
        return;
      }
      await sleep(150);
    }
  };

  // 开始批量压缩
  const startBatchCompression = async (
    tasks: CompressionTask[],
    startCompressionFn: (settings: CompressionSettings, outputDirectory?: string, isBatchMode?: boolean) => Promise<void>,
    switchToTaskFn: (taskId: string) => void,
    outputDirectory?: string,
    overrideSettings?: CompressionSettings | null
  ) => {
    // 检查是否已经在批量处理中
    if (isProcessingBatch.value) {
      console.log('Batch processing already in progress, skipping start');
      return;
    }
    
    // 筛选出待处理的任务（包括排队中的任务）
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'queued');
    
    if (pendingTasks.length === 0) {
      console.log('No pending or queued tasks to process');
      return;
    }

    // 如果提供了覆盖设置，则应用到所有待处理任务
    if (overrideSettings) {
      console.log('Applying override settings to all batch tasks:', overrideSettings);
      pendingTasks.forEach(task => {
        task.settings = { ...task.settings, ...overrideSettings };
      });
    }

    console.log(`Starting batch compression for ${pendingTasks.length} tasks`);
    
    isProcessingBatch.value = true;
    batchQueue.value = [...pendingTasks];
    currentBatchIndex.value = 0;

    // 将所有待处理任务设置为排队状态，除了第一个
    pendingTasks.forEach((task, index) => {
      if (index === 0) {
        task.status = 'processing';
      } else {
        task.status = 'queued';
      }
    });

    try {
      // 依次处理每个任务
      for (let i = 0; i < batchQueue.value.length; i++) {
        const task = batchQueue.value[i];
        currentBatchIndex.value = i;
        
        console.log(`[BATCH_LOG] startBatchCompression: Processing task ${i + 1}/${batchQueue.value.length}: ${task.file.name}`);
        
        // 切换到当前任务
        switchToTaskFn(task.id);
        
        // 等待一小段时间确保切换完成
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 开始压缩当前任务
        try {
          // 确保任务状态正确设置
          task.status = 'processing';

          // 额外安全：在批量模式下也确保不会出现多个 processing
          const others = tasks.filter(t => t.status === 'processing' && t.id !== task.id);
          if (others.length > 0) {
            console.log('[BATCH_SAFETY] Detected other processing tasks, pausing them:', others.map(o => o.id));
            for (const o of others) {
              try {
                await invoke('pause_task', { taskId: o.id });
                console.log('[BATCH_SAFETY] Paused other processing task:', o.id);
              } catch (e) {
                const msg = String(e);
                if (msg.includes('Process was interrupted') || msg.includes('not found')) {
                  console.log('[BATCH_SAFETY] Other task already interrupted/not found, treat as paused:', o.id);
                } else {
                  console.warn('[BATCH_SAFETY] Failed to pause other processing task:', o.id, e);
                }
              }
              o.status = 'paused';
            }
          }

          // 如果有下一个任务，将其设置为排队状态
          if (i + 1 < batchQueue.value.length) {
            batchQueue.value[i + 1].status = 'queued';
          }
          
          // 触发压缩但不直接等待它完成，避免在“暂停”时无法返回
          startCompressionFn(task.settings, outputDirectory, true).catch((error) => {
            console.error(`startCompressionFn error for ${task.file.name}:`, error);
            // 若不是用户暂停且任务也未完成，则标记为失败
            const t = tasks.find(t => t.id === task.id);
            if (t && t.status !== 'paused' && t.status !== 'completed') {
              t.status = 'failed';
            }
          });

          // 等待任务进入终止状态（完成/失败/暂停），再处理下一个
          await waitUntilTaskSettled(tasks, task.id);
          console.log(`[BATCH_LOG] startBatchCompression: task settled for ${task.file.name}. Final status: ${tasks.find(t => t.id === task.id)?.status}`);
          
          // 这里无需根据状态做额外处理，循环会继续下一个任务
        } catch (error) {
          console.error(`Task ${task.file.name} failed:`, error);
          task.status = 'failed';
          // 继续处理下一个任务，不中断整个批量处理
        }
        
        // 等待一小段时间再处理下一个任务
        await new Promise(resolve => setTimeout(resolve, 1000));
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

  // 停止批量处理
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
    switchToTaskFn: (taskId: string) => void,
    outputDirectory?: string,
    overrideSettings?: CompressionSettings | null
  ) => {
    // 为保证逻辑一致性，直接复用 startBatchCompression（它会处理pending/queued两种状态）
    return startBatchCompression(tasks, startCompressionFn, switchToTaskFn, outputDirectory, overrideSettings);
  };

  // 获取批量处理统计信息
  const getBatchStats = (tasks: CompressionTask[]) => {
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'queued').length;
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
    isProcessingBatch,
    currentBatchIndex,
    batchQueue,
    batchProgress,
    startBatchCompression,
    stopBatchCompression,
    resumeBatchCompression,
    getBatchStats
  };
}