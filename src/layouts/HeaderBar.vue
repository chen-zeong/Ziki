<script setup lang="ts">
import { Sun, Moon, Minus, Square, X } from 'lucide-vue-next';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import LogPanel from '../components/LogPanel.vue';
import { useGlobalSettingsStore } from '../stores/useGlobalSettingsStore';
import { onMounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { Window as TauriWindow } from '@tauri-apps/api/window';

const globalSettings = useGlobalSettingsStore();

const isWindows = ref(false);
let appWindow: TauriWindow | null = null;

onMounted(async () => {
  // 仅在 Tauri 环境下检查平台并隐藏原生标题栏（Windows）
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
  if (!isTauri) return;

  try {
    appWindow = TauriWindow.getCurrent();
    const platform = await invoke<string>('get_platform');
    isWindows.value = platform === 'windows';
    if (isWindows.value) {
      try {
        await appWindow.setDecorations(false);
      } catch (e) {
        console.warn('Failed to disable decorations on Windows:', e);
      }
    }
  } catch (e) {
    console.warn('Failed to detect platform or initialize app window:', e);
  }
});

const handleMinimize = async () => {
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
  if (!isTauri || !appWindow) return;
  try { await appWindow.minimize(); } catch (e) { console.warn('minimize failed', e); }
};

const handleMaximize = async () => {
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
  if (!isTauri || !appWindow) return;
  try {
    const max = await appWindow.isMaximized();
    if (max) await appWindow.unmaximize(); else await appWindow.maximize();
  } catch (e) { console.warn('maximize toggle failed', e); }
};

const handleClose = async () => {
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
  if (!isTauri || !appWindow) return;
  try { await appWindow.close(); } catch (e) { console.warn('close failed', e); }
};
</script>

<template>
  <!-- 顶部标题栏 -->
  <div class="h-9 flex-shrink-0 bg-[#f5f5f5] dark:bg-[#2d2d2d] flex items-center justify-between px-2 pr-4 border-b border-gray-200 dark:border-gray-700" data-tauri-drag-region>
    <!-- 左侧：Windows 自定义窗口控制按钮（最左侧） -->
    <div v-if="isWindows" class="flex items-center space-x-1">
      <!-- 最小化 -->
      <button
        class="h-6 w-8 flex items-center justify-center text-gray-600 dark:text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-border rounded-md transition-colors"
        @click="handleMinimize"
        :data-tauri-drag-region="false"
        title="最小化"
      >
        <Minus class="w-4 h-4" />
      </button>
      <!-- 最大化/还原 -->
      <button
        class="h-6 w-8 flex items-center justify-center text-gray-600 dark:text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-border rounded-md transition-colors"
        @click="handleMaximize"
        :data-tauri-drag-region="false"
        title="最大化/还原"
      >
        <Square class="w-4 h-4" />
      </button>
      <!-- 关闭 -->
      <button
        class="h-6 w-8 flex items-center justify-center text-gray-600 dark:text-dark-secondary hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 rounded-md transition-colors"
        @click="handleClose"
        :data-tauri-drag-region="false"
        title="关闭"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- 中间留白：作为拖拽区域的缓冲，提高可拖拽面积 -->
    <div class="flex-1" />

    <!-- 右侧：日志、语言切换和主题切换 -->
    <div class="flex items-center space-x-2">
      <!-- Log Panel Button: 放在语言切换左边 -->
      <div :data-tauri-drag-region="false">
        <LogPanel />
      </div>

      <!-- Language Switcher -->
      <LanguageSwitcher />
      
      <!-- Theme Toggle -->
      <button 
        class="h-6 w-6 flex items-center justify-center text-gray-600 dark:text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-border rounded-md transition-colors"
        @click="globalSettings.toggleTheme"
        :data-tauri-drag-region="false"
      >
        <Sun v-if="!globalSettings.isDarkMode" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>