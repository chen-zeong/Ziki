<template>
  <div id="drop-zone" class="transition-all duration-300">
    <h3 class="font-bold text-xl text-gray-800 dark:text-gray-100 mb-4">{{ $t('common.upload') }}</h3>
    <div 
      class="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 sm:p-12 text-center transition-colors duration-300 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-gray-800/50 cursor-pointer"
      :class="{
        'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-gray-800/50': isDragOver
      }"
      @click="triggerFileInput"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <CloudUpload class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
      <p class="mt-4 text-gray-600 dark:text-gray-300">
        <span class="font-semibold text-amber-600 dark:text-amber-400">{{ $t('fileUpload.selectFiles') }}</span> {{ $t('fileUpload.subtitle') }}
      </p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">{{ $t('fileUpload.supportedFormats') }}</p>
      <input 
        ref="fileInputRef"
        type="file" 
        class="hidden" 
        multiple 
        accept="video/*,image/*"
        @change="handleFileSelect"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { CloudUpload } from 'lucide-vue-next';

const emit = defineEmits<{
  filesSelected: [files: FileList]
}>();

const isDragOver = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
let unlistenDragDrop: UnlistenFn | null = null;
let unlistenDragEnter: UnlistenFn | null = null;
let unlistenDragLeave: UnlistenFn | null = null;
let unlistenDragOver: UnlistenFn | null = null;

const triggerFileInput = async () => {
  try {
    // Use Tauri's file dialog to get proper file paths
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Video and Image Files',
        extensions: ['mp4', 'mov', 'avi', 'mkv', 'jpg', 'jpeg', 'png', 'gif']
      }]
    });
    
    if (selected && Array.isArray(selected)) {
      // Create File objects with proper paths
      const files: File[] = [];
      for (const filePath of selected) {
        // Create a mock File object with the real path
        const fileName = filePath.split('/').pop() || 'unknown';
        // Determine file type based on extension
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        let mimeType = 'application/octet-stream';
        if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
          mimeType = `video/${extension === 'mov' ? 'quicktime' : extension}`;
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
          mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        }
        
        // Get file size using Tauri API
        let fileSize = 0;
        try {
          fileSize = await invoke<number>('get_file_size', { filePath });
        } catch (error) {
          console.warn('Failed to get file size:', error);
        }
        
        const mockFile = new File([], fileName, { type: mimeType });
        (mockFile as any).path = filePath; // Add the real path
        // Override the size property
        Object.defineProperty(mockFile, 'size', {
          value: fileSize,
          writable: false,
          enumerable: true,
          configurable: false
        });
        files.push(mockFile);
      }
      
      // Create a FileList-like object
      const fileList = {
        item: (index: number) => files[index] || null,
        ...files,
        length: files.length
      } as FileList;
      
      emit('filesSelected', fileList);
    }
  } catch (error) {
    console.error('Error selecting files:', error);
    // Fallback to regular file input
    fileInputRef.value?.click();
  }
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    emit('filesSelected', target.files);
  }
};

const handleDragOver = () => {
  isDragOver.value = true;
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleDrop = async (event: DragEvent) => {
  isDragOver.value = false;
  // Prevent default behavior to avoid conflicts with Tauri's file drop
  event.preventDefault();
  event.stopPropagation();
};

// Handle Tauri file drop events
const handleTauriFileDrop = async (filePaths: string[]) => {
  console.log('🎯 Processing dropped files:', filePaths);
  
  if (filePaths && Array.isArray(filePaths)) {
    console.log('📁 Processing', filePaths.length, 'dropped files');
    
    const files: File[] = [];
    
    for (const filePath of filePaths) {
      console.log('🔍 Processing file path:', filePath);
      
      // Extract file name from path
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
      console.log('📝 File name extracted:', fileName);
      
      // Determine MIME type based on file extension
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      let mimeType = 'application/octet-stream';
      
      if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
        mimeType = `video/${extension === 'mov' ? 'quicktime' : extension}`;
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
        mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      }
      
      console.log('🏷️ MIME type determined:', mimeType);
      
      // Get file size using Tauri API
      let fileSize = 0;
      try {
        console.log('📏 Getting file size for:', filePath);
        fileSize = await invoke<number>('get_file_size', { filePath });
        console.log('📏 File size retrieved:', fileSize, 'bytes');
      } catch (error) {
        console.warn('⚠️ Failed to get file size for:', filePath, error);
      }
      
      // Create a mock File object with the real path and size
      console.log('🔨 Creating File object for:', fileName);
      const mockFile = new File([], fileName, { type: mimeType });
      (mockFile as any).path = filePath; // Add the real path
      
      // Override the size property
      Object.defineProperty(mockFile, 'size', {
        value: fileSize,
        writable: false,
        enumerable: true,
        configurable: false
      });
      
      files.push(mockFile);
      console.log('✅ File object created successfully for:', fileName);
    }
    
    if (files.length > 0) {
      console.log('🚀 Emitting filesSelected event with', files.length, 'files');
      const fileList = {
        length: files.length,
        item: (index: number) => files[index] || null,
        [Symbol.iterator]: function* () {
          for (let i = 0; i < files.length; i++) {
            yield files[i];
          }
        }
      } as FileList;
      
      // Add array-like access
      files.forEach((file, index) => {
        (fileList as any)[index] = file;
      });
      
      emit('filesSelected', fileList);
      console.log('✅ filesSelected event emitted successfully');
    } else {
      console.warn('⚠️ No valid files to emit');
    }
  }
};

// Setup Tauri event listeners
onMounted(async () => {
  console.log('FileUploader mounted, registering file drop listeners...');
  
  // 检查是否在 Tauri 环境中
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    try {
      console.log('✅ Tauri environment detected, registering drag drop listeners...');
      
      // 监听拖拽进入事件
      unlistenDragEnter = await listen('tauri://drag-enter', (event) => {
        console.log('🎯 Tauri drag enter event:', event);
        isDragOver.value = true;
      });
      
      // 监听拖拽悬停事件
      unlistenDragOver = await listen('tauri://drag-over', (event) => {
        console.log('🎯 Tauri drag over event:', event);
        isDragOver.value = true;
      });
      
      // 监听拖拽离开事件
      unlistenDragLeave = await listen('tauri://drag-leave', (event) => {
        console.log('🎯 Tauri drag leave event:', event);
        isDragOver.value = false;
      });
      
      // 监听文件拖放事件
      unlistenDragDrop = await listen('tauri://drag-drop', (event: any) => {
        console.log('🎯 Tauri drag drop event received:', event);
        isDragOver.value = false;
        
        if (event.payload && event.payload.paths) {
          console.log('🎯 User dropped files:', event.payload.paths);
          handleTauriFileDrop(event.payload.paths);
        }
      });
      
      console.log('✅ Tauri file drop listeners registered successfully');
    } catch (error) {
      console.error('❌ Failed to register Tauri file drop listeners:', error);
    }
  } else {
    console.log('ℹ️ Not in Tauri environment, skipping file drop listeners registration');
  }
});

// Cleanup event listeners
onUnmounted(() => {
  // 清理所有 Tauri 事件监听器
  if (unlistenDragDrop) {
    unlistenDragDrop();
  }
  if (unlistenDragEnter) {
    unlistenDragEnter();
  }
  if (unlistenDragLeave) {
    unlistenDragLeave();
  }
  if (unlistenDragOver) {
    unlistenDragOver();
  }
});
</script>