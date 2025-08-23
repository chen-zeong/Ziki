import { ref, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { VideoFile, CompressionTask, CompressionSettings, CompressionResult, VideoMetadata } from '../types';

// 任务缓存接口
interface TaskCache {
  id: string;
  videoPath: string;
  settings: CompressionSettings;
  outputPath: string;
  createdAt: number;
}

// 缓存管理
const CACHE_KEY = 'video_compression_tasks';
const MAX_CACHE_SIZE = 99;

const saveTasksToCache = (tasks: CompressionTask[]) => {
  try {
    const cacheData: TaskCache[] = tasks.map(task => ({
      id: task.id,
      videoPath: task.file.path,
      settings: task.settings,
      outputPath: task.outputDirectory || '',
      createdAt: task.createdAt.getTime()
    }));
    
    // 限制缓存大小
    const limitedCache = cacheData.slice(0, MAX_CACHE_SIZE);
    localStorage.setItem(CACHE_KEY, JSON.stringify(limitedCache));
  } catch (error) {
    console.warn('Failed to save tasks to cache:', error);
  }
};

// const loadTasksFromCache = (): TaskCache[] => {
//   try {
//     const cached = localStorage.getItem(CACHE_KEY);
//     return cached ? JSON.parse(cached) : [];
//   } catch (error) {
//     console.warn('Failed to load tasks from cache:', error);
//     return [];
//   }
// };

export function useFileHandler() {
  const selectedFiles = ref<VideoFile[]>([]);
  const tasks = ref<CompressionTask[]>([]);
  const currentFile = ref<VideoFile | null>(null);
  const isUploaderVisible = ref(true);
  const isProcessing = ref(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // 监听任务变化，自动保存到缓存
  watch(tasks, (newTasks) => {
    saveTasksToCache(newTasks);
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

    console.log('Resuming compression for task:', taskId);
    task.status = 'processing';
    isProcessing.value = true;

    // 重新设置进度监听器
    const unlisten = await listen('compression-progress', (event: any) => {
      const { inputPath, progress } = event.payload;
      if (inputPath === task.file.path) {
        task.progress = Math.round(progress);
        console.log(`Compression progress for ${task.file.name}: ${task.progress}%`);
      }
    });

    try {
      // 调用后端的 resume_task，它现在会等待任务完成
      const result = await invoke<CompressionResult>('resume_task', { taskId });

      // 立即清理监听器，避免后续进度事件干扰状态
      unlisten();

      if (result.success) {
        // 创建一个全新的任务对象来替换旧的，以确保响应性
        const updatedTask = {
          ...task,
          status: 'completed' as const,
          progress: 100,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize || 0,
          compressedMetadata: result.compressedMetadata,
          completedAt: new Date(),
          file: {
            ...task.file,
            compressedPath: result.outputPath,
            compressedUrl: result.outputPath ? convertFileSrc(result.outputPath) : undefined,
          }
        };
        
        tasks.value = tasks.value.map(t => t.id === taskId ? updatedTask : t);
        
        if (currentFile.value && currentFile.value.id === task.file.id) {
          currentFile.value = { ...updatedTask.file };
        }
        
        console.log('Task completed successfully:', taskId);
      } else {
        task.status = 'failed';
        task.error = result.error || 'Resume failed';
      }
    } catch (error) {
      unlisten(); // 确保在任何错误情况下都清理监听器
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to resume compression:', errorMessage);

      // 检查是否是再次被暂停
      if (errorMessage.includes('Process was interrupted')) {
        console.log('Task was paused again, setting status to paused:', task.id);
        task.status = 'paused';
      } else {
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
          name: file.name,
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
          console.warn('Failed to generate thumbnail for', file.name, ':', error);
        }
        
        // Get video metadata for video files
        if (file.type.startsWith('video/')) {
          try {
            const metadata = await invoke<VideoMetadata>('get_video_metadata', {
              videoPath: filePath
            });
            videoFile.metadata = metadata;
            console.log('Video metadata for', file.name, ':', metadata);
            
            // 触发全局metadata更新事件，供其他组件使用
            window.dispatchEvent(new CustomEvent('video-metadata-updated', {
              detail: {
                fileId: videoFile.id,
                filePath: filePath,
                metadata: metadata
              }
            }));
          } catch (error) {
            console.warn('Failed to get video metadata for', file.name, ':', error);
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

  const startCompression = async (settings: CompressionSettings, outputDirectory?: string) => {
    if (!currentFile.value) {
      return;
    }
    
    const task = tasks.value.find(t => t.file.id === currentFile.value?.id);
    if (!task) {
      return;
    }
    
    isProcessing.value = true;
    task.status = 'processing';
    task.settings = settings;
    task.progress = 0;
    task.startedAt = new Date(); // 记录开始时间
    
    try {
      // Use provided output directory or get default desktop path
      const outputDir = outputDirectory || await invoke<string>('get_desktop_path');
      
      // Generate output filename
      const fileExtension = `.${settings.format}`;
      const baseName = task.file.name.replace(/\.[^/.]+$/, '');
      const outputPath = `${outputDir}/${baseName}_compressed${fileExtension}`;
      
      // Update progress
      task.progress = 10;
      
      // Prepare compression settings for backend
      const backendSettings = {
        format: settings.format,
        codec: settings.videoCodec,
        resolution: settings.resolution,
        custom_resolution: settings.customResolution ? {
          width: settings.customResolution.width,
          height: settings.customResolution.height
        } : null,
        quality_type: settings.qualityType,
        crf_value: settings.crfValue,
        bitrate: settings.bitrate,
        time_range: settings.timeRange ? {
          start: settings.timeRange.start,
          end: settings.timeRange.end
        } : null,
        hardwareAcceleration: settings.hardwareAcceleration
      };
      
      console.log('Backend settings with hardware acceleration:', backendSettings);
      
      // 设置进度监听器
      const unlisten = await listen('compression-progress', (event: any) => {
        const { inputPath, progress } = event.payload;
        if (inputPath === task.file.path) {
          task.progress = Math.round(progress);
          console.log(`Compression progress for ${task.file.name}: ${task.progress}%`);
        }
      });

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
         const errorMessage = compressionError instanceof Error ? compressionError.message : String(compressionError);
         // 只有在非暂停的情况下才清理事件监听器
         if (!errorMessage.includes('Process was interrupted')) {
            unlisten();
         }
         throw compressionError;
       }
    } catch (error) {
      console.error('Compression error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 检查是否是暂停操作导致的中断
      if (errorMessage.includes('Process was interrupted')) {
        console.log('Task was paused, setting status to paused:', task.id);
        task.status = 'paused';
        // 不设置error，因为这不是真正的错误
      } else {
        task.status = 'failed';
        task.error = errorMessage;
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