<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { useLogStore } from '../stores/useLogStore';
import { MessageSquareText, X, Trash2, Logs, Copy } from 'lucide-vue-next';
import { useGlobalSettingsStore } from '../stores/useGlobalSettingsStore';

const logStore = useLogStore();
const global = useGlobalSettingsStore();

const open = ref(false);
const scrollContainer = ref<HTMLElement>();

const listenerAttached = ref(false);
const attachScrollListener = () => {
  const el = scrollContainer.value;
  if (el && !listenerAttached.value) {
    el.addEventListener('scroll', onNativeScroll, { passive: true });
    listenerAttached.value = true;
  }
};
const detachScrollListener = () => {
  const el = scrollContainer.value;
  if (el && listenerAttached.value) {
    el.removeEventListener('scroll', onNativeScroll as any);
    listenerAttached.value = false;
  }
};

const scrollToTop = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0;
    updateScrollState();
  }
};

const toggle = () => {
  open.value = !open.value;
  if (open.value) {
    logStore.markAllRead();
    nextTick(() => {
      attachScrollListener();
      updateScrollState();
      // 默认展示最新日志（已按时间倒序排列），滚动到顶部
      scrollToTop();
    });
  } else {
    detachScrollListener();
  }
};

onMounted(() => {
  // mark read when opened
  watch(open, (v) => {
    if (v) {
      logStore.markAllRead();
      nextTick(() => {
        attachScrollListener();
        updateScrollState();
        // 默认展示最新日志（已按时间倒序排列），滚动到顶部
        scrollToTop();
      });
    } else {
      detachScrollListener();
    }
  });
  window.addEventListener('resize', updateScrollState);
});

onBeforeUnmount(() => {
  detachScrollListener();
  window.removeEventListener('resize', updateScrollState);
  detachDrag();
});

const entries = computed(() => logStore.orderedLogs);

// 监听日志变化，打开面板时保持最新（顶部）
watch(entries, () => {
  if (open.value) {
    nextTick(() => {
      scrollToTop();
    });
  }
}, { deep: true });

const levelColor = (level: string) => ({
  info: 'text-gray-600 dark:text-gray-300',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
} as const)[level as 'info' | 'success' | 'warning' | 'error'] || 'text-gray-600 dark:text-gray-300';

const levelBadge = (level: string) => ({
  info: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
} as const)[level as 'info' | 'success' | 'warning' | 'error'] || 'bg-gray-100 text-gray-600';

const timefmt = (ts: number) => new Date(ts).toLocaleString();

