<script setup lang="ts">
/**
 * 일일 리포트 — AS-IS S-006-04 (배치 의존, 템플릿 4탭, 엑셀 3종).
 *
 * 통계 화면이라 **카드**다(D3 — 대시보드 · 통계는 카드, 목록 · 폼은 평평하게).
 *
 * AS-IS는 "배치 집계라 실시간과 다를 수 있다"를 빨간 본문 글자로 적었다. 여기서는
 * 집계 기준을 제목 옆 표시로 올리고 **기준 시각**을 박는다 — 두 화면 숫자가 다를 때
 * 어느 쪽이 언제 값인지 바로 알 수 있어야 한다(D-10).
 * 템플릿 본문은 보고용 문장이라 복사 버튼을 붙인다(AS-IS는 긁어서 복사했다).
 */
import { computed, ref } from 'vue'
import PageHead from '../../app/PageHead.vue'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import WsDownload from '../../ws/WsDownload.vue'
import { fmtDate } from '../../ws/period'
import { notify } from '../../ws/notify'
import { BIZ, CO_FG, bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { rng } from '@fixtures/rng'
import { seedOf } from '@fixtures/sp'

const at = ref<Date>(new Date())
const busy = ref(false)
const made = ref<string | null>(null)
function generate() {
  busy.value = true
  setTimeout(() => { busy.value = false; made.value = new Date().toTimeString().slice(0, 8); notify('리포트를 만들었습니다', 'success') }, 900)
}

const d = computed(() => {
  const r = rng(seedOf(ctxKey() + fmtDate(at.value)))
  const k = (n: number) => Math.round(n * (0.7 + r() * 0.6))
  return {
    day: { apply: k(15), applyCo: k(6), confirm: k(12), confirmCo: k(8) },
    total: { apply: k(160_000), applyCo: k(20_000), confirm: k(120_000), confirmCo: k(12_000) },
    point: { buy: [k(130_000_000), k(1_000)], cancel: [-k(40_000_000), k(300)], net: [k(90_000_000), k(700)], all: [k(30_000_000_000), k(220_000)] },
    byCo: CO_FG.map((c) => ({ label: c.label, apply: k(20_000), confirm: k(16_000) })),
    byBiz: BIZ.map((b, i) => ({ label: b.label, confirm: k([90_000, 30_000, 6_000, 400][i]), used: k([2e10, 7e9, 1e9, 1e8][i]) })),
  }
})
const md = computed(() => { const x = at.value; return `${String(x.getMonth() + 1).padStart(2, '0')}/${String(x.getDate()).padStart(2, '0')}` })
const f = (n: number) => n.toLocaleString('ko-KR')
const text1 = computed(() => [
  `<일일 신청현황 (${md.value})>`, `- 신청인원 및 신청기업 : ${f(d.value.day.apply)}명 (${f(d.value.day.applyCo)}개사)`,
  `<일일 확정현황 (${md.value})>`, `- 확정인원 및 확정기업 : ${f(d.value.day.confirm)}명 (${f(d.value.day.confirmCo)}개사)`,
  `<전체 확정현황 (01/30 ~ ${md.value})>`, `- 확정인원 및 확정기업 : ${f(d.value.total.confirm)}명 (${f(d.value.total.confirmCo)}개사)`,
  `<포인트 사용현황 (${md.value})>`, `- 최종금액 및 최종건수 : ${f(d.value.point.all[0])}원 (${f(d.value.point.all[1])}건)`,
].join('\n'))
async function copy(t: string) {
  try { await navigator.clipboard.writeText(t); notify('보고 문구를 복사했습니다', 'success') } catch { notify('복사하지 못했습니다 — 브라우저 권한을 확인하세요', 'danger') }
}
const ymd = computed(() => fmtDate(at.value).replace(/\./g, ''))
const files = computed(() => [
  { name: `지원사업_신청현황_${ymd.value}.xlsx`, rows: 20_000 },
  { name: `지원사업_포인트_사용현황_${ymd.value}.xlsx`, rows: 8_412 },
  { name: `지원사업_최종_참여기업_목록_${ymd.value}.xlsx`, rows: 12_000 },
])
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
      </div>
      <div class="gen">
        <label for="dr-at">보고일자</label>
        <DatePicker v-model="at" input-id="dr-at" date-format="yy.mm.dd" show-icon icon-display="input" :max-date="new Date()" style="width: 160px" />
        <span class="ws-desc">{{ ctx.year }}년 {{ bizLabel(ctx.biz) }}</span>
        <Button :label="busy ? '만드는 중…' : '리포트 생성'" severity="contrast" :loading="busy" @click="generate" />
        <span v-if="made" class="ws-desc" role="status">{{ made }}에 만들었다</span>
      </div>
      <p class="ws-desc" style="margin-top: 8px">실시간 조회 화면(접수·자격심사 등)과 숫자가 다를 수 있다 — 기준 시각이 다르다.</p>
    </section>

    <div class="ws-split ws-split--12">
      <section class="ws-sec ws-card">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">엑셀 파일</h2></div></div>
        <ul class="fl">
          <li v-for="x in files" :key="x.name">
            <span class="fl__n">{{ x.name }}</span>
            <WsDownload :total="x.rows" :limit="50000" label="내려받기" />
          </li>
        </ul>
        <p class="ws-desc">파일이 크면 몇 분 걸린다 — 받는 중에도 다른 화면을 쓸 수 있다.</p>
      </section>

      <section class="ws-sec ws-card">
        <Tabs value="t1">
          <TabList>
            <Tab value="t1">템플릿 1 · 요약</Tab>
            <Tab value="t2">템플릿 2 · 기업구분별</Tab>
            <Tab value="t3">템플릿 3 · 사업별</Tab>
            <Tab value="t4">템플릿 4 · 보고 문구</Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="t1">
              <div class="kp">
                <div class="kp__i"><span>일일 신청</span><b>{{ f(d.day.apply) }}<small>명</small></b><em>{{ f(d.day.applyCo) }}개사</em></div>
                <div class="kp__i"><span>일일 확정</span><b>{{ f(d.day.confirm) }}<small>명</small></b><em>{{ f(d.day.confirmCo) }}개사</em></div>
                <div class="kp__i"><span>전체 신청</span><b>{{ f(d.total.apply) }}<small>명</small></b><em>{{ f(d.total.applyCo) }}개사</em></div>
                <div class="kp__i"><span>전체 확정</span><b>{{ f(d.total.confirm) }}<small>명</small></b><em>{{ f(d.total.confirmCo) }}개사</em></div>
              </div>
              <table class="ws-gtb" style="margin-top: 16px">
                <caption class="cap">포인트 사용현황 ({{ md }})</caption>
                <thead><tr><th scope="col">구분</th><th scope="col">금액</th><th scope="col">건수</th></tr></thead>
                <tbody>
                  <tr><th scope="row">구매</th><td class="ws-num">{{ f(d.point.buy[0]) }}원</td><td class="ws-num">{{ f(d.point.buy[1]) }}</td></tr>
                  <tr><th scope="row">취소</th><td class="ws-num">{{ f(d.point.cancel[0]) }}원</td><td class="ws-num">{{ f(d.point.cancel[1]) }}</td></tr>
                  <tr><th scope="row">종합</th><td class="ws-num">{{ f(d.point.net[0]) }}원</td><td class="ws-num">{{ f(d.point.net[1]) }}</td></tr>
                  <tr class="is-total"><th scope="row">최종(누적)</th><td class="ws-num">{{ f(d.point.all[0]) }}원</td><td class="ws-num">{{ f(d.point.all[1]) }}</td></tr>
                </tbody>
              </table>
            </TabPanel>
            <TabPanel value="t2">
              <table class="ws-gtb">
                <thead><tr><th scope="col">기업구분</th><th scope="col">신청 인원</th><th scope="col">확정 인원</th><th scope="col">확정률</th></tr></thead>
                <tbody>
                  <tr v-for="c in d.byCo" :key="c.label"><th scope="row">{{ c.label }}</th><td class="ws-num">{{ f(c.apply) }}</td><td class="ws-num">{{ f(c.confirm) }}</td><td class="ws-num">{{ ((c.confirm / c.apply) * 100).toFixed(1) }}%</td></tr>
                </tbody>
              </table>
            </TabPanel>
            <TabPanel value="t3">
              <table class="ws-gtb">
                <thead><tr><th scope="col">사업</th><th scope="col">확정 인원</th><th scope="col">포인트 사용액</th></tr></thead>
                <tbody>
                  <tr v-for="b in d.byBiz" :key="b.label" :class="{ 'is-ctx': b.label === bizLabel(ctx.biz) }"><th scope="row">{{ b.label }}</th><td class="ws-num">{{ f(b.confirm) }}</td><td class="ws-num">{{ f(b.used) }}원</td></tr>
                </tbody>
              </table>
            </TabPanel>
            <TabPanel value="t4">
              <pre class="rp">{{ text1 }}</pre>
              <div style="margin-top: 8px; text-align: right"><Button label="보고 문구 복사" severity="secondary" outlined @click="copy(text1)" /></div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </section>
    </div>
  </div>
</template>

<style scoped>
.gen { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.fl { display: grid; gap: 8px; margin-bottom: 8px; }
.fl li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--ws-border-lighter); }
.fl__n { min-width: 0; overflow-wrap: anywhere; font-size: var(--ws-font-size-md); }
.kp { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kp__i { display: grid; gap: 4px; padding: 14px 16px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); }
.kp__i span { color: var(--ws-text-sub); font-size: var(--ws-font-size-md); }
.kp__i b { font-size: 22px; font-variant-numeric: tabular-nums; }
.kp__i b small { margin-left: 2px; font-size: var(--ws-font-size-md); font-weight: 400; }
.kp__i em { color: var(--ws-text-muted); font-style: normal; font-size: var(--ws-font-size-md); }
.cap { caption-side: top; padding-bottom: 6px; text-align: left; font-weight: 600; }
.rp { margin: 0; padding: 16px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); background: var(--ws-surface-sunken); font: inherit; line-height: 1.8; white-space: pre-wrap; }
</style>
