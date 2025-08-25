<script setup lang="ts">
import { Archive, FolderCog } from 'lucide-vue-next';
import OutputFolder from '../components/OutputFolder.vue';
import TimeRangeSettings from '../components/video-settings/TimeRangeSettings.vue';
import type { CompressionTask } from '../types';

interface Props {
  tasks: CompressionTask[];
  currentFile: any;
  isProcessing: boolean;
  isProcessingBatch?: boolean;
  outputPath: string;
  timeRangeSettings: any;
  showOutputFolderPopup: boolean;
  showTimeRangePopup: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits([
  'toggle-output-folder-popup',
  'toggle-time-range-popup',
  'output-path-update',
  'time-validation-change',
  'batch-compress',
  'bottom-compress',
  'update:timeRangeSettings'
]);

const handleOutputPathUpdate = (path: string) => {
  emit('output-path-update', path);
};

const handleTimeValidationChange = (isValid: boolean) => {
  emit('time-validation-change', isValid);
};

const handleBatchCompress = () => {
  console.log('🚀 FooterBar handleBatchCompress clicked!');
  emit('batch-compress');
  console.log('📡 batch-compress event emitted');
};

const handleBottomCompress = () => {
  emit('bottom-compress');
};

const toggleOutputFolderPopup = () => {
  emit('toggle-output-folder-popup');
};

const toggleTimeRangePopup = () => {
  emit('toggle-time-range-popup');
};
</script>

<template>
  <!-- 底部状态栏 -->
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
            <FolderCog class="w-4 h-4" />
          </button>
          
          <!-- 悬浮的输出文件夹设置 -->
          <div v-if="showOutputFolderPopup">
            <!-- 透明遮罩层 -->
            <div 
              class="fixed inset-0 z-40" 
              @click="toggleOutputFolderPopup"
            ></div>
            <!-- 弹窗内容 -->
            <div 
              class="absolute bottom-full mb-2 left-0 w-80 z-50"
              @click.stop
            >
              <OutputFolder
                :show-output-folder="true"
                @update:output-path="handleOutputPathUpdate"
                @close="toggleOutputFolderPopup"
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
          class="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-700 dark:text-dark-secondary hover:text-gray-900 dark:hover:text-gray-100"
          @click="toggleTimeRangePopup"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" :class="timeRangeSettings.enabled ? 'text-[#518dd6] dark:text-[#518dd6]' : 'text-gray-700 dark:text-dark-secondary'">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>自定义时间段</span>
        </button>
        
        <!-- 时间段设置弹出框 -->
        <div v-if="showTimeRangePopup" class="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-dark-panel border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 p-4">
          <TimeRangeSettings 
            :model-value="timeRangeSettings" 
            @update:model-value="$emit('update:timeRangeSettings', $event)"
            :metadata="currentFile?.metadata"
            @validation-change="handleTimeValidationChange"
          />
        </div>
      </div>
      
      <!-- 批量压缩按钮 -->
      <button 
        class="text-white text-sm font-semibold rounded-md transition-colors px-4 py-1.5 flex items-center space-x-2"
        :class="(isProcessing && !isProcessingBatch) || tasks.filter(t => t.status === 'pending' || t.status === 'queued').length === 0 ? 'bg-gray-400 text-gray-200 cursor-not-allowed hover:bg-gray-400' : ''"
        :style="(isProcessing && !isProcessingBatch) || tasks.filter(t => t.status === 'pending' || t.status === 'queued').length === 0 ? {} : { backgroundColor: isProcessingBatch ? '#dc2626' : '#578ae6' }"
        :disabled="(isProcessing && !isProcessingBatch) || tasks.filter(t => t.status === 'pending' || t.status === 'queued').length === 0"
        @click="handleBatchCompress"
      >
        <Archive class="w-4 h-4" />
        <span>{{ isProcessingBatch ? '停止批量' : '批量压缩' }}</span>
        <span class="bg-white/20 px-1.5 py-0.5 rounded text-xs">
          {{ tasks.filter(t => t.status === 'pending' || t.status === 'queued').length }}
        </span>
      </button>
      
      <button 
        class="relative overflow-hidden text-white text-sm font-semibold rounded-md transition-all duration-300 px-4 py-1.5 min-w-[100px]"
        :class="{
          'bg-gray-400 text-gray-200 cursor-not-allowed': !currentFile,
          'ripple-button': currentFile
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
</template>