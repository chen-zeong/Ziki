<script setup lang="ts">
import { computed } from 'vue';
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

// 获取当前选中任务（与 MainContent 保持一致，按 file.id 匹配）
const selectedTask = computed(() => {
  if (!props.currentFile) return null;
  return props.tasks.find(t => t.file?.id === props.currentFile.id) || null;
});

// 仅统计“等待中/排队中”的任务数量，并且仅限于当前选中的任务类型
const pendingTasksCount = computed(() => {
  const type = selectedTask.value?.type;
  if (!type) return 0;
  return props.tasks.filter(t => (t.status === 'pending' || t.status === 'queued') && t.type === type).length;
});

// 当且仅当没有等待/排队中的任务时禁用批量按钮
const isBatchButtonDisabled = computed(() => {
  return pendingTasksCount.value === 0;
});

// 批量按钮文案始终为“批量压缩”
const batchButtonText = computed(() => {
  return '批量压缩';
});

// 底部压缩按钮的文本
const compressButtonText = computed(() => {
  if (selectedTask.value?.status === 'processing') return '压缩中...';
  if (selectedTask.value?.status === 'completed') return '已完成';
  return '开始压缩';
});

// 底部压缩按钮是否禁用
const isCompressButtonDisabled = computed(() => {
  if (!props.currentFile) return true;
  const status = selectedTask.value?.status;
  return status === 'processing' || status === 'completed';
});

// 当前任务是否锁定（完成后不可更改设置）
const isSettingsLocked = computed(() => selectedTask.value?.status === 'completed');

// 仅在视频任务显示时间段设置
const showTimeRangeUI = computed(() => selectedTask.value?.type === 'video');

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
  if (isSettingsLocked.value) return; // 已完成任务禁止打开时间段设置
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
      <!-- 自定义时间段开关（仅视频显示） -->
      <div class="relative" v-if="showTimeRangeUI">
        <button
          class="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-700 dark:text-dark-secondary hover:text-gray-900 dark:hover:text-gray-100"
          :class="{ 'opacity-50 cursor-not-allowed pointer-events-none': isSettingsLocked }"
          :disabled="isSettingsLocked"
          @click="toggleTimeRangePopup"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" :class="timeRangeSettings.enabled ? 'text-[#518dd6] dark:text-[#518dd6]' : 'text-gray-700 dark:text-dark-secondary'">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>自定义时间段</span>
        </button>
        
        <!-- 时间段设置弹出框 -->
        <transition name="fade-up">
          <div v-if="showTimeRangePopup" class="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-dark-panel border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 p-4">
            <TimeRangeSettings 
              :model-value="timeRangeSettings" 
              @update:model-value="$emit('update:timeRangeSettings', $event)"
              :metadata="currentFile?.metadata"
              :disabled="isSettingsLocked"
              @validation-change="handleTimeValidationChange"
            />
          </div>
        </transition>
      </div>
      
      <!-- 批量压缩按钮 -->
      <button 
        class="text-white text-sm font-semibold rounded-md transition-colors px-4 py-1.5 flex items-center space-x-2"
        :class="{ 'bg-gray-400 text-gray-200 cursor-not-allowed hover:bg-gray-400': isBatchButtonDisabled }"
        :style="pendingTasksCount > 0 ? { backgroundColor: '#578ae6' } : {}"
        :disabled="isBatchButtonDisabled"
        @click="handleBatchCompress"
      >
        <Archive class="w-4 h-4" />
        <span>{{ batchButtonText }}</span>
        <span class="bg-white/20 px-1.5 py-0.5 rounded text-xs">
          {{ pendingTasksCount }}
        </span>
      </button>
      
      <button 
        class="relative overflow-hidden text-white text-sm font-semibold rounded-md transition-all duration-300 px-4 py-1.5 min-w-[100px]"
        :class="{
          'bg-gray-400 text-gray-200 cursor-not-allowed': isCompressButtonDisabled && selectedTask?.status !== 'completed',
          'ripple-button': !isCompressButtonDisabled
        }"
        :style="
          (selectedTask?.status === 'processing')
            ? { backgroundColor: '#578ae6' }
            : (selectedTask?.status === 'completed')
              ? { backgroundColor: '#449062' }
              : (!isCompressButtonDisabled ? { backgroundColor: '#578ae6' } : {})
        "
        :disabled="isCompressButtonDisabled"
        @click="handleBottomCompress"
      >
        <!-- 压缩中状态 -->
        <template v-if="selectedTask?.status === 'processing'">
          <!-- 半透明蒙版层 -->
          <div class="absolute top-0 left-0 h-full rounded-md bg-white/40 dark:bg-black/25 transition-all duration-500 ease-out progress-mask"></div>
          <span>{{ compressButtonText }}</span>
        </template>
        
        <!-- 其他状态 -->
        <template v-else>
          <span>{{ compressButtonText }}</span>
        </template>
      </button>
    </div>
  </footer>
</template>

<style scoped>
/* 进度蒙版层动画（作用于 FooterBar 内部的 processing 状态按钮） */
.progress-mask {
  width: 0%;
  animation: progress-fill 3s ease-in-out infinite;
}

@keyframes progress-fill {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 0%; }
}
/* 与硬件支持列表一致的淡入上移动画 */
.fade-up-enter-active,
.fade-up-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.fade-up-enter-to,
.fade-up-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>