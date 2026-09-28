<script setup lang="ts">
/**
 * 잔여금 기업상세 — AS-IS S-005-03-D (페이지 이동).
 *
 * 기업 한 곳의 출금 · 환불이 **청구년월 단위 행**으로 쌓인다 — 월 정산 구조다.
 * AS-IS 상세 집계표 머리글 오타(`츌금`)는 여기서 목록과 같은 머리글을 공유해 다시 생기지 않는다.
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHead from '../../app/PageHead.vue'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import WsDownload from '../../ws/WsDownload.vue'
import { coFgLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { memo } from '../../sp/stores'
import { makeMonthly, makeRemain, type RemainRow } from '@fixtures/sp'
import { UNITS, money, type Unit } from '../../sp/money'

const route = useRoute()
const router = useRouter()
const row = computed(() => memo('remain', ctxKey(), () => makeRemain(ctxKey(), ctx.year)).find((r) => r.id === route.params.id) as RemainRow | undefined)
const months = computed(() => (row.value ? makeMonthly(row.value, ctx.year) : []))
const unit = ref<Unit>('원')
const STAGES = [['dep', '최초입금'], ['out', '출금'], ['ref', '환불'], ['rem', '잔여']] as const
</script>

<template>
  <div v-if="!row" class="ws-page">
    <PageHead title="기업상세" />
    <div class="ws-empty"><p>이 기업은 지금 전역 조건에 없습니다.</p><Button label="기업 목록" severity="secondary" outlined @click="router.push('/sp/remaining')" /></div>
  </div>
  <div v-else class="ws-page">
    <PageHead :title="`${row.name} 잔여금`" />

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">합계</h2><span class="ws-desc">신청번호 {{ row.applyNo }} · {{ coFgLabel(row.coFg) }}</span></div>
        <div class="ws-tit__r"><span class="ws-desc">금액 단위</span><SelectButton v-model="unit" :options="[...UNITS]" :allow-empty="false" aria-label="금액 단위" /></div>
      </div>
      <table class="ws-gtb">
        <thead>
          <tr><th v-for="([, l], i) in STAGES" :key="l" scope="colgroup" colspan="2" :class="{ g: i > 0 }">{{ l }}</th></tr>
          <tr><template v-for="([k], i) in STAGES" :key="k"><th scope="col" :class="{ g: i > 0 }">기업+개인</th><th scope="col">지원기관</th></template></tr>
        </thead>
        <tbody>
          <tr class="is-total">
            <template v-for="([k], i) in STAGES" :key="k">
              <td class="ws-num" :class="{ g: i > 0 }">{{ money(row[k][0], unit) }}</td><td class="ws-num">{{ money(row[k][1], unit) }}</td>
            </template>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">청구년월별 내역</h2><span class="ws-total">총<strong>{{ months.length }}</strong>건</span></div>
        <div class="ws-tit__r"><WsDownload :total="months.length" /></div>
      </div>
      <table class="ws-gtb">
        <thead>
          <tr><th scope="col" rowspan="2">번호</th><th scope="col" rowspan="2">청구년월</th><th scope="colgroup" colspan="2" class="g">출금</th><th scope="colgroup" colspan="2" class="g">환불</th></tr>
          <tr><th scope="col" class="g">기업+개인</th><th scope="col">지원기관</th><th scope="col" class="g">기업+개인</th><th scope="col">지원기관</th></tr>
        </thead>
        <tbody>
          <tr v-for="m in months" :key="m.ym">
            <td class="ws-num">{{ m.no }}</td><td style="text-align: center">{{ m.ym }}</td>
            <td class="ws-num g">{{ money(m.out[0], unit) }}</td><td class="ws-num">{{ money(m.out[1], unit) }}</td>
            <td class="ws-num g">{{ money(m.ref[0], unit) }}</td><td class="ws-num">{{ money(m.ref[1], unit) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colspan="2">합계</th>
            <td class="ws-num g">{{ money(months.reduce((s, m) => s + m.out[0], 0), unit) }}</td><td class="ws-num">{{ money(months.reduce((s, m) => s + m.out[1], 0), unit) }}</td>
            <td class="ws-num g">{{ money(months.reduce((s, m) => s + m.ref[0], 0), unit) }}</td><td class="ws-num">{{ money(months.reduce((s, m) => s + m.ref[1], 0), unit) }}</td>
          </tr>
        </tfoot>
      </table>
    </section>

    <div class="ws-btnbox"><div class="ws-btnbox__c"><Button label="기업 목록" severity="secondary" outlined @click="router.push('/sp/remaining')" /></div></div>
  </div>
</template>
