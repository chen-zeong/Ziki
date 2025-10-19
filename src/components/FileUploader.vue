<template>
  <div id="drop-zone" class="transition-all duration-300">
    <div
      class="relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/70 bg-white/75 px-8 py-12 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 dark:border-white/12 dark:bg-white/[0.04] dark:shadow-[0_22px_48px_rgba(4,9,20,0.45)]"
      :class="{
        'border-[var(--brand-primary)]/65 bg-white shadow-[0_20px_48px_rgba(99,102,241,0.18)] dark:border-[var(--brand-primary)]/55 dark:bg-white/[0.08]':
          isDragOver
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
      <div class="flex w-full max-w-3xl flex-col items-center gap-8">
        <div class="inline-flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/85 px-4 py-2 text-sm font-medium text-indigo-500 shadow-sm dark:border-white/12 dark:bg-white/[0.06] dark:text-indigo-200">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white">
            <CloudUpload class="h-5 w-5" />
          </span>
          <span>{{ $t('fileUpload.dragHere') }}</span>
        </div>

        <div class="space-y-3 text-slate-600 dark:text-slate-300">
          <h3 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {{ $t('fileUpload.title') }}
          </h3>
          <p class="text-sm sm:text-base">
            {{ $t('fileUpload.description') }}
          </p>
        </div>

        <div class="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          <div class="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-5 py-4 text-left shadow-sm transition-colors duration-200 hover:border-[var(--brand-primary)]/35 dark:border-white/12 dark:bg-white/[0.05] dark:hover:border-[var(--brand-primary)]/35">
            <span class="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-200">
              <FileVideo class="h-6 w-6" />
            </span>
            <div class="space-y-1">
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {{ $t('fileUpload.videoLabel') }}
              </p>
              <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {{ $t('fileUpload.videoHint') }}
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-5 py-4 text-left shadow-sm transition-colors duration-200 hover:border-[var(--brand-primary)]/35 dark:border-white/12 dark:bg-white/[0.05] dark:hover:border-[var(--brand-primary)]/35">
            <span class="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 dark:bg-amber-500/20 dark:text-amber-200">
              <ImageIcon class="h-6 w-6" />
            </span>
            <div class="space-y-1">
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {{ $t('fileUpload.imageLabel') }}
              </p>
              <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {{ $t('fileUpload.imageHint') }}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:border-[var(--brand-primary)]/45 hover:text-[var(--brand-primary)] dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:border-[var(--brand-primary)]/40"
          @click.stop.prevent="triggerFileInput"
        >
          {{ $t('fileUpload.selectFiles') }}
        </button>

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
import { CloudUpload, FileVideo, Image as ImageIcon } from 'lucide-vue-next';

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
