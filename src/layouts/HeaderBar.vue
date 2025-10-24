<script setup lang="ts">
import { Sun, Moon, FolderCog } from 'lucide-vue-next';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import LogPanel from '../components/LogPanel.vue';
import OutputFolder from '../components/OutputFolder.vue';
import { useGlobalSettingsStore } from '../stores/useGlobalSettingsStore';
import { computed, onMounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { Window as TauriWindow } from '@tauri-apps/api/window';
import WindowsTitlebarControls from '../components/window/WindowsTitlebarControls.vue';

const globalSettings = useGlobalSettingsStore();

const isWindows = ref(false);
const platformChecked = ref(false);
const previewWindowsControls = ref(false);
let appWindow: TauriWindow | null = null;

const shouldShowWindowsControls = computed(() => isWindows.value || previewWindowsControls.value);

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
  if (!isTauri) {
    platformChecked.value = true;
    return;
  }

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
      previewWindowsControls.value = false;
      try {
        await appWindow.setDecorations(false);
      } catch (e) {
        console.warn('Failed to disable decorations on Windows:', e);
      }
    }
  } catch (e) {
    console.warn('Failed to detect platform or initialize app window:', e);
  } finally {
    platformChecked.value = true;
  }
});

const toggleOutputFolderPopup = () => emit('toggle-output-folder-popup');
const handleOutputPathUpdate = (path: string) => emit('output-path-update', path);
const togglePreviewWindowsControls = () => {
  previewWindowsControls.value = !previewWindowsControls.value;
};

const separatorStyle = computed(() => ({
  backgroundColor: globalSettings.isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(17, 24, 39, 0.22)',
  height: '16px',
  margin: '0.35rem 0.25rem 0.35rem 0'
}));
</script>

<template>
  <!-- 顶部标题栏：透明背景，不占据布局高度（由父容器绝对定位） -->
  <div
    class="h-9 flex-shrink-0 bg-transparent dark:bg-transparent flex items-center justify-between px-2 pr-4 border-b border-transparent"
    :class="{ 'windows-header': shouldShowWindowsControls }"
    data-tauri-drag-region
  >
    <!-- 中间：标题留白（不显示任何文字） -->
    <div class="flex-1" />

    <!-- 右侧：输出文件夹、日志、语言、主题切换 -->
    <div
      class="header-actions flex items-center gap-2 mt-1"
      :class="{ 'windows-mode': shouldShowWindowsControls }"
      :data-tauri-drag-region="false"
    >
      <!-- 自定义输出文件夹按钮（移动到日志按钮左侧） -->
      <div class="relative">
        <button 
          :class="['header-icon-button', { 'is-active': props.showOutputFolderPopup }]"
          @click="toggleOutputFolderPopup"
          :title="$t('outputFolder.title') || '输出文件夹'"
          :data-tauri-drag-region="false"
        >
          <FolderCog class="w-4 h-4" />
        </button>
        <!-- 悬浮输出文件夹设置 -->
        <div v-if="props.showOutputFolderPopup" class="fixed inset-0 z-40" @click="toggleOutputFolderPopup"></div>
        <Transition name="header-pop">
          <div
            v-if="props.showOutputFolderPopup"
            class="absolute top-full mt-2 right-0 w-80 z-50 header-popover"
            @click.stop
          >
            <OutputFolder
              :show-output-folder="true"
              @update:output-path="handleOutputPathUpdate"
              @close="toggleOutputFolderPopup"
              class="soft-shadow"
            />
          </div>
        </Transition>
      </div>

      <!-- 日志按钮 -->
      <div>
        <LogPanel />
      </div>
      
      <button
        v-if="platformChecked && !isWindows"
        class="header-preview-toggle"
        :class="{ active: previewWindowsControls }"
        type="button"
        @click="togglePreviewWindowsControls"
      >
        <span class="preview-dot" aria-hidden="true" />
        <span>{{ previewWindowsControls ? $t('window.previewToggleOn') : $t('window.previewToggleOff') }}</span>
      </button>

      <LanguageSwitcher />
      <button 
        :class="['header-icon-button', 'theme-toggle', { 'windows-theme': shouldShowWindowsControls }]"
        @click="globalSettings.toggleTheme"
        :aria-pressed="globalSettings.isDarkMode"
        :data-tauri-drag-region="false"
      >
        <Transition name="theme-icon" mode="out-in">
          <Sun v-if="!globalSettings.isDarkMode" key="sun" class="theme-icon" />
          <Moon v-else key="moon" class="theme-icon" />
        </Transition>
      </button>
      <div
        v-if="shouldShowWindowsControls"
        class="win-controls-separator"
        :style="separatorStyle"
        aria-hidden="true"
      />
      <WindowsTitlebarControls v-if="shouldShowWindowsControls" />
    </div>
  </div>
</template>

<style scoped>
.header-pop-enter-active,
.header-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.header-pop-enter-from,
.header-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}
.header-popover {
  transform-origin: top right;
}
.theme-icon {
  width: 14px;
  height: 14px;
  display: inline-block;
}
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.6);
}
.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.6);
}

.win-controls-separator {
  width: 1px;
  align-self: center;
  border-radius: 9999px;
}

.header-preview-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 500;
  color: rgba(17, 24, 39, 0.72);
  background-color: rgba(17, 24, 39, 0.06);
  transition: background-color 160ms ease, color 160ms ease;
  line-height: 1;
}

.header-preview-toggle:hover {
  background-color: rgba(17, 24, 39, 0.12);
}

.header-preview-toggle:active {
  background-color: rgba(17, 24, 39, 0.18);
}

.header-preview-toggle.active {
  color: #2563eb;
  background-color: rgba(37, 99, 235, 0.12);
}

.header-preview-toggle .preview-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background-color: currentColor;
}

:global(.dark) .header-preview-toggle {
  color: rgba(226, 232, 240, 0.74);
  background-color: rgba(148, 163, 184, 0.12);
}

:global(.dark) .header-preview-toggle:hover {
  background-color: rgba(148, 163, 184, 0.2);
}

:global(.dark) .header-preview-toggle:active {
  background-color: rgba(148, 163, 184, 0.26);
}

:global(.dark) .header-preview-toggle.active {
  color: #93c5fd;
  background-color: rgba(37, 99, 235, 0.32);
}
</style>
