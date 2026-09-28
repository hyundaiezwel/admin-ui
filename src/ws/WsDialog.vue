<script setup lang="ts">
/**
 * 팝업 — 원본 `w2popup_window`.
 *
 * 네이티브 `<dialog>`를 쓴다. `showModal()`이 포커스 가두기 · Esc 닫기 · 배경 차단 ·
 * 뒤 내용의 inert 처리를 전부 해 준다. 직접 짜면 그 넷을 다 다시 만들어야 한다.
 *
 * 원본 실측
 *   머리 48px · #f6f7f9 · 안쪽 12 48 12 32 · 밑줄 #eee · 제목 16px/700
 *   본문 안쪽 20px
 *   하단 버튼 가운데 정렬 · 최소폭 68 · 확인은 초록(.pop_contents > .btnbox .pri)
 *
 * `side`를 주면 오른쪽에 붙는 패널이 된다(상세 보기). 원본에는 없는 형태라 머리·본문
 * 규칙은 팝업과 같게 두고 위치만 바꾼다.
 */
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    width?: string
    side?: boolean
  }>(),
  { width: '560px', side: false },
)
const emit = defineEmits<{ 'update:open': [boolean] }>()

const el = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (v) => {
    const d = el.value
    if (!d) return
    if (v && !d.open) d.showModal()
    if (!v && d.open) d.close()
  },
  { flush: 'post' },
)

// Esc·form[method=dialog]로 닫혀도 부모 상태가 따라오게 한다
const onClose = () => emit('update:open', false)
// 배경을 누르면 닫는다 — dialog 자체가 눌렸다는 건 안쪽이 아니라 배경이라는 뜻이다
const onBackdrop = (e: MouseEvent) => { if (e.target === el.value) emit('update:open', false) }

onBeforeUnmount(() => el.value?.open && el.value.close())
</script>

<template>
  <dialog
    ref="el"
    class="ws-dlg"
    :class="{ 'ws-dlg--side': side }"
    :style="{ '--w': width }"
    :aria-label="title"
    @close="onClose"
    @click="onBackdrop"
  >
    <header class="ws-dlg__head">
      <h2 class="ws-dlg__tit">{{ title }}</h2>
      <button type="button" class="ws-dlg__x" aria-label="닫기" @click="emit('update:open', false)">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.6" /></svg>
      </button>
    </header>
    <div class="ws-dlg__body"><slot /></div>
    <footer v-if="$slots.foot" class="ws-dlg__foot"><slot name="foot" /></footer>
  </dialog>
</template>

<style>
.ws-dlg {
  width: min(var(--w), calc(100vw - 32px));
  max-height: calc(100vh - 64px);
  padding: 0;
  border: 0;
  border-radius: var(--ws-radius-lg);
  background: var(--ws-surface);
  color: var(--ws-text);
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.2);
  overflow: hidden;
}
.ws-dlg[open] { display: flex; flex-direction: column; }
.ws-dlg::backdrop { background: rgb(0 0 0 / 0.4); }

.ws-dlg__head {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  height: var(--ws-popup-head-h);
  padding: 12px 48px 12px 32px;
  background: var(--ws-surface-sunken);
  border-bottom: 1px solid var(--ws-border-lighter);
}
.ws-dlg__tit { font-size: var(--ws-font-size-lg); font-weight: 700; line-height: 24px; }
.ws-dlg__x {
  position: absolute; right: 12px; top: 50%; translate: 0 -50%;
  display: grid; place-items: center; width: 32px; height: 32px;
  border: 0; border-radius: var(--ws-radius); background: none; color: var(--ws-text-sub); cursor: pointer;
}
.ws-dlg__x:hover { background: var(--ws-surface-alt); }

.ws-dlg__body { flex: 1; min-height: 0; overflow: auto; padding: 20px 32px; }
.ws-dlg__body > * + * { margin-top: var(--ws-gap-region); }

.ws-dlg__foot { flex: none; display: flex; justify-content: center; gap: 6px; padding: 0 32px 24px; }
.ws-dlg__foot .ws-btn { min-width: 68px; }

/* 옆 패널 — 오른쪽 끝에 높이를 다 채운다 */
.ws-dlg--side {
  margin: 0 0 0 auto;
  height: 100vh;
  max-height: none;
  border-radius: 0;
}
.ws-dlg--side .ws-dlg__foot { justify-content: flex-end; padding-top: 16px; border-top: 1px solid var(--ws-border-lighter); }
</style>
