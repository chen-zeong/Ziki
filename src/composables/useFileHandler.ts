import { ref, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { VideoFile, CompressionTask, CompressionSettings, CompressionResult, VideoMetadata } from '../types';



export function useFileHandler() {
  const selectedFiles = ref<VideoFile[]>([]);
  const tasks = ref<CompressionTask[]>([]);
  const currentFile = ref<VideoFile | null>(null);
  const isUploaderVisible = ref(true);
  const isProcessing = ref(false);



  const generateId = () => Math.random().toString(36).substr(2, 9);

  // 维护每个任务的进度事件监听器，避免重复监听导致的重复日志/进度
  const activeProgressListeners = new Map<string, () => void>();



  // 监听任务状态变化：当任务不再是 processing（例如 paused/completed/failed/queued）时，清理它的进度监听器
  watch(tasks, (newTasks) => {
    newTasks.forEach((t) => {
      if (t.status !== 'processing') {
        const unlisten = activeProgressListeners.get(t.id);
        if (unlisten) {
          try { unlisten(); } catch (e) { console.warn('Failed to unlisten progress listener:', e); }
          activeProgressListeners.delete(t.id);
        }
      }
    });
  }, { deep: true });

  // 切换到指定任务
  const switchToTask = (taskId: string) => {
    const task = tasks.value.find(t => t.id === taskId);
    if (task) {
      currentFile.value = task.file;
      isUploaderVisible.value = false;
      console.log('Switched to task:', taskId);
    }
  };

  // 删除任务
  const deleteTask = (taskId: string) => {
    const taskIndex = tasks.value.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      // 清理该任务可能存在的进度监听器
      const unlisten = activeProgressListeners.get(taskId);
      if (unlisten) {
        try { unlisten(); } catch (e) { console.warn('Failed to unlisten before delete:', e); }
        activeProgressListeners.delete(taskId);
      }

      tasks.value[taskIndex]; // 获取要删除的任务
      tasks.value.splice(taskIndex, 1);
      
      // 如果删除的是当前任务，切换到第一个可用任务
      if (currentFile.value?.id === taskId) {
        if (tasks.value.length > 0) {
          currentFile.value = tasks.value[0].file;
        } else {
          currentFile.value = null;
          isUploaderVisible.value = true;
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

    console.log('Resuming compression for task:', taskId);
    task.status = 'processing';
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
        task.progress = Math.min(100, Math.max(0, Math.round(progress)));
        console.log(`Compression progress for ${task.file.name}: ${task.progress}%`);
      }
    });
    // 记录监听器
    activeProgressListeners.set(task.id, unlisten);

    try {
      // 调用后端的 resume_task，它现在会等待任务完成
      const result = await invoke<CompressionResult>('resume_task', { taskId });

      // 立即清理监听器，避免后续进度事件干扰状态
      try { unlisten(); } catch {}
      activeProgressListeners.delete(task.id);

      if (result.success) {
        // 恢复成功，标记为完成状态
        task.status = 'completed';
        task.progress = 100;
        task.originalSize = result.originalSize;
        task.compressedSize = result.compressedSize || 0;
        task.compressedMetadata = result.compressedMetadata;
        task.completedAt = new Date();
        task.file.compressedPath = result.outputPath;
        task.file.compressedUrl = result.outputPath ? convertFileSrc(result.outputPath) : undefined;
        
        // Update currentFile if it matches this task
        if (currentFile.value && currentFile.value.id === task.file.id) {
          currentFile.value = { ...task.file };
        }
        
        console.log('Task completed successfully:', taskId);
      } else {
        task.status = 'failed';
        task.error = result.error || 'Resume failed';
      }
    } catch (error) {
      // 确保在任何错误情况下都清理监听器
      try { unlisten(); } catch {}
      activeProgressListeners.delete(task.id);

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to resume compression:', errorMessage);

      // 检查是否是再次被暂停
      if (errorMessage.includes('Process was interrupted')) {
        // 边界处理：如果进程在完成时被中断，但输出文件已生成，则判定为完成
        try {
          // 推断输出路径
          const baseName = task.file.name.replace(/\.[^/.]+$/i, '');
          const fileExtension = `.${task.settings.format}`;
          let outDir = task.outputDirectory;
          if (!outDir) {
            try { outDir = await invoke<string>('get_desktop_path'); } catch {}
          }
          if (outDir) {
            const expectedPath = `${outDir}/${baseName}_compressed${fileExtension}`;
            const size = await invoke<number>('get_file_size', { filePath: expectedPath });
            if (size && size > 0) {
              let compressedMetadata: VideoMetadata | undefined = undefined;
              try {
                compressedMetadata = await invoke<VideoMetadata>('get_video_metadata', { videoPath: expectedPath });
              } catch {}
              task.status = 'completed';
              task.progress = 100;
              task.compressedSize = size;
              task.compressedMetadata = compressedMetadata;
              task.completedAt = new Date();
              task.file.compressedPath = expectedPath;
              task.file.compressedUrl = convertFileSrc(expectedPath);
              // Update currentFile if it matches this task
              if (currentFile.value && currentFile.value.id === task.file.id) {
                currentFile.value = { ...task.file };
              }
              console.log('[FALLBACK] Output exists after interruption, marking as completed:', task.id);
            } else {
              console.log('Task was paused, setting status to paused:', task.id);
              task.status = 'paused';
            }
          } else {
            console.log('Task was paused, setting status to paused (no output dir):', task.id);
            task.status = 'paused';
          }
        } catch (postCheckErr) {
          console.log('Task was paused, setting status to paused:', task.id, 'post-check error:', postCheckErr);
          task.status = 'paused';
        }
      } else {
        // Real error
        task.status = 'failed';
        task.error = errorMessage;
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
          originalUrl: URL.createObjectURL(file)
        };
        

        
        // Generate thumbnail for video file
        try {
          const thumbnailUrl = await invoke<string>('generate_thumbnail', {
            videoPath: filePath
          });
          videoFile.thumbnailUrl = thumbnailUrl;
        } catch (error) {
          console.warn('Failed to generate thumbnail for', displayName, ':', error);
        }
        
        // Get video metadata for video files
        if (file.type.startsWith('video/')) {
          try {
            const metadata = await invoke<VideoMetadata>('get_video_metadata', {
              videoPath: filePath
            });
            videoFile.metadata = metadata;
            console.log('Video metadata for', displayName, ':', metadata);
            
            // 触发全局metadata更新事件，供其他组件使用
            window.dispatchEvent(new CustomEvent('video-metadata-updated', {
              detail: {
                fileId: videoFile.id,
                filePath: filePath,
                metadata: metadata
              }
            }));
          } catch (error) {
            console.warn('Failed to get video metadata for', displayName, ':', error);
          }
        }
        
        selectedFiles.value.push(videoFile);
        
        // Set current file if it's the first one
        if (!currentFile.value) {
          currentFile.value = videoFile;
          isUploaderVisible.value = false;
        }
        
        // Add task for this file
        const task: CompressionTask = {
          id: videoFile.id,
          file: videoFile,
          status: 'pending',
          progress: 0,
          originalSize: actualSize,
          settings: {
            format: 'mp4',
            videoCodec: 'libx264',
            resolution: 'original',
            qualityType: 'crf',
            crfValue: 23
          },
          createdAt: new Date()
        };
        tasks.value.unshift(task);
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
        // 同步前端状态
        other.status = 'paused';
      }
    }
    
    // 检查任务是否已经在处理中，避免重复启动（批量模式除外）
    if (task.status === 'processing' && !isBatchMode) {
      console.log(`Task ${task.file.name} is already processing, skipping`);
      return;
    }
    
    console.log(`Starting compression for task: ${task.file.name}, current status: ${task.status}`);
    
    isProcessing.value = true;
    task.status = 'processing';
    task.settings = settings;
    task.progress = 0;
    task.startedAt = new Date(); // 记录开始时间
    
    try {
      // Use provided output directory or get default desktop path
      const outputDir = outputDirectory || await invoke<string>('get_desktop_path');
      
      // 记录输出目录，便于后续恢复/校验
      task.outputDirectory = outputDir;
      
      // Generate output filename
      const fileExtension = `.${settings.format}`;
      const baseName = task.file.name.replace(/\.[^/.]+$/i, '');
      const outputPath = `${outputDir}/${baseName}_compressed${fileExtension}`;
      
      // Update progress
      task.progress = 10;
      
      // Prepare compression settings for backend
      const backendSettings = {
        format: settings.format,
        codec: settings.videoCodec,
        resolution: settings.resolution || 'original',
        custom_resolution: settings.customResolution ? {
          width: settings.customResolution.width,
          height: settings.customResolution.height
        } : null,
        quality_type: settings.qualityType,
        crf_value: settings.crfValue,
        time_range: settings.timeRange ? {
          start: settings.timeRange.start,
          end: settings.timeRange.end
        } : null,

        hardwareAcceleration: settings.hardwareAcceleration,
        bitDepth: settings.bitDepth
      };
      
      console.log('Backend settings with hardware acceleration:', backendSettings);
      
      // 若该任务已有遗留监听器，先清理，避免重复日志/进度
      const existingUnlisten = activeProgressListeners.get(task.id);
      if (existingUnlisten) {
        try { existingUnlisten(); } catch {}
        activeProgressListeners.delete(task.id);
      }
      
      // 设置进度监听器
      console.log(`Setting up progress listener for task: ${task.file.name} (${task.file.path})`);
      const unlisten = await listen(`compression-progress-${task.id}`, (event: any) => {
        const { taskId, progress } = event.payload;
        if (taskId === task.id) {
          task.progress = Math.min(100, Math.max(0, Math.round(progress)));
          console.log(`Progress ${task.progress}% for ${task.file.name}`);
        }
      });
      // 记录监听器
      activeProgressListeners.set(task.id, unlisten);

      try {
         // 初始化进度
         task.progress = 0;

         // Call backend compression
         const result = await invoke<CompressionResult>('compress_video', {
           taskId: task.id,
           inputPath: task.file.path,
           outputPath: outputPath,
           settings: backendSettings
         });

         // 压缩成功后才清理事件监听器
         unlisten();
         activeProgressListeners.delete(task.id);

         if (result.success) {
           task.status = 'completed';
           task.progress = 100;
           task.originalSize = result.originalSize; // Update with actual file size from backend
           task.compressedSize = result.compressedSize || 0;
           task.compressedMetadata = result.compressedMetadata; // 添加压缩后的元数据
           task.completedAt = new Date();
           // Set both compressed path and URL
           task.file.compressedPath = result.outputPath;
           task.file.compressedUrl = result.outputPath ? convertFileSrc(result.outputPath) : undefined;
           // Save output directory for the "open folder" button
           task.outputDirectory = outputDir;
           
           // Update currentFile if it matches this task
           if (currentFile.value && currentFile.value.id === task.file.id) {
             currentFile.value = { ...task.file };
           }
         } else {
           task.status = 'failed';
           task.error = result.error || 'Compression failed';
         }
       } catch (compressionError) {
         // 当压缩被暂停或失败时，必须清理监听器，避免遗留
         try { unlisten(); } catch {}
         activeProgressListeners.delete(task.id);

         const errorMessage = compressionError instanceof Error ? compressionError.message : String(compressionError);
         
         if (errorMessage.includes('Process was interrupted')) {
            // 边界处理：如果进程在完成时被中断，但输出文件已生成，则判定为完成
            try {
              const size = await invoke<number>('get_file_size', { filePath: outputPath });
              if (size && size > 0) {
                let compressedMetadata: VideoMetadata | undefined = undefined;
                try {
                  compressedMetadata = await invoke<VideoMetadata>('get_video_metadata', { videoPath: outputPath });
                } catch {}
                task.status = 'completed';
                task.progress = 100;
                task.compressedSize = size;
                task.compressedMetadata = compressedMetadata;
                task.completedAt = new Date();
                task.file.compressedPath = outputPath;
                task.file.compressedUrl = outputPath ? convertFileSrc(outputPath) : undefined;
                // Update currentFile if it matches this task
                if (currentFile.value && currentFile.value.id === task.file.id) {
                  currentFile.value = { ...task.file };
                }
                console.log('[FALLBACK] Output exists after interruption, marking as completed:', task.id);
              } else {
                console.log('Task was paused, setting status to paused:', task.id);
                task.status = 'paused';
              }
            } catch (postCheckErr) {
              console.log('Task was paused, setting status to paused:', task.id, 'post-check error:', postCheckErr);
              task.status = 'paused';
            }
         } else {
            // Real error
            task.status = 'failed';
            task.error = errorMessage;
         }
       }
    } catch (error) {
      console.error('Compression setup error:', error);
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
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