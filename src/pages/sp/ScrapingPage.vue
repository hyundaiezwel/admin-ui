<script setup lang="ts">
/**
 * 스크래핑 적발 — AS-IS S-001-04 부정행위 관리(스크래핑) (난이도 5).
 *
 * 바꾼 것:
 *   ① 기본 기간을 **1개월**로 둔다. AS-IS 기본값은 오늘 하루라 화면을 열면 늘 0건이다
 *   ② 교차 집계를 **행 = 조치여부, 열 = 거래사이트**로 돌렸다. AS-IS는 한 줄에 25칸(5 × 5)을
 *      2단 머리글로 늘어놓아 "중고거래 A의 조치필요"를 찾으려면 머리글을 두 번 읽어야 한다
 *   ③ 연락처 · 이메일은 목록에서 가린다. AS-IS는 평문이다(09 개인정보)
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import RadioButton from 'primevue/radiobutton'
import WsSearch from '../../ws/WsSearch.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { parseDate, presetRange, PRESETS, type Range } from '../../ws/period'
import { mask } from '../../ws/mask'
import { badgeHtml } from '../../ws/badge'
import { usePaged } from '../../app/usePaged'
import { HANDLE, REPORT, SITES, USED_AFTER } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { memo } from '../../sp/stores'
import { makeScraping } from '@fixtures/sp'

const router = useRouter()
const blank = () => ({ range: presetRange(PRESETS[2]) as Range, basis: '실행일', handle: '', site: '', report: '' })
const f = ref(blank())
const applied = ref(blank())

const all = computed(() => memo('scrap', ctxKey(), () => makeScraping(ctxKey(), ctx.year)))
/** 기간만 건 집합 — 교차 집계는 조치여부 · 사이트 조건과 무관하게 그 기간 전체를 센다 */
const inPeriod = computed(() => all.value.filter((r) => {
  const d = parseDate(applied.value.basis === '실행일' ? r.runAt : r.regAt)
  const [a, b] = applied.value.range
  return (!a || !d || d >= a) && (!b || !d || d <= b)
}))
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() =>
  inPeriod.value.filter((r) => {
    const a = applied.value
    return (!a.handle || r.handle === a.handle) && (!a.site || r.site === a.site) && (!a.report || r.report === a.report)
  }),
)
onMounted(reload)
watch(ctxKey, () => requery())
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); search() }
function drill(handle: string, site: string) { f.value = { ...f.value, handle, site }; search() }

const cross = computed(() => {
  const rowsOf = [{ code: '', label: '전체' }, ...HANDLE]
  return rowsOf.map((h) => ({
    ...h,
    cells: ['', ...SITES].map((s) => inPeriod.value.filter((r) => (!h.code || r.handle === h.code) && (!s || r.site === s)).length),
  }))
})

