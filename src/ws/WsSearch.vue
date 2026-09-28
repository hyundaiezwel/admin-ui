<script setup lang="ts">
/**
 * 조회 영역 — 원본 `shbox`.
 *
 * 목록 화면 다섯 장이 똑같이 쓴다. 제목줄(초기화 · 조회(F2) · 상세조회) + 한 줄 폼 +
 * 아래 가운데 접기 손잡이. 화면은 `<tr>`만 넘긴다 — 라벨과 칸의 폭은 `cols`가 정한다.
 *
 * **조회 버튼만 초록이다.** 원본 `.shbox .titbox .btn_cm.pri` 규칙이다.
 * F2는 보이는 화면에서만 받는다(`useHotkey`).
 */
import { ref } from 'vue'
import { useHotkey } from '../app/useHotkey'

const props = withDefaults(defineProps<{ cols?: string[]; title?: string }>(), {
  // 라벨 · 칸 × 3 — 원본 조회 영역은 한 줄에 셋이 기본이다
  cols: () => ['72px', '', '132px', '', '132px', ''],
  title: '조회',
})
const emit = defineEmits<{ search: []; reset: [] }>()
const detail = ref(false)

useHotkey('F2', () => emit('search'))
</script>

<template>
  <form class="ws-sh" @submit.prevent="emit('search')">
    <div class="ws-tit">
      <div class="ws-tit__l"><h2 class="ws-tit__h">{{ title }}</h2></div>
      <div class="ws-tit__r">
        <button type="button" class="ws-btn ws-btn--icon" aria-label="조건 초기화" title="초기화" @click="emit('reset')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
        </button>
        <button type="submit" class="ws-btn ws-btn--search">조회(F2)</button>
        <button v-if="$slots.detail" type="button" class="ws-btn" :aria-expanded="detail" @click="detail = !detail">상세조회</button>
      </div>
    </div>
    <div class="ws-sh__body">
      <table class="ws-tb">
        <colgroup><col v-for="(w, i) in props.cols" :key="i" :style="w ? { width: w } : undefined" /></colgroup>
        <tbody>
          <slot />
          <slot v-if="detail" name="detail" />
        </tbody>
      </table>
    </div>
    <button v-if="$slots.detail" type="button" class="ws-sh__fold" :aria-expanded="detail" :aria-label="detail ? '상세 조건 접기' : '상세 조건 펼치기'" @click="detail = !detail" />
  </form>
</template>
