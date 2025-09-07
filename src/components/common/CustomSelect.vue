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

    <!-- Teleport 模式（避免被遮挡） -->
    <Teleport v-if="isOpen" to="body">
      <div
        class="fixed z-[99999]"
        :style="{ top: dropdownPos.top + 'px', left: dropdownPos.left + 'px', width: dropdownPos.width + 'px', height: dropdownPos.height + 'px' }"
        @click.stop
      >
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
            ref="dropdownRef"
            class="absolute w-full rounded-lg border border-gray-200 dark:border-dark-border overflow-auto custom-scrollbar bg-white dark:bg-[#232529]"
            :class="{
              'top-full mt-2': dropdownDirection === 'down',
              'bottom-full mb-2': dropdownDirection === 'up'
            }"
            :style="{ maxHeight: (Math.min(options.length, props.maxVisibleOptions) * (computedItemHeight + 4) + 12) + 'px' }"
            style="pointer-events: auto !important; user-select: auto !important;"
          >
            <div class="py-1">
              <div
                v-for="option in options"
                :key="option.value"
                class="relative cursor-pointer select-none py-2.5 mx-2 px-3 text-gray-900 dark:text-dark-text hover:bg-amber-50 dark:hover:bg-dark-border transition-colors duration-150 rounded-lg my-1"
                data-option-item
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
    </Teleport>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
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
  maxVisibleOptions?: number;
  teleportToBody?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择...',
  dropdownDirection: 'down',
  disabled: false,
  maxVisibleOptions: 4,
  teleportToBody: true
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
const isOpen = ref(false);
const selectRef = ref<HTMLElement>();
const dropdownRef = ref<HTMLElement>();
const dropdownPos = ref({ top: 0, left: 0, width: 0, height: 0 });
const computedItemHeight = ref(48); // 估算项高度，打开后用实际测量覆盖

const selectedOption = computed(() => {
  return props.options.find(option => option.value === props.modelValue);
});

const updateDropdownFixedPos = () => {
  if (!selectRef.value) return;
  const rect = selectRef.value.getBoundingClientRect();
  dropdownPos.value = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
};

const computeItemHeight = () => {
  if (!dropdownRef.value) return;
  const el = dropdownRef.value.querySelector('[data-option-item]') as HTMLElement | null;
  if (!el) return;
  const styles = window.getComputedStyle(el);
  const height = el.getBoundingClientRect().height;
  // 不将上下 margin 计入单项高度，防止计算溢出导致显示 4.5 项
  computedItemHeight.value = Math.ceil(height);
};

const toggleDropdown = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    updateDropdownFixedPos();
    window.addEventListener('scroll', updateDropdownFixedPos, true);
    window.addEventListener('resize', updateDropdownFixedPos);
    nextTick(() => computeItemHeight());
    window.addEventListener('resize', computeItemHeight);
  } else {
    window.removeEventListener('scroll', updateDropdownFixedPos, true);
    window.removeEventListener('resize', updateDropdownFixedPos);
    window.removeEventListener('resize', computeItemHeight);
  }
};

const selectOption = (option: Option) => {
  emit('update:modelValue', option.value);
  isOpen.value = false;
  window.removeEventListener('scroll', updateDropdownFixedPos, true);
  window.removeEventListener('resize', updateDropdownFixedPos);
  window.removeEventListener('resize', computeItemHeight);
};

const handleClickOutside = (event: Event) => {
  const target = event.target as Node;
  // 如果点击发生在 Teleport 的下拉框内部，不关闭
  if (dropdownRef.value && dropdownRef.value.contains(target)) {
    return;
  }
  if (selectRef.value && !selectRef.value.contains(target)) {
    isOpen.value = false;
    window.removeEventListener('scroll', updateDropdownFixedPos, true);
    window.removeEventListener('resize', updateDropdownFixedPos);
    window.removeEventListener('resize', computeItemHeight);
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('scroll', updateDropdownFixedPos, true);
  window.removeEventListener('resize', updateDropdownFixedPos);
  window.removeEventListener('resize', computeItemHeight);
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
  background-color: #f3f4f6;
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