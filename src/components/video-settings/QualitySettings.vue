<template>
  <div class="p-4 rounded-xl bg-white dark:bg-[#20242f] border border-slate-200/70 dark:border-white/10 transition-all duration-300">
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-200">
          {{ t('videoSettings.quality') }}
        </label>
        <span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border border-slate-200/80 dark:border-white/15 text-slate-600 dark:text-slate-100">
          {{ qualityText }}
        </span>
      </div>

      <div class="relative pt-4 pb-2">
        <div class="relative h-3 rounded-full bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden">
          <div
            class="absolute inset-y-0 left-0 bg-[var(--brand-primary)]/90 transition-all duration-150"
            :style="{ width: qualityValue + '%' }"
          />
          <div
            class="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 rounded bg-slate-300 dark:bg-white/50"
            :style="{ left: `calc(${defaultSliderPosition}% - 1px)` }"
          />
        </div>

        <div
          class="absolute top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white dark:bg-[#181b23] border border-slate-200/80 dark:border-white/15 shadow-sm transition-transform duration-150 grid place-items-center"
          :class="{ 'scale-105': showTooltip }"
          :style="{ left: `calc(${qualityValue}% - 14px)` }"
        >
          <div class="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
        </div>

        <div
          class="absolute bottom-full mb-2 pointer-events-none -translate-x-1/2 text-xs px-2 py-1 rounded bg-slate-900 text-white dark:bg-white/90 dark:text-slate-900 transition duration-150"
          :class="showTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'"
          :style="{ left: qualityValue + '%' }"
        >
          {{ currentParamDisplay }}
        </div>

        <input
          id="quality-slider"
          v-model="qualityValue"
          type="range"
          min="2"
          max="98"
          step="1"
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          @input="updateQualityState"
          @mouseenter="showTooltip = true"
          @mouseleave="showTooltip = false"
          @mousedown="showTooltip = true"
          @mouseup="showTooltip = false"
        />
      </div>

      <div class="pt-4 border-t border-slate-200/80 dark:border-white/10 space-y-3">
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
  getQualityLevelIndex,
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
}

const props = withDefaults(defineProps<Props>(), {
  isHardwareAccelerated: false,
  currentVideoCodec: ''
});

const emit = defineEmits<{
  'update:modelValue': [value: Partial<CompressionSettings>];
}>();

const qualityValue = ref(80);
const showTooltip = ref(false);
const selectedBitDepth = ref<8 | 10 | 12>(8);

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
  const originalDepth = getOriginalBitDepth();
  const fallbackDepth = originalDepth >= 12 ? 12 : originalDepth >= 10 ? 10 : 8;
  selectedBitDepth.value = (props.modelValue.bitDepth as 8 | 10 | 12) ?? fallbackDepth;

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
</script>