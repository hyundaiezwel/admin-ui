<script setup lang="ts">
/**
 * 통계 — 차트 전 종류 + 표·차트 병치.
 *
 * 원본에는 카드가 없다. 구획 제목 + 테두리 상자로 평면에 둔다 — 그림자는 원본 어휘가 아니다.
 * 원본 차트는 FusionCharts(상용)라 옮겨 오지 않았고 ECharts로 대신 그린다.
 *
 * 패턴(`aria.decal`)은 쓰지 않는다(사용자 결정). 그래서 이 화면은 **범례를 빼면 안 된다** —
 * 계열이 가장 많은 화면이라 색 하나가 구분을 다 진다.
 */
import { computed, onMounted, ref } from 'vue'
import PageHead from '../app/PageHead.vue'
import QueryState from '../app/QueryState.vue'
import EzChart from '../app/EzChart.vue'
import { useMockQuery } from '../app/useMockQuery'
import { won } from '@fixtures/rng'

const RANGES = ['7일', '14일', '30일', '90일']
const range = ref('30일')
const days = computed(() => {
  const n = Number(range.value.replace('일', ''))
  return Array.from({ length: n }, (_, i) => `${Math.floor(i / 30) + 8}/${(i % 30) + 1}`)
})

const { loading, error, reload } = useMockQuery(() => [1], { latency: 500 })
onMounted(reload)

const CHANNELS = ['웹', '앱', '제휴몰']
const CATEGORIES = ['상품권', '건강', '여행', '문화', '도서']

const stacked = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { data: CHANNELS },
  xAxis: { type: 'category', data: days.value },
  yAxis: { type: 'value' },
  series: CHANNELS.map((name, ci) => ({
    name, type: 'bar', stack: 'total', barMaxWidth: 20,
    data: days.value.map((_, i) => 30 + ((i * (7 + ci * 5)) % 60)),
  })),
}))

const combo = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['매출', '건수'] },
  xAxis: { type: 'category', data: days.value },
  yAxis: [{ type: 'value', name: '매출(만원)' }, { type: 'value', name: '건수', splitLine: { show: false } }],
  series: [
    { name: '매출', type: 'bar', barMaxWidth: 18, data: days.value.map((_, i) => 800 + ((i * 53) % 700)) },
    { name: '건수', type: 'line', yAxisIndex: 1, smooth: true, data: days.value.map((_, i) => 40 + ((i * 11) % 50)) },
  ],
}))

const donut = {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [{ type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'], label: { show: false }, data: CATEGORIES.map((name, i) => ({ name, value: 120 + i * 47 })) }],
}

/** 요일 × 시간대. 색 하나로만 값을 나르므로 visualMap 범례를 반드시 같이 둔다 */
const heat = {
  tooltip: { position: 'top' },
  grid: { left: 40, right: 16, top: 10, bottom: 56 },
  xAxis: { type: 'category', data: Array.from({ length: 12 }, (_, i) => `${i * 2}시`), splitArea: { show: true } },
  yAxis: { type: 'category', data: ['월', '화', '수', '목', '금', '토', '일'], splitArea: { show: true } },
  visualMap: { min: 0, max: 100, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 90, inRange: { color: ['#eaf2fd', '#2f80ed'] } },
  series: [{ type: 'heatmap', data: Array.from({ length: 7 }, (_, d) => Array.from({ length: 12 }, (_, h) => [h, d, (d * 17 + h * 13) % 100])).flat() }],
}

const table = computed(() =>
  CATEGORIES.map((c, i) => {
    const amount = 12000000 + i * 3400000
    return { category: c, count: 120 + i * 47, amount, avg: Math.round(amount / (120 + i * 47)) }
  }),
)
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">조회 기간</h2></div>
        <div class="ws-tit__r">
          <div class="ws-seg" role="radiogroup" aria-label="조회 기간">
            <label v-for="r in RANGES" :key="r"><input v-model="range" type="radio" name="st-range" :value="r" /><span>{{ r }}</span></label>
          </div>
          <span class="ws-sep" aria-hidden="true" />
          <button type="button" class="ws-btn ws-btn--line">엑셀 내려받기</button>
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :lines="8" @retry="reload">
        <div class="ws-chartbox"><EzChart :option="stacked" height="280px" /></div>
      </QueryState>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">매출·건수</h2></div></div>
      <div class="ws-chartbox"><EzChart :option="combo" height="280px" /></div>
    </section>

    <div class="ws-split">
      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">분류 구성</h2></div></div>
        <div class="ws-chartbox"><EzChart :option="donut" height="260px" /></div>
      </section>
      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">요일·시간대 주문 밀도</h2></div></div>
        <div class="ws-chartbox"><EzChart :option="heat" height="260px" /></div>
      </section>
    </div>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">분류별 집계</h2></div></div>
      <table class="ws-gtb">
        <caption class="ws-sr-only">분류별 주문 건수와 매출</caption>
        <thead><tr><th scope="col">분류</th><th scope="col">건수</th><th scope="col">매출</th><th scope="col">건단가</th></tr></thead>
        <tbody>
          <tr v-for="r in table" :key="r.category">
            <td>{{ r.category }}</td>
            <td class="ws-num">{{ won(r.count) }}</td>
            <td class="ws-num">{{ won(r.amount) }}원</td>
            <td class="ws-num">{{ won(r.avg) }}원</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">합계</th>
            <td class="ws-num">{{ won(table.reduce((s, r) => s + r.count, 0)) }}</td>
            <td class="ws-num">{{ won(table.reduce((s, r) => s + r.amount, 0)) }}원</td>
            <td class="ws-num">—</td>
          </tr>
        </tfoot>
      </table>
    </section>
  </div>
</template>