const lbl = (list: { code: string; label: string }[], c: string) => list.find((x) => x.code === c)?.label ?? c
const columns = [
  { title: '번호', field: 'no', width: 68, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '실행일', field: 'runAt', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '거래사이트', field: 'site', width: 120 },
  {
    title: '글제목', field: 'title', minWidth: 180, formatter: (c: any) => `<a class="ws-celllink">${c.getValue()}</a>`,
    cellClick: (_: any, c: any) => router.push(`/sp/scraping/${c.getRow().getData().id}`),
  },
  { title: '닉네임', field: 'nick', width: 110 },
  { title: '연락처', field: 'phone', width: 124, formatter: (c: any) => mask(c.getValue(), 'phone') },
  { title: '이메일', field: 'email', width: 150, formatter: (c: any) => mask(c.getValue(), 'email') },
  { title: '참여자 특정', field: 'matched', width: 96, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? badgeHtml('특정', 'brand') : badgeHtml('못 함', 'mute')) },
  { title: '게시 후 포인트', field: 'usedAfter', width: 110, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => lbl(USED_AFTER, c.getValue()) },
  { title: '소명서', field: 'report', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => lbl(REPORT, c.getValue()) },
  { title: '게시글 삭제', field: 'deleted', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? '삭제됨' : '게시 중') },
  { title: '조치여부', field: 'handle', width: 96, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => { const h = HANDLE.find((x) => x.code === c.getValue()); return badgeHtml(h?.label ?? '', h?.tone) } },
]
const fmt = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['104px', '', '160px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="s-from">기간</label></th>
        <td colspan="3"><WsPeriod id="s-from" v-model="f.range" v-model:basis="f.basis" :bases="['실행일', '등록일']" /></td>
      </tr>
      <tr>
        <th scope="row">거래사이트</th>
        <td colspan="3">
          <div class="ws-choices" role="radiogroup" aria-label="거래사이트">
            <div class="ws-radio"><RadioButton v-model="f.site" input-id="s-site-all" name="s-site" value="" /><label for="s-site-all">전체</label></div>
            <div v-for="(s, i) in SITES" :key="s" class="ws-radio"><RadioButton v-model="f.site" :input-id="`s-site-${i}`" name="s-site" :value="s" /><label :for="`s-site-${i}`">{{ s }}</label></div>
          </div>
        </td>
      </tr>
      <tr>
        <th scope="row">조치여부</th>
        <td>
          <div class="ws-choices" role="radiogroup" aria-label="조치여부">
            <div class="ws-radio"><RadioButton v-model="f.handle" input-id="s-h-all" name="s-h" value="" /><label for="s-h-all">전체</label></div>
            <div v-for="h in HANDLE" :key="h.code" class="ws-radio"><RadioButton v-model="f.handle" :input-id="`s-h-${h.code}`" name="s-h" :value="h.code" /><label :for="`s-h-${h.code}`">{{ h.label }}</label></div>
          </div>
        </td>
        <th scope="row">소명서</th>
        <td>
          <div class="ws-choices" role="radiogroup" aria-label="소명서 제출여부">
            <div class="ws-radio"><RadioButton v-model="f.report" input-id="s-r-all" name="s-r" value="" /><label for="s-r-all">전체</label></div>
            <div v-for="r in REPORT" :key="r.code" class="ws-radio"><RadioButton v-model="f.report" :input-id="`s-r-${r.code}`" name="s-r" :value="r.code" /><label :for="`s-r-${r.code}`">{{ r.label }}</label></div>
          </div>
        </td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">거래사이트 × 조치여부</h2>
          <span class="ws-fresh ws-fresh--batch">매일 배치 수집</span>
          <span class="ws-desc">조회 기간 안의 적발 건수 · 숫자를 누르면 그 조건으로 목록을 조회한다</span>
        </div>
      </div>
      <table class="ws-gtb">
        <thead>
          <tr><th scope="col">조치여부</th><th scope="col">전체</th><th v-for="(s, i) in SITES" :key="s" scope="col" :class="{ g: i === 0 }">{{ s }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="h in cross" :key="h.label" :class="{ 'is-total': !h.code }">
            <th scope="row">{{ h.label }}</th>
            <td v-for="(n, j) in h.cells" :key="j" class="ws-num" :class="{ g: j === 1 }">
              <button v-if="n" type="button" class="ws-cell-link" :aria-label="`${h.label} · ${j ? SITES[j - 1] : '전체 사이트'} ${n}건 — 목록 조회`" @click="drill(h.code, j ? SITES[j - 1] : '')">{{ fmt(n) }}</button>
              <span v-else class="ws-cell-zero">0</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">적발 목록</h2><span class="ws-total">총<strong>{{ fmt(total) }}</strong>건</span></div>
        <div class="ws-tit__r"><WsDownload :total="total" :limit="10000" /></div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>연락처 · 이메일은 목록에서 가린다. 원문은 상세에서 열고, 열람이 기록된다.</li>
        <li>적발 → 소명 요구 → 조치 → 이용정지 → 참여불가 회원 등록이 상세 한 화면에서 이어진다.</li>
      </ul>
    </div>
  </div>
</template>
