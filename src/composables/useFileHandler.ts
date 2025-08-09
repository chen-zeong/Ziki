import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { VideoFile, CompressionTask, CompressionSettings, CompressionResult, VideoMetadata } from '../types';

export function useFileHandler() {
  const selectedFiles = ref<VideoFile[]>([]);
  const tasks = ref<CompressionTask[]>([]);
  const currentFile = ref<VideoFile | null>(null);
  const isUploaderVisible = ref(true);
  const isProcessing = ref(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleFiles = async (fileList: FileList) => {
    if (!fileList || fileList.length === 0) return;
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
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
            crfValue: 23,
            audioCodec: 'aac',
            sampleRate: 'original'
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
        audio_format: settings.audioCodec,
        sample_rate: settings.sampleRate,
        time_range: settings.timeRange ? {
          start: settings.timeRange.start,
          end: settings.timeRange.end
        } : null
      };
      
      // Update progress
      task.progress = 20;
      
      // Call backend compression
      const result = await invoke<CompressionResult>('compress_video', {
        inputPath: task.file.path,
        outputPath: outputPath,
        settings: backendSettings
      });
      
      if (result.success) {
        task.status = 'completed';
        task.progress = 100;
        task.originalSize = result.originalSize; // Update with actual file size from backend
        task.compressedSize = result.compressedSize || 0;
        task.completedAt = new Date();
        // Set both compressed path and URL
        task.file.compressedPath = result.outputPath;
        task.file.compressedUrl = result.outputPath ? convertFileSrc(result.outputPath) : undefined;
        
        // Update currentFile if it matches this task
        if (currentFile.value && currentFile.value.id === task.file.id) {
          currentFile.value = { ...task.file };
        }
      } else {
        task.status = 'failed';
        task.error = result.error || 'Compression failed';
      }
    } catch (error) {
      console.error('Compression error:', error);
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
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
    getCompressionRatio
  };
}