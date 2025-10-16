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

      <div class="relative pt-2">
        <div class="relative h-8 flex items-center">
          <div class="absolute w-full h-3 bg-slate-200/80 dark:bg-slate-700/70 rounded-full z-0"></div>

          <div
            class="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 rounded bg-slate-300 dark:bg-white/50 pointer-events-none z-30"
            :style="{ left: `calc(${defaultSliderPosition}% - 1.5px)` }"
            aria-hidden="true"
          ></div>

          <div
            class="absolute h-3 rounded-full z-10 bg-[var(--brand-primary)]/90 transition-[width] duration-150 ease-out"
            :style="{ width: qualityValue + '%' }"
          ></div>

          <div
            class="absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full cursor-pointer transition-transform duration-150 ease-out hover:scale-105 z-30"
            :class="{ 'scale-105': showTooltip }"
            :style="{ left: `calc(${qualityValue}% - 14px)` }"
          >
            <div class="absolute inset-1 bg-gradient-to-br from-white to-gray-100 dark:from-gray-50 dark:to-gray-200 rounded-full opacity-60 shadow ring-1 ring-white/40 dark:ring-white/10"></div>
          </div>

          <div
            class="absolute bottom-full mb-2 pointer-events-none transform -translate-x-1/2 z-40 transition duration-150 ease-out"
            :class="{ 'opacity-100 translate-y-0 scale-100': showTooltip, 'opacity-0 -translate-y-1 scale-95': !showTooltip }"
            :style="{ left: qualityValue + '%', willChange: 'transform, opacity' }"
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
          class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-50"
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
  // 简化逻辑：默认允许所有位深；如需限制，可根据 codec/hardware 能力判断
  return [8, 10, 12].includes(depth);
};

const setBitDepth = (depth: number) => {
  if (![8, 10, 12].includes(depth)) return;
  selectedBitDepth.value = depth as 8 | 10 | 12;
  const updates: Partial<CompressionSettings> = {
    ...settings.value,
    bitDepth: selectedBitDepth.value
  };
  settings.value = updates;
  emit('update:modelValue', updates);
};

const bitDepthButtonClass = (depth: number) => {
  const isSelected = selectedBitDepth.value === depth;
  const disabled = !canUseDepth(depth);
  return [
    isSelected
      ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
      : 'border-slate-200/80 dark:border-white/15 text-slate-700 dark:text-slate-200',
    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10'
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
  emit('update:modelValue', settings.value);
};

// 同步外部传入的 modelValue 到内部状态
watch(() => props.modelValue, () => {
  if (props.modelValue.bitDepth && [8, 10, 12].includes(props.modelValue.bitDepth as number)) {
    selectedBitDepth.value = props.modelValue.bitDepth as 8 | 10 | 12;
  }
  qualityValue.value = deriveSliderFromModel();
}, { deep: true });

onMounted(async () => {
  await nextTick();
  emit('update:modelValue', settings.value);
});
</script>

<style scoped>
.tooltip-bubble {
  position: relative;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96));
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
  border-top: 6px solid rgba(30, 41, 59, 0.96);
}
:deep(.dark) .tooltip-bubble {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96));
  border-color: rgba(100, 116, 139, 0.25);
}
</style>