// 复制相关（仅右上角按钮）
const lastCopiedId = ref<string | null>(null);
const copyLog = async (e: any) => {
  try {
    const base = `[${e.level.toUpperCase()}] ${e.message}`;
    const meta = e.meta ? `\n${JSON.stringify(e.meta, null, 2)}` : '';
    const text = `${base}${meta}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    lastCopiedId.value = e.id;
    setTimeout(() => { if (lastCopiedId.value === e.id) lastCopiedId.value = null; }, 1200);
  } catch (_) {
    // ignore
  }
};

// 自绘滚动条（第三方风格）
const state = ref({ client: 0, scroll: 0, top: 0 });
const minThumb = 28;
const thumbSize = computed(() => {
  const c = state.value.client;
  const s = state.value.scroll;
  if (!c || !s || s <= c) return c; // 内容不溢出
  return Math.max(minThumb, Math.round((c / s) * c));
});
const thumbOffset = computed(() => {
  const c = state.value.client, s = state.value.scroll, t = state.value.top;
  if (!c || !s || s <= c) return 0;
  const track = c - thumbSize.value;
  return track <= 0 ? 0 : Math.round((t / (s - c)) * track);
});

const updateScrollState = () => {
  const el = scrollContainer.value;
  if (!el) return;
  state.value = { client: el.clientHeight, scroll: el.scrollHeight, top: el.scrollTop };
};

const onNativeScroll = () => updateScrollState();

// 拖拽逻辑
let dragStartY = 0; let dragStartTop = 0; let dragging = false;
const onThumbDown = (ev: MouseEvent) => {
  ev.preventDefault();
  ev.stopPropagation();
  dragging = true;
  dragStartY = ev.clientY;
  dragStartTop = state.value.top;
  document.addEventListener('mousemove', onThumbMove);
  document.addEventListener('mouseup', onThumbUp);
};
const onThumbMove = (ev: MouseEvent) => {
  if (!dragging || !scrollContainer.value) return;
  const c = state.value.client, s = state.value.scroll;
  if (s <= c) return;
  const track = c - thumbSize.value;
  const deltaY = ev.clientY - dragStartY;
  const ratio = (s - c) / (track || 1);
  scrollContainer.value.scrollTop = Math.min(s - c, Math.max(0, dragStartTop + deltaY * ratio));
  updateScrollState();
};
const onThumbUp = () => detachDrag();
const detachDrag = () => {
  if (!dragging) return;
  dragging = false;
  document.removeEventListener('mousemove', onThumbMove);
  document.removeEventListener('mouseup', onThumbUp);
};

const onTrackClick = (ev: MouseEvent) => {
  if (!scrollContainer.value) return;
  const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
  const y = ev.clientY - rect.top;
  const c = state.value.client, s = state.value.scroll;
  if (s <= c) return;
  const targetTop = Math.max(0, Math.min(s - c, (y / rect.height) * s - c / 2));
  scrollContainer.value.scrollTop = targetTop;
  updateScrollState();
};
</script>

<template>
  <div class="relative">
    <button
      class="header-icon-button"
      :class="{ 'is-active': open }"
      @click.stop="toggle"
      :title="$t('logPanel.' + (open ? 'close' : 'open')) || (open ? '关闭日志' : '打开日志')"
      data-tauri-drag-region="false"
    >
      <Logs class="w-4 h-4" />
    </button>

    <Transition name="log-pop">
      <div v-if="open" class="log-popover-container">
        <div class="log-popover">
          <div class="log-header">
            <div class="log-header-title">
              <MessageSquareText class="w-4 h-4" />
              {{ $t('logPanel.title') || '日志' }}
            </div>
            <div class="log-header-actions">
              <button
                class="log-header-action"
                @click="logStore.clear()"
                :title="$t('logPanel.clear') || '清空日志'"
              >
                <Trash2 class="w-4 h-4" />
              </button>
              <button
                class="log-header-action"
                @click="open = false"
                :title="$t('common.close') || '关闭'"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div class="log-body">
            <div
              ref="scrollContainer"
              class="log-scroll"
            >
              <div v-if="entries.length === 0" class="log-empty">
                {{ $t('logPanel.empty') || '暂无日志' }}
              </div>
              <div
                v-for="e in entries"
                :key="e.id"
                class="log-entry"
              >
                <div class="log-entry-content">
                  <div class="log-entry-header">
                    <span class="log-entry-level" :class="levelBadge(e.level)">{{ e.level.toUpperCase() }}</span>
                    <span class="log-entry-time">{{ timefmt(e.timestamp) }}</span>
                  </div>
                  <div class="log-entry-message" :class="levelColor(e.level)">{{ e.message }}</div>
                  <pre v-if="e.meta" class="log-entry-meta">{{ JSON.stringify(e.meta, null, 2) }}</pre>
                </div>
                <button class="log-entry-copy" @click.stop="copyLog(e)" :title="$t('logPanel.copy') || '复制'">
                  <Copy class="w-4 h-4" />
                </button>
                <div v-if="lastCopiedId === e.id" class="log-entry-copied">
                  {{ $t('logPanel.copied') || '已复制' }}
                </div>
              </div>
            </div>
            <div
              class="log-scrollbar"
              :class="{ 'invisible': state.client <= 0 || state.scroll <= state.client }"
              @mousedown.stop.prevent="onTrackClick"
            >
              <div
                class="log-scrollbar-thumb"
                :style="{ height: thumbSize + 'px', transform: `translateY(${thumbOffset}px)` }"
                @mousedown.stop.prevent="onThumbDown"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
<style scoped>
.log-popover-container {
  position: absolute;
  right: 0;
  margin-top: 8px;
  width: min(480px, calc(100vw - 40px));
  z-index: 1050;
}
.log-popover {
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 28px 60px -18px rgba(15, 23, 42, 0.32);
  backdrop-filter: blur(12px);
  overflow: hidden;
}
.dark .log-popover {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(22, 28, 40, 0.95);
  box-shadow: 0 28px 64px -16px rgba(0, 0, 0, 0.6);
}
.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(248, 250, 255, 0.7);
}
.dark .log-header {
  border-color: rgba(148, 163, 184, 0.12);
  background: rgba(30, 41, 59, 0.55);
}
.log-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}
.dark .log-header-title {
  color: #e2e8f0;
}
.log-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.log-header-action {
  height: 30px;
  width: 30px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #64748b;
  transition: background 0.18s ease, color 0.18s ease;
}
.log-header-action:hover {
  background: rgba(148, 163, 184, 0.18);
  color: #1e293b;
}
.dark .log-header-action {
  color: rgba(226, 232, 240, 0.85);
}
.dark .log-header-action:hover {
  background: rgba(148, 163, 184, 0.18);
  color: #f8fafc;
}
.log-body {
  position: relative;
  max-height: min(60vh, 520px);
}
.log-scroll {
  padding: 16px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: inherit;
  scrollbar-width: none;
}
.log-scroll::-webkit-scrollbar {
  display: none;
}
.log-empty {
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
  padding: 28px 0;
}
.dark .log-empty {
  color: #cbd5f5;
}
.log-entry {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(248, 250, 255, 0.85);
  padding: 12px 14px;
}
.dark .log-entry {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(30, 41, 59, 0.65);
}
.log-entry-content {
  flex: 1 1 auto;
  min-width: 0;
}
.log-entry-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.log-entry-level {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.08em;
}
.log-entry-time {
  font-size: 11px;
  color: #94a3b8;
}
.dark .log-entry-time {
  color: rgba(148, 163, 184, 0.75);
}
.log-entry-message {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-all;
}
.log-entry-meta {
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-all;
}
.dark .log-entry-meta {
  color: #cbd5f5;
}
.log-entry-copy {
  flex: 0 0 auto;
  color: #94a3b8;
  transition: color 0.18s ease;
}
.log-entry-copy:hover {
  color: #1e293b;
}
.dark .log-entry-copy {
  color: rgba(226, 232, 240, 0.7);
}
.dark .log-entry-copy:hover {
  color: #f8fafc;
}
.log-entry-copied {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.85);
  color: #ffffff;
}
.log-scrollbar {
  position: absolute;
  top: 12px;
  right: 8px;
  width: 8px;
  bottom: 12px;
  pointer-events: auto;
}
.log-scrollbar::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 4px;
  background: transparent;
}
.log-scrollbar-thumb {
  position: absolute;
  left: 0;
  right: 0;
  width: 8px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.65);
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.log-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.9);
}
.dark .log-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.5);
}
.dark .log-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.75);
}
.log-pop-enter-active,
.log-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.log-pop-enter-from,
.log-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
.log-pop-enter-active .log-popover,
.log-pop-leave-active .log-popover {
  transform-origin: top right;
}
</style>
