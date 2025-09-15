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
      class="relative h-6 w-6 flex items-center justify-center text-gray-600 dark:text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-border rounded-md transition-colors"
      @click.stop="toggle"
      :title="open ? '关闭日志' : '打开日志'"
    >
      <Logs class="w-4 h-4" />
      <span v-if="logStore.hasUnread && !open" class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
    </button>

    <!-- Floating Panel -->
    <transition name="fade-slide">
      <div v-if="open" class="absolute right-0 mt-2 w-[460px] max-h-[60vh] bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#262626]">
          <div class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <MessageSquareText class="w-4 h-4" />
            日志
          </div>
          <div class="flex items-center gap-1">
            <button
              class="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#333]"
              @click="logStore.clear()"
              title="清空日志"
            >
              <Trash2 class="w-4 h-4" />
            </button>
            <button
              class="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-[#333]"
              @click="open = false"
              title="关闭"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div class="relative">
          <div
            ref="scrollContainer"
            class="p-3 space-y-2 overflow-auto max-h-[50vh] custom-scroll-area"
          >
            <div v-if="entries.length === 0" class="text-center text-sm text-gray-500 dark:text-gray-400 py-6">暂无日志</div>
            <div
              v-for="e in entries"
              :key="e.id"
              class="relative rounded-lg border border-gray-100 dark:border-gray-800 p-2.5 bg-white/60 dark:bg-white/5"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] px-1.5 py-0.5 rounded-md font-medium" :class="levelBadge(e.level)">{{ e.level.toUpperCase() }}</span>
                    <span class="text-xs text-gray-400">{{ timefmt(e.timestamp) }}</span>
                  </div>
                  <div class="mt-1 text-sm leading-relaxed break-all" :class="levelColor(e.level)">{{ e.message }}</div>
                  <pre v-if="e.meta" class="mt-1 text-xs text-gray-500 whitespace-pre-wrap break-all">{{ JSON.stringify(e.meta, null, 2) }}</pre>
                </div>
                <button class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" @click.stop="copyLog(e)" title="复制">
                  <Copy class="w-4 h-4" />
                </button>
              </div>
              <div v-if="lastCopiedId === e.id" class="absolute right-2 top-2 text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/90 text-white">已复制</div>
            </div>
          </div>

          <!-- 自绘滚动条（不受全局隐藏影响） -->
          <div
            class="fake-scrollbar"
            :class="{ 'invisible': state.client <= 0 || state.scroll <= state.client }"
            @mousedown.stop.prevent="onTrackClick"
          >
            <div
              class="fake-thumb"
              :style="{ height: thumbSize + 'px', transform: `translateY(${thumbOffset}px)` }"
              @mousedown.stop.prevent="onThumbDown"
            />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-slide-enter-active, .fade-slide-leave-active { transition: all .18s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(-6px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-6px); }

/* 允许该区域显示滚动条（覆盖全局）且作为第三方风格容器 */
.custom-scroll-area {
  scrollbar-width: none !important; /* Firefox 隐藏原生，使用自绘 */
}
.custom-scroll-area::-webkit-scrollbar { display: none !important; }

/* 自绘滚动条容器 */
.fake-scrollbar {
  position: absolute;
  top: 0;
  right: 2px;
  width: 8px;
  height: 100%;
  pointer-events: auto;
  z-index: 10;
}

/* 轨道 */
.fake-scrollbar::before {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background: transparent;
  border-radius: 4px;
}

/* 滑块 */
.fake-thumb {
  position: absolute;
  top: 0; right: 0; left: 0;
  width: 8px;
  background: rgba(156, 163, 175, 0.6); /* gray-400 */
  border-radius: 4px;
  transition: background-color .2s ease;
  cursor: pointer;
}
.fake-thumb:hover { background: rgba(156, 163, 175, 0.8); }

:host(.dark) .fake-thumb, .dark .fake-thumb {
  background: rgba(75, 85, 99, 0.6); /* gray-600 */
}
:host(.dark) .fake-thumb:hover, .dark .fake-thumb:hover {
  background: rgba(75, 85, 99, 0.8);
}
</style>