<script setup lang="ts">
import { ref, computed, provide, nextTick } from 'vue';
import FileUploader from './components/FileUploader.vue';
import VideoComparison from './components/VideoComparison.vue';
import TaskList from './components/TaskList.vue';
import OutputFolder from './components/OutputFolder.vue';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import TimeRangeSettings from './components/video-settings/TimeRangeSettings.vue';

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
  startCompression,
  switchToTask,
  deleteTask
} = useFileHandler();

const { isDark, toggleTheme } = useTheme();

// 提供当前文件信息给子组件
provide('currentFile', currentFile);

const showOutputFolder = ref(false);
const showOutputFolderPopup = ref(false);
const outputPath = ref('');
const showTimeRangePopup = ref(false);
const timeRangeSettings = ref({
  enabled: false,
  timeRange: {
    start: '00:00:00',
    end: '00:00:00'
  }
});

const toggleOutputFolder = () => {
  showOutputFolder.value = !showOutputFolder.value;
};

const toggleOutputFolderPopup = () => {
  showOutputFolderPopup.value = !showOutputFolderPopup.value;
};

const toggleTimeRangePopup = () => {
  showTimeRangePopup.value = !showTimeRangePopup.value;
};

const handleTimeValidationChange = (isValid: boolean) => {
  // 处理时间验证变化
  console.log('Time validation changed:', isValid);
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
  
  // 检查是否真的需要更新，避免不必要的响应式更新
  const needsUpdate = (
    (images.beforeImage && images.beforeImage !== currentFile.value.originalUrl) ||
    (images.afterImage && images.afterImage !== currentFile.value.compressedUrl)
  );
  
  if (!needsUpdate) return;
  
  // 使用nextTick确保更新在下一个tick中进行，避免递归
  nextTick(() => {
    if (!currentFile.value) return;
    
    // 创建新的文件对象
    const updatedFile = { ...currentFile.value };
    
    if (images.beforeImage && images.beforeImage !== updatedFile.originalUrl) {
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
  });
};

const onReset = () => {
  resetUploader();
};

// 批量压缩处理函数
const handleBatchCompress = async () => {
  const pendingTasks = tasks.value.filter(t => t.status === 'pending' || t.status === 'queued');
  if (pendingTasks.length === 0) {
    return;
  }
  
  console.log(`Starting batch compression for ${pendingTasks.length} tasks`);
  
  // 这里可以添加批量压缩的具体逻辑
  // 例如：依次处理每个等待中的任务
  for (const task of pendingTasks) {
    if (task.status === 'pending') {
      task.status = 'queued';
    }
  }
};

// VideoComparison组件引用
const videoComparisonRef = ref<InstanceType<typeof VideoComparison> | null>(null);

// 底部按钮的压缩处理
const handleBottomCompress = () => {
  if (videoComparisonRef.value) {
    // 调用VideoComparison组件的压缩方法
    videoComparisonRef.value.triggerCompress();
  }
};

// 批量暂停所有任务
const handlePauseAllTasks = () => {
  tasks.value.forEach(task => {
    if (task.status === 'processing') {
      task.status = 'paused';
    }
  });
  console.log('All processing tasks paused');
};

// 批量开始所有任务
const handleStartAllTasks = () => {
  tasks.value.forEach(task => {
    if (task.status === 'pending' || task.status === 'paused') {
      task.status = 'queued';
    }
  });
  console.log('All pending/paused tasks started');
};

// 处理任务切换
const handleTaskSwitch = (taskId: string) => {
  switchToTask(taskId);
};

// 处理任务删除
const handleTaskDelete = (taskId: string) => {
  deleteTask(taskId);
};


</script>

<template>
  <!-- 整个应用窗口容器 -->
  <div class="w-full h-screen bg-gray-200 dark:bg-dark-bg flex flex-col overflow-hidden border border-gray-300 dark:border-dark-border transition-colors duration-300">
    <!-- 顶部标题栏 -->
    <div class="h-9 flex-shrink-0 bg-[#f5f5f5] dark:bg-[#2d2d2d] flex items-center justify-end px-4 border-b border-gray-200 dark:border-gray-700" data-tauri-drag-region>
      <!-- 右侧：语言切换和主题切换 -->
      <div class="flex items-center space-x-2">
        <!-- Language Switcher -->
        <LanguageSwitcher />
        
        <!-- Theme Toggle -->
        <button 
          class="h-6 w-6 flex items-center justify-center text-gray-600 dark:text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-border rounded-md transition-colors"
          @click="toggleTheme"
          data-tauri-drag-region="false"
        >
          <svg v-if="!isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
          </svg>
        </button>
      </div>
    </div>



    <!-- 3. 主内容区域 -->
    <main class="flex-grow flex pr-3 space-x-3 overflow-hidden bg-white dark:bg-dark-primary" style="pointer-events: auto;">
      <!-- 3.1 左侧面板: 任务队列 -->
      <div class="w-1/3 flex flex-col">
        <div class="flex-grow overflow-hidden">
          <!-- Output Folder Settings (Expandable) -->
          <OutputFolder
            v-if="showOutputFolder"
            :show-output-folder="showOutputFolder"
            @update:output-path="handleOutputPathUpdate"
            @close="handleOutputFolderClose"
          />
          
          <!-- Task List -->
          <TaskList 
            :tasks="tasks" 
            :show-theme-toggle="false" 
            @add-files="() => { if (!isUploaderVisible) onReset(); }"
            @pause-all-tasks="handlePauseAllTasks"
            @start-all-tasks="handleStartAllTasks"
            @switchTask="handleTaskSwitch"
            @deleteTask="handleTaskDelete"
          />
        </div>
      </div>

      <!-- 3.2 右侧面板: 预览和设置 -->
      <div class="w-2/3 flex flex-col overflow-hidden" :class="isUploaderVisible ? 'space-y-6' : 'space-y-3'">
        <!-- File Upload (Visible by default) -->
        <div v-if="isUploaderVisible" class="flex-grow bg-white dark:bg-gray-900/50 rounded-md border border-gray-300 dark:border-gray-700 flex items-center justify-center">
          <FileUploader @files-selected="onFilesSelected" />
        </div>

        <!-- Quality Comparison & Settings (Hidden by default) -->
        <VideoComparison 
          v-else
          ref="videoComparisonRef"
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
    </main>

    <!-- 4. 底部状态栏 -->
    <footer class="flex-shrink-0 flex items-center justify-between p-2 border-t border-gray-300 dark:border-dark-border bg-[#f5f5f5] dark:bg-[#2d2d2d]" style="pointer-events: auto;">
      <div class="flex items-center space-x-4">
        <div class="text-xs text-gray-500 dark:text-dark-secondary">
          <span v-if="isProcessing">{{ $t('status.processing') || '处理中' }}...</span>
          <span v-else-if="tasks.length > 0">{{ $t('status.ready') || '就绪' }} - {{ tasks.length }} {{ $t('status.tasks') || '个任务' }}</span>
          <span v-else>{{ $t('status.ready') || '就绪' }}</span>
        </div>
        <div class="flex items-center space-x-2 relative">
          <div class="relative">
            <button 
              class="p-1 text-gray-500 dark:text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-border rounded transition-colors"
              @click="toggleOutputFolderPopup"
              :title="$t('outputFolder.title') || '输出文件夹'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </button>
            
            <!-- 悬浮的输出文件夹设置 -->
               <div v-if="showOutputFolderPopup">
                 <!-- 透明遮罩层 -->
                 <div 
                   class="fixed inset-0 z-40" 
                   @click="showOutputFolderPopup = false"
                 ></div>
                 <!-- 弹窗内容 -->
                 <div 
                   class="absolute bottom-full mb-2 left-0 w-80 z-50"
                   @click.stop
                 >
                   <OutputFolder
                     :show-output-folder="true"
                     @update:output-path="handleOutputPathUpdate"
                     @close="showOutputFolderPopup = false"
                   />
                 </div>
               </div>
          </div>
          
          <div class="text-xs text-gray-500 dark:text-dark-secondary max-w-xs truncate">
            <span v-if="outputPath">{{ outputPath }}</span>
            <span v-else>{{ $t('status.noOutputPath') || '未设置输出路径' }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <!-- 自定义时间段开关 -->
        <div class="relative">
          <button
            class="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            :class="showTimeRangePopup ? 'text-gray-800 dark:text-gray-200' : 'text-gray-700 dark:text-dark-secondary hover:text-gray-900 dark:hover:text-gray-100'"
            @click="toggleTimeRangePopup"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>自定义时间段</span>
          </button>
          
          <!-- 时间段设置弹出框 -->
          <div v-if="showTimeRangePopup" class="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-dark-panel border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 p-4">
            <TimeRangeSettings 
              v-model="timeRangeSettings" 
              :metadata="currentFile?.metadata"
              @validation-change="handleTimeValidationChange"
            />
          </div>
        </div>
        
        <!-- 批量压缩按钮 -->
        <button 
          class="text-white text-sm font-semibold rounded-md transition-colors px-4 py-1.5 flex items-center space-x-2"
          :class="isProcessing || tasks.filter(t => t.status === 'pending' || t.status === 'queued').length === 0 ? 'bg-gray-400 text-gray-200 cursor-not-allowed hover:bg-gray-400' : ''"
          :style="isProcessing || tasks.filter(t => t.status === 'pending' || t.status === 'queued').length === 0 ? {} : { backgroundColor: '#578ae6' }"
          :disabled="isProcessing || tasks.filter(t => t.status === 'pending' || t.status === 'queued').length === 0"
          @click="handleBatchCompress"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <span>批量压缩</span>
          <span class="bg-white/20 px-1.5 py-0.5 rounded text-xs">
            {{ tasks.filter(t => t.status === 'pending' || t.status === 'queued').length }}
          </span>
        </button>
        
        <button 
          class="relative overflow-hidden text-white text-sm font-semibold rounded-md transition-all duration-300 px-4 py-1.5 min-w-[100px]"
          :class="{
            'bg-gray-400 text-gray-200 cursor-not-allowed': !currentFile,
            'ripple-button': !isProcessing && currentFile
          }"
          :style="!currentFile ? {} : { backgroundColor: '#578ae6' }"
          :disabled="isProcessing || !currentFile"
          @click="handleBottomCompress"
        >
          <!-- 非压缩状态 -->
          <template v-if="!isProcessing">
            开始压缩
          </template>
          
          <!-- 压缩中状态 - 半透明蒙版层设计 -->
          <template v-else>
            <!-- 半透明蒙版层 -->
            <div class="absolute top-0 left-0 h-full rounded-md bg-white/40 dark:bg-black/25 transition-all duration-500 ease-out progress-mask"></div>
            
            <div>
              
              压缩中...
            </div>
          </template>
        </button>
      </div>
    </footer>
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

/* 涟漪按钮效果 */
.ripple-button {
  position: relative;
  overflow: hidden;
}

.ripple-button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.ripple-button:active::before {
  width: 300px;
  height: 300px;
}

/* 进度蒙版层动画 */
.progress-mask {
  width: 0%;
  animation: progress-fill 3s ease-in-out infinite;
}

@keyframes progress-fill {
  0% {
    width: 0%;
  }
  50% {
    width: 70%;
  }
  100% {
    width: 0%;
  }
}

/* 移除全局button hover效果，避免与组件内部样式冲突 */
</style>