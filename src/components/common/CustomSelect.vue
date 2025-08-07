<template>
  <div class="relative" ref="selectRef">
    <button
      type="button"
      class="relative w-full cursor-pointer rounded-lg bg-white dark:bg-gray-800 py-2 pl-3 pr-8 text-left border border-gray-200 dark:border-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all duration-200"
      style="pointer-events: auto !important; user-select: auto !important;"
      @click.stop="toggleDropdown"
      :class="{
        'ring-2 ring-amber-500 border-amber-500': isOpen
      }"
    >
      <span class="block truncate text-gray-900 dark:text-gray-100 font-medium">
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
        class="absolute z-[99999] mt-2 w-full rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 max-h-60 overflow-auto custom-scrollbar"
        style="pointer-events: auto !important; user-select: auto !important;"
      >
        <div class="py-1">
          <div
            v-for="option in options"
            :key="option.value"
            class="relative cursor-pointer select-none py-2.5 mx-2 px-3 text-gray-900 dark:text-gray-100 hover:bg-amber-50 dark:hover:bg-gray-700 transition-colors duration-150 rounded-lg my-1"
            :class="{
              'bg-amber-100 dark:bg-gray-700 text-amber-900 dark:text-amber-200': option.value === modelValue
            }"
            style="pointer-events: auto !important; user-select: auto !important;"
            @click.stop="selectOption(option)"
          >
            <span class="block truncate font-medium">
              {{ option.label }}
            </span>
            <span
              v-if="option.value === modelValue"
              class="absolute inset-y-0 right-0 flex items-center pr-4 text-amber-600 dark:text-amber-400"
            >
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface Option {
  value: string;
  label: string;
}

interface Props {
  modelValue: string;
  options: Option[];
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择...'
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