<script setup lang="ts">
import { ref, computed } from 'vue';

import FileUploader from './components/FileUploader.vue';
import VideoComparison from './components/VideoComparison.vue';
import TaskList from './components/TaskList.vue';
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


const showOutputFolder = ref(false);
const outputPath = ref('');

const toggleOutputFolder = () => {
  showOutputFolder.value = !showOutputFolder.value;
};

const selectOutputFolder = async () => {
  try {
    // For now, just set a placeholder path
    // In a real implementation, you would use Tauri's dialog API
    outputPath.value = '/Users/Desktop/Output';
    showOutputFolder.value = false;
  } catch (error) {
    console.error('Failed to select folder:', error);
  }
};

const beforeImage = computed(() => {
  return currentFile.value?.originalUrl || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
});

const afterImage = computed(() => {
  return currentFile.value?.compressedUrl || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=20&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
});

const onFilesSelected = async (files: FileList) => {
  await handleFiles(files);
};

const onCompress = async (settings: CompressionSettings) => {
  if (!currentFile.value) {
    return;
  }
  
  try {
    await startCompression(settings);
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
  <div class="bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-200 transition-colors duration-300 h-screen overflow-hidden">
    <div class="container mx-auto p-4 sm:p-8 max-w-7xl h-full flex flex-col">


      <main class="grid grid-cols-1 lg:grid-cols-5 gap-8 flex-1 overflow-hidden">
        <!-- Left Column: Main Operations -->
        <div class="lg:col-span-3 overflow-hidden">
          <div class="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-6 sm:p-8 h-full overflow-auto">
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
        <div class="lg:col-span-2 overflow-hidden flex flex-col">
          <!-- Controls Bar -->
          <div class="flex justify-end items-center space-x-2 mb-4">
            <!-- Output Folder Icon -->
            <button 
              class="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none transition-colors"
              @click="toggleOutputFolder"
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
          </div>
          
          <!-- Output Folder Settings (Expandable) -->
          <transition 
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 transform -translate-y-2 scale-95"
            enter-to-class="opacity-100 transform translate-y-0 scale-100"
            leave-active-class="transition-all duration-300 ease-in"
            leave-from-class="opacity-100 transform translate-y-0 scale-100"
            leave-to-class="opacity-0 transform -translate-y-2 scale-95"
          >
            <div 
              v-if="showOutputFolder"
              class="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-4"
            >
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择输出文件夹</label>
            <div class="flex space-x-2">
              <input 
                v-model="outputPath"
                type="text" 
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-amber-500 focus:border-amber-500"
                placeholder="选择输出路径..."
                readonly
              >
              <button 
                class="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 transition-colors"
                @click="selectOutputFolder"
              >
                选择
              </button>
            </div>
            </div>
          </transition>
          
          <!-- Task List -->
          <div class="flex-1 overflow-hidden">
            <TaskList :tasks="tasks" :show-theme-toggle="false" />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>