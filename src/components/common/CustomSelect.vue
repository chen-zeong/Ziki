<template>
  <div :class="['relative', containerClass]" ref="triggerRef">
    <!-- 触发按钮 -->
    <button
      type="button"
      class="select-trigger w-full rounded-xl px-4 py-2.5 pr-11 text-left font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
      :class="{ 'is-open': isOpen }"
      @click.stop="toggleDropdown"
    >
      <span :class="['block truncate', isPlaceholder ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-100']">{{ selectedLabel || placeholderText }}</span>
      <ChevronDown class="select-trigger__icon absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
    </button>

    <!-- Teleport 到 body，避免被父容器裁剪 -->
    <teleport v-if="teleportToBody" to="body">
      <div v-if="isOpen" class="fixed inset-0 z-[9998]" @click="closeDropdown"></div>
      <transition name="fade-scale">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="select-dropdown fixed z-[9999] overflow-auto rounded-xl border border-slate-200/80 dark:border-white/10 ring-1 ring-white/40 dark:ring-white/10"
          :class="dropdownAppearanceClass"
          :style="{ ...menuStyle }"
        >
          <ul class="select-dropdown__list py-2 text-xs text-slate-600 dark:text-slate-200 space-y-1">
            <li
              v-for="opt in visibleOptions"
              :key="opt.value"
              :class="[
                'select-option px-3 py-2 flex items-start gap-2 cursor-pointer rounded-lg mx-2 transition-all duration-200',
                opt.value === props.modelValue
                  ? 'select-option--active bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] font-semibold dark:bg-[var(--brand-primary)]/24 dark:text-slate-100'
                  : 'hover:bg-slate-100 dark:hover:bg-white/10'
              ]"
              @click.stop="selectOption(opt.value)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="truncate font-medium">{{ opt.label }}</span>
                  <div v-if="opt.tags && opt.tags.length" class="flex flex-wrap gap-1 ml-1.5">
                    <span
                      v-for="(tag, idx) in opt.tags.slice(0, 2)"
                      :key="tag + idx"
                      class="px-1.5 py-0 rounded-full text-[10px] leading-[16px] font-medium text-slate-400 dark:text-slate-300 ring-1 ring-inset ring-white/50 dark:ring-white/15 bg-white/40 dark:bg-white/5"
                    >
                      {{ tag }}
                    </span>
                    <span v-if="opt.tags.length > 2" class="px-1.5 py-0 rounded-full text-[10px] leading-[16px] font-medium text-slate-400 dark:text-slate-500 ring-1 ring-inset ring-white/40 dark:ring-white/10 bg-white/30 dark:bg-white/5">+{{ opt.tags.length - 2 }}</span>
                  </div>
                </div>
              </div>
              <Check v-if="opt.value === props.modelValue" class="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
            </li>
          </ul>
        </div>
      </transition>
    </teleport>

    <!-- 非 Teleport 模式（相对定位） -->
    <div v-else>
      <div v-if="isOpen" class="fixed inset-0 z-40" @click="closeDropdown"></div>
      <transition name="fade-scale">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="select-dropdown absolute z-50 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 dark:border-dark-border ring-1 ring-black/5 dark:ring-white/10"
          :class="[dropdownAppearanceClass, dropdownDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1']"
          :style="{ backgroundColor: dropdownBackground }"
        >
          <ul class="select-dropdown__list py-2 text-xs text-slate-600 dark:text-slate-200 space-y-1">
            <li
              v-for="opt in visibleOptions"
              :key="opt.value"
              :class="[
                'select-option px-3 py-2 flex items-start gap-2 cursor-pointer rounded-lg mx-2 transition-all duration-200',
                opt.value === props.modelValue
                  ? 'select-option--active bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] font-semibold dark:bg-[var(--brand-primary)]/24 dark:text-slate-100'
                  : 'hover:bg-slate-100 dark:hover:bg-white/10'
              ]"
              @click.stop="selectOption(opt.value)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="truncate font-medium">{{ opt.label }}</span>
                  <div v-if="opt.tags && opt.tags.length" class="flex flex-wrap gap-1 ml-1.5">
                    <span
                      v-for="(tag, idx) in opt.tags.slice(0, 2)"
                      :key="tag + idx"
                      class="px-1.5 py-0 rounded-full text-[10px] leading-[16px] font-medium text-slate-400 dark:text-slate-300 ring-1 ring-inset ring-white/50 dark:ring-white/15 bg-white/40 dark:bg-white/5"
                    >
                      {{ tag }}
                    </span>
                    <span v-if="opt.tags.length > 2" class="px-1.5 py-0 rounded-full text-[10px] leading-[16px] font-medium text-slate-400 dark:text-slate-500 ring-1 ring-inset ring-white/40 dark:ring-white/10 bg-white/30 dark:bg-white/5">+{{ opt.tags.length - 2 }}</span>
                  </div>
                </div>
              </div>
              <Check v-if="opt.value === props.modelValue" class="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
            </li>
          </ul>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount, watch, type CSSProperties } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { ChevronDown, Check } from 'lucide-vue-next';
import { useGlobalSettingsStore } from '../../stores/useGlobalSettingsStore';

interface Option { value: string; label: string; description?: string; tags?: string[] }

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
  placeholder: '',
  dropdownDirection: 'down',
  teleportToBody: false,
  maxVisibleOptions: 6,
  containerClass: '',
  strictDirection: false
});

const { t } = useI18n();
const globalSettings = useGlobalSettingsStore();
const { isDarkMode } = storeToRefs(globalSettings);

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
const placeholderText = computed(() => props.placeholder || t('common.pleaseSelect'));
const dropdownBackground = computed(() =>
  isDarkMode.value ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.97)'
);
const dropdownAppearanceClass = computed(() =>
  isDarkMode.value
    ? 'select-dropdown--dark shadow-[0_28px_54px_rgba(3,7,18,0.7)]'
    : 'shadow-[0_26px_52px_rgba(15,23,42,0.15)]'
);

watch(dropdownBackground, (color) => {
  menuStyle.value = {
    ...menuStyle.value,
    backgroundColor: color
  };
});

// 不再截断 options，使用 maxHeight 控制可视数量
const visibleOptions = computed(() => props.options);

// 使用 rAF 防抖，避免多层 setTimeout/nextTick 竞态
let rafId: number | null = null;
let resizeObserver: ResizeObserver | null = null;

function computePosition() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    const el = triggerRef.value;
    const menu = dropdownRef.value;
    if (!el || !menu) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // 固定行高，避免因选中项/图标导致高度抖动
    const itemH = 36; // px
    const spacing = Math.max(0, (props.maxVisibleOptions - 1)) * 4; // space-y-1 => 4px * (N-1)
    const padding = 8; // ul: py-1 => 8px
    const border = 2; // 上下边框约 2px
    const desiredMax = itemH * props.maxVisibleOptions + spacing + padding + border;

    // 统一边距与触发器间距
    const EDGE = 8; // 视窗边距
    const GAP = 6; // 与触发器间距（确保不是接近0）

    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - EDGE);
    const spaceAbove = Math.max(0, rect.top - EDGE);

    // 方向选择
    let useUp = false;
    if (props.strictDirection) {
      useUp = props.dropdownDirection === 'up';
    } else {
      // 非严格：优先选择可用空间更大的方向
      useUp = spaceAbove > spaceBelow;
    }

    // 实际内容高度（可能小于 desiredMax）
    const naturalH = menu.scrollHeight || desiredMax;

    // 按方向计算可用高度，并裁剪高度用于定位
    const available = useUp ? spaceAbove : spaceBelow;
    const targetH = Math.max(0, Math.min(desiredMax, available, naturalH));

    const top = useUp
      ? (rect.top - targetH - GAP)
      : (rect.bottom + GAP);

    menuStyle.value = {
      minWidth: rect.width + 'px',
      width: rect.width + 'px',
      left: rect.left + 'px',
      top: Math.round(top) + 'px',
      maxHeight: Math.round(Math.min(desiredMax, available)) + 'px',
      backgroundColor: dropdownBackground.value
    };
  });
}

const openDropdown = () => {
  if (isOpen.value) return;
  isOpen.value = true;
  nextTick(() => {
    computePosition();
    window.addEventListener('scroll', computePosition, true);
    window.addEventListener('resize', computePosition);

    if (!resizeObserver && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => computePosition());
    }
    if (resizeObserver && dropdownRef.value) {
      resizeObserver.observe(dropdownRef.value);
    }
  });
};

const closeDropdown = () => {
  if (!isOpen.value) return;
  isOpen.value = false;
  window.removeEventListener('scroll', computePosition, true);
  window.removeEventListener('resize', computePosition);
  if (resizeObserver && dropdownRef.value) {
    resizeObserver.unobserve(dropdownRef.value);
  }
};

function toggleDropdown() {
  isOpen.value ? closeDropdown() : openDropdown();
}

function selectOption(val: string) {
  emit('update:modelValue', val);
  closeDropdown();
}

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener('scroll', computePosition, true);
  window.removeEventListener('resize', computePosition);
});

// 移除对 modelValue/options 的多处监听，交由 ResizeObserver + 打开时初始化来保证稳定定位
</script>

<style scoped>
.select-trigger {
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.42);
  color: #1e293b;
}

.select-trigger:hover,
.select-trigger.is-open {
  border-color: rgba(99, 102, 241, 0.48);
  background: rgba(238, 242, 255, 0.9);
}

.select-trigger__icon {
  color: rgba(100, 116, 139, 0.72);
}

.select-dropdown {
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(18px);
  transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.select-dropdown__list {
  background: transparent;
  border-radius: inherit;
}

.select-dropdown--dark {
  background: rgba(15, 23, 42, 0.96);
  border-color: rgba(71, 85, 105, 0.42);
}

:global(.dark) .select-trigger {
  background: rgba(14, 17, 26, 0.96);
  border-color: rgba(71, 85, 105, 0.45);
  color: #f8fafc;
}

:global(.dark) .select-trigger:hover,
:global(.dark) .select-trigger.is-open {
  border-color: rgba(148, 163, 184, 0.34);
  background: rgba(21, 25, 36, 0.94);
}

:global(.dark) .select-dropdown {
  background: rgba(15, 23, 42, 0.96);
  border-color: rgba(71, 85, 105, 0.38);
}

:global(.dark) .select-dropdown__list {
  background: rgba(15, 23, 42, 0.96);
  border-radius: inherit;
}

:global(.dark) .select-trigger__icon {
  color: rgba(203, 213, 225, 0.78);
}

:global(.dark) .select-dropdown .select-option {
  color: rgba(226, 232, 240, 0.9);
}

:global(.dark) .select-dropdown .select-option--active {
  background: rgba(94, 104, 128, 0.28);
  color: #f8fafc;
}
</style>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  transform-origin: top;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}
</style>
