<script setup lang="ts">
import { Sun, Moon, Minus, Square, X, FolderCog } from 'lucide-vue-next';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import LogPanel from '../components/LogPanel.vue';
import OutputFolder from '../components/OutputFolder.vue';
import { useGlobalSettingsStore } from '../stores/useGlobalSettingsStore';
import { onMounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { Window as TauriWindow } from '@tauri-apps/api/window';

const globalSettings = useGlobalSettingsStore();

const isWindows = ref(false);
let appWindow: TauriWindow | null = null;

// 从父组件接收输出路径和弹窗显隐
interface Props {
  outputPath?: string;
  showOutputFolderPopup?: boolean;
}
const props = defineProps<Props>();

// 事件：输出文件夹弹窗开关与路径更新
const emit = defineEmits<{
  'toggle-output-folder-popup': [];
  'output-path-update': [path: string];
}>();

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

const toggleOutputFolderPopup = () => emit('toggle-output-folder-popup');
const handleOutputPathUpdate = (path: string) => emit('output-path-update', path);
</script>

<template>
  <!-- 顶部标题栏：透明背景，不占据布局高度（由父容器绝对定位） -->
  <div class="h-9 flex-shrink-0 bg-transparent dark:bg-transparent flex items-center justify-between px-2 pr-4 border-b border-transparent" data-tauri-drag-region>
    <div v-if="isWindows" class="flex items-center space-x-1">
      <!-- 关闭（放到最左侧，突出视觉层级） -->
      <button
        class="h-7 w-7 flex items-center justify-center rounded-md transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-red-500/90 hover:text-white focus:outline-none focus:ring-0 hover-lift"
        @click="handleClose"
        :data-tauri-drag-region="false"
        :title="$t('window.close') || '关闭'"
        aria-label="Close"
      >
        <X class="w-4 h-4" />
      </button>
      <!-- 最小化 -->
      <button
        class="h-7 w-7 flex items-center justify-center rounded-md transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-500/15 dark:hover:bg-gray-300/15 hover:text-gray-900 dark:hover:text-white active:scale-95 focus:outline-none focus:ring-0 hover-lift"
        @click="handleMinimize"
        :data-tauri-drag-region="false"
        :title="$t('window.minimize') || '最小化'"
        aria-label="Minimize"
      >
        <Minus class="w-4 h-4" />
      </button>
      <!-- 最大化/还原 -->
      <button
        class="h-7 w-7 flex items-center justify-center rounded-md transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-500/15 dark:hover:bg-gray-300/15 hover:text-gray-900 dark:hover:text-white active:scale-95 focus:outline-none focus:ring-0 hover-lift"
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

    <!-- 右侧：输出文件夹、日志、语言、主题切换 -->
    <div class="flex items-center space-x-2 mt-1" :data-tauri-drag-region="false">
      <!-- 自定义输出文件夹按钮（移动到日志按钮左侧） -->
      <div class="relative">
        <button 
          class="h-6 w-6 flex items-center justify-center text-gray-600 dark:text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-border rounded-md transition-colors"
          @click="toggleOutputFolderPopup"
          :title="$t('outputFolder.title') || '输出文件夹'"
        >
          <FolderCog class="w-4 h-4" />
        </button>
        <!-- 悬浮输出文件夹设置 -->
        <div v-if="props.showOutputFolderPopup">
          <div class="fixed inset-0 z-40" @click="toggleOutputFolderPopup"></div>
          <div class="absolute top-full mt-2 right-0 w-80 z-50" @click.stop>
            <OutputFolder
              :show-output-folder="true"
              @update:output-path="handleOutputPathUpdate"
              @close="toggleOutputFolderPopup"
              class="soft-shadow"
            />
          </div>
        </div>
      </div>

      <!-- 日志按钮 -->
      <div>
        <LogPanel />
      </div>
      
      <LanguageSwitcher />
      <button 
        class="h-6 w-6 flex items-center justify-center text-gray-600 dark:text-dark-secondary bg-white dark:bg-dark-border border border-slate-200/70 dark:border-white/10 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-dark-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/50"
        @click="globalSettings.toggleTheme"
        :aria-pressed="globalSettings.isDarkMode"
        :data-tauri-drag-region="false"
      >
        <Sun v-if="!globalSettings.isDarkMode" class="w-3.5 h-3.5" />
        <Moon v-else class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
