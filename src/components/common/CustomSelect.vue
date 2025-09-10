<template>
  <div :class="['relative', containerClass]" ref="triggerRef">
    <!-- 触发按钮 -->
    <button
      type="button"
      class="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-dark-border rounded-md px-3 py-2 text-left shadow-sm hover:bg-gray-50 dark:hover:bg-[#151515] focus:outline-none focus:ring-2 focus:ring-amber-500 relative pr-9"
      @click.stop="toggleDropdown"
    >
      <span :class="['block truncate', isPlaceholder ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200']">{{ selectedLabel || placeholder }}</span>
      <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
    </button>

    <!-- Teleport 到 body，避免被父容器裁剪 -->
    <teleport v-if="teleportToBody" to="body">
      <!-- 点击遮罩 -->
      <div v-show="isOpen" class="fixed inset-0 z-[9998]" @click="closeDropdown"></div>
      <!-- 下拉容器（fixed + 计算定位） -->
      <transition name="fade-scale">
        <div
          v-show="isOpen"
          ref="dropdownRef"
          class="fixed z-[9999] bg-white dark:bg-[#111111] border border-gray-200 dark:border-dark-border rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10 overflow-auto"
          :style="menuStyle"
        >
          <ul class="py-1 text-sm text-gray-700 dark:text-gray-200 space-y-1">
            <li
              v-for="opt in visibleOptions"
              :key="opt.value"
              :class="[
                'px-3 py-2 flex items-center justify-between cursor-pointer rounded-md mx-1',
                opt.value === props.modelValue ? 'bg-amber-50 dark:bg-[#1a1405] text-amber-700 dark:text-amber-400' : 'hover:bg-gray-100 dark:hover:bg-[#1c1c1c]'
              ]"
              @click.stop="selectOption(opt.value)"
            >
              <span class="truncate">{{ opt.label }}</span>
              <Check v-if="opt.value === props.modelValue" class="w-4 h-4 text-amber-500" />
            </li>
          </ul>
        </div>
      </transition>
    </teleport>

    <!-- 非 Teleport 模式（相对定位） -->
    <div v-else>
      <div v-show="isOpen" class="fixed inset-0 z-40" @click="closeDropdown"></div>
      <transition name="fade-scale">
        <div
          v-show="isOpen"
          ref="dropdownRef"
          class="absolute z-50 w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-dark-border rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10 max-h-60 overflow-auto"
          :class="dropdownDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'"
        >
          <ul class="py-1 text-sm text-gray-700 dark:text-gray-200 space-y-1">
            <li
              v-for="opt in visibleOptions"
              :key="opt.value"
              :class="[
                'px-3 py-2 flex items-center justify-between cursor-pointer rounded-md mx-1',
                opt.value === props.modelValue ? 'bg-amber-50 dark:bg-[#1a1405] text-amber-700 dark:text-amber-400' : 'hover:bg-gray-100 dark:hover:bg-[#1c1c1c]'
              ]"
              @click.stop="selectOption(opt.value)"
            >
              <span class="truncate">{{ opt.label }}</span>
              <Check v-if="opt.value === props.modelValue" class="w-4 h-4 text-amber-500" />
            </li>
          </ul>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, type CSSProperties } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';

interface Option { value: string; label: string }

interface Props {
  options: Option[];
  modelValue?: string;
  placeholder?: string;
  dropdownDirection?: 'up' | 'down';
  teleportToBody?: boolean;
  maxVisibleOptions?: number;
  containerClass?: string;
  strictDirection?: boolean; // 新增：严格遵循方向，不触发自动翻转
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  placeholder: '请选择',
  dropdownDirection: 'down',
  teleportToBody: false,
  maxVisibleOptions: 6,
  containerClass: '',
  strictDirection: false
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const menuStyle = ref<CSSProperties>({});

const selectedLabel = computed(() => {
  const opt = props.options.find(o => o.value === props.modelValue);
  return opt?.label || '';
});
const isPlaceholder = computed(() => !selectedLabel.value);

// 不再截断 options，使用 maxHeight 控制可视数量
const visibleOptions = computed(() => props.options);

function computePosition() {
  const el = triggerRef.value;
  const menu = dropdownRef.value;
  if (!el || !menu) return;
  const rect = el.getBoundingClientRect();

  // 先设置最小宽度，避免换行引发尺寸抖动
  menuStyle.value.minWidth = rect.width + 'px';
  menuStyle.value.width = rect.width + 'px';
  menuStyle.value.left = rect.left + 'px';
  // 默认向下展开，渲染后再根据实际高度纠正
  menuStyle.value.top = rect.bottom + 4 + 'px';

  nextTick(() => {
    // 量测单项高度，计算所需 maxHeight，确保第 N 项完整可见
    const firstItem = menu.querySelector('li') as HTMLElement | null;
    const itemH = firstItem ? firstItem.getBoundingClientRect().height : 36; // 兜底 36px
    const spacing = Math.max(0, (props.maxVisibleOptions - 1)) * 4; // space-y-1 => 4px * (N-1)
    const padding = 8; // ul: py-1 => 8px
    const border = 2; // 上下边框约 2px
    const desiredMax = itemH * props.maxVisibleOptions + spacing + padding + border + 2; // +2 余量防裁剪

    const viewportMax = window.innerHeight - 24; // 距离视窗边缘预留
    menuStyle.value.maxHeight = Math.min(desiredMax, viewportMax) + 'px';

    // 根据是否溢出决定向上展开；当 strictDirection=true 时，忽略自动翻转
    const menuRect = menu.getBoundingClientRect();
    const h = menuRect.height || desiredMax;
    const wantUp = props.dropdownDirection === 'up';
    const overflowDown = rect.bottom + 4 + h > window.innerHeight - 8;
    if (wantUp || (!props.strictDirection && overflowDown)) {
      const top = Math.max(8, rect.top - h - 4);
      menuStyle.value.top = top + 'px';
    } else {
      // 明确向下且严格遵循方向时，保持向下
      menuStyle.value.top = Math.min(window.innerHeight - h - 8, rect.bottom + 4) + 'px';
    }
  });
}

function toggleDropdown() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(() => {
      computePosition();
      window.addEventListener('scroll', computePosition, true);
      window.addEventListener('resize', computePosition);
    });
  } else {
    window.removeEventListener('scroll', computePosition, true);
    window.removeEventListener('resize', computePosition);
  }
}

function closeDropdown() {
  isOpen.value = false;
  window.removeEventListener('scroll', computePosition, true);
  window.removeEventListener('resize', computePosition);
}

function selectOption(val: string) {
  emit('update:modelValue', val);
  closeDropdown();
}

onBeforeUnmount(() => {
  window.removeEventListener('scroll', computePosition, true);
  window.removeEventListener('resize', computePosition);
});

watch(() => props.modelValue, () => {
  // 可根据需要添加联动逻辑
});
</script>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>