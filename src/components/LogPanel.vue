<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { useLogStore } from '../stores/useLogStore';
import { MessageSquareText, X, Trash2, MessageSquareCode, Logs } from 'lucide-vue-next';
import { useGlobalSettingsStore } from '../stores/useGlobalSettingsStore';

const logStore = useLogStore();
const global = useGlobalSettingsStore();

const open = ref(false);
const scrollContainer = ref<HTMLElement>();

const toggle = () => {
  open.value = !open.value;
  if (open.value) {
    logStore.markAllRead();
    nextTick(() => scrollToBottom());
  }
};

const scrollToBottom = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
};

onMounted(() => {
  // mark read when opened
  watch(open, (v) => { if (v) logStore.markAllRead(); });
});

const entries = computed(() => logStore.orderedLogs);

// 监听日志变化，自动滚动到底部
watch(entries, () => {
  if (open.value) {
    nextTick(() => scrollToBottom());
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
        <div ref="scrollContainer" class="p-3 space-y-2 overflow-auto custom-scrollbar max-h-[50vh]">
          <div v-if="entries.length === 0" class="text-center text-sm text-gray-500 dark:text-gray-400 py-6">暂无日志</div>
          <div v-for="e in entries" :key="e.id" class="rounded-lg border border-gray-100 dark:border-gray-800 p-2.5 bg-white/60 dark:bg-white/5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-[11px] px-1.5 py-0.5 rounded-md font-medium" :class="levelBadge(e.level)">{{ e.level.toUpperCase() }}</span>
                  <span class="text-xs text-gray-400">{{ timefmt(e.timestamp) }}</span>
                </div>
                <div class="mt-1 text-sm leading-relaxed break-all" :class="levelColor(e.level)">{{ e.message }}</div>
                <pre v-if="e.meta" class="mt-1 text-xs text-gray-500 whitespace-pre-wrap break-all">{{ JSON.stringify(e.meta, null, 2) }}</pre>
              </div>
            </div>
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

/* 美化滚动条样式 */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.4) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.4);
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.6);
}

.dark .custom-scrollbar {
  scrollbar-color: rgba(75, 85, 99, 0.6) transparent;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.6);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.8);
}
</style>