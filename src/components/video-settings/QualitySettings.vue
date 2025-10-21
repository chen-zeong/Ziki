<template>
  <div :class="['quality-settings-shell transition-all duration-300', shellClasses]">
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-200">
          {{ t('videoSettings.quality') }}
        </label>
        <span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border border-slate-200/80 dark:border-white/15 text-slate-600 dark:text-slate-100">
          {{ qualityText }}
        </span>
      </div>

      <div class="relative mt-3 pt-0.5 pb-0">
        <div class="slider-shell">
          <div class="slider-track">
            <div
              class="slider-default-marker"
              :style="{ left: `calc(${defaultSliderPosition}% - 1px)` }"
            ></div>
            <div
              class="slider-fill"
              :style="{ width: qualityValue + '%' }"
            ></div>
          </div>
          <div
            class="slider-thumb"
            :class="{ 'is-active': showTooltip }"
            :style="{ left: `calc(${qualityValue}% - 14px)` }"
          >
            <span class="thumb-core"></span>
            <span class="thumb-ring"></span>
          </div>
          <div
            class="slider-tooltip"
            :class="{ 'slider-tooltip--visible': showTooltip }"
            :style="{ left: qualityValue + '%' }"
          >
            <div class="tooltip-bubble">
              {{ currentParamDisplay }}
            </div>
          </div>
        </div>

        <input
          id="quality-slider"
          v-model.number="qualityValue"
          type="range"
          min="2"
          max="98"
          step="1"
          class="slider-input"
          @input="updateQualityState"
          @mouseenter="showTooltip = true"
          @mouseleave="showTooltip = false"
          @mousedown="showTooltip = true"
          @mouseup="showTooltip = false"
          @touchstart.passive="showTooltip = true"
          @touchend.passive="showTooltip = false"
        />
      </div>

      <div class="pt-2 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200">
            {{ t('videoSettings.colorDepth') }}
          </span>
          <span class="text-xs text-slate-500 dark:text-slate-300">{{ bitDepthText }}</span>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="depth in [8, 10, 12]"
            :key="depth"
            class="h-9 rounded-md border text-xs font-medium transition-colors"
            :class="bitDepthButtonClass(depth)"
            :disabled="!canUseDepth(depth)"
            :title="bitDepthTooltip(depth)"
            @click="setBitDepth(depth as 8 | 10 | 12)"
          >
            {{ depth }}bit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject, nextTick } from 'vue';
import type { CompressionSettings } from '../../types';
import {
  getEncoderQualityParam,
  getDefaultQualityParam,
  QUALITY_LEVELS
} from '../../config/qualityMappings';
import { useI18n } from 'vue-i18n';

const currentFile = inject<{ value: any }>('currentFile');
const { t } = useI18n();

interface Props {
  modelValue: Partial<CompressionSettings>;
  resolution?: string;
  isHardwareAccelerated?: boolean;
  currentVideoCodec?: string;
  withCardShell?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isHardwareAccelerated: false,
  currentVideoCodec: '',
  withCardShell: true
});

const emit = defineEmits<{
  'update:modelValue': [value: Partial<CompressionSettings>];
}>();

const shellClasses = computed(() =>
  props.withCardShell
    ? 'p-4 rounded-xl bg-white dark:bg-[#222221] border border-slate-200/70 dark:border-white/10'
    : 'p-0 bg-transparent border-0 shadow-none'
);

const qualityValue = ref(80);
const showTooltip = ref(false);
const selectedBitDepth = ref<8 | 10 | 12>(8);
const isInternalModelUpdate = ref(false);

const getOriginalBitDepth = (): number => {
  const val = currentFile?.value?.metadata?.colorDepth as unknown;
  if (typeof val === 'number') return val;
  if (!val) return 8;
  const s = String(val).toLowerCase();
  if (s.includes('16')) return 16;
  if (s.includes('12')) return 12;
  if (s.includes('10')) return 10;
  if (s.includes('8')) return 8;
  const m = s.match(/(\d{1,2})/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n)) return n;
  }
  return 8;
};

const originalBitDepth = computed(() => getOriginalBitDepth());
const maxSupportedBitDepth = computed<8 | 10 | 12>(() => {
  const value = originalBitDepth.value;
  if (value >= 12) return 12;
  if (value >= 10) return 10;
  return 8;
});
const resolveBitDepth = (depth?: number | null): 8 | 10 | 12 => {
  const candidates: Array<8 | 10 | 12> = [8, 10, 12];
  if (depth && candidates.includes(depth as 8 | 10 | 12) && depth <= maxSupportedBitDepth.value) {
    return depth as 8 | 10 | 12;
  }
  const lowerCandidates = candidates.filter(d => d <= maxSupportedBitDepth.value);
  return (lowerCandidates[lowerCandidates.length - 1] ?? 8) as 8 | 10 | 12;
};

const deriveSliderFromModel = (): number => {
  const codec = props.currentVideoCodec || 'h264';
  const isHW = props.isHardwareAccelerated || false;
  const type = (props.modelValue.qualityType ?? getDefaultQualityParam(codec, isHW).paramType) as 'crf' | 'qv' | 'profile';

  let target: number | string | undefined;
  if (type === 'crf') target = props.modelValue.crfValue;
  else if (type === 'qv') target = props.modelValue.qvValue;
  else target = props.modelValue.profileValue;

  if (target === undefined || target === null) {
    return getDefaultQualityParam(codec, isHW).sliderValue;
  }

  if (type === 'profile') {
    const profiles = ['proxy', 'lt', 'standard', 'hq', '4444'];
    const idx = profiles.indexOf(String(target).toLowerCase());
    const clamped = idx >= 0 ? idx : 3;
    const level = QUALITY_LEVELS[clamped];
    return Math.round((level.range[0] + level.range[1]) / 2);
  }

  const targetNum = Number(target);
  if (Number.isNaN(targetNum)) {
    return getDefaultQualityParam(codec, isHW).sliderValue;
  }

  let bestSlider = 60;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let s = 2; s <= 98; s++) {
    const param = getEncoderQualityParam(codec, isHW, s);
    if (param.paramType !== type) continue;
    const v = Number(param.value);
    const delta = Math.abs(v - targetNum);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestSlider = s;
      if (delta === 0) break;
    }
  }
  return bestSlider;
};

const initializeSettings = () => {
  const defaults = getDefaultQualityParam(props.currentVideoCodec || 'h264', props.isHardwareAccelerated || false);
  const incomingDepth = props.modelValue.bitDepth as number | undefined;
  selectedBitDepth.value = resolveBitDepth(incomingDepth);

  qualityValue.value = deriveSliderFromModel();

  return {
    qualityType: defaults.paramType as 'crf' | 'qv' | 'profile',
    bitDepth: selectedBitDepth.value,
    ...props.modelValue
  };
};

const settings = ref<Partial<CompressionSettings>>(initializeSettings());

const computeQualityMetadata = (sliderValue: number) => {
  const value = sliderValue;
  const defaults = getDefaultQualityParam(props.currentVideoCodec || 'h264', props.isHardwareAccelerated || false);
  let labelKey = 'videoSettings.qualityVeryHigh';
  if (value <= 20) labelKey = 'videoSettings.qualityVeryLow';
  else if (value <= 40) labelKey = 'videoSettings.qualityLow';
  else if (value <= 60) labelKey = 'videoSettings.qualityMedium';
  else if (value <= 85) labelKey = 'videoSettings.qualityHigh';

  const param = getEncoderQualityParam(
    props.currentVideoCodec || 'h264',
    props.isHardwareAccelerated || false,
    sliderValue
  );

  let hint = '';
  if (param.paramType === 'crf') {
    const defaultParam = getEncoderQualityParam(
      props.currentVideoCodec || 'h264',
      props.isHardwareAccelerated || false,
      defaults.sliderValue
    );
    const delta = Number(param.value) - Number(defaultParam.value);
    const magnitude = Math.abs(delta);
    const direction = delta === 0 ? 'same' : delta < 0 ? 'better' : 'worse';
    hint = t('videoSettings.qualityChange', {
      delta: magnitude,
      direction: direction === 'better'
        ? t('videoSettings.qualityBetter')
        : direction === 'worse'
          ? t('videoSettings.qualityWorse')
          : t('videoSettings.qualitySame')
    });
  } else if (param.paramType === 'profile') {
    hint = t('videoSettings.profileHint', { profile: String(param.value).toUpperCase() });
  } else if (param.paramType === 'qv') {
    hint = t('videoSettings.qvHint', { value: param.value });
  }

  return {
    labelKey,
    param,
    hint
  };
};

// ===== 新增：模板所需的计算属性与方法 =====
const defaultSliderPosition = computed(() => {
  return getDefaultQualityParam(props.currentVideoCodec || 'h264', props.isHardwareAccelerated || false).sliderValue;
});

const qualityMeta = computed(() => computeQualityMetadata(qualityValue.value));
const qualityText = computed(() => t(qualityMeta.value.labelKey));

const currentParamDisplay = computed(() => {
  const { param } = qualityMeta.value;
  if (param.paramType === 'crf') return `CRF ${param.value}`;
  if (param.paramType === 'qv') return `-q:v ${param.value}`;
  if (param.paramType === 'profile') return `Profile ${String(param.value).toUpperCase()}`;
  return '';
});

const bitDepthText = computed(() => `${selectedBitDepth.value}bit`);
const bitDepthTooltip = (depth: number) => `${depth}bit`;

const canUseDepth = (depth: number) => {
  return [8, 10, 12].includes(depth) && depth <= maxSupportedBitDepth.value;
};

const setBitDepth = (depth: number) => {
  if (![8, 10, 12].includes(depth) || !canUseDepth(depth)) return;
  selectedBitDepth.value = depth as 8 | 10 | 12;
  const updates: Partial<CompressionSettings> = {
    ...settings.value,
    bitDepth: selectedBitDepth.value
  };
  settings.value = updates;
  isInternalModelUpdate.value = true;
  emit('update:modelValue', updates);
};

