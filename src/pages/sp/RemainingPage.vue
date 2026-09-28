<script setup lang="ts">
/**
 * 잔여금 현황 — AS-IS S-005-03 (12열 집계 + 기업상세).
 *
 * 금액은 전부 **두 재원 쌍**이다: 기업+개인 / 지원기관, 입금 시점에 3 : 1이 강제된다(핵심 1).
 * AS-IS는 이 쌍을 `출금금액[기업+개인/지원기관]`처럼 한 칸에 슬래시로 넣는다. 여기서는
 * 2단 머리글로 가르고, 묶음 경계를 굵은 선으로 그어 12열을 넷씩 읽게 한다.
 *
 * 더한 것: 금액 단위 전환(억 단위 합계를 원 단위로 읽으면 자릿수를 센다), 비율 확인 열,
 * 집계 기준 표시(실시간 — AS-IS 40분 간격 재조회에서 값이 늘었다, A2 §7).
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsPickField, { type PickItem } from '../../ws/WsPickField.vue'
import { usePaged } from '../../app/usePaged'
import { CO_FG, bizLabel, coFgLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { memo } from '../../sp/stores'
import { makeRemain, type Pair, type RemainRow } from '@fixtures/sp'
import { UNITS, money, type Unit } from '../../sp/money'

const router = useRouter()
const all = computed(() => memo('remain', ctxKey(), () => makeRemain(ctxKey(), ctx.year)))
const picks = computed<PickItem[]>(() => all.value.map((r) => ({ id: r.id, label: r.name, sub: r.applyNo })))

const f = ref<{ co: PickItem | null; coFg: string }>({ co: null, coFg: '' })
const applied = ref({ ...f.value })
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() =>
  all.value.filter((r) => (!applied.value.co || r.id === applied.value.co.id) && (!applied.value.coFg || r.coFg === applied.value.coFg)),
)
onMounted(reload)
watch(ctxKey, () => { f.value.co = null; applied.value.co = null; requery() })
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = { co: null, coFg: '' }; search() }

const unit = ref<Unit>('원')
const STAGES: [keyof Pick<RemainRow, 'dep' | 'out' | 'ref' | 'rem'>, string][] = [['dep', '최초입금'], ['out', '출금'], ['ref', '환불'], ['rem', '잔여']]

/** 합계 — 조회 조건 전체(쪽이 아니라) */
const sums = computed(() => {
  const list = all.value.filter((r) => (!applied.value.co || r.id === applied.value.co.id) && (!applied.value.coFg || r.coFg === applied.value.coFg))
  return Object.fromEntries(STAGES.map(([k]) => [k, list.reduce<Pair>((s, r) => [s[0] + r[k][0], s[1] + r[k][1]], [0, 0])])) as Record<string, Pair>
})
const ratioOk = (p: Pair) => p[1] === 0 ? p[0] === 0 : Math.abs(p[0] / p[1] - 3) < 0.01

const cell = (k: string, i: 0 | 1) => (c: any) => money(c.getRow().getData()[k][i], unit.value)
const columns = computed(() => [
  {
    title: '기업명', field: 'name', minWidth: 170,
    formatter: (c: any) => `<a class="ws-celllink">${c.getValue()}</a>`,
    cellClick: (_: any, c: any) => router.push(`/sp/remaining/${c.getRow().getData().id}`),
  },
  { title: '신청번호', field: 'applyNo', width: 116, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '기업구분', field: 'coFg', width: 104, formatter: (c: any) => coFgLabel(c.getValue()) },
  ...STAGES.map(([k, label]) => ({
    title: label, headerHozAlign: 'center', cssClass: 'ws-col-g',
    columns: [
      { title: '기업+개인', field: `${k}0`, width: 118, hozAlign: 'right', headerHozAlign: 'center', headerSort: false, formatter: cell(k, 0), cssClass: 'ws-col-g' },
      { title: '지원기관', field: `${k}1`, width: 108, hozAlign: 'right', headerHozAlign: 'center', headerSort: false, formatter: cell(k, 1) },
    ],
  })),
  { title: '3:1', field: 'dep', width: 56, hozAlign: 'center', headerHozAlign: 'center', headerSort: false, formatter: (c: any) => (ratioOk(c.getValue()) ? '✓' : '<span class="ws-badge ws-badge--danger">어긋남</span>') },
])
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['104px', '', '160px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="r-co">고객사</label></th>
        <td><WsPickField id="r-co" v-model="f.co" :items="picks" header="고객사 찾기" placeholder="전체 — 찾기로 한 곳 선택" /></td>
        <th scope="row"><label for="r-fg">기업구분</label></th>
        <td><Select v-model="f.coFg" input-id="r-fg" :options="[{ code: '', label: '전체' }, ...CO_FG]" option-label="label" option-value="code" placeholder="전체" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">잔여금 합계</h2>
          <span class="ws-fresh ws-fresh--live">실시간</span>
          <span class="ws-desc">{{ ctx.year }}년 {{ bizLabel(ctx.biz) }} · {{ total.toLocaleString('ko-KR') }}개 기업</span>
        </div>
        <div class="ws-tit__r"><span class="ws-desc">금액 단위</span><SelectButton v-model="unit" :options="[...UNITS]" :allow-empty="false" aria-label="금액 단위" /></div>
      </div>
      <div class="ws-xscroll">
        <table class="ws-gtb">
          <thead>
            <tr><th v-for="([, l], i) in STAGES" :key="l" scope="colgroup" colspan="3" :class="{ g: i > 0 }">{{ l }}</th></tr>
            <tr>
              <template v-for="([k], i) in STAGES" :key="k">
                <th scope="col" :class="{ g: i > 0 }">기업+개인</th><th scope="col">지원기관</th><th scope="col">합계</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr class="is-total">
              <template v-for="([k], i) in STAGES" :key="k">
                <td class="ws-num" :class="{ g: i > 0 }">{{ money(sums[k][0], unit) }}</td>
                <td class="ws-num">{{ money(sums[k][1], unit) }}</td>
                <td class="ws-num">{{ money(sums[k][0] + sums[k][1], unit) }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">기업별 잔여금</h2><span class="ws-total">총<strong>{{ total.toLocaleString('ko-KR') }}</strong>곳</span><span class="ws-desc">단위 {{ unit }}</span></div>
        <div class="ws-tit__r"><WsDownload :total="total" :limit="20000" /></div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :key="unit" :columns="columns" :rows="rows" height="auto" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>재원은 둘이다 — 기업+개인(근로자 2 + 기업 1)과 지원기관(1). 입금 시점에 3 : 1이 강제되고, <b>3:1</b> 열이 어긋난 기업을 드러낸다.</li>
        <li>고객사 칸에 바로 기업명을 치면 찾기 팝업이 그 글자로 열린다.</li>
      </ul>
    </div>
  </div>
</template>
