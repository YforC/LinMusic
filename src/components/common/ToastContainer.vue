<template>
  <Teleport to="body">
    <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="px-4 py-3 rounded-lg shadow-lg backdrop-blur-md pointer-events-auto flex items-center gap-2 min-w-[200px] max-w-[400px]"
          :class="{
            'bg-primary/90 text-black': toast.type === 'success',
            'bg-red-500/90 text-white': toast.type === 'error',
            'bg-white/20 text-white': toast.type === 'info'
          }"
        >
          <span class="material-symbols-outlined text-[20px]">
            {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
          </span>
          <span class="text-sm font-medium">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { globalToast } from '@/composables/useToast'

const { toasts } = globalToast
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
