<script setup lang="ts">
/**
 * 포인트 조회 — AS-IS S-004-01 (난이도 4).
 *
 * 회원별 배정 · 사용 · 잔여. AS-IS는 기업을 고르지 않으면 "회원별 내역 (총 0건)"만 뜨고 이유를
 * 말하지 않는다. 미리보기에서 바꾼 것:
 *   ① **조회 전에 필수 조건을 알린다** — 기업을 고르기 전에는 목록 자리에 "기업을 먼저 고르세요"
 *   ② 사용 경로 4갈래(기본 차감 · 온라인 · 복지카드 · 영수증)와 배정 두 값(초기 · 실)을 2단 머리글로
 *   ③ 포인트 종류 26개 체크박스 → 그룹 다중 선택(기본 재원 · 이벤트 · 비정산)
 *   ④ 행을 누르면 옆 패널 — 재원별(지원기관 · 기업 · 개인) 잔여와 사용 경로 합
 *   ⑤ 엑셀 두 종(목록 · 월별 전개 상세) — 상한 5만 건을 버튼 옆에
 */
import { computed, ref } from 'vue'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import Drawer from 'primevue/drawer'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsPickField, { type PickItem } from '../../ws/WsPickField.vue'
import WsMasked from '../../ws/WsMasked.vue'
import { mask } from '../../ws/mask'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { memo } from '../../sp/stores'
import { makeCompanies, makePoints, POINT_KINDS, EMP_STS, type PointRow } from '@fixtures/sp'

const cos = computed<PickItem[]>(() => memo('company', ctxKey(), () => makeCompanies(ctxKey(), ctx.year)).map((c) => ({ id: c.id, label: c.name, sub: c.bizNo })))
const blank = () => ({ co: null as PickItem | null, kinds: [] as string[], emp: '', kwType: '이름', kw: '' })
const f = ref(blank())
const applied = ref(blank())
const need = computed(() => (applied.value.co ? null : '기업을 먼저 고르세요 — 회원 포인트는 기업 단위로 조회한다'))

const all = computed(() => (applied.value.co ? memo('point', applied.value.co.id, () => makePoints(applied.value.co!.id)) : []))
const hit = (r: PointRow) => {
  const a = applied.value
  const k = a.kw.trim()
  const field = a.kwType === '이름' ? r.name : a.kwType === '사번' ? r.empNo : r.birth
  return (!a.emp || r.emp === a.emp) && (!k || field.includes(k))
}
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => all.value.filter(hit))
function search() {
  if (!f.value.co) { notify('기업을 먼저 고르세요', 'warning'); return }
  applied.value = { ...f.value }
  requery()
}
function reset() { f.value = blank(); applied.value = blank(); requery() }

