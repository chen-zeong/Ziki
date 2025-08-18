<script setup lang="ts">
import { ref, computed, provide } from 'vue';
import FileUploader from './components/FileUploader.vue';
import VideoComparison from './components/VideoComparison.vue';
import TaskList from './components/TaskList.vue';
import OutputFolder from './components/OutputFolder.vue';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import { useFileHandler } from './composables/useFileHandler';
import { useTheme } from './composables/useTheme';
import type { CompressionSettings } from './types';

const {
  tasks,
  currentFile,
  isUploaderVisible,
  selectedFiles,
  isProcessing,
  handleFiles,
  resetUploader,
  startCompression
} = useFileHandler();

const { isDark, toggleTheme } = useTheme();

// 提供当前文件信息给子组件
provide('currentFile', currentFile);

const showOutputFolder = ref(false);
const outputPath = ref('');

const toggleOutputFolder = () => {
  showOutputFolder.value = !showOutputFolder.value;
};

const handleOutputPathUpdate = (path: string) => {
  outputPath.value = path;
};

const handleOutputFolderClose = () => {
  showOutputFolder.value = false;
};

const beforeImage = computed(() => {
  return currentFile.value?.originalUrl || '';
});

const afterImage = computed(() => {
  return currentFile.value?.compressedUrl || '';
});

const onFilesSelected = async (files: FileList) => {
  await handleFiles(files);
};

const onCompress = async (settings: CompressionSettings) => {
  if (!currentFile.value) {
    return;
  }
  
  console.log('Starting compression with output path:', outputPath.value);

  try {
    await startCompression(settings, outputPath.value);
  } catch (error) {
    console.error('Compression failed in App.vue:', error);
  }
};

const onUpdateImages = (images: { beforeImage?: string; afterImage?: string }) => {
  if (!currentFile.value) return;
  
  // 创建新的文件对象以触发响应式更新
  const updatedFile = { ...currentFile.value };
  
  if (images.beforeImage) {
    updatedFile.originalUrl = images.beforeImage;
  }
  
  // 注意：afterImage是压缩后的帧图片，不应该覆盖compressedUrl（压缩视频路径）
  // compressedUrl应该保持为压缩后的视频文件路径
  
  // 更新当前文件
  currentFile.value = updatedFile;
  
  // 同时更新selectedFiles中的对应文件
  const fileIndex = selectedFiles.value.findIndex((f: any) => f.id === updatedFile.id);
  if (fileIndex !== -1) {
    selectedFiles.value[fileIndex] = updatedFile;
  }
};

const onReset = () => {
  resetUploader();
};
</script>

<template>
  <div class="bg-gray-50 text-gray-800 dark:text-gray-200 transition-colors duration-300 h-screen overflow-hidden" :style="{ backgroundColor: isDark ? '#181917' : '' }">
    <div data-tauri-drag-region class="container mx-auto p-4 sm:p-8 max-w-7xl h-full flex flex-col">
      <main class="grid grid-cols-1 lg:grid-cols-5 gap-8 flex-1 overflow-hidden" style="pointer-events: auto;">
        <!-- Left Column: Main Operations -->
        <div class="lg:col-span-3 overflow-hidden" style="pointer-events: auto;">
          <div class="bg-white border border-gray-200 dark:border-gray-800 rounded-xl px-6 sm:px-8 pt-4 sm:pt-6 pb-6 sm:pb-8 h-full overflow-auto" :style="{ backgroundColor: isDark ? '#2b2b2b' : '' }">
            <!-- File Upload (Visible by default) -->
            <FileUploader 
              v-if="isUploaderVisible"
              @files-selected="onFilesSelected"
            />

            <!-- Quality Comparison & Settings (Hidden by default) -->
            <VideoComparison 
              v-else
              :title="currentFile?.name"
              :before-image="beforeImage"
              :after-image="afterImage"
              :is-processing="isProcessing"
              :video-path="currentFile?.path"
              :compressed-video-path="currentFile?.compressedUrl"
              :compressed-video-file-path="currentFile?.compressedPath"
              @reset="onReset"
              @compress="onCompress"
              @update-images="onUpdateImages"
            />
          </div>
        </div>

        <!-- Right Column: Controls & Task List -->
        <div class="lg:col-span-2 overflow-hidden flex flex-col" style="pointer-events: auto;">
          <!-- Controls Bar -->
          <div class="flex justify-end items-center space-x-2 mb-4">
            <!-- Output Folder Icon -->
            <button 
              class="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none transition-colors"
              @click="toggleOutputFolder"
              :title="$t('outputFolder.title')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>

            </button>
            
            <!-- Theme Toggle -->
            <button 
              class="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none transition-colors"
              @click="toggleTheme"
            >
              <svg v-if="!isDark" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
              </svg>
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
              </svg>
            </button>
            
            <!-- Language Switcher -->
            <LanguageSwitcher />
          </div>
          
          <!-- Output Folder Settings (Expandable) -->
          <OutputFolder
            :show-output-folder="showOutputFolder"
            @update:output-path="handleOutputPathUpdate"
            @close="handleOutputFolderClose"
          />
          
          <!-- Codec Detector -->
          <div class="mb-4">
            <CodecDetector />
          </div>
          
          <!-- Task List -->
          <div class="flex-1 overflow-hidden">
            <TaskList :tasks="tasks" :show-theme-toggle="false" />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* 确保任务列表容器能够自适应高度变化 */
.lg\:col-span-2 {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* 优化按钮悬停效果 */
button {
  transition: all 0.2s ease-in-out;
}

/* 移除全局button hover效果，避免与组件内部样式冲突 */
</style>