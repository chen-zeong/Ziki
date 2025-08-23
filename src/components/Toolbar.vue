<template>
  <div class="flex-shrink-0 border-b border-gray-300 dark:border-gray-700">
    <div class="bg-gray-50 dark:bg-gray-800/50 p-2 flex items-center space-x-3" style="pointer-events: auto;" data-tauri-drag-region>
      <div class="ml-3"></div>
      <button 
        class="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-md text-sm text-white transition-colors"
        @click="$emit('addFiles')"
        data-tauri-drag-region="false"
      >
        <BadgePlus class="w-4 h-4" />
        <span>{{ $t('toolbar.addFiles') || '添加文件' }}</span>
      </button>
      
      <button 
        class="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors" 
        :title="$t('toolbar.startQueue') || '开始队列'"
        :disabled="tasksLength === 0"
        @click="$emit('startQueue')"
        data-tauri-drag-region="false"
      >
        <Play class="w-5 h-5" />
      </button>
      
      <button 
        class="p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors" 
        :title="$t('toolbar.pauseQueue') || '暂停队列'"
        :disabled="!isProcessing"
        @click="$emit('pauseQueue')"
        data-tauri-drag-region="false"
      >
        <Pause class="w-4 h-4" />
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
        <Sun v-if="!isDark" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </button>
    </div>
  </div></div>
</template>

<script setup lang="ts">
import LanguageSwitcher from './LanguageSwitcher.vue';
import { BadgePlus, Play, Pause, Sun, Moon } from 'lucide-vue-next';

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