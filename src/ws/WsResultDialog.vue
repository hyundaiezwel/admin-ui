<script setup lang="ts">
/**
 * 처리 결과 보고 — 성공 · 처리 실패 · 통지 실패를 따로 센다.
 *
 * AS-IS에서 처리와 발송은 분리돼 있다: `선정완료 처리 되었으나 SMS 발송 실패하였습니다.`
 * 상태는 바뀌었는데 문자는 안 나간 건이 생긴다. 토스트 한 줄로는 **어느 곳이** 빠졌는지
 * 알 수 없어서 재발송을 못 한다. 실패 건은 목록으로 남기고 내려받게 한다.
 */
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { notify } from './notify'

export interface ResultItem { target: string; reason: string; kind: 'process' | 'notice' }
/** `skipped` — 실행 전에 적격 판정으로 뺀 수. 실패가 아니다(확인 팝업에서 이미 보였다) */
defineProps<{ header: string; ok: number; fails: ResultItem[]; auditId?: string; skipped?: number }>()
const visible = defineModel<boolean>('visible', { required: true })
</script>

<template>
  <Dialog v-model:visible="visible" modal :header="header" :style="{ width: '560px' }" :draggable="false">
    <div class="rs">
      <dl class="rs__sum">
        <div><dt>처리 완료</dt><dd class="is-ok">{{ ok.toLocaleString('ko-KR') }}</dd></div>
        <div><dt>처리 실패</dt><dd :class="{ 'is-bad': fails.some((f) => f.kind === 'process') }">{{ fails.filter((f) => f.kind === 'process').length }}</dd></div>
        <div><dt>통지 실패 <small>(상태는 바뀜)</small></dt><dd :class="{ 'is-warn': fails.some((f) => f.kind === 'notice') }">{{ fails.filter((f) => f.kind === 'notice').length }}</dd></div>
      </dl>
      <p v-if="skipped" class="ws-desc">실행 전에 뺀 곳 {{ skipped.toLocaleString('ko-KR') }} — 상태가 맞지 않아 대상에 넣지 않았다(실패 아님)</p>
      <table v-if="fails.length" class="ws-gtb">
        <caption class="rs__cap">실패 목록</caption>
        <thead><tr><th scope="col">대상</th><th scope="col">구분</th><th scope="col">사유</th></tr></thead>
        <tbody>
          <tr v-for="f in fails" :key="f.target + f.reason">
            <td>{{ f.target }}</td>
            <td><span :class="f.kind === 'process' ? 'ws-badge ws-badge--danger' : 'ws-badge ws-badge--warning'">{{ f.kind === 'process' ? '처리' : '통지' }}</span></td>
            <td>{{ f.reason }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="auditId" class="ws-desc">감사 기록 <code>{{ auditId }}</code> — 누가 · 언제 · 어떤 조건으로 처리했는지 남았다.</p>
    </div>
    <template #footer>
      <Button v-if="fails.length" label="실패 목록 내려받기" severity="secondary" outlined @click="notify('실패 목록을 내려받았습니다(미리보기)')" />
      <Button v-if="fails.some((f) => f.kind === 'notice')" label="통지 실패 건 재발송" severity="secondary" outlined @click="notify('재발송을 요청했습니다(미리보기)', 'success')" />
      <Button label="닫기" @click="visible = false" />
    </template>
  </Dialog>
</template>

<style scoped>
.rs { display: grid; gap: var(--ws-gap-block); }
.rs__sum { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.rs__sum div { padding: 12px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); background: var(--ws-surface-sunken); }
.rs__sum dt { color: var(--ws-text-sub); font-size: var(--ws-font-size-md); }
.rs__sum dd { margin-top: 4px; font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.rs__sum .is-ok { color: var(--ws-text-success); }
.rs__sum .is-bad { color: var(--ws-text-danger); }
.rs__sum .is-warn { color: var(--ws-text-warning); }
.rs__cap { caption-side: top; padding-bottom: 6px; text-align: left; font-weight: 600; }
</style>
