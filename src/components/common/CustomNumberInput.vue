<template>
  <div class="relative">
    <input
      :value="modelValue ?? ''"
      @input="handleInput"
      @blur="handleBlur"
      :min="min"
      :max="max"
      :step="step"
      :placeholder="placeholder"
      :disabled="disabled"
      type="number"
      class="w-full h-11 px-4 pr-10 rounded-xl text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] custom-number-input shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
    />
    <div class="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
      <button
        @click="increment"
        :disabled="disabled || (max !== undefined && (modelValue ?? 0) >= max)"
        class="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
        type="button"
      >
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
        </svg>
      </button>
      <button
        @click="decrement"
        :disabled="disabled || (min !== undefined && (modelValue ?? 0) <= min)"
        class="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
        type="button"
      >
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">

interface Props {
  modelValue?: number
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  step: 1,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (!isNaN(value)) {
    emit('update:modelValue', value)
  }
}

const handleBlur = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = parseFloat(target.value)
  
  if (isNaN(value)) {
    value = props.modelValue ?? 0
  } else {
    if (props.min !== undefined && value < props.min) {
      value = props.min
    }
    if (props.max !== undefined && value > props.max) {
      value = props.max
    }
  }
  
  emit('update:modelValue', value)
}

const increment = () => {
  const currentValue = props.modelValue ?? 0
  const newValue = currentValue + props.step
  if (props.max === undefined || newValue <= props.max) {
    emit('update:modelValue', newValue)
  }
}

const decrement = () => {
  const currentValue = props.modelValue ?? 0
  const newValue = currentValue - props.step
  if (props.min === undefined || newValue >= props.min) {
    emit('update:modelValue', newValue)
  }
}
</script>

<style scoped>
/* 自定义数字输入框样式 */
.custom-number-input {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(226, 232, 240, 0.9);
  color: #1f2937;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.custom-number-input::placeholder {
  color: rgba(148, 163, 184, 0.9);
}

.custom-number-input:hover {
  border-color: rgba(81, 98, 255, 0.35);
}

.custom-number-input:focus {
  outline: none;
  border-color: rgba(81, 98, 255, 0.55) !important;
  box-shadow: 0 0 0 3px rgba(81, 98, 255, 0.18) !important;
}

/* 夜间模式样式 */
.dark .custom-number-input {
  background: rgba(20, 21, 29, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
}

.dark .custom-number-input::placeholder {
  color: rgba(148, 163, 184, 0.65);
}

.dark .custom-number-input:hover {
  border-color: rgba(122, 139, 255, 0.45);
}

.dark .custom-number-input:focus {
  border-color: rgba(122, 139, 255, 0.7) !important;
  box-shadow: 0 0 0 3px rgba(122, 139, 255, 0.24) !important;
}
</style>
