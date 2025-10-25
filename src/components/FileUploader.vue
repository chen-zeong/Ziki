<template>
  <div id="drop-zone" class="transition-all duration-300">
    <div
      class="relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/70 bg-transparent px-10 py-16 text-center transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-primary)]/45 dark:border-white/15"
      :class="{
        'border-[var(--brand-primary)]/70 bg-[var(--brand-primary)]/5 dark:bg-white/5': isDragOver
      }"
      role="button"
      tabindex="0"
      @click="triggerFileInput"
      @keydown.enter.prevent="triggerFileInput"
      @keydown.space.prevent="triggerFileInput"
      @dragenter.prevent="handleDragOver"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop="handleDrop"
    >
      <div class="flex w-full max-w-2xl flex-col items-center gap-6">
        <div class="inline-flex items-center gap-3 rounded-full border border-slate-200/70 px-6 py-3 text-base font-semibold text-slate-500 transition-colors duration-200 hover:border-[var(--brand-primary)]/60 hover:text-[var(--brand-primary)] dark:border-white/12 dark:text-slate-200 dark:hover:border-[var(--brand-primary)]/50">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-sm">
            <CloudUpload class="h-5 w-5" />
          </span>
          <span>{{ $t('fileUpload.dragHere') }}</span>
        </div>

        <p class="max-w-xl text-xs font-medium uppercase tracking-[0.22em] text-slate-400 whitespace-pre-line dark:text-slate-500">
          {{ $t('fileUpload.supportedFormats') }}
        </p>

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

const handleDragLeave = (event?: DragEvent) => {
  if (event) {
    const current = event.currentTarget as HTMLElement | null;
    const related = event.relatedTarget as Node | null;
    if (current && related && current.contains(related)) {
      return;
    }
  }
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