const sum = computed(() => {
  const list = all.value.filter(hit)
  const s = (k: keyof PointRow) => list.reduce((t, r) => t + (r[k] as number), 0)
  return { init: s('init'), real: s('real'), used: s('base') + s('online') + s('card') + s('receipt'), remain: s('remain') }
})
const won = (x: number) => x.toLocaleString('ko-KR')
const n = (c: any) => won(c.getValue())
const columns = [
  { title: '번호', field: 'no', width: 64, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '이름', field: 'name', width: 84, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
  { title: '사번', field: 'empNo', width: 84, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '부서', field: 'dept', width: 110 },
  { title: '재직', field: 'emp', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '배정', headerHozAlign: 'center', cssClass: 'ws-col-g', columns: [
    { title: '초기', field: 'init', width: 92, hozAlign: 'right', headerHozAlign: 'center', formatter: n, cssClass: 'ws-col-g' },
    { title: '실배정', field: 'real', width: 92, hozAlign: 'right', headerHozAlign: 'center', formatter: n },
  ] },
  { title: '사용', headerHozAlign: 'center', cssClass: 'ws-col-g', columns: [
    { title: '기본 차감', field: 'base', width: 92, hozAlign: 'right', headerHozAlign: 'center', formatter: n, cssClass: 'ws-col-g' },
    { title: '온라인', field: 'online', width: 92, hozAlign: 'right', headerHozAlign: 'center', formatter: n },
    { title: '복지카드', field: 'card', width: 92, hozAlign: 'right', headerHozAlign: 'center', formatter: n },
    { title: '영수증', field: 'receipt', width: 84, hozAlign: 'right', headerHozAlign: 'center', formatter: n },
  ] },
  { title: '잔여', field: 'remain', width: 100, hozAlign: 'right', headerHozAlign: 'center', sorter: 'number', formatter: n, cssClass: 'ws-col-g' },
]

const panel = ref(false)
const cur = ref<PointRow | null>(null)
function open(r: PointRow) { cur.value = r; panel.value = true }
/** 재원 비율 — 지원기관 1 : 기업 1 : 개인 2. 사용은 세 재원에서 비율대로 동시에 빠진다 */
const byFund = (x: number) => [['지원기관', x / 4], ['기업', x / 4], ['개인', x / 2]] as [string, number][]
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['104px', '', '160px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row" class="req"><label for="pt-co">기업</label></th>
        <td><WsPickField id="pt-co" v-model="f.co" :items="cos" header="기업 찾기" placeholder="찾기로 기업 선택 — 필수" /></td>
        <th scope="row"><label for="pt-k">포인트 종류</label></th>
        <td>
          <MultiSelect
            v-model="f.kinds" input-id="pt-k" :options="POINT_KINDS" option-group-label="group" option-group-children="items"
            placeholder="전체" :max-selected-labels="2" selected-items-label="{0}종 선택" fluid filter
          />
        </td>
      </tr>
      <tr>
        <th scope="row"><label for="pt-kw">검색어</label></th>
        <td>
          <div class="ws-kw">
            <Select v-model="f.kwType" :options="['이름', '사번', '생년월일']" aria-label="검색어 구분" class="ws-kw__type" />
            <InputText id="pt-kw" v-model="f.kw" fluid :placeholder="`${f.kwType} 입력`" />
          </div>
        </td>
        <th scope="row"><label for="pt-emp">재직 상태</label></th>
        <td><Select v-model="f.emp" input-id="pt-emp" :options="['', ...EMP_STS].map((v) => ({ v, l: v || '전체' }))" option-label="l" option-value="v" placeholder="전체" fluid /></td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">포인트 합계</h2>
          <span class="ws-fresh ws-fresh--live">실시간</span>
          <span class="ws-desc">{{ ctx.year }}.01.01 ~ {{ ctx.year }}.12.31 · {{ bizLabel(ctx.biz) }}{{ applied.co ? ` · ${applied.co.label}` : '' }}</span>
        </div>
      </div>
      <dl class="sm">
        <div><dt>초기 배정</dt><dd>{{ applied.co ? won(sum.init) : '—' }}</dd></div>
        <div><dt>사용 가능(실배정)</dt><dd>{{ applied.co ? won(sum.real) : '—' }}</dd></div>
        <div><dt>사용</dt><dd>{{ applied.co ? won(sum.used) : '—' }}</dd></div>
        <div><dt>잔여</dt><dd>{{ applied.co ? won(sum.remain) : '—' }}</dd></div>
      </dl>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">회원별 내역</h2><span class="ws-total">총<strong>{{ won(total) }}</strong>명</span></div>
        <div class="ws-tit__r">
          <WsDownload :total="total" :limit="50000" label="목록 내려받기" />
          <WsDownload :total="total * 12" :limit="50000" label="월별 상세 내려받기" />
        </div>
      </div>
      <div v-if="need" class="ws-empty need" role="status">
        <p><b>{{ need }}</b></p>
        <p class="ws-desc">AS-IS는 이때 "총 0건"만 보여 줬다 — 빈 결과와 조건 부족을 구분한다.</p>
      </div>
      <template v-else>
        <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
          <TabGrid :columns="columns" :rows="rows" height="auto" @row-click="open" />
        </QueryState>
        <WsPager v-model:first="first" v-model:rows="size" :total="total" />
      </template>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>사용 1건은 세 재원(지원기관 1 : 기업 1 : 개인 2)에서 비율대로 동시에 빠진다. 행을 누르면 재원별로 나눠 보인다.</li>
        <li>초기 배정과 실배정이 다르면 배정 뒤 조정(추가 · 이벤트)이 있었다는 뜻이다.</li>
      </ul>
    </div>

    <Drawer v-model:visible="panel" position="right" :style="{ width: '520px' }" :header="cur ? `${mask(cur.name, 'name')} 포인트` : ''">
      <div v-if="cur" class="pn">
        <table class="ws-tb">
          <colgroup><col style="width: 100px" /><col /></colgroup>
          <tbody>
            <tr><th scope="row">이름</th><td><WsMasked :value="cur.name" kind="name" label="회원 이름" /></td></tr>
            <tr><th scope="row">생년월일</th><td><WsMasked :value="cur.birth" kind="birth" label="생년월일" /></td></tr>
            <tr><th scope="row">사번 · 부서</th><td>{{ cur.empNo }} · {{ cur.dept }} · {{ cur.emp }}</td></tr>
          </tbody>
        </table>
        <table class="ws-gtb">
          <caption class="cap">재원별</caption>
          <thead><tr><th scope="col">재원</th><th scope="col">배정</th><th scope="col">사용</th><th scope="col">잔여</th></tr></thead>
          <tbody>
            <tr v-for="([k, v], i) in byFund(cur.real)" :key="k">
              <th scope="row">{{ k }}</th><td class="ws-num">{{ won(v) }}</td>
              <td class="ws-num">{{ won(byFund(cur.real - cur.remain)[i][1]) }}</td><td class="ws-num">{{ won(byFund(cur.remain)[i][1]) }}</td>
            </tr>
          </tbody>
          <tfoot><tr><th scope="row">합계</th><td class="ws-num">{{ won(cur.real) }}</td><td class="ws-num">{{ won(cur.real - cur.remain) }}</td><td class="ws-num">{{ won(cur.remain) }}</td></tr></tfoot>
        </table>
        <table class="ws-gtb">
          <caption class="cap">사용 경로</caption>
          <thead><tr><th scope="col">기본 차감</th><th scope="col">온라인</th><th scope="col">복지카드</th><th scope="col">영수증</th></tr></thead>
          <tbody><tr><td class="ws-num">{{ won(cur.base) }}</td><td class="ws-num">{{ won(cur.online) }}</td><td class="ws-num">{{ won(cur.card) }}</td><td class="ws-num">{{ won(cur.receipt) }}</td></tr></tbody>
        </table>
      </div>
    </Drawer>
  </div>
</template>

<style scoped>
.sm { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.sm div { padding: 12px 16px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); }
.sm dt { color: var(--ws-text-sub); font-size: var(--ws-font-size-md); }
.sm dd { margin-top: 2px; font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.need { border: 1px dashed var(--ws-field-border); border-radius: var(--ws-radius); }
.pn { display: grid; gap: var(--ws-gap-block); }
.cap { caption-side: top; padding-bottom: 6px; text-align: left; font-weight: 600; }
</style>
