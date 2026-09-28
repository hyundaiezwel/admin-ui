<script setup lang="ts">
/**
 * 세션 만료 알림 — 셸에 하나.
 *
 * AS-IS(G-004)는 만료 뒤에 "로그인 연장하기(새로고침) / 다시 로그인하기" 모달을 띄운다. 새로고침으로
 * 연장하면 **쓰던 내용이 날아간다.** 여기서는
 *   - 만료 **2분 전에** 알린다 — 남은 시간을 초 단위로
 *   - 연장은 새로고침 없이 — 폼 입력 · 열린 탭 · 선택이 그대로다
 *   - 마우스 · 키보드를 쓰는 동안은 알아서 연장된다(업무 중에 끊기지 않게)
 * 만료되면 로그인 화면으로. 실제 구현에서는 서버 세션 연장 API를 부른다.
 *
 * 미리보기: 사용자 메뉴의 "세션 만료 알림 보기"가 남은 시간을 70초로 당긴다.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { notify } from '../ws/notify'
import { session, extend } from './session'

const router = useRouter()
const now = ref(Date.now())
let t: number | undefined
const left = computed(() => Math.max(0, Math.round((session.expiresAt - now.value) / 1000)))
const warn = computed(() => left.value > 0 && left.value <= session.warnSec)
const mmss = computed(() => `${Math.floor(left.value / 60)}:${String(left.value % 60).padStart(2, '0')}`)

/** 업무 중이면 조용히 연장 — 알림이 떠 있을 때는 사람이 고르게 둔다 */
let last = 0
function activity() {
  if (warn.value || Date.now() - last < 30_000) return
  last = Date.now()
  extend()
}
onMounted(() => {
  t = window.setInterval(() => (now.value = Date.now()), 1000)
  ;['pointerdown', 'keydown'].forEach((e) => window.addEventListener(e, activity, { passive: true }))
})
onBeforeUnmount(() => {
  window.clearInterval(t)
  ;['pointerdown', 'keydown'].forEach((e) => window.removeEventListener(e, activity))
})
watch(left, (s, prev) => {
  if (s === 0 && prev > 0) { notify('세션이 끝나 로그아웃했습니다', 'warning'); router.push('/login'); extend() }
})
function keep() { extend(); notify('로그인을 연장했습니다 — 30분', 'success') }
</script>

<template>
  <Dialog :visible="warn" modal header="곧 자동 로그아웃됩니다" :closable="false" :style="{ width: '420px' }" :draggable="false">
    <p class="sg__t" role="timer" aria-live="off">{{ mmss }}</p>
    <p>남은 시간이 지나면 로그아웃된다. <b>연장하면 쓰던 내용 · 열린 탭이 그대로</b> 남는다.</p>
    <template #footer>
      <Button label="로그아웃" severity="secondary" outlined @click="router.push('/login'); extend()" />
      <Button label="로그인 연장" @click="keep" />
    </template>
  </Dialog>
</template>

<style scoped>
.sg__t { margin-bottom: 8px; font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums; text-align: center; color: var(--ws-text-danger); }
</style>
