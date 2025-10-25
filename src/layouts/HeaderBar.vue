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
let appWindow: TauriWindow | null = null;

const shouldShowWindowsControls = computed(() => isWindows.value);

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

// 新增：Windows 下为拖拽区域提供微弱不透明背景，避免完全透明导致拖拽失效
const windowsHeaderStyle = computed(() => ({
  backgroundColor: globalSettings.isDarkMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'
}));

// 新增：在 Windows 下直接调用 startDragging，提升拖拽可靠性
const onHeaderMouseDown = async (e: MouseEvent) => {
  try {
    // 仅响应左键按下，且不在交互子元素上
    if (e.button !== 0) return;
    if (!isWindows.value) return;
    if (!appWindow) return;
    // 如果事件源位于标记了 data-tauri-drag-region="false" 的元素中，跳过
    const target = e.target as HTMLElement | null;
    if (target) {
      let el: HTMLElement | null = target;
      while (el) {
        if (el.getAttribute && el.getAttribute('data-tauri-drag-region') === 'false') {
          return; // 不触发窗口拖拽
        }
        el = el.parentElement;
      }
    }
    await appWindow.startDragging();
  } catch (err) {
    console.warn('startDragging failed:', err);
  }
};

onMounted(async () => {
  // 仅在 Tauri 环境下检查平台并隐藏原生标题栏（Windows）
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
  if (!isTauri) {
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
      try {
        await appWindow.setDecorations(false);
      } catch (e) {
        console.warn('Failed to disable decorations on Windows:', e);
      }
    }
  } catch (e) {
    console.warn('Failed to detect platform or initialize app window:', e);
  } finally {
    // no-op
  }
});

const toggleOutputFolderPopup = () => emit('toggle-output-folder-popup');
const handleOutputPathUpdate = (path: string) => emit('output-path-update', path);

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
    :style="isWindows ? windowsHeaderStyle : undefined"
    @mousedown="onHeaderMouseDown"
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

</style>
