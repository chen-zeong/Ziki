<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Window as TauriWindow } from '@tauri-apps/api/window';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { useGlobalSettingsStore } from '../../stores/useGlobalSettingsStore';

const { t } = useI18n();

const hasTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
const currentWindow = ref<TauriWindow | null>(null);
const isMaximized = ref(false);
const globalSettings = useGlobalSettingsStore();

let unlistenResized: UnlistenFn | null = null;

const updateMaximizedState = async () => {
  if (!currentWindow.value) return;
  try {
    isMaximized.value = await currentWindow.value.isMaximized();
  } catch (error) {
    console.warn('Failed to read maximized state', error);
  }
};

const handleMinimize = async () => {
  if (!currentWindow.value) return;
  try {
    await currentWindow.value.minimize();
  } catch (error) {
    console.warn('Minimize failed', error);
  }
};

const handleToggleMaximize = async () => {
  if (!currentWindow.value) return;
  try {
    const maximized = await currentWindow.value.isMaximized();
    if (maximized) {
      await currentWindow.value.unmaximize();
    } else {
      await currentWindow.value.maximize();
    }
    await updateMaximizedState();
  } catch (error) {
    console.warn('Maximize toggle failed', error);
  }
};

const handleClose = async () => {
  if (!currentWindow.value) return;
  try {
    await currentWindow.value.close();
  } catch (error) {
    console.warn('Close failed', error);
  }
};

onMounted(async () => {
  if (!hasTauri) return;
  try {
    const win = TauriWindow.getCurrent();
    currentWindow.value = win;
    await updateMaximizedState();
    unlistenResized = await win.onResized(updateMaximizedState);
  } catch (error) {
    console.warn('Failed to initialise Windows titlebar controls', error);
  }
});

onBeforeUnmount(() => {
  if (unlistenResized) {
    try {
      unlistenResized();
    } catch (error) {
      console.warn('Failed to teardown resize listener', error);
    }
    unlistenResized = null;
  }
});

const controlThemeVars = computed(() => {
  if (globalSettings.isDarkMode) {
  return {
    '--win-controls-bg': 'transparent',
      '--win-btn-color': '#ffffff',
      '--win-btn-hover-bg': 'rgba(255, 255, 255, 0.16)',
      '--win-btn-active-bg': 'rgba(255, 255, 255, 0.22)',
      '--win-icon-stroke': '#ffffff'
    };
  }
  return {
    '--win-controls-bg': 'transparent',
    '--win-btn-color': 'rgba(0, 0, 0, 0.78)',
    '--win-btn-hover-bg': 'rgba(0, 0, 0, 0.06)',
    '--win-btn-active-bg': 'rgba(0, 0, 0, 0.12)',
    '--win-icon-stroke': 'currentColor'
  };
});
</script>

<template>
  <div class="windows-controls" :style="controlThemeVars" :data-tauri-drag-region="false">
    <button
      class="win-button win-minimize"
      type="button"
      @click="handleMinimize"
      @mousedown.stop
      :title="t('window.minimize') || 'Minimize'"
      aria-label="Minimize"
      :data-tauri-drag-region="false"
    >
      <svg viewBox="0 0 10 10" class="win-icon" aria-hidden="true" fill="none">
        <path d="M1.5 5.5h7" />
      </svg>
    </button>

    <button
      class="win-button win-maximize"
      type="button"
      @click="handleToggleMaximize"
      @mousedown.stop
      :title="(isMaximized ? t('window.maximizeRestore') : t('window.maximize')) || 'Maximize'"
      :aria-label="isMaximized ? 'Restore Down' : 'Maximize'"
      :data-tauri-drag-region="false"
      :class="{ 'is-restore': isMaximized }"
    >
      <svg
        v-if="!isMaximized"
        viewBox="0 0 10 10"
        class="win-icon"
        aria-hidden="true"
        fill="none"
      >
        <rect x="1.5" y="1.5" width="7" height="7" rx="0.6" />
      </svg>
      <svg
        v-else
        viewBox="0 0 12 12"
        class="win-icon"
        aria-hidden="true"
        fill="none"
      >
        <path d="M3.5 4.5h6v6h-6z" />
        <path d="M2.5 2.5h6v2" />
      </svg>
    </button>

    <button
      class="win-button win-close"
      type="button"
      @click="handleClose"
      @mousedown.stop
      :title="t('window.close') || 'Close'"
      aria-label="Close"
      :data-tauri-drag-region="false"
    >
      <svg viewBox="0 0 10 10" class="win-icon" aria-hidden="true" fill="none">
        <path d="M2 2l6 6M8 2L2 8" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.windows-controls {
  display: flex;
  align-items: stretch;
  height: 100%;
  user-select: none;
  border-radius: 0;
  overflow: hidden;
  background-color: var(--win-controls-bg, transparent);
  -webkit-app-region: no-drag;
}

.win-button {
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--win-btn-color, rgba(0, 0, 0, 0.78));
  transition: background-color 120ms ease, color 120ms ease;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.win-button:hover {
  background-color: var(--win-btn-hover-bg, rgba(0, 0, 0, 0.06));
}

.win-button:active {
  background-color: var(--win-btn-active-bg, rgba(0, 0, 0, 0.12));
}

.win-button.win-close:hover {
  background-color: #e81123;
  color: #ffffff;
}

.win-button.win-close:active {
  background-color: #c50f1f;
}

.win-icon {
  width: 10px;
  height: 10px;
  stroke: currentColor;
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  stroke: var(--win-icon-stroke, currentColor);
}

.win-maximize.is-restore .win-icon {
  stroke-width: 1.1;
}
</style>
