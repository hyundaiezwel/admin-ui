<script setup lang="ts">
import { toasts } from './notify'
</script>

<template>
  <!-- role=status + aria-live=polite — 읽고 있던 문장을 끊지 않고 다음에 읽어 준다 -->
  <div class="ws-toasts" role="status" aria-live="polite">
    <p v-for="t in toasts" :key="t.id" class="ws-toast" :class="`ws-toast--${t.tone}`">{{ t.text }}</p>
  </div>
</template>

<style>
.ws-toasts { position: fixed; z-index: 1000; left: 50%; bottom: 32px; translate: -50% 0; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
.ws-toast {
  display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 20px;
  border-radius: var(--ws-radius-lg); background: var(--ws-action-primary); color: var(--ws-text-inverse);
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
}
.ws-toast::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--ws-brand-light); }
.ws-toast--danger::before { background: var(--ws-surface-danger); }
</style>
