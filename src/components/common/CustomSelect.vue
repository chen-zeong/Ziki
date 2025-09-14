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
          <ul class="py-1 text-xs text-gray-700 dark:text-gray-200 space-y-1">
            <li
              v-for="opt in visibleOptions"
              :key="opt.value"
              :class="[
                'px-3 py-2 flex items-start gap-2 cursor-pointer rounded-md mx-1',
                opt.value === props.modelValue ? 'bg-amber-50 dark:bg-[#1a1405] text-amber-700 dark:text-amber-400' : 'hover:bg-gray-100 dark:hover:bg-[#1c1c1c]'
              ]"
              @click.stop="selectOption(opt.value)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="truncate font-semibold opacity-80">{{ opt.label }}</span>
                  <div v-if="opt.tags && opt.tags.length" class="flex flex-wrap gap-1 ml-1.5">
                    <span
                      v-for="(tag, idx) in opt.tags.slice(0, 2)"
                      :key="tag + idx"
                      class="px-1.5 py-0 rounded-full text-[10px] leading-[16px] font-medium text-gray-500 dark:text-gray-400 ring-1 ring-inset ring-gray-300/60 dark:ring-white/15 bg-transparent"
                    >
                      {{ tag }}
                    </span>
                    <span v-if="opt.tags.length > 2" class="px-1.5 py-0 rounded-full text-[10px] leading-[16px] font-medium text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300/50 dark:ring-white/10 bg-transparent">+{{ opt.tags.length - 2 }}</span>
                  </div>
                </div>
              </div>
              <Check v-if="opt.value === props.modelValue" class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
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
          <ul class="py-1 text-xs text-gray-700 dark:text-gray-200 space-y-1">
            <li
              v-for="opt in visibleOptions"
              :key="opt.value"
              :class="[
                'px-3 py-2 flex items-start gap-2 cursor-pointer rounded-md mx-1',
                opt.value === props.modelValue ? 'bg-amber-50 dark:bg-[#1a1405] text-amber-700 dark:text-amber-400' : 'hover:bg-gray-100 dark:hover:bg-[#1c1c1c]'
              ]"
              @click.stop="selectOption(opt.value)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="truncate font-semibold opacity-80">{{ opt.label }}</span>
                  <div v-if="opt.tags && opt.tags.length" class="flex flex-wrap gap-1 ml-1.5">
                    <span
                      v-for="(tag, idx) in opt.tags.slice(0, 2)"
                      :key="tag + idx"
                      class="px-1.5 py-0 rounded-full text-[10px] leading-[16px] font-medium text-gray-500 dark:text-gray-400 ring-1 ring-inset ring-gray-300/60 dark:ring-white/15 bg-transparent"
                    >
                      {{ tag }}
                    </span>
                    <span v-if="opt.tags.length > 2" class="px-1.5 py-0 rounded-full text-[10px] leading-[16px] font-medium text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300/50 dark:ring-white/10 bg-transparent">+{{ opt.tags.length - 2 }}</span>
                  </div>
                </div>
              </div>
              <Check v-if="opt.value === props.modelValue" class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
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

    // 按方向计算可用高度，并裁剪 maxHeight
    const available = useUp ? spaceAbove : spaceBelow;
    const maxH = Math.max(0, Math.min(desiredMax, available));

    const top = useUp
      ? (rect.top - maxH - GAP)
      : (rect.bottom + GAP);

    menuStyle.value = {
      minWidth: rect.width + 'px',
      width: rect.width + 'px',
      left: rect.left + 'px',
      top: Math.round(top) + 'px',
      maxHeight: Math.round(maxH) + 'px'
    };
  });
}

function toggleDropdown() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(() => {
      computePosition();
      window.addEventListener('scroll', computePosition, true);
      window.addEventListener('resize', computePosition);

      // 仅在打开时观察下拉内容尺寸变化
      if (!resizeObserver && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => computePosition());
      }
      if (resizeObserver && dropdownRef.value) {
        resizeObserver.observe(dropdownRef.value);
      }
    });
  } else {
    window.removeEventListener('scroll', computePosition, true);
    window.removeEventListener('resize', computePosition);
    if (resizeObserver && dropdownRef.value) {
      resizeObserver.unobserve(dropdownRef.value);
    }
  }
}

function closeDropdown() {
  isOpen.value = false;
  window.removeEventListener('scroll', computePosition, true);
  window.removeEventListener('resize', computePosition);
  if (resizeObserver && dropdownRef.value) {
    resizeObserver.unobserve(dropdownRef.value);
  }
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