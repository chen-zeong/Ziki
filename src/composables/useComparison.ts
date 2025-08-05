import { ref, onMounted, onUnmounted } from 'vue';

export function useComparison() {
  const sliderPosition = ref(50);
  const isDragging = ref(false);
  const sliderRef = ref<HTMLElement | null>(null);

  const updateSliderPosition = (event: MouseEvent) => {
    if (!sliderRef.value || !isDragging.value) return;
    
    const rect = sliderRef.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    sliderPosition.value = percentage;
    sliderRef.value.style.setProperty('--position', `${percentage}%`);
  };

  const startDragging = (event: MouseEvent) => {
    isDragging.value = true;
    updateSliderPosition(event);
  };

  const stopDragging = () => {
    isDragging.value = false;
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (isDragging.value) {
      updateSliderPosition(event);
    }
  };

  onMounted(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDragging);
  });

  onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopDragging);
  });

  return {
    sliderPosition,
    sliderRef,
    startDragging
  };
}