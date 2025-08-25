<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import { useTheme } from '../composables/useTheme';

const { isDark, toggleTheme } = useTheme();
</script>

<template>
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
        <Sun v-if="!isDark" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>