<template>
  <Transition
    enter-active-class="transition-all duration-500 ease-out"
    enter-from-class="max-h-0 opacity-0 transform scale-y-95"
    enter-to-class="max-h-[1000px] opacity-100 transform scale-y-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="max-h-[1000px] opacity-100 transform scale-y-100"
    leave-to-class="max-h-0 opacity-0 transform scale-y-95"
  >
    <div v-if="isExpanded" class="overflow-hidden">
      <div class="px-3 pb-4 pt-3 border-t border-white/60 dark:border-white/10 bg-white/85 dark:bg-[#1a1c25]/60 backdrop-blur-md rounded-2xl shadow-[0_12px_22px_rgba(15,23,42,0.08)] transition-all duration-300">
        
        <!-- 压缩前后对比 (仅完成的任务) -->
        <TaskComparison 
          v-if="task.status === 'completed' && task.file.metadata" 
          :task="task" 
        />
        
        <!-- 文件信息 (未完成的任务) -->
        <TaskFileInfo 
          v-else-if="task.file.metadata" 
          :task="task" 
        />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import TaskComparison from './TaskComparison.vue';
import TaskFileInfo from './TaskFileInfo.vue';
import type { CompressionTask } from '../../types';

interface Props {
  task: CompressionTask;
  isExpanded: boolean;
}

const props = defineProps<Props>();
</script>
