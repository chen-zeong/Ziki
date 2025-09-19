import { ref, watch, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTaskStore } from '../stores/useTaskStore';
import { useGlobalSettingsStore } from '../stores/useGlobalSettingsStore';
import { useLogStore } from '../stores/useLogStore';
import type { VideoFile, CompressionTask, CompressionSettings, CompressionResult, VideoMetadata } from '../types';
import i18n from '../i18n';



export function useFileHandler() {
  const taskStore = useTaskStore();
  const globalSettings = useGlobalSettingsStore();
  const logStore = useLogStore();
  const selectedFiles = ref<VideoFile[]>([]);
  const tasks = computed(() => taskStore.tasks);
  const currentFile = ref<VideoFile | null>(null);
  const isUploaderVisible = ref(true);
  const isProcessing = ref(false);

  // Yield to next animation frame (fallback to setTimeout) to let UI/RAF paint
  const yieldToUI = () => new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // 维护每个任务的进度事件监听器，避免重复监听导致的重复日志/进度
  const activeProgressListeners = new Map<string, () => void>();
  // 新增：维护每个任务的取消事件监听器和取消标记
  const activeCancelListeners = new Map<string, () => void>();
  const cancelledTasks = new Set<string>();
  // 新增：维护日志相关监听器（后端发出的命令与错误事件）
  const activeCommandListeners = new Map<string, () => void>();
  const activeErrorListeners = new Map<string, () => void>();



  // 监听任务状态变化：当任务不再是 processing（例如 paused/completed/failed/queued/cancelled）时，清理它的进度/取消监听器
  watch(tasks, (newTasks) => {
    newTasks.forEach((t) => {
      if (t.status !== 'processing') {
        const unlisten = activeProgressListeners.get(t.id);
        if (unlisten) {
          try { unlisten(); } catch (e) { console.warn('Failed to unlisten progress listener:', e); }
          activeProgressListeners.delete(t.id);
        }
        const unlistenCancel = activeCancelListeners.get(t.id);
        if (unlistenCancel) {
          try { unlistenCancel(); } catch (e) { console.warn('Failed to unlisten cancel listener:', e); }
          activeCancelListeners.delete(t.id);
        }
        // 清理日志相关监听器
        const unlistenCmd = activeCommandListeners.get(t.id);
        if (unlistenCmd) { try { unlistenCmd(); } catch (e) { console.warn('Failed to unlisten command listener:', e); } activeCommandListeners.delete(t.id); }
        const unlistenErr = activeErrorListeners.get(t.id);
        if (unlistenErr) { try { unlistenErr(); } catch (e) { console.warn('Failed to unlisten error listener:', e); } activeErrorListeners.delete(t.id); }
      }
    });
  }, { deep: true });

  // 切换到指定任务
  const switchToTask = (taskId: string) => {
    const task = tasks.value.find(t => t.id === taskId);
    if (task) {
      currentFile.value = task.file;
      isUploaderVisible.value = false;
      taskStore.selectTask(taskId);
      console.log('Switched to task:', taskId);
    }
  };

  // 删除任务
  const deleteTask = (taskId: string) => {
    const task = tasks.value.find(t => t.id === taskId);
    if (task) {
      // 清理该任务可能存在的进度监听器
      const unlisten = activeProgressListeners.get(taskId);
      if (unlisten) {
        try { unlisten(); } catch (e) { console.warn('Failed to unlisten before delete:', e); }
        activeProgressListeners.delete(taskId);
      }
      const unlistenCancel = activeCancelListeners.get(taskId);
      if (unlistenCancel) {
        try { unlistenCancel(); } catch (e) { console.warn('Failed to unlisten cancel before delete:', e); }
        activeCancelListeners.delete(taskId);
      }
      // 清理日志相关监听器
      const unlistenCmd = activeCommandListeners.get(taskId);
      if (unlistenCmd) { try { unlistenCmd(); } catch {} activeCommandListeners.delete(taskId); }
      const unlistenErr = activeErrorListeners.get(taskId);
      if (unlistenErr) { try { unlistenErr(); } catch {} activeErrorListeners.delete(taskId); }
      cancelledTasks.delete(taskId);

      // 使用store删除任务
      taskStore.removeTask(taskId);
      
      // 如果删除的是当前任务，切换到第一个可用任务
      if (currentFile.value?.id === taskId) {
        if (tasks.value.length > 0) {
          currentFile.value = tasks.value[0].file;
          taskStore.selectTask(tasks.value[0].id);
        } else {
          currentFile.value = null;
          isUploaderVisible.value = true;
          (taskStore as any).selectedTaskId = null;
        }
      }
      
      // 同时从selectedFiles中删除
      const fileIndex = selectedFiles.value.findIndex(f => f.id === taskId);
      if (fileIndex !== -1) {
        selectedFiles.value.splice(fileIndex, 1);
      }
      
      console.log('Deleted task:', taskId);
    }
  };

  // 恢复压缩任务
  const resumeCompression = async (taskId: string) => {
    const task = tasks.value.find(t => t.id === taskId);
    if (!task || task.status !== 'paused') return;

    // 在恢复任何任务前，确保全局只有一个任务在 processing：
    // 如果发现有其它任务正在处理，则先尝试暂停它们，并清理其进度监听器
    const otherProcessingTasks = tasks.value.filter(t => t.status === 'processing' && t.id !== task.id);
    if (otherProcessingTasks.length > 0) {
      console.log('[RESUME_SAFETY] Detected other processing tasks, pausing them before resuming:', otherProcessingTasks.map(t => t.id));
      for (const other of otherProcessingTasks) {
        try {
          await invoke('pause_task', { taskId: other.id });
          console.log('[RESUME_SAFETY] Paused other processing task:', other.id);
        } catch (pauseErr) {
          const msg = String(pauseErr);
          if (msg.includes('Process was interrupted') || msg.includes('not found')) {
            console.log('[RESUME_SAFETY] Other processing task already interrupted/not found, treat as paused:', other.id);
          } else {
            console.warn('[RESUME_SAFETY] Failed to pause other processing task:', other.id, pauseErr);
          }
        }
        // 清理该任务的进度监听器
        const unlistenOther = activeProgressListeners.get(other.id);
        if (unlistenOther) {
          try { unlistenOther(); } catch {}
          activeProgressListeners.delete(other.id);
        }
        // 同步前端状态
        other.status = 'paused';
      }
    }

    // 重置该任务的取消标记，并清理旧的取消监听器
    cancelledTasks.delete(task.id);
    const existingCancelUnlistenResume = activeCancelListeners.get(task.id);
    if (existingCancelUnlistenResume) {
      try { existingCancelUnlistenResume(); } catch {}
      activeCancelListeners.delete(task.id);
    }

    console.log('Resuming compression for task:', taskId);
    logStore.addInfo(`恢复压缩：${task.file.name}`, { taskId: task.id });
    taskStore.updateTaskStatus(task.id, 'processing');
    isProcessing.value = true;

    // 若该任务已有遗留监听器，先清理
    const existingUnlistenResume = activeProgressListeners.get(task.id);
    if (existingUnlistenResume) {
      try { existingUnlistenResume(); } catch {}
      activeProgressListeners.delete(task.id);
    }

    // 重新设置进度监听器
    const unlisten = await listen(`compression-progress-${task.id}`, (event: any) => {
      const { taskId, progress } = event.payload;
      if (taskId === task.id) {
        const progressValue = Math.min(100, Math.max(0, Math.round(progress)));
        taskStore.updateTaskProgress(task.id, progressValue);
        console.log(`Compression progress for ${task.file.name}: ${progressValue}%`);
      }
    });
    // 记录监听器
    activeProgressListeners.set(task.id, unlisten);

    // 监听后端错误事件（恢复过程中可能不会再次发送command事件，但错误事件会发送）
    const existingCmd = activeCommandListeners.get(task.id); if (existingCmd) { try { existingCmd(); } catch {} activeCommandListeners.delete(task.id); }
    const existingErr = activeErrorListeners.get(task.id); if (existingErr) { try { existingErr(); } catch {} activeErrorListeners.delete(task.id); }
    try {
      const unlistenErr = await listen(`compression-error-${task.id}`, (event: any) => {
        const { error, stderr } = (event && event.payload) || {};
        logStore.addError(`压缩错误：${task.file.name} - ${error || '未知错误'}`, { taskId: task.id, stderr });
      });
      activeErrorListeners.set(task.id, unlistenErr);
    } catch {}

    // 新增：监听后端发送的 FFmpeg 命令事件（恢复场景）
    try {
      const unlistenCmd = await listen(`compression-command-${task.id}`, (event: any) => {
        const { command, args } = (event && event.payload) || {};
        const display = command || (Array.isArray(args) ? `ffmpeg ${args.join(' ')}` : '');
        if (display) {
          logStore.addInfo(i18n.global.t('logMessages.ffmpegCommand', { name: display }), { taskId: task.id, command, args });
        }
      });
      activeCommandListeners.set(task.id, unlistenCmd);
    } catch {}

    // 先设置取消监听器
    const unlistenCancel = await listen(`compression-cancelled-${task.id}`, () => {
      if (cancelledTasks.has(task.id)) return;
      console.log('[CANCEL] Received cancel event during resume:', task.id);
      cancelledTasks.add(task.id);
      taskStore.updateTaskStatus(task.id, 'cancelled');
      isProcessing.value = false;
      // 清理进度监听器
      const unlistenProg = activeProgressListeners.get(task.id);
      if (unlistenProg) { try { unlistenProg(); } catch {} activeProgressListeners.delete(task.id); }
      // 清理日志监听器
      const uCmd = activeCommandListeners.get(task.id); if (uCmd) { try { uCmd(); } catch {} activeCommandListeners.delete(task.id); }
      const uErr = activeErrorListeners.get(task.id); if (uErr) { try { uErr(); } catch {} activeErrorListeners.delete(task.id); }
      // 自行清理取消监听器
      try { unlistenCancel(); } catch {}
      activeCancelListeners.delete(task.id);
      // 日志
      logStore.addWarning(`已取消：${task.file.name}`, { taskId: task.id });
    });
    activeCancelListeners.set(task.id, unlistenCancel);

    try {
      // 调用后端的 resume_task，它现在会等待任务完成
      const result = await invoke<CompressionResult>('resume_task', { taskId });

      // 立即清理监听器，避免后续进度事件干扰状态
      try { unlisten(); } catch {}
      activeProgressListeners.delete(task.id);
      const unlistenCancelEnd = activeCancelListeners.get(task.id);
      if (unlistenCancelEnd) { try { unlistenCancelEnd(); } catch {} activeCancelListeners.delete(task.id); }
      const uCmd = activeCommandListeners.get(task.id); if (uCmd) { try { uCmd(); } catch {} activeCommandListeners.delete(task.id); }
      const uErr = activeErrorListeners.get(task.id); if (uErr) { try { uErr(); } catch {} activeErrorListeners.delete(task.id); }

      if (cancelledTasks.has(task.id)) {
        console.log('[CANCEL] Task was cancelled during resume, skip completion:', task.id);
        return;
      }

      if (result.success) {
        // 恢复成功，使用 store 的实时任务对象来更新，避免陈旧引用
        const live = taskStore.getTaskById(task.id) || task;
        const updatedTask: CompressionTask = {
          ...live,
          status: 'completed',
          progress: 100,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize ?? live.compressedSize ?? 0,
          compressedMetadata: result.compressedMetadata,
          completedAt: new Date(),
          file: {
            ...live.file,
            compressedPath: result.outputPath,
            compressedUrl: result.outputPath ? convertFileSrc(result.outputPath) : undefined
          }
        };
        taskStore.updateTask(updatedTask);
        
        // Update currentFile if it matches this task
        if (currentFile.value && currentFile.value.id === updatedTask.file.id) {
          currentFile.value = { ...updatedTask.file };
        }
        
        console.log('Task completed successfully:', taskId);
        logStore.addSuccess(`${i18n.global.t('success.compressionCompleted')}：${updatedTask.file.name}`, { taskId: updatedTask.id, originalSize: result.originalSize, compressedSize: result.compressedSize, outputPath: result.outputPath });
      } else {
        const live = taskStore.getTaskById(task.id) || task;
        taskStore.updateTask({ ...live, status: 'failed', error: result.error || 'Resume failed' });
        logStore.addError(`恢复失败：${task.file.name}`, { taskId: task.id, error: result.error });
      }
    } catch (error) {
      // 确保在任何错误情况下都清理监听器
      try { unlisten(); } catch {}
      activeProgressListeners.delete(task.id);
      const unlistenCancelErr = activeCancelListeners.get(task.id);
      if (unlistenCancelErr) { try { unlistenCancelErr(); } catch {} activeCancelListeners.delete(task.id); }
      const uCmd = activeCommandListeners.get(task.id); if (uCmd) { try { uCmd(); } catch {} activeCommandListeners.delete(task.id); }
      const uErr = activeErrorListeners.get(task.id); if (uErr) { try { uErr(); } catch {} activeErrorListeners.delete(task.id); }

      const errorMessage = error instanceof Error ? error.message : String(error);
      logStore.addError(`恢复失败：${task.file.name}`, { taskId: task.id, error: errorMessage });

      // 检查是否是再次被暂停
      if (errorMessage.includes('Process was interrupted')) {
        if (cancelledTasks.has(task.id)) {
          task.status = 'cancelled';
          console.log('[CANCEL] Interrupted due to cancellation during resume:', task.id);
          logStore.addWarning(`已取消：${task.file.name}`, { taskId: task.id });
        } else {
          // 边界处理：如果进程在完成时被中断，但输出文件已生成，则判定为完成
          try {
            // 推断输出路径
            const fileExtension = task.settings.format;
            const outputFileName = globalSettings.generateOutputFileName(task.file.name, fileExtension);
            let outDir = task.outputDirectory;
            if (!outDir) {
              try { outDir = await invoke<string>('get_desktop_path'); } catch {}
            }
            if (outDir) {
              const expectedPath = `${outDir}/${outputFileName}`;
              const size = await invoke<number>('get_file_size', { filePath: expectedPath });
              if (size && size > 0) {
                let compressedMetadata: VideoMetadata | undefined = undefined;
                try {
                  compressedMetadata = await invoke<VideoMetadata>('get_video_metadata', { videoPath: expectedPath });
                } catch {}
                // 使用store进行原子更新，避免直接修改task导致的引用问题
                const live = taskStore.getTaskById(task.id) || task;
                const updatedTask: CompressionTask = {
                  ...live,
                  status: 'completed',
                  progress: 100,
                  compressedSize: size,
                  compressedMetadata,
                  completedAt: new Date(),
                  file: {
                    ...live.file,
                    compressedPath: expectedPath,
                    compressedUrl: expectedPath ? convertFileSrc(expectedPath) : undefined
                  }
                };
                taskStore.updateTask(updatedTask);
                if (currentFile.value && currentFile.value.id === updatedTask.file.id) {
                  currentFile.value = { ...updatedTask.file };
                }
                console.log('[FALLBACK] Output exists after interruption, marking as completed:', task.id);
                logStore.addSuccess(`${i18n.global.t('success.compressionCompleted')}：${task.file.name}`, { taskId: task.id, compressedSize: size, outputPath: expectedPath });
              } else {
                console.log('Task was paused, setting status to paused:', task.id);
                taskStore.updateTaskStatus(task.id, 'paused');
                logStore.addWarning(`已暂停：${task.file.name}`, { taskId: task.id });
              }
            } else {
              console.log('Task was paused, setting status to paused (no output dir):', task.id);
              taskStore.updateTaskStatus(task.id, 'paused');
              logStore.addWarning(`已暂停：${task.file.name}`, { taskId: task.id });
            }
          } catch (postCheckErr) {
            console.log('Task was paused, setting status to paused:', task.id, 'post-check error:', postCheckErr);
            taskStore.updateTaskStatus(task.id, 'paused');
            logStore.addWarning(`已暂停：${task.file.name}`, { taskId: task.id, error: String(postCheckErr) });
          }
        }
      } else {
        // Real error
        const live = taskStore.getTaskById(task.id) || task;
        taskStore.updateTask({ ...live, status: 'failed', error: errorMessage });
        logStore.addError(`恢复失败：${task.file.name}`, { taskId: task.id, error: errorMessage });
      }
    } finally {
      isProcessing.value = false;
    }
  };

  const handleFiles = async (fileList: FileList) => {
    console.log('handleFiles received fileList:', fileList);
    if (!fileList || fileList.length === 0) return;
    
    const files = Array.from(fileList);
    console.log('Converted to array:', files);

    // 记录导入前任务数量和是否已有选中任务
    const prevTaskCount = tasks.value.length;
    const hadSelected = !!taskStore.selectedTaskId;

    for (const file of files) {
      console.log('Processing file:', file);
      if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
        // Get the real file path from the File object
        const filePath = (file as any).path || (file as any).webkitRelativePath || file.name;
        // Normalize display name to basename (Windows/macOS friendly)
        const displayName = (filePath ? String(filePath).split(/[\\/]/).pop() : file.name) || file.name;
        
        // Get actual file size using Tauri API
        let actualSize = file.size || 0;
        try {
          if (filePath) {
            actualSize = await invoke<number>('get_file_size', { filePath });
          }
        } catch (error) {
          console.warn('Failed to get file size from Tauri, using file.size:', error);
        }
        
        const videoFile: VideoFile = {
          id: generateId(),
          name: displayName,
          size: actualSize,
          path: filePath,
          originalUrl: (typeof window !== 'undefined' && (window as any).__TAURI__ && filePath)
            ? convertFileSrc(filePath)
            : URL.createObjectURL(file)
        };
        
        selectedFiles.value.push(videoFile);
        // Yield after pushing into selectedFiles to avoid synchronous deep watchers blocking UI
        await yieldToUI();

        // Set current file if it's the first one
        if (!currentFile.value) {
          currentFile.value = videoFile;
          isUploaderVisible.value = false;
          // Yield to allow UI (HUD/RAF) to update before further work
          await yieldToUI();
        }

        // Only generate thumbnail for video files
        if (file.type.startsWith('video/')) {
          invoke<string>('generate_thumbnail', {
            videoPath: filePath
          }).then(thumbnailUrl => {
            const fileInArray = selectedFiles.value.find(f => f.id === videoFile.id);
            if (fileInArray) {
              fileInArray.thumbnailUrl = thumbnailUrl;
            }
          }).catch(error => {
            console.warn('Failed to generate thumbnail for', displayName, ':', error);
          });
        }
        
        // Get video metadata for video files
        if (file.type.startsWith('video/')) {
          invoke<VideoMetadata>('get_video_metadata', {
            videoPath: filePath
          }).then(metadata => {
            const fileInArray = selectedFiles.value.find(f => f.id === videoFile.id);
            if (fileInArray) {
              fileInArray.metadata = metadata;
            }
            console.log('Video metadata for', displayName, ':', metadata);
            
            // 触发全局metadata更新事件，供其他组件使用
            window.dispatchEvent(new CustomEvent('video-metadata-updated', {
              detail: {
                fileId: videoFile.id,
                filePath: filePath,
                metadata: metadata
              }
            }));
          }).catch(error => {
            console.warn('Failed to get video metadata for', displayName, ':', error);
            // 新增：用户提示，避免静默失败
            try {
              const reason = typeof error === 'string' ? error : (error?.message || '未知错误');
              const msg = i18n.global.t('importFailed', { name: displayName, reason });
              // 在桌面端以最简单方式提示
              if (typeof window !== 'undefined' && window?.alert) {
                window.alert(msg as unknown as string);
              }
            } catch (_) {
              // ignore
            }
          });
        }
        
        // Determine task type and defaults
        const isVideo = file.type.startsWith('video/');
        const taskType = isVideo ? 'video' : 'image';
        
        // Add task for this file
        const task: CompressionTask = {
          id: videoFile.id,
          type: taskType as any,
          file: videoFile,
          status: 'pending',
          progress: 0,
          originalSize: actualSize,
          settings: isVideo
            ? {
                format: 'mp4',
                videoCodec: 'H.264',
                resolution: 'original',
                qualityType: 'crf',
                crfValue: 23
              }
            : {
                // 图片任务默认：保持原始分辨率；PNG 的首次导入默认输出 JPEG，第二次才默认 PNG
                format: (() => {
                  const lower = displayName.toLowerCase();
                  if (lower.endsWith('.png')) {
                    try {
                      const done = localStorage.getItem('pngFirstDefaultToJpgDone') === '1';
                      if (!done) {
                        localStorage.setItem('pngFirstDefaultToJpgDone', '1');
                        return 'jpeg';
                      }
                      return 'png';
                    } catch (_) {
                      // 如果 localStorage 不可用，退回原逻辑
                      return 'png';
                    }
                  }
                  if (lower.endsWith('.webp')) return 'webp';
                  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpeg';
                  return 'jpeg';
                })(),
                videoCodec: 'image',
                resolution: 'original',
                qualityType: 'crf',
                crfValue: 80 // 0-100 画质滑块默认 80
              },
          createdAt: new Date()
        };
        tasks.value.unshift(task);
        // Yield after pushing task to avoid long synchronous reactive cascades
        await yieldToUI();
      }
    }

    // 导入完成后，如是首次导入（或当前无选中任务），默认选中任务列表从上往下的第一个（数组顶部）
    if (prevTaskCount === 0 || !hadSelected) {
      const topTask = tasks.value[0];
      if (topTask) {
        // 同步 currentFile 与选中状态
        currentFile.value = topTask.file;
        isUploaderVisible.value = false;
        taskStore.selectTask(topTask.id);
        await yieldToUI();
      }
    }
  };

  const resetUploader = () => {
    selectedFiles.value = [];
    currentFile.value = null;
    isUploaderVisible.value = true;
  };

  const startCompression = async (settings: CompressionSettings, outputDirectory?: string, isBatchMode = false) => {
    if (!currentFile.value) {
      return;
    }

    const task = tasks.value.find(t => t.file.id === currentFile.value?.id);
    if (!task) {
      return;
    }

    // 在开始任何新任务前，确保全局只有一个任务在 processing：
    // 如果发现有其它任务正在处理，则先尝试暂停它们，并清理其进度监听器
    const otherProcessingTasks = tasks.value.filter(t => t.status === 'processing' && t.id !== task.id);
    if (otherProcessingTasks.length > 0) {
      console.log('[SAFETY] Detected other processing tasks, pausing them before starting new one:', otherProcessingTasks.map(t => t.id));
      for (const other of otherProcessingTasks) {
        try {
          await invoke('pause_task', { taskId: other.id });
          console.log('[SAFETY] Paused other processing task:', other.id);
        } catch (pauseErr) {
          const msg = String(pauseErr);
          if (msg.includes('Process was interrupted') || msg.includes('not found')) {
            console.log('[SAFETY] Other processing task already interrupted/not found, treat as paused:', other.id);
          } else {
            console.warn('[SAFETY] Failed to pause other processing task:', other.id, pauseErr);
          }
        }
        // 清理该任务的进度监听器
        const unlistenOther = activeProgressListeners.get(other.id);
        if (unlistenOther) {
          try { unlistenOther(); } catch {}
          activeProgressListeners.delete(other.id);
        }
        // 同步前端状态：进入排队而非暂停
        taskStore.updateTaskStatus(other.id, 'queued');
      }
    }

    // 检查任务是否已经在处理中，避免重复启动（批量模式除外）
    if (task.status === 'processing' && !isBatchMode) {
      console.log(`Task ${task.file.name} is already processing, skipping`);
      return;
    }

    console.log(`Starting compression for task: ${task.file.name}, current status: ${task.status}`);

    isProcessing.value = true;

    // 清理旧的监听器与取消标记
    const existingProg = activeProgressListeners.get(task.id); if (existingProg) { try { existingProg(); } catch {} activeProgressListeners.delete(task.id); }
    const existingCancel = activeCancelListeners.get(task.id); if (existingCancel) { try { existingCancel(); } catch {} activeCancelListeners.delete(task.id); }
    const existingCmd = activeCommandListeners.get(task.id); if (existingCmd) { try { existingCmd(); } catch {} activeCommandListeners.delete(task.id); }
    const existingErr = activeErrorListeners.get(task.id); if (existingErr) { try { existingErr(); } catch {} activeErrorListeners.delete(task.id); }
    cancelledTasks.delete(task.id);

    // 计算输出目录
    let outDir = outputDirectory || task.outputDirectory;
    if (!outDir) {
      try { outDir = await invoke<string>('get_desktop_path'); } catch {}
    }
    if (outDir) {
      const live2 = taskStore.getTaskById(task.id) || task;
      taskStore.updateTask({ ...live2, outputDirectory: outDir });
    }

    // 规范化图片任务的格式，防止传入视频容器格式（如 mp4）导致“Unsupported image format”
    const isImageTask = task.type === 'image';
    const lowerFormat = String((settings as any)?.format || '').toLowerCase();
    const imageFormats = new Set(['jpeg', 'jpg', 'png', 'webp', 'avif']);
    let effectiveFormat = lowerFormat;
    if (isImageTask && !imageFormats.has(effectiveFormat)) {
      let fallback = String((task.settings as any)?.format || '').toLowerCase();
      if (!imageFormats.has(fallback)) {
        const name = task.file.name.toLowerCase();
        if (name.endsWith('.png')) fallback = 'png';
        else if (name.endsWith('.webp')) fallback = 'webp';
        else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) fallback = 'jpeg';
        else fallback = 'jpeg';
      }
      try { logStore.addWarning(`检测到无效的图片格式：${(settings as any)?.format}，已更正为 ${fallback}` as string, { taskId: task.id }); } catch {}
      effectiveFormat = fallback;
    }
    const normalizedSettings = { ...(settings as any), format: effectiveFormat as any } as any;

    // 初始化任务状态与进度
    {
      const live = taskStore.getTaskById(task.id) || task;
      taskStore.updateTask({ ...live, status: 'processing', settings: normalizedSettings as any, progress: 0, startedAt: new Date() });
    }

    // 监听压缩进度
    let unlistenProg: (() => void) | undefined;
    unlistenProg = await listen(`compression-progress-${task.id}`, (event: any) => {
      const { taskId, progress } = event?.payload || {};
      if (taskId === task.id) {
        const progressValue = Math.min(100, Math.max(0, Math.round(progress)));
        taskStore.updateTaskProgress(task.id, progressValue);
        console.log(`Compression progress for ${task.file.name}: ${progressValue}%`);
      }
    });
    activeProgressListeners.set(task.id, unlistenProg);

    // 监听错误事件
    try {
      const unlistenErr = await listen(`compression-error-${task.id}`, (event: any) => {
        const { error, stderr } = (event && event.payload) || {};
        logStore.addError(`压缩错误：${task.file.name} - ${error || '未知错误'}`, { taskId: task.id, stderr });
      });
      activeErrorListeners.set(task.id, unlistenErr);
    } catch {}

    // 监听取消事件
    const unlistenCancel = await listen(`compression-cancelled-${task.id}`, () => {
      if (cancelledTasks.has(task.id)) return;
      console.log('[CANCEL] Received cancel event:', task.id);
      cancelledTasks.add(task.id);
      taskStore.updateTaskStatus(task.id, 'cancelled');
      isProcessing.value = false;
      const up = activeProgressListeners.get(task.id); if (up) { try { up(); } catch {} activeProgressListeners.delete(task.id); }
      const uCmd = activeCommandListeners.get(task.id); if (uCmd) { try { uCmd(); } catch {} activeCommandListeners.delete(task.id); }
      const uErr = activeErrorListeners.get(task.id); if (uErr) { try { uErr(); } catch {} activeErrorListeners.delete(task.id); }
      try { unlistenCancel(); } catch {}
      activeCancelListeners.delete(task.id);
      logStore.addWarning(`已取消：${task.file.name}`, { taskId: task.id });
    });
    activeCancelListeners.set(task.id, unlistenCancel);

    // 新增：监听后端发送的 FFmpeg 命令事件（启动场景）
    try {
      const unlistenCmd = await listen(`compression-command-${task.id}`, (event: any) => {
        const { command, args } = (event && event.payload) || {};
        const display = command || (Array.isArray(args) ? `ffmpeg ${args.join(' ')}` : '');
        if (display) {
          logStore.addInfo(i18n.global.t('logMessages.ffmpegCommand', { name: display }), { taskId: task.id, command, args });
        }
      });
      activeCommandListeners.set(task.id, unlistenCmd);
    } catch {}

    // 计算输出文件路径
    const ext = (normalizedSettings as any).format;
    const outputFileName = globalSettings.generateOutputFileName(task.file.name, ext);
    const outputPath = outDir ? `${outDir}/${outputFileName}` : undefined;

    const inputPath = task.file.path;

    // 构建后端所需的 settings 结构（字段名与 Rust 对齐）
    const payloadSettings: any = {
      format: (normalizedSettings as any).format,
      codec: (normalizedSettings as any).videoCodec || 'image',
      resolution: (normalizedSettings as any).resolution,
      custom_resolution: (normalizedSettings as any).customResolution
        ? { width: (normalizedSettings as any).customResolution.width, height: (normalizedSettings as any).customResolution.height }
        : undefined,
      quality_type: (normalizedSettings as any).qualityType,
      crf_value: (normalizedSettings as any).crfValue,
      qv_value: (normalizedSettings as any).qvValue,
      bitrate: (normalizedSettings as any).bitrate,
      time_range: (normalizedSettings as any).timeRange
        ? { start: (normalizedSettings as any).timeRange.start ?? null, end: (normalizedSettings as any).timeRange.end ?? null }
        : undefined,
      // 这两个字段在 Rust 侧通过 serde(rename) 期望驼峰命名
      hardwareAcceleration: (normalizedSettings as any).hardwareAcceleration,
      bitDepth: (normalizedSettings as any).bitDepth,
    };

    try {
      if (!outputPath) {
        throw new Error('No output directory available');
      }

      let result: CompressionResult;
      if (task.type === 'image') {
        result = await invoke<CompressionResult>('compress_image', {
          taskId: task.id,
          inputPath,
          outputPath,
          settings: payloadSettings,
        });
      } else {
        result = await invoke<CompressionResult>('compress_video', {
          taskId: task.id,
          inputPath,
          outputPath,
          settings: payloadSettings,
        });
      }

      // 清理监听器
      try { unlistenProg && unlistenProg(); } catch {}
      activeProgressListeners.delete(task.id);
      const unlistenCancelEnd = activeCancelListeners.get(task.id); if (unlistenCancelEnd) { try { unlistenCancelEnd(); } catch {} activeCancelListeners.delete(task.id); }
      const uCmd = activeCommandListeners.get(task.id); if (uCmd) { try { uCmd(); } catch {} activeCommandListeners.delete(task.id); }
      const uErr = activeErrorListeners.get(task.id); if (uErr) { try { uErr(); } catch {} activeErrorListeners.delete(task.id); }

      if (cancelledTasks.has(task.id)) {
        console.log('[CANCEL] Task was cancelled during start, skip completion:', task.id);
        return;
      }

      if (result.success) {
        const live = taskStore.getTaskById(task.id) || task;
        const updatedTask: CompressionTask = {
          ...live,
          status: 'completed',
          progress: 100,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize ?? live.compressedSize ?? 0,
          compressedMetadata: result.compressedMetadata,
          completedAt: new Date(),
          outputDirectory: outDir || live.outputDirectory,
          file: {
            ...live.file,
            compressedPath: result.outputPath,
            compressedUrl: result.outputPath ? convertFileSrc(result.outputPath) : undefined
          }
        };
        taskStore.updateTask(updatedTask);
        if (currentFile.value && currentFile.value.id === updatedTask.file.id) {
          currentFile.value = { ...updatedTask.file };
        }
        if (task.type === 'image') {
          logStore.addSuccess(i18n.global.t('logMessages.compressionCompletedImage', { name: task.file.name }), { taskId: task.id, originalSize: result.originalSize, compressedSize: result.compressedSize, outputPath: result.outputPath });
        } else {
          logStore.addSuccess(`${i18n.global.t('success.compressionCompleted')}：${task.file.name}`, { taskId: task.id, originalSize: result.originalSize, compressedSize: result.compressedSize, outputPath: result.outputPath });
        }
      } else {
        const live = taskStore.getTaskById(task.id) || task;
        taskStore.updateTask({ ...live, status: 'failed', error: result.error || 'Compression failed' });
        if (task.type === 'image') {
          logStore.addError(i18n.global.t('logMessages.compressionFailedImage', { name: task.file.name }), { taskId: task.id, error: result.error });
        } else {
          logStore.addError(i18n.global.t('logMessages.compressionFailedVideo', { name: task.file.name }), { taskId: task.id, error: result.error });
        }
      }
    } catch (error) {
      // 确保在任何错误情况下都清理监听器
      try { unlistenProg && unlistenProg(); } catch {}
      activeProgressListeners.delete(task.id);
      const unlistenCancelErr = activeCancelListeners.get(task.id);
      if (unlistenCancelErr) { try { unlistenCancelErr(); } catch {} activeCancelListeners.delete(task.id); }
      const uCmd = activeCommandListeners.get(task.id); if (uCmd) { try { uCmd(); } catch {} activeCommandListeners.delete(task.id); }
      const uErr = activeErrorListeners.get(task.id); if (uErr) { try { uErr(); } catch {} activeErrorListeners.delete(task.id); }

      const errorMessage = error instanceof Error ? error.message : String(error);
      const live = taskStore.getTaskById(task.id) || task;
      taskStore.updateTask({ ...live, status: 'failed', error: errorMessage });
      if (task.type === 'image') {
        logStore.addError(i18n.global.t('logMessages.compressionFailedImage', { name: task.file.name }), { taskId: task.id, error: errorMessage });
      } else {
        logStore.addError(i18n.global.t('logMessages.compressionFailedVideo', { name: task.file.name }), { taskId: task.id, error: errorMessage });
      }
    } finally {
      isProcessing.value = false;
    }
  };

    const formatFileSize = (bytes: number): string => {
      if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getCompressionRatio = (task: CompressionTask): string => {
      if (!task.compressedSize || !task.originalSize || isNaN(task.compressedSize) || isNaN(task.originalSize)) return '0%';
      const ratio = ((task.originalSize - task.compressedSize) / task.originalSize) * 100;
      return Math.round(ratio) + '%';
    };

    return {
      selectedFiles,
      tasks,
      currentFile,
      isUploaderVisible,
      isProcessing,
      handleFiles,
      resetUploader,
      startCompression,
      formatFileSize,
      getCompressionRatio,
      switchToTask,
      deleteTask,
      resumeCompression
    };
  }