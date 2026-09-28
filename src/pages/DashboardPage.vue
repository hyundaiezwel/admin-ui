<script setup lang="ts">
/**
 * 대시보드 — KPI · 차트 3종 · 최근 문의. 드릴다운은 해당 목록 화면으로 보낸다.
 *
 * 원본 관리자센터 메인의 **요약 칸** 어휘를 따른다 — 흰 칸 · 1px #ccc · 모서리 6.
 * 그림자와 카드 여백을 늘리지 않는다. 폭을 2:1로 나눠 무게를 준다.
 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHead from '../app/PageHead.vue'
import QueryState from '../app/QueryState.vue'
import EzChart from '../app/EzChart.vue'
import { badgeClass } from '../ws/badge'
import { useMockQuery } from '../app/useMockQuery'
import { makeInquiries, STATUS_TONE } from '@fixtures/inquiries'
import { makeOrders } from '@fixtures/orders'
import { won } from '@fixtures/rng'

const router = useRouter()
const inquiries = makeInquiries(320)
const orders = makeOrders(500)

const { loading, error, reload } = useMockQuery(() => [1], { latency: 500 })
onMounted(reload)

const kpis = computed(() => [
  { label: '오늘 주문', value: won(orders.length), unit: '건', delta: '+12.4%', up: true, to: '/sales/orders' },
  { label: '결제 금액', value: won(Math.round(orders.reduce((s, o) => s + o.amount, 0) / 10000)), unit: '만원', delta: '+8.1%', up: true, to: '/sales/orders' },
  { label: '미답변 문의', value: won(inquiries.filter((i) => i.status === '접수' || i.status === '처리중').length), unit: '건', delta: '-3.0%', up: false, to: '/cs/inquiries' },
  { label: 'SLA 초과', value: won(inquiries.filter((i) => i.slaLeft < 0).length), unit: '건', delta: '+5건', up: false, danger: true, to: '/cs/inquiries' },
])

const days = Array.from({ length: 14 }, (_, i) => `9/${i + 6}`)
const trend = {
  tooltip: { trigger: 'axis' },
  legend: { data: ['주문', '취소'] },
  xAxis: { type: 'category', data: days },
  yAxis: { type: 'value' },
  series: [
    { name: '주문', type: 'line', smooth: true, areaStyle: { opacity: 0.12 }, data: days.map((_, i) => 120 + ((i * 37) % 90)) },
    { name: '취소', type: 'line', smooth: true, data: days.map((_, i) => 12 + ((i * 13) % 22)) },
  ],
}
const byChannel = {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [{
    type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'], label: { show: false },
    data: ['웹', '앱', '전화', '카카오', '이메일'].map((name) => ({ name, value: inquiries.filter((i) => i.channel === name).length })),
  }],
}
const CATS = ['배송', '환불', '결제', '쿠폰', '포인트']
const byCategory = {
  tooltip: { trigger: 'axis' },
  grid: { left: 56, top: 10, bottom: 24 },
  xAxis: { type: 'value' },
  yAxis: { type: 'category', data: CATS },
  series: [{ type: 'bar', barWidth: 14, data: CATS.map((c) => inquiries.filter((i) => i.category === c).length) }],
}
const recent = computed(() => inquiries.slice(0, 6))
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <QueryState :loading="loading" :error="error" :lines="3" @retry="reload">
      <ul class="kpis">
        <li v-for="k in kpis" :key="k.label">
          <RouterLink :to="k.to" class="kpi">
            <span class="kpi__label">{{ k.label }}</span>
            <span class="kpi__value" :class="{ 'is-danger': k.danger }">{{ k.value }}<small>{{ k.unit }}</small></span>
            <!-- 증감은 화살표 + 부호로 읽힌다. 색만으로 방향을 알리지 않는다 -->
            <span class="kpi__delta" :class="k.up ? 'is-up' : 'is-down'">{{ k.up ? '▲' : '▼' }} {{ k.delta }} <span class="ws-sr-only">전일 대비</span></span>
          </RouterLink>
        </li>
      </ul>
    </QueryState>

    <div class="ws-split ws-split--21">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">주문·취소 추이</h2><span class="ws-total">최근<strong>14</strong>일</span></div>
          <div class="ws-tit__r"><button type="button" class="ws-btn ws-btn--line" @click="router.push('/stats')">통계 자세히</button></div>
        </div>
        <div class="ws-chartbox"><EzChart :option="trend" height="260px" /></div>
      </section>
      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">문의 채널 구성</h2></div></div>
        <div class="ws-chartbox"><EzChart :option="byChannel" height="260px" /></div>
      </section>
    </div>

    <div class="ws-split ws-split--12">
      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">문의 분류별 건수</h2></div></div>
        <div class="ws-chartbox"><EzChart :option="byCategory" height="232px" /></div>
      </section>
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">최근 문의</h2></div>
          <div class="ws-tit__r"><RouterLink to="/cs/inquiries" class="ws-btn ws-btn--line">전체 보기</RouterLink></div>
        </div>
        <table class="ws-gtb recent">
          <caption class="ws-sr-only">최근 접수된 문의 6건</caption>
          <colgroup><col style="width: 11ch" /><col /><col style="width: 8ch" /><col style="width: 10ch" /></colgroup>
          <thead><tr><th scope="col">문의번호</th><th scope="col">제목</th><th scope="col">담당자</th><th scope="col">상태</th></tr></thead>
          <tbody>
            <tr v-for="r in recent" :key="r.id">
              <td>{{ r.id }}</td>
              <td class="trunc">{{ r.title }}</td>
              <td>{{ r.assignee }}</td>
              <td style="text-align: center"><span :class="badgeClass(STATUS_TONE[r.status])">{{ r.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<style scoped>
.kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--ws-gap-inter); }
.kpi {
  display: flex; flex-direction: column; gap: 6px; padding: 16px 20px;
  border: 1px solid var(--ws-border); border-radius: var(--ws-radius); background: var(--ws-surface);
  color: var(--ws-text); text-decoration: none;
}
.kpi:hover { border-color: var(--ws-field-border); text-decoration: none; }
.kpi__label { color: var(--ws-text-sub); }
.kpi__value { font-size: 26px; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; }
.kpi__value small { margin-left: 3px; font-size: var(--ws-font-size); font-weight: 400; color: var(--ws-text-muted); }
.kpi__value.is-danger { color: var(--ws-text-danger); }
.kpi__delta { font-size: var(--ws-font-size-sm); }
.kpi__delta.is-up { color: var(--ws-text-success); }
.kpi__delta.is-down { color: var(--ws-text-danger); }

.recent { table-layout: fixed; }
.trunc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
