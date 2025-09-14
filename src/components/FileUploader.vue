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
// Replace UnlistenFn-typed vars with any to avoid dependency on event API here
let unlistenDragDrop: any = null;
let unlistenDragEnter: any = null;
let unlistenDragLeave: any = null;
let unlistenDragOver: any = null;

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

// Neutralize previous Tauri drag-drop listener registration here; now handled in TaskList
onMounted(async () => {
  console.log('FileUploader mounted - drag & drop handled globally by TaskList.');
});

// Cleanup (kept for safety; no-ops if listeners not set)
onUnmounted(() => {
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