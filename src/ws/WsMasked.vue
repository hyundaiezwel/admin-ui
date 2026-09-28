<script setup lang="ts">
/**
 * 가린 값 + 열람 버튼. 열면 기록이 남는다는 것을 버튼 옆에서 알린다 —
 * 열람이 공짜처럼 보이면 가림이 형식이 된다.
 */
import { ref } from 'vue'
import { mask, type MaskKind } from './mask'
import { notify } from './notify'

const props = defineProps<{ value: string; kind: MaskKind; label: string }>()
const open = ref(false)
function reveal() {
  open.value = true
  notify(`${props.label} 열람을 기록했습니다(미리보기)`)
}
</script>

<template>
  <span class="mk">
    <span :class="{ 'mk__v--hidden': !open }">{{ open ? value : mask(value, kind) }}</span>
    <button v-if="!open" type="button" class="mk__b" :aria-label="`${label} 원문 보기 — 열람 기록이 남습니다`" @click="reveal">보기</button>
  </span>
</template>

<style scoped>
.mk { display: inline-flex; align-items: center; gap: 6px; }
.mk__v--hidden { font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
.mk__b {
  height: 22px; padding: 0 6px; border: 1px solid var(--ws-border); border-radius: var(--ws-radius-sm);
  background: var(--ws-surface); color: var(--ws-text-sub); font: inherit; font-size: var(--ws-font-size-sm); cursor: pointer;
}
.mk__b:hover { border-color: var(--ws-field-border); color: var(--ws-text); }
.mk__b:focus-visible { outline: none; box-shadow: var(--ws-focus-ring); }
</style>