const bitDepthButtonClass = (depth: number) => {
  const isSelected = selectedBitDepth.value === depth;
  const disabled = !canUseDepth(depth);
  return [
    isSelected
      ? 'border-transparent text-white bg-[#6776ec] shadow-[0_16px_32px_-18px_rgba(103,118,236,0.65)]'
      : 'border-slate-200/80 dark:border-white/15 text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5',
    disabled
      ? 'opacity-45 cursor-not-allowed'
      : 'hover:border-[#6776ec]/45 hover:text-[#6776ec] dark:hover:border-[#6776ec]/55 dark:hover:text-[#aeb6ff]'
  ].join(' ');
};

const updateQualityState = () => {
  const param = getEncoderQualityParam(
    props.currentVideoCodec || 'h264',
    props.isHardwareAccelerated || false,
    qualityValue.value
  );

  const updates: Partial<CompressionSettings> = {
    qualityType: param.paramType as 'crf' | 'qv' | 'profile',
    bitDepth: selectedBitDepth.value
  };

  if (param.paramType === 'crf') {
    updates.crfValue = Number(param.value);
    updates.qvValue = undefined;
    updates.profileValue = undefined;
  } else if (param.paramType === 'qv') {
    updates.qvValue = Number(param.value);
    updates.crfValue = undefined;
    updates.profileValue = undefined;
  } else if (param.paramType === 'profile') {
    updates.profileValue = String(param.value);
    updates.crfValue = undefined;
    updates.qvValue = undefined;
  }

  settings.value = { ...settings.value, ...updates };
  isInternalModelUpdate.value = true;
  emit('update:modelValue', settings.value);
};

// 同步外部传入的 modelValue 到内部状态
watch(() => props.modelValue, () => {
  if (isInternalModelUpdate.value) {
    isInternalModelUpdate.value = false;
    return;
  }
  selectedBitDepth.value = resolveBitDepth(props.modelValue.bitDepth as number | undefined);
  qualityValue.value = deriveSliderFromModel();
}, { deep: true });

watch(maxSupportedBitDepth, (maxDepth) => {
  if (selectedBitDepth.value > maxDepth) {
    setBitDepth(maxDepth);
  }
});

onMounted(async () => {
  await nextTick();
  isInternalModelUpdate.value = true;
  emit('update:modelValue', settings.value);
});

</script>

<style scoped>
.slider-shell {
  position: relative;
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
}
.slider-track {
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
  overflow: hidden;
  box-shadow: inset 0 1px 1px rgba(15, 23, 42, 0.08);
}
.slider-track::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top, rgba(255, 255, 255, 0.25), transparent 65%);
  pointer-events: none;
}
.dark .slider-track {
  background: rgba(71, 85, 105, 0.45);
  box-shadow: inset 0 1px 1px rgba(2, 6, 23, 0.55);
}
.slider-default-marker {
  position: absolute;
  top: 50%;
  width: 2px;
  height: 70%;
  transform: translateY(-50%);
  background: rgba(226, 232, 240, 0.75);
  pointer-events: none;
  opacity: 0.85;
}
.dark .slider-default-marker {
  background: rgba(148, 163, 184, 0.5);
}
.slider-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(99, 102, 241, 0.92);
  transition: width 0.18s cubic-bezier(0.33, 1, 0.68, 1);
  box-shadow: 0 10px 22px -16px rgba(99, 102, 241, 0.45);
}
.slider-thumb {
  position: absolute;
  top: 50%;
  width: 26px;
  height: 26px;
  transform: translateY(-50%);
  pointer-events: none;
  transition: transform 0.18s ease, filter 0.18s ease;
}
.slider-thumb.is-active {
  transform: translateY(-50%) scale(1.08);
  filter: brightness(1.05);
}
.thumb-core {
  position: absolute;
  inset: 3px;
  border-radius: 999px;
  background: #6366f1;
  border: none;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
}
.dark .thumb-core {
  background: rgba(99, 102, 241, 0.92);
  box-shadow: 0 6px 16px rgba(2, 6, 23, 0.7);
}
.thumb-ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 2px solid rgba(99, 102, 241, 0.32);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.slider-thumb.is-active .thumb-ring {
  border-color: rgba(99, 102, 241, 0.55);
  box-shadow: none;
}
.slider-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  transform: translateX(-50%) translateY(6px) scale(0.96);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.slider-tooltip--visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}
.slider-input {
  position: absolute;
  top: -10px;
  bottom: -10px;
  left: 0;
  right: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 40;
  touch-action: none;
}
.tooltip-bubble {
  position: relative;
  background: rgba(15, 23, 42, 0.96);
  color: white;
  font-size: 11px;
  line-height: 1;
  padding: 6px 8px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(148, 163, 184, 0.25);
  white-space: nowrap;
}
.tooltip-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(15, 23, 42, 0.96);
}
:deep(.dark) .tooltip-bubble {
  background: rgba(2, 6, 23, 0.96);
  border-color: rgba(100, 116, 139, 0.25);
}
</style>
