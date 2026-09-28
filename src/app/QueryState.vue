<script setup lang="ts">
/**
 * 조회 상태 넷 — 로딩 · 오류 · 빈 · 정상.
 *
 * 화면은 `loading`/`error`/`empty`만 넘기고 내용은 기본 슬롯에 둔다.
 *
 * 순서가 규칙이다. **오류가 로딩보다 먼저다** — 실패한 조회에 스켈레톤을 겹쳐 그리면
 * 아직 기다리면 된다는 거짓말이 된다.
 * 로딩은 오버레이가 아니라 자리를 차지하는 줄로 그린다 — 오버레이는 조회 조건을
 * 가려서 "무엇으로 조회했는지"를 못 보게 한다.
 */
withDefaults(
  defineProps<{ loading?: boolean; error?: string | null; empty?: boolean; lines?: number; emptyText?: string }>(),
  { lines: 6, emptyText: '조회 결과가 없습니다.' },
)
defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="error" class="qs-err" role="alert">
    <p><strong>QUERY_FAILED</strong> {{ error }}</p>
    <button type="button" class="ws-btn ws-btn--sm" @click="$emit('retry')">다시 시도</button>
  </div>
  <div v-else-if="loading" class="qs-skel" aria-busy="true" aria-label="조회 중">
    <span class="qs-skel__head" />
    <span v-for="i in lines" :key="i" class="qs-skel__row" />
  </div>
  <div v-else-if="empty" class="ws-empty">
    <p>{{ emptyText }}</p>
    <p class="ws-desc">조회 조건을 바꿔 다시 조회해 주세요.</p>
  </div>
  <slot v-else />
</template>

<style>
.qs-err {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  min-height: 48px; padding: 8px 16px;
  border: 1px solid var(--ws-text-danger); border-radius: var(--ws-radius);
  background: var(--ws-surface-danger); color: var(--ws-text-danger);
}
.qs-err strong { margin-right: 8px; }

.qs-skel { display: flex; flex-direction: column; border-top: 1px solid var(--ws-border-strong); }
.qs-skel__head, .qs-skel__row { display: block; background: linear-gradient(90deg, var(--ws-surface-alt) 25%, var(--ws-surface-head) 50%, var(--ws-surface-alt) 75%); background-size: 200% 100%; animation: qs 1.2s infinite linear; }
.qs-skel__head { height: var(--ws-grid-head-h); }
.qs-skel__row { height: var(--ws-grid-row-h); margin-top: 1px; opacity: 0.6; }
@keyframes qs { to { background-position: -200% 0; } }
</style>
