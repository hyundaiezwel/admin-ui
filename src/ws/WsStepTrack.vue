<script setup lang="ts">
/**
 * 단계 표시 — 지나온 단계 · 지금 · 남은 단계.
 *
 * 두 곳에서 쓴다. ① 상세 화면의 생애주기(21상태가 어느 단계인지), ② 되돌릴 수 없는
 * 일괄 처리의 진행(조건 → 미리보기 → 확인 → 결과). 색만으로 알리지 않는다 —
 * 지난 단계에는 ✓, 지금 단계에는 `aria-current="step"`과 굵은 글자가 붙는다.
 *
 * `branch`는 본선을 벗어난 상태(이탈 · 이용정지 · 환불)를 지금 단계 옆 가지로 단다.
 */
defineProps<{
  steps: { label: string; sub?: string }[]
  current: number
  branch?: { label: string; tone: 'danger' | 'warning' | 'mute' }
  label: string
}>()
</script>

<template>
  <ol class="st" :aria-label="label">
    <li v-for="(s, i) in steps" :key="s.label" class="st__i" :class="{ 'is-done': i < current, 'is-now': i === current }" :aria-current="i === current ? 'step' : undefined">
      <span class="st__dot" aria-hidden="true">{{ i < current ? '✓' : i + 1 }}</span>
      <span class="st__t"><b>{{ s.label }}</b><small v-if="s.sub">{{ s.sub }}</small></span>
      <span v-if="branch && i === current" class="ws-badge" :class="`ws-badge--${branch.tone}`">{{ branch.label }}</span>
    </li>
  </ol>
</template>

<style scoped>
.st { display: flex; gap: 0; counter-reset: st; }
.st__i { position: relative; flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; padding-right: 12px; color: var(--ws-text-muted); }
.st__i + .st__i::before {
  content: ''; position: absolute; left: -12px; top: 50%; width: 8px; height: 1px; background: var(--ws-border-strong);
}
.st__dot {
  flex: none; display: grid; place-items: center; width: 24px; height: 24px; border: 1px solid var(--ws-field-border);
  border-radius: 50%; background: var(--ws-surface); font-size: var(--ws-font-size-sm); font-weight: 700;
}
.st__t { display: grid; min-width: 0; }
.st__t b { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st__t small { font-size: var(--ws-font-size-sm); }
.is-done { color: var(--ws-text-sub); }
.is-done .st__dot { border-color: var(--ws-action-search); background: var(--ws-surface-selected); color: var(--ws-text-brand); }
.is-now { color: var(--ws-text); }
.is-now .st__dot { border-color: var(--ws-action-primary); background: var(--ws-action-primary); color: var(--ws-action-primary-fg); }
.is-now .st__t b { font-weight: 700; }
</style>
