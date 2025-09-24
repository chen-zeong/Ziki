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
      @drop="handleDrop"
    >
      <CloudUpload class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
      <p class="mt-4 text-gray-600 dark:text-gray-300">
        <span class="font-semibold text-amber-600 dark:text-amber-400">{{ $t('fileUpload.selectFiles') }}</span> {{ $t('fileUpload.subtitle') }}
      </p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-2 whitespace-pre-line max-w-md leading-relaxed">{{ $t('fileUpload.supportedFormats') }}</p>
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
import { CloudUpload } from 'lucide-vue-next';

const emit = defineEmits<{
  filesSelected: [files: FileList]
}>();

const isDragOver = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const triggerFileInput = async () => {
  try {
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Video and Image Files',
        extensions: ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'flv', 'm4v', 'm4s', 'm4p', 'mpg', 'mpeg', 'mpe', 'mpv', 'mp2', 'mts', 'm2ts', 'ts', '3gp', '3g2', 'asf', 'vob', 'ogv', 'ogg', 'rm', 'rmvb', 'f4v', 'f4p', 'f4a', 'f4b', 'mod', 'mxf', 'qt', 'yuv', 'amv', 'svi', 'roq', 'nsv', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'heic', 'heif', 'avif', 'jxl']
      }]
    });
    
    if (selected && Array.isArray(selected)) {
      const files: File[] = [];
      for (const filePath of selected) {
        const fileName = filePath.split('/').pop() || 'unknown';
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        let mimeType = 'application/octet-stream';
        if (['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'flv', 'm4v', 'm4s', 'm4p', 'mpg', 'mpeg', 'mpe', 'mpv', 'mp2', 'mts', 'm2ts', 'ts', '3gp', '3g2', 'asf', 'vob', 'ogv', 'ogg', 'rm', 'rmvb', 'f4v', 'f4p', 'f4a', 'f4b', 'mod', 'mxf', 'qt', 'yuv', 'amv', 'svi', 'roq', 'nsv'].includes(extension)) {
          mimeType = `video/${extension === 'mov' ? 'quicktime' : extension === 'wmv' ? 'x-ms-wmv' : extension === 'avi' ? 'x-msvideo' : extension === '3gp' ? '3gpp' : extension === 'ogv' ? 'ogg' : extension}`;
        } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'heic', 'heif', 'avif', 'jxl'].includes(extension)) {
          mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        }
        
        let fileSize = 0;
        try {
          fileSize = await invoke<number>('get_file_size', { filePath });
        } catch (error) {
          console.warn('Failed to get file size:', error);
        }
        
        const mockFile = new File([], fileName, { type: mimeType });
        (mockFile as any).path = filePath;
        // 注意：不要强行覆盖 File.size（该属性为只读且不可重新定义），否则会在某些 WebView 中抛出错误。
        // 实际的文件大小会在后续 handleFiles 中通过 Tauri 获取。
        files.push(mockFile);
      }
      
      const fileList = {
        item: (index: number) => files[index] || null,
        ...files,
        length: files.length
      } as FileList;
      
      emit('filesSelected', fileList);
    }
  } catch (error) {
    console.error('Error selecting files:', error);
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

const handleDrop = async (_event: DragEvent) => {
  console.log('[FileUploader] DOM drop captured (will be processed by TaskListMain)');
  isDragOver.value = false;
  // 不阻止默认行为，避免拦截 Tauri 的 tauri://drag-drop 事件
};

onMounted(async () => {
  console.log('FileUploader mounted - drag & drop handled globally by TaskList.');
});

onUnmounted(() => {
  // no-op
});
</script>