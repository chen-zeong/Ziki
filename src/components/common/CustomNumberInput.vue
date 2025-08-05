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
      class="w-full h-10 px-3 pr-8 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
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