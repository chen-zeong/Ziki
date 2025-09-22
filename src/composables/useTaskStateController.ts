import { computed, ref, watch } from 'vue';
import type { CompressionSettings, CompressionTask } from '../types';
import { useTaskStore } from '../stores/useTaskStore';
import { useLogStore } from '../stores/useLogStore';

/**
 * 任务状态控制器（单并发调度）
 * - 仅允许一个任务处于 processing
 * - 兼容图片与视频任务（统一调度，不区分类型）
 * - 遵循现有状态语义：
 *   - pending：等待中（尚未真正进入排队/执行）
 *   - queued：排队中（已明确在队列，等待前序完成后压缩）
 *   - processing：压缩中（唯一）
 *   - paused：已暂停（不在筛选器中新增，仅状态使用）
 *   - completed/failed/cancelled：终止态
 */
export interface TaskStateControllerOptions {
  // 启动新任务压缩：依赖外部实现（useFileHandler.startCompression）
  startCompression: (
    settings: CompressionSettings,
    outputDirectory?: string,
    isBatchMode?: boolean
  ) => Promise<void>;
  // 恢复已暂停任务：依赖外部实现（useFileHandler.resumeCompression）
  resumeCompression: (taskId: string) => Promise<void>;
  // 获取当前输出目录（若需要）
  getOutputDirectory?: () => string | undefined;
  // 切换到指定任务，确保 startCompression 作用于正确的 currentFile
  switchToTask?: (taskId: string) => void;
}

export function useTaskStateController(options: TaskStateControllerOptions) {
  const { startCompression, resumeCompression, getOutputDirectory, switchToTask } = options;
  const taskStore = useTaskStore();
  const logStore = useLogStore();

  // 队列暂停：不打断当前 processing，但阻止新任务启动
  const queuePaused = ref(false);

  // 是否正在调度，避免重复重入
  const scheduling = ref(false);

  // 计算属性：终止态
  const isTerminal = (t: CompressionTask) =>
    t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled';

  // 获取当前 processing 任务
  const currentProcessing = computed(() => taskStore.tasks.find(t => t.status === 'processing') || null);

  // 获取下一任务（仅考虑 queued；FIFO by createdAt）
  const pickNextTask = (): CompressionTask | null => {
    const queued = taskStore.tasks
      .filter(t => t.status === 'queued')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (queued.length > 0) return queued[0];

    // 不再自动选择 paused 任务，避免用户手动暂停后被立即恢复
    return null;
  };

  // 将一批后续候选标记为 queued（现代队列体验：除了当前要启动的，其余候选显式标记 queued）
  // 注意：由显式 enqueue 控制，不再在调度时自动标记
  const markFollowingAsQueued = (_currentId: string) => {
    // no-op（保留接口以兼容可能的外部调用）
  };

  // 调度核心：若没有 processing 且队列未暂停，则启动下一项
  const scheduleNext = async () => {
    if (scheduling.value) return;
    if (queuePaused.value) return;
    if (currentProcessing.value) return;

    scheduling.value = true;
    try {
      const next = pickNextTask();
      if (!next) return;

      // 先切换到该任务，确保 startCompression 作用对象正确
      switchToTask?.(next.id);

      if (next.status === 'paused') {
        // 过去会在此自动恢复 paused 任务；现在不再自动恢复，直接返回
        return;
      }

      // queued 场景：启动压缩
      const outputDir = getOutputDirectory?.();
      try {
        await startCompression(next.settings, outputDir, false);
        // startCompression 内部会设置为 processing，并在完成/失败时自行写回状态
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        taskStore.updateTask({ ...next, status: 'failed', error: msg });
        logStore.addError(`Compression start failed: ${next.file.name}`, { taskId: next.id, error: msg });
      }
    } finally {
      scheduling.value = false;
    }
  };

  // 入队：将任务置为 queued（若当前空闲则直接尝试启动）
  const enqueue = (taskId: string) => {
    const t = taskStore.getTaskById(taskId);
    if (!t || isTerminal(t)) return;
    if (t.status === 'queued') return;
    if (t.status === 'processing') return; // 已在运行
    taskStore.updateTaskStatus(taskId, 'queued');
    // 若当前没有运行中的任务且未暂停，尝试调度
    if (!currentProcessing.value && !queuePaused.value) {
      void scheduleNext();
    }
  };

  // 暂停队列：不影响当前 processing，但阻止 scheduleNext 启动新任务
  const pauseQueue = () => { queuePaused.value = true; };
  const resumeQueue = () => {
    const wasPaused = queuePaused.value;
    queuePaused.value = false;
    // 若从暂停恢复且当前空闲，尝试继续
    if (wasPaused && !currentProcessing.value) {
      void scheduleNext();
    }
  };

  // 暂停单任务（仅在 processing 时有效），其余状态不操作
  const pauseTask = async (taskId: string) => {
    const t = taskStore.getTaskById(taskId);
    if (!t || t.status !== 'processing') return;
    try {
      // 统一由上层现有逻辑触发 pause（App.vue / TaskListMain.vue 中已集成 invoke('pause_task')）
      // 这里仅标记，真正的中断由后端事件驱动最终状态
      taskStore.updateTaskStatus(taskId, 'paused');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      taskStore.updateTask({ ...t, status: 'failed', error: msg });
      logStore.addError(`Pause failed: ${t.file.name}`, { taskId: t.id, error: msg });
    }
  };

  // 恢复任务：
  // - 若 paused：调用 resumeCompression
  // - 若 queued 且空闲：直接 scheduleNext
  const resumeTask = async (taskId: string) => {
    const t = taskStore.getTaskById(taskId);
    if (!t || isTerminal(t)) return;

    if (t.status === 'paused') {
      try {
        switchToTask?.(t.id);
        await resumeCompression(t.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        taskStore.updateTask({ ...t, status: 'failed', error: msg });
        logStore.addError(`Resume failed: ${t.file.name}`, { taskId: t.id, error: msg });
      }
      return;
    }

    // 非 paused：需显式入队才会被调度
    enqueue(taskId);
    if (!currentProcessing.value && !queuePaused.value) {
      await scheduleNext();
    }
  };

  // 监听任务列表变化：当没有 processing 且未暂停时，尝试调度
  watch(
    () => taskStore.tasks.map(t => ({ id: t.id, status: t.status, createdAt: t.createdAt })),
    () => {
      if (!currentProcessing.value && !queuePaused.value) {
        void scheduleNext();
      }
    },
    { deep: true }
  );

  // 监听当前 processing 结束（进入终止态或 paused），自动调度下一个
  watch(
    () => currentProcessing.value?.status,
    (newStatus) => {
      if (!newStatus || newStatus === 'paused' || newStatus === 'completed' || newStatus === 'failed' || newStatus === 'cancelled') {
        if (!queuePaused.value) {
          void scheduleNext();
        }
      }
    }
  );

  return {
    // 状态
    queuePaused,
    // 操作
    scheduleNext,
    enqueue,
    pauseQueue,
    resumeQueue,
    pauseTask,
    resumeTask,
  };
}