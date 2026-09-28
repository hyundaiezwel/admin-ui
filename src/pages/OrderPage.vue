<script setup lang="ts">
/**
 * 주문·정산 관리 — 대용량 + 합계 행 + 컬럼 고정.
 *
 * 합계는 원본 `gridFooterTDDefault`처럼 그리드 바로 밑에 붙인다. 다만 Tabulator 안의
 * columnCalcs는 쓰지 않는다 — 가상 렌더와 같이 쓰면 스크롤 중 합계가 깜빡인다(DS1에서 확인).
 * 그리드 밖에 두되 같은 면·같은 선으로 이어 붙여 한 덩어리로 읽히게 한다.
 */
import { computed, onMounted, ref, watch } from 'vue'
import PageHead from '../app/PageHead.vue'
import QueryState from '../app/QueryState.vue'
import TabGrid from '../grid/TabGrid.vue'
import WsSearch from '../ws/WsSearch.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import { notify } from '../ws/notify'
import { badgeHtml } from '../ws/badge'
import { useMockQuery, ERROR_KEYWORD } from '../app/useMockQuery'
import { makeOrders, ORDER_STATUS, ORDER_STATUS_TONE, ORDER_CHANNELS } from '@fixtures/orders'
import { won } from '@fixtures/rng'

const SIZES = [1000, 30000, 100000, 300000]
const size = ref(1000)
const f = ref<{ keyword: string; status: string | null; channel: string | null }>({ keyword: '', status: null, channel: null })
const applied = ref({ ...f.value })
const selectedCount = ref(0)

const source = computed(() => makeOrders(size.value))

const { rows, loading, error, reload } = useMockQuery(
  () =>
    source.value.filter((o) => {
      const a = applied.value
      return (
        (!a.keyword || o.id.includes(a.keyword) || o.customer.includes(a.keyword) || o.product.includes(a.keyword)) &&
        (!a.status || o.status === a.status) &&
        (!a.channel || o.channel === a.channel)
      )
    }),
  { latency: 350, failIf: () => applied.value.keyword.includes(ERROR_KEYWORD) },
)
onMounted(reload)
watch(size, reload)

const sum = computed(() =>
  rows.value.reduce((s, o) => ({ amount: s.amount + o.amount, fee: s.fee + o.fee, settle: s.settle + o.settle }), { amount: 0, fee: 0, settle: 0 }),
)

const money = (c: any) => won(Number(c.getValue()))
const columns = [
  { title: '주문번호', field: 'id', width: 128, sorter: 'string', headerFilter: 'input' }, // frozen 없음 — 범위 선택(editable)과 섞이면 Tabulator가 동작을 보장하지 않는다
  { title: '주문일시', field: 'orderedAt', width: 138, sorter: 'string' },
  { title: '고객', field: 'customer', width: 90, sorter: 'string', headerFilter: 'input' },
  { title: '상품', field: 'product', minWidth: 170, sorter: 'string' },
  { title: '수량', field: 'qty', width: 68, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number' },
  { title: '결제금액', field: 'amount', width: 118, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: money },
  { title: '수수료', field: 'fee', width: 104, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: money },
  { title: '정산금액', field: 'settle', width: 118, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: money },
  { title: '채널', field: 'channel', width: 78, sorter: 'string' },
  { title: '상태', field: 'status', width: 92, hozAlign: 'center', headerHozAlign: 'center', sorter: 'string',
    formatter: (c: any) => badgeHtml(c.getValue(), ORDER_STATUS_TONE[c.getValue() as keyof typeof ORDER_STATUS_TONE]) },
]

const grid = ref<InstanceType<typeof TabGrid> | null>(null)
function search() { applied.value = { ...f.value }; reload() }
function reset() { f.value = { keyword: '', status: null, channel: null }; search() }
const SIZE_OPTS = SIZES.map((n) => ({ label: n >= 10000 ? `${n / 10000}만` : n.toLocaleString(), value: n }))
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="o-kw">검색어</label></th>
        <td><InputText id="o-kw" v-model="f.keyword" fluid placeholder="주문번호 · 고객 · 상품" /></td>
        <th scope="row"><label for="o-st">상태</label></th>
        <td>
          <Select v-model="f.status" input-id="o-st" :options="[...ORDER_STATUS]" placeholder="전체" show-clear fluid />
        </td>
        <th scope="row"><label for="o-ch">채널</label></th>
        <td>
          <Select v-model="f.channel" input-id="o-ch" :options="[...ORDER_CHANNELS]" placeholder="전체" show-clear fluid />
        </td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">주문 목록</h2>
          <span class="ws-total">총<strong>{{ rows.length.toLocaleString('ko-KR') }}</strong>건</span>
          <span class="ws-desc">선택 {{ selectedCount }}건</span>
        </div>
        <div class="ws-tit__r">
          <span id="o-size" class="ws-desc">데이터 규모</span>
          <SelectButton v-model="size" :options="SIZE_OPTS" option-label="label" option-value="value" :allow-empty="false" aria-labelledby="o-size" />
          <span class="ws-sep" aria-hidden="true" />
          <Button label="엑셀 내려받기" severity="secondary" outlined class="ws-line" @click="grid?.exportCsv('orders.csv'); notify('조회 결과 전체를 내려받습니다')" />
        </div>
      </div>

      <div class="ws-gv">
        <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="12" @retry="reload">
          <TabGrid ref="grid" :columns="columns" :rows="rows" editable height="440px" @selection-change="selectedCount = $event" />
          <!-- 합계 — 원본 gridFooterTDDefault 자리 -->
          <dl class="sum" aria-label="합계">
            <div><dt>결제금액 합계</dt><dd>{{ won(sum.amount) }}원</dd></div>
            <div><dt>수수료 합계</dt><dd>{{ won(sum.fee) }}원</dd></div>
            <div class="sum__key"><dt>정산금액 합계</dt><dd>{{ won(sum.settle) }}원</dd></div>
          </dl>
        </QueryState>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sum {
  display: flex; gap: var(--ws-gap-region); margin: 0;
  height: var(--ws-grid-row-h); padding: 0 16px; align-items: center;
  background: var(--ws-surface-head); border-top: 1px solid var(--ws-border-strong); border-bottom: 1px solid var(--ws-border);
}
.sum > div { display: flex; gap: var(--ws-gap-intra); align-items: baseline; }
.sum dt { color: var(--ws-text-sub); }
.sum dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
.sum__key { margin-left: auto; }
.sum__key dd { color: var(--ws-text-brand); }
</style>
