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

    // 设置窗口标题为空字符串，保证顶部不显示任何文字（跨平台生效）
    try {
    // 使用单个空格而非空字符串，避免在部分平台/策略下被视为无效标题
    await appWindow.setTitle(' ');
    } catch (e) {
      console.warn('Failed to set empty window title:', e);
    }

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
     <div v-if="isWindows" class="flex items-center space-x-1">
       <!-- 关闭（放到最左侧，突出视觉层级） -->
       <button
         class="h-7 w-7 flex items-center justify-center rounded-md transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-red-500/90 hover:text-white focus:outline-none focus:ring-0"
         @click="handleClose"
         :data-tauri-drag-region="false"
         :title="$t('window.close') || '关闭'"
         aria-label="Close"
       >
         <X class="w-4 h-4" />
       </button>
       <!-- 最小化 -->
       <button
         class="h-7 w-7 flex items-center justify-center rounded-md transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-500/15 dark:hover:bg-gray-300/15 hover:text-gray-900 dark:hover:text-white active:scale-95 focus:outline-none focus:ring-0"
         @click="handleMinimize"
         :data-tauri-drag-region="false"
         :title="$t('window.minimize') || '最小化'"
         aria-label="Minimize"
       >
         <Minus class="w-4 h-4" />
       </button>
       <!-- 最大化/还原 -->
       <button
         class="h-7 w-7 flex items-center justify-center rounded-md transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-500/15 dark:hover:bg-gray-300/15 hover:text-gray-900 dark:hover:text-white active:scale-95 focus:outline-none focus:ring-0"
         @click="handleMaximize"
         :data-tauri-drag-region="false"
         :title="$t('window.maximize') || '最大化'"
         aria-label="Maximize/Restore"
       >
         <Square class="w-4 h-4" />
       </button>
     </div>
    
    <!-- 中间：标题留白（不显示任何文字） -->
    <div class="flex-1" />

    <!-- 右侧：主题与语言切换、日志按钮等 -->
    <div class="flex items-center space-x-2" :data-tauri-drag-region="false">
      <div>
        <LogPanel />
      </div>
      <LanguageSwitcher />
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