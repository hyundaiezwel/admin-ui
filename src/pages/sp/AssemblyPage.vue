<script setup lang="ts">
/**
 * 대외 제출 리포트(국회요구자료) — AS-IS S-006-05 (난이도 4, 리포트 9탭).
 *
 * 통계 화면이라 카드(D3). 탭이 아홉 개라 한 줄에 다 들어가지 않는다 — **탭 넘침**의 대표 화면이다.
 *   - PrimeVue Tabs `scrollable` — 넘치면 좌우 넘김 버튼이 생기고, 고른 탭은 보이는 자리로 따라온다
 *   - 탭 이름은 자르지 않는다. 대신 "무엇 × 무엇" 형태로 짧게 다듬었다(원 이름은 부제로)
 *   - 탭마다 기준(배치 · 기준일)과 내려받기가 같은 자리에 있다
 * 표 내용은 목업이다 — 축(지역 · 업종 · 기업구분 …)만 AS-IS를 따른다.
 */
import { computed, ref } from 'vue'
import PageHead from '../../app/PageHead.vue'
import DatePicker from 'primevue/datepicker'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import WsDownload from '../../ws/WsDownload.vue'
import { fmtDate } from '../../ws/period'
import { CO_FG, bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { rng } from '@fixtures/rng'
import { seedOf } from '@fixtures/sp'

const REGIONS = ['서울', '경기', '인천', '강원', '충청', '전라', '경상', '제주']
const GOODS = ['숙박', '여행 상품', '레저 · 입장권', '렌터카', '항공', '기타']
const REPORTS = [
  { id: 'r1', name: '상품유형 × 사용금액', rows: GOODS, cols: ['건수', '사용금액'] },
  { id: 'r2', name: '지역 × 사용금액(전체)', rows: REGIONS, cols: ['건수', '사용금액'] },
  { id: 'r3', name: '지역 × 사용금액(기업)', rows: REGIONS, cols: ['기업 수', '사용금액'] },
  { id: 'r4', name: '지역 × 판매현황(숙박)', rows: REGIONS, cols: ['예약 건수', '박 수', '판매금액'] },
  { id: 'r5', name: '지역 × 판매현황(업체)', rows: REGIONS, cols: ['업체 수', '판매금액'] },
  { id: 'r6', name: '기업유형 × 사용현황', rows: CO_FG.map((c) => c.label), cols: ['참여 인원', '사용금액', '1인당'] },
  { id: 'r7', name: '상품유형 × 사용현황', rows: GOODS, cols: ['참여 인원', '사용금액'] },
  { id: 'r8', name: '실적현황', rows: ['신청', '선정', '참여개시', '사용'], cols: ['기업', '인원', '금액'] },
  { id: 'r9', name: '업체현황', rows: GOODS, cols: ['제휴 업체', '신규', '해지'] },
]
const tab = ref('r1')
const at = ref(new Date())
const data = computed(() => Object.fromEntries(REPORTS.map((rep) => {
  const r = rng(seedOf(ctxKey() + rep.id + fmtDate(at.value)))
  return [rep.id, rep.rows.map(() => rep.cols.map((c) => Math.round((c.includes('금액') ? 1e8 : c === '1인당' ? 2e5 : 900) * (0.3 + r() * 1.4))))]
})))
const f = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page ws-page--canvas">
    <PageHead />

    <section class="ws-sec ws-card">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">보고 기준</h2>
          <span class="ws-fresh ws-fresh--batch">매일 00시 배치 집계 · {{ fmtDate(at) }} 00:00 기준</span>
        </div>
        <div class="ws-tit__r">
          <label for="as-at" class="ws-desc">보고일자</label>
          <DatePicker v-model="at" input-id="as-at" date-format="yy.mm.dd" show-icon icon-display="input" :max-date="new Date()" style="width: 160px" />
        </div>
      </div>
      <p class="ws-desc">참여년도와 보고일자의 연도가 같아야 한다(AS-IS 검증) — 지금 {{ ctx.year }}년 · {{ bizLabel(ctx.biz) }}</p>
    </section>

    <section class="ws-sec ws-card">
      <Tabs v-model:value="tab" scrollable>
        <TabList>
          <Tab v-for="(r, i) in REPORTS" :key="r.id" :value="r.id">{{ i + 1 }}. {{ r.name }}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel v-for="r in REPORTS" :key="r.id" :value="r.id">
            <div class="ws-tit" style="margin-bottom: 12px">
              <div class="ws-tit__l"><h3 class="ws-tit__h">{{ r.name }}</h3></div>
              <div class="ws-tit__r"><WsDownload :total="r.rows.length" :limit="10000" label="이 리포트 내려받기" /></div>
            </div>
            <table class="ws-gtb">
              <thead><tr><th scope="col">구분</th><th v-for="c in r.cols" :key="c" scope="col">{{ c }}</th></tr></thead>
              <tbody>
                <tr v-for="(row, i) in r.rows" :key="row"><th scope="row">{{ row }}</th><td v-for="(v, j) in data[r.id][i]" :key="j" class="ws-num">{{ f(v) }}</td></tr>
              </tbody>
              <tfoot>
                <tr><th scope="row">합계</th><td v-for="(c, j) in r.cols" :key="c" class="ws-num">{{ c === '1인당' ? '—' : f(data[r.id].reduce((s, x) => s + x[j], 0)) }}</td></tr>
              </tfoot>
            </table>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </section>
  </div>
</template>
