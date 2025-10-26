<template>
  <div class="px-4 pb-4 flex items-center justify-between flex-shrink-0" :class="isWindows ? 'pt-4' : 'pt-8'">
    <!-- 左侧工具栏按钮 -->
    <div class="flex items-center gap-2">
      <button
        class="flex items-center gap-1.5 h-8 px-3 rounded-xl text-sm font-medium transition-colors duration-200 bg-white dark:bg-white/10 border border-slate-200/70 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:border-[var(--brand-primary)]/45 hover:text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/60"
        @click="handleAddFiles"
        :title="t('toolbar.addFiles')"
      >
        <Plus class="w-4 h-4" />
        <span>{{ t('toolbar.addFiles') }}</span>
      </button>

      <button
        class="flex items-center gap-1.5 h-8 px-3 rounded-xl text-sm font-medium transition-colors duration-200 text-red-500 dark:text-red-300 border border-slate-200/70 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-red-50/80 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:opacity-40 disabled:pointer-events-none"
        @click="handleClearAllTasks"
        :disabled="tasks.length === 0"
        :title="t('taskList.clearAllTasks')"
      >
        <BrushCleaning class="w-4 h-4" />
        <span>{{ t('taskList.clear') }}</span>
      </button>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/60 disabled:opacity-40 disabled:pointer-events-none"
        :class="multiSelectMode ? activeMultiSelectClasses : inactiveMultiSelectClasses"
        :aria-pressed="multiSelectMode"
        :disabled="tasks.length === 0"
        @click="$emit('toggle-multi-select')"
        :title="t('taskList.multiSelect')"
      >
        <ListChecks class="w-4 h-4" aria-hidden="true" />
        <span class="sr-only">{{ t('taskList.multiSelect') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, BrushCleaning, ListChecks } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useTaskStore } from '../../stores/useTaskStore';
import type { CompressionTask } from '../../types';

const { t } = useI18n();
const taskStore = useTaskStore();

const isWindows = ref(false);
onMounted(async () => {
  try {
    const platform = await invoke<string>('get_platform');
    isWindows.value = platform === 'windows';
  } catch (e) {
    // 非 Tauri 或调用失败时保持默认（macOS/其他）样式
    isWindows.value = false;
  }
});

const props = defineProps<{
  tasks?: CompressionTask[];
  multiSelectMode?: boolean;
}>();

// 使用store中的任务数据，如果props中有tasks则使用props（向后兼容）
const tasks = computed(() => props.tasks || taskStore.tasks);

const emit = defineEmits<{
  addFiles: [];
  filesSelected: [files: FileList];
  'clear-all-tasks': [];
  toggleStatusFilter: [status: string];
  'toggle-multi-select': [];
}>();

const multiSelectMode = computed(() => !!props.multiSelectMode);
const inactiveMultiSelectClasses =
  'border-slate-200/80 bg-white text-slate-500 hover:text-[#2563eb] hover:border-[#2563eb]/45 dark:border-white/12 dark:bg-[#1f1f26] dark:text-slate-300 dark:hover:border-[#6366f1]/50 dark:hover:text-[#6366f1]';
const activeMultiSelectClasses =
  'border-[#60a5fa]/60 bg-[#e6efff] text-[#1d4ed8] shadow-[0_6px_16px_-12px_rgba(59,130,246,0.35)] hover:bg-[#d8e4ff] dark:border-[rgba(129,140,248,0.35)] dark:bg-[rgba(98,104,241,0.22)] dark:text-[#eef2ff] dark:shadow-[0_12px_28px_-18px_rgba(99,102,241,0.62)] dark:ring-1 dark:ring-inset dark:ring-[rgba(129,140,248,0.28)]';

// 清空所有任务
const handleClearAllTasks = () => {
  console.log('清空任务按钮被点击');
  emit('clear-all-tasks');
};

// 处理添加文件按钮点击
const handleAddFiles = async () => {
  try {
    // 使用 Tauri 的文件对话框选择文件
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Video and Image Files',
        extensions: ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'flv', 'm4v', 'm4s', 'm4p', 'mpg', 'mpeg', 'mpe', 'mpv', 'mp2', 'mts', 'm2ts', 'ts', '3gp', '3g2', 'asf', 'vob', 'ogv', 'ogg', 'rm', 'rmvb', 'f4v', 'f4p', 'f4a', 'f4b', 'mod', 'mxf', 'qt', 'yuv', 'amv', 'svi', 'roq', 'nsv', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'heic', 'heif', 'avif', 'jxl']
      }]
    });

    if (Array.isArray(selected) && selected.length > 0) {
      // 仿造 FileList，并附加 path 以便后续获取文件大小与类型
      const files = selected.map((filePath) => {
        const fileName = filePath.split(/\\\\|\//).pop() || 'unknown';
        const ext = (fileName.split('.').pop() || '').toLowerCase();
        const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'flv', 'm4v', 'm4s', 'm4p', 'mpg', 'mpeg', 'mpe', 'mpv', 'mp2', 'mts', 'm2ts', 'ts', '3gp', '3g2', 'asf', 'vob', 'ogv', 'ogg', 'rm', 'rmvb', 'f4v', 'f4p', 'f4a', 'f4b', 'mod', 'mxf', 'qt', 'yuv', 'amv', 'svi', 'roq', 'nsv'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'heic', 'heif', 'avif', 'jxl'];
        let mimeType = 'application/octet-stream';
        if (videoExts.includes(ext)) {
          mimeType = `video/${ext === 'mov' ? 'quicktime' : ext === 'wmv' ? 'x-ms-wmv' : ext === 'avi' ? 'x-msvideo' : ext === '3gp' ? '3gpp' : ext === 'ogv' ? 'ogg' : ext}`;
        } else if (imageExts.includes(ext)) {
          mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        }
        const mockFile = new File([], fileName, { type: mimeType });
        (mockFile as any).path = filePath;
        return mockFile;
      });
      const fileList = {
        item: (index: number) => files[index] || null,
        ...files,
        length: files.length
      } as FileList;
      emit('filesSelected', fileList);
    } else {
      // 兼容老的上传通道
      emit('addFiles');
    }
  } catch (error) {
    console.error('Failed to open file dialog:', error);
    // 回退到旧的文件选择逻辑（如果有）
    emit('addFiles');
  }
};
// 切换状态筛选
const toggleStatusFilter = (status: string) => {
  emit('toggleStatusFilter', status);
};
</script>
