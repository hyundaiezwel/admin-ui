<script setup lang="ts">
/**
 * 긴 상세 화면의 구획 바로가기 — 위에 붙어 따라온다.
 *
 * AS-IS 기업 기초정보 상세는 신청정보 · 협약 · 환불 · 입금 · 모집인원 이력 · 메모 이력이
 * 한 장에 이어져 2,000px을 넘는다. 저장 버튼은 맨 아래다. 어디쯤 읽고 있는지와
 * 다른 구획으로 가는 길을 위에 둔다. 해시 라우터라 `#id` 앵커를 쓰지 않고 스크롤한다.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ sections: { id: string; label: string }[] }>()
const on = ref(props.sections[0]?.id)
let io: IntersectionObserver | null = null

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  on.value = id
}
onMounted(() => {
  const root = document.querySelector('.sh-scroll')
  io = new IntersectionObserver(
    (es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) on.value = v.target.id },
    { root, rootMargin: '-60px 0px -60% 0px' },
  )
  props.sections.forEach((s) => { const el = document.getElementById(s.id); if (el) io!.observe(el) })
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <nav class="an" aria-label="구획 바로가기">
    <button v-for="s in sections" :key="s.id" type="button" class="an__i" :aria-current="on === s.id ? 'location' : undefined" @click="go(s.id)">{{ s.label }}</button>
  </nav>
</template>

<style scoped>
.an {
  position: sticky; top: 0; z-index: 3; display: flex; gap: 4px; padding: 8px 0;
  border-bottom: 1px solid var(--ws-border); background: var(--ws-surface);
}
.an__i {
  height: 32px; padding: 0 12px; border: 0; border-radius: var(--ws-radius);
  background: none; color: var(--ws-text-sub); font: inherit; cursor: pointer;
}
.an__i:hover { background: var(--ws-surface-hover); color: var(--ws-text); }
.an__i[aria-current='location'] { background: var(--ws-surface-selected); color: var(--ws-text-brand); font-weight: 700; }
.an__i:focus-visible { outline: none; box-shadow: var(--ws-focus-ring); }
</style>
