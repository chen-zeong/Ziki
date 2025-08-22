<template>
  <div class="flex-shrink-0 border-b border-gray-300 dark:border-gray-700">
    <div class="bg-gray-50 dark:bg-gray-800/50 p-2 flex items-center space-x-3" style="pointer-events: auto;" data-tauri-drag-region>
      <div class="ml-3"></div>
      <button 
        class="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-md text-sm text-white transition-colors"
        @click="$emit('addFiles')"
        data-tauri-drag-region="false"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        <span>{{ $t('toolbar.addFiles') || '添加文件' }}</span>
      </button>
      
      <button 
        class="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors" 
        :title="$t('toolbar.startQueue') || '开始队列'"
        :disabled="tasksLength === 0"
        @click="$emit('startQueue')"
        data-tauri-drag-region="false"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
        </svg>
      </button>
      
      <button 
        class="p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors" 
        :title="$t('toolbar.pauseQueue') || '暂停队列'"
        :disabled="!isProcessing"
        @click="$emit('pauseQueue')"
        data-tauri-drag-region="false"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
      </button>
      
      <!-- 新增的控件 -->
      <div class="flex-grow"></div> <!-- 占位符将右侧按钮推到最右边 -->
      
      <!-- 右侧按钮组 -->
      <div class="flex items-center gap-2">
        <!-- Language Switcher -->
        <LanguageSwitcher />
        
        <!-- Theme Toggle -->
        <button 
          class="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          @click="$emit('toggleTheme')"
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
  </div></div>
</template>

<script setup lang="ts">
import LanguageSwitcher from './LanguageSwitcher.vue';

interface Props {
  tasksLength: number;
  isProcessing: boolean;
  isDark: boolean;
}

withDefaults(defineProps<Props>(), {
  tasksLength: 0,
  isProcessing: false,
  isDark: false
});

defineEmits<{
  addFiles: [];
  startQueue: [];
  pauseQueue: [];
  toggleOutputFolder: [];
  toggleTheme: [];
}>();
</script>