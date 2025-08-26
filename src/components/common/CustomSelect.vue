<template>
  <div class="relative" ref="selectRef">
    <button
      type="button"
      class="relative w-full h-10 cursor-pointer rounded-lg py-2 pl-3 pr-8 text-left border transition-all duration-200 custom-select-button"
      :class="{
        'custom-select-focused': isOpen,
        'opacity-60 cursor-not-allowed': props.disabled
      }"
      :disabled="props.disabled"
      style="pointer-events: auto !important; user-select: auto !important;"
      @click.stop="toggleDropdown"
    >
      <span class="block truncate text-sm custom-select-text">
        {{ selectedOption?.label || placeholder }}
      </span>
      <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <svg
          class="h-5 w-5 text-gray-400 transition-transform duration-200"
          :class="{ 'rotate-180': isOpen }"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </span>
    </button>

    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute z-[99999] w-full rounded-lg border border-gray-200 dark:border-dark-border overflow-auto custom-scrollbar bg-white dark:bg-[#232529]"
        :class="{
          'mt-2': dropdownDirection === 'down',
          'mb-2 bottom-full': dropdownDirection === 'up'
        }"
        :style="{ 
          maxHeight: Math.min(options.length, 4) * 40 + 16 + 'px'
        }"
        style="pointer-events: auto !important; user-select: auto !important;"
      >
        <div class="py-1">
          <div
            v-for="option in options"
            :key="option.value"
            class="relative cursor-pointer select-none py-2.5 mx-2 px-3 text-gray-900 dark:text-dark-text hover:bg-amber-50 dark:hover:bg-dark-border transition-colors duration-150 rounded-lg my-1"
            :class="{
              'bg-amber-100 dark:bg-[#4a4a4a] text-amber-900 dark:text-dark-accent': option.value === modelValue
            }"
            style="pointer-events: auto !important; user-select: auto !important;"
            @click.stop="selectOption(option)"
          >
            <span class="block truncate text-sm">
              {{ option.label }}
            </span>
            <span
              v-if="option.value === modelValue"
              class="absolute inset-y-0 right-0 flex items-center pr-4 text-amber-600 dark:text-dark-accent"
            >
              <Check class="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Check } from 'lucide-vue-next';

interface Option {
  value: string;
  label: string;
}

interface Props {
  modelValue: string;
  options: Option[];
  placeholder?: string;
  dropdownDirection?: 'down' | 'up';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择...',
  dropdownDirection: 'down',
  disabled: false
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
const isOpen = ref(false);
const selectRef = ref<HTMLElement>();

const selectedOption = computed(() => {
  return props.options.find(option => option.value === props.modelValue);
});

const toggleDropdown = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
};

const selectOption = (option: Option) => {
  emit('update:modelValue', option.value);
  isOpen.value = false;
};

const handleClickOutside = (event: Event) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
/* 确保CustomSelect组件可以正常交互 */
.relative {
  user-select: auto !important;
  -webkit-user-select: auto !important;
  -moz-user-select: auto !important;
  -ms-user-select: auto !important;
  pointer-events: auto !important;
}

.relative * {
  user-select: auto !important;
  -webkit-user-select: auto !important;
  -moz-user-select: auto !important;
  -ms-user-select: auto !important;
  pointer-events: auto !important;
}

/* 自定义搜索框样式 */
.custom-select-button {
  background-color: #f6f6f6;
  border-color: #dcdcdc;
  color: #2c3e50;
}

.custom-select-text {
  color: #2c3e50;
}

.custom-select-text::placeholder {
  color: #7f8c8d;
}

.custom-select-button:hover {
  border-color: #a0a0a0;
}

.custom-select-focused {
  border-color: #a0a0a0 !important;
  box-shadow: 0 0 0 3px rgba(160, 160, 160, 0.3) !important;
}

/* 夜间模式样式 */
.dark .custom-select-button {
  background-color: #232529;
  border-color: #383A3F;
  color: #E1E3E8;
}

.dark .custom-select-text {
  color: #E1E3E8;
}

.dark .custom-select-text::placeholder {
  color: #969BAD;
}

.dark .custom-select-button:hover {
  border-color: #60687A;
}

.dark .custom-select-focused {
  border-color: #60687A !important;
  box-shadow: 0 0 0 3px rgba(120, 130, 150, 0.35) !important;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f8fafc;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

.dark .custom-scrollbar {
  scrollbar-color: #6b7280 #1f2937;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>