<script setup lang="ts">
/**
 * 참여 기업 관리 — AS-IS S-003-05 기업관리 + S-003-12 RPA 축소판 (난이도 5).
 *
 * 승인 이후 기업의 모든 처리가 여기서 일어난다: 참여개시 · 입금기한 변경 · 승인취소 · 확인서 파기 ·
 * 추가 인원 심사 · 취소공문. AS-IS 목록은 20열, 상태 라디오 15개, 행마다 다른 버튼이다.
 *
 * 미리보기에서 바꾼 것:
 *   ① 상태 15개 → **건수 붙은 단계 탭 6개**(+ 참여개시 하위 칩). 누르면 바로 거른다
 *   ② 행 버튼 → **처리 메뉴 하나**. 그 상태에서 할 수 있는 것만 뜬다(src/sp/company.ts 한 표)
 *   ③ 일괄 버튼에 **적격 건수**를 먼저 보인다 — "12곳 중 8곳". AS-IS는 실행 뒤에 실패로 알았다
 *   ④ 20열 → 기본 열 + **열 묶음 표시 설정**. 계좌 · 첨부 · 환불은 필요할 때 켠다
 *   ⑤ 행을 누르면 **옆 패널** — 계좌 인증 · 통장사본 · 취소공문 · 메모를 목록을 떠나지 않고
 *   ⑥ 입금기한 변경에 **처리 경로(에스크로)**를 드러낸다. AS-IS는 같은 버튼이 몰래 다른 경로를 탔다
 *   ⑦ 전체 승인취소(AS-IS의 조건 없는 일괄)는 없앴다 — 선택 승인취소만, 대량은 일괄 참여 취소 흐름으로
 */
import { computed, onMounted, ref, watch } from 'vue'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Drawer from 'primevue/drawer'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import MultiSelect from 'primevue/multiselect'
import RadioButton from 'primevue/radiobutton'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsCountTabs, { type CountTab } from '../../ws/WsCountTabs.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsResultDialog, { type ResultItem } from '../../ws/WsResultDialog.vue'
import WsFileView from '../../ws/WsFileView.vue'
import WsMasked from '../../ws/WsMasked.vue'
import WsUpload from '../../ws/WsUpload.vue'
import SpStatus from '../../sp/SpStatus.vue'
import { fmtDate } from '../../ws/period'
import { mask } from '../../ws/mask'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { statusHtml } from '../../sp/status'
import { bizLabel, coFgLabel, stateOf } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { memo } from '../../sp/stores'
import { ACTION_LABEL, BULK, PER_HEAD, REFUND_LABEL, TABS, STATES_IN_SCREEN, allowed, allowedByState, type Action } from '../../sp/company'
import { makeCompanies, type CompanyRow } from '@fixtures/sp'

const KW = ['기업명', '사업자번호', '가상계좌번호', '기업계좌번호', '소재지', '참여경로']
const blank = () => ({ kwType: '기업명', kw: '', growth: '', refund: '', cancelDoc: '', hire: '' })
const f = ref(blank())
const applied = ref(blank())
const tab = ref('all')
const sub = ref<string | null>(null)

const all = computed(() => memo('company', ctxKey(), () => makeCompanies(ctxKey(), ctx.year)))
const byForm = (r: CompanyRow) => {
  const a = applied.value
  const k = a.kw.trim()
  const field = { 기업명: r.name, 사업자번호: r.bizNo, 가상계좌번호: r.vacct, 기업계좌번호: r.acct, 소재지: r.region, 참여경로: r.channel }[a.kwType] ?? ''
  return (!k || field.includes(k)) && (!a.growth || (a.growth === 'Y') === r.growth) && (!a.refund || r.refund === a.refund) &&
    (!a.cancelDoc || (a.cancelDoc === 'Y') === r.cancelDoc) && (!a.hire || (a.hire === 'Y') === r.hire.yn)
}
/** 조회 조건만 건 집합 — 탭 건수는 이것으로 센다(탭을 바꿔도 다른 탭 숫자가 변하지 않게) */
const base = computed(() => all.value.filter(byForm))
const codesOf = () => (sub.value ? [sub.value] : TABS.find((t) => t.id === tab.value)!.codes)

const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => base.value.filter((r) => codesOf().includes(r.sts)), {
  failIf: () => applied.value.kw.includes(ERROR_KEYWORD),
})
onMounted(reload)
watch(ctxKey, () => requery())
watch([tab, sub], () => requery())
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); tab.value = 'all'; sub.value = null; search() }

const tabs = computed<CountTab[]>(() => TABS.map((t) => ({
  id: t.id, label: t.label, count: base.value.filter((r) => t.codes.includes(r.sts)).length,
  subs: t.id === 'active' ? t.codes.map((c) => ({ id: c, label: (stateOf(c)?.label ?? c).replace('참여개시·', ''), count: base.value.filter((r) => r.sts === c).length })) : undefined,
})))

/* --- 목록 --------------------------------------------------------------- */
const grid = ref<InstanceType<typeof TabGrid> | null>(null)
const sel = ref<CompanyRow[]>([])
function onSel() { sel.value = (grid.value?.selectedData() ?? []) as CompanyRow[] }

/** 기본 열은 한 화면(1440)에 들어가게 — 나머지는 묶음으로 켠다. AS-IS는 20열을 늘 다 폈다 */
const GROUPS = ['계좌번호', '첨부', '환불수단', '발전모델 · 장애인 채용']
const shown = ref<string[]>([])
const n = (c: any) => Number(c.getValue()).toLocaleString('ko-KR')
const yes = (ok: string, no: string, tone = 'danger') => (c: any) => (c.getValue() ? `<span class="ws-badge ws-badge--success">${ok}</span>` : `<span class="ws-badge ws-badge--${tone}">${no}</span>`)
const columns = computed(() => [
  { title: '번호', field: 'no', width: 64, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '기업명', field: 'name', minWidth: 160 },
  { title: '사업자번호', field: 'bizNo', width: 118, hozAlign: 'center', headerHozAlign: 'center' },
  ...(shown.value.includes('발전모델 · 장애인 채용') ? [
    { title: '발전모델', field: 'growth', width: 78, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? '대상' : '비대상') },
    { title: '장애인 채용', headerHozAlign: 'center', cssClass: 'ws-col-g', columns: [
      { title: '여부', field: 'hire', width: 58, hozAlign: 'center', headerHozAlign: 'center', cssClass: 'ws-col-g', formatter: (c: any) => (c.getValue().yn ? '채용' : '—') },
      { title: '인원', field: 'hire', width: 58, hozAlign: 'right', headerHozAlign: 'center', formatter: (c: any) => (c.getValue().yn ? c.getValue().hired : '') },
    ] },
  ] : []),
  { title: '참여인원', headerHozAlign: 'center', cssClass: 'ws-col-g', columns: [
    { title: '최초', field: 'first', width: 62, hozAlign: 'right', headerHozAlign: 'center', sorter: 'number', formatter: n, cssClass: 'ws-col-g' },
    { title: '추가', field: 'added', width: 62, hozAlign: 'right', headerHozAlign: 'center', sorter: 'number', formatter: n },
    { title: '최종', field: 'final', width: 62, hozAlign: 'right', headerHozAlign: 'center', sorter: 'number', formatter: n },
  ] },
  { title: '추가 신청', field: 'addReq', width: 84, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? `<span class="ws-badge ws-badge--warning">${c.getValue()}명 대기</span>` : '') },
  { title: '계좌인증', field: 'acctOk', width: 80, hozAlign: 'center', headerHozAlign: 'center', formatter: yes('인증', '미인증') },
  ...(shown.value.includes('계좌번호') ? [{ title: '계좌번호', headerHozAlign: 'center', cssClass: 'ws-col-g', columns: [
    { title: '가상계좌', field: 'vacct', width: 132, hozAlign: 'center', headerHozAlign: 'center', cssClass: 'ws-col-g' },
    { title: '기업계좌', field: 'acct', width: 132, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'account') },
  ] }] : []),
  ...(shown.value.includes('첨부') ? [{ title: '첨부', headerHozAlign: 'center', cssClass: 'ws-col-g', columns: [
    { title: '통장사본', field: 'bankCopy', width: 76, hozAlign: 'center', headerHozAlign: 'center', cssClass: 'ws-col-g', formatter: yes('있음', '없음', 'warning') },
    { title: '취소공문', field: 'cancelDoc', width: 76, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? '등록' : '—') },
  ] }] : []),
  ...(shown.value.includes('환불수단') ? [{ title: '환불수단', field: 'refund', width: 92, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => REFUND_LABEL[c.getValue() as 'C'] }] : []),
  { title: '입금기한', field: 'due', width: 100, hozAlign: 'center', headerHozAlign: 'center', cssClass: 'ws-col-g' },
  { title: '상태', field: 'sts', width: 150, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => statusHtml(c.getValue()) },
  {
    title: '처리', field: 'id', width: 84, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
    formatter: (c: any) => `<button type="button" class="ws-cellbtn" aria-haspopup="menu">처리 ▾</button>`,
    cellClick: (e: MouseEvent, c: any) => openRowMenu(e, c.getRow().getData()),
  },
])

/* --- 행 처리 메뉴 — 이 상태에서 할 수 있는 것만 ---------------------------- */
const rowMenu = ref<InstanceType<typeof Menu> | null>(null)
const menuRow = ref<CompanyRow | null>(null)
const menuItems = computed(() => (menuRow.value ? allowed(menuRow.value) : []).map((a) => ({
  label: ACTION_LABEL[a], class: a === 'break' || a === 'apprCancel' ? 'is-danger' : undefined, command: () => run(a, [menuRow.value!]),
})))
function openRowMenu(e: MouseEvent, r: CompanyRow) {
  menuRow.value = r
  const btn = (e.target as HTMLElement).closest('button')
  rowMenu.value?.toggle({ currentTarget: btn, target: btn } as unknown as Event)
}

/* --- 처리 실행 ------------------------------------------------------------ */
const act = ref<{ action: Action; rows: CompanyRow[]; skipped: CompanyRow[] } | null>(null)
const actOpen = ref(false)
const docsOpen = ref(false)
const reviewOpen = ref(false)
const result = ref<{ open: boolean; header: string; ok: number; fails: ResultItem[]; auditId?: string; skipped?: number }>({ open: false, header: '', ok: 0, fails: [] })

/** 선택 중 이 처리를 할 수 있는 행 · 없는 행. 일괄 버튼 라벨과 확인 팝업이 같은 판정을 본다 */
const split = (a: Action, list: CompanyRow[]) => ({ ok: list.filter((r) => allowed(r).includes(a)), no: list.filter((r) => !allowed(r).includes(a)) })

function run(a: Action, list: CompanyRow[]) {
  if (a === 'docs') { current.value = list[0]; docsOpen.value = true; return }
  if (a === 'cancelDoc') { openPanel(list[0]); return }
  if (a === 'addReview') { current.value = list[0]; reviewOpen.value = true; return }
  const s = split(a, list)
  act.value = { action: a, rows: s.ok, skipped: s.no }
  actOpen.value = true
}
const DIALOG: Record<string, { notice: string; danger?: boolean; reason?: boolean; date?: boolean; warn?: string }> = {
  start: { notice: '참여개시 안내 LMS 및 E-Mail이 기업담당자에게 발송됩니다.' },
  due: { notice: '바뀐 입금기한으로 입금 요청 LMS 및 E-Mail이 다시 발송됩니다.', date: true },
  apprCancel: { notice: '기업담당자에게 승인취소 LMS 및 E-Mail이 발송됩니다. 최종제출로 돌아간다.', danger: true, reason: true },
  break: {
    notice: '기업담당자에게 확인서 파기 LMS 및 E-Mail이 발송됩니다.', danger: true, reason: true,
    warn: '파기 전에 입금 여부를 다시 확인하세요. 입금했는데 입금완료로 바뀌지 않은 상태에서 파기하면 환불을 시스템에서 진행할 수 없습니다.',
  },
}
const TO: Record<string, string> = { start: '611', apprCancel: '410', break: '390' }
function confirm(p: ActionPayload) {
  const a = act.value!
  a.rows.forEach((r) => { if (TO[a.action]) r.sts = TO[a.action]; if (p.date) r.due = fmtDate(p.date); r.updatedAt = fmtDate(new Date()) })
  const noticeFail = a.rows.filter((_, i) => i % 7 === 5)
  result.value = {
    open: true, header: `${ACTION_LABEL[a.action]} 결과`, ok: a.rows.length, auditId: `AUD-${Date.now().toString(36).toUpperCase()}`,
    skipped: a.skipped.length,
    fails: noticeFail.map((r) => ({ target: r.name, reason: '휴대전화번호 정보가 없어 LMS 전송 실패', kind: 'notice' as const })),
  }
  grid.value?.clearSelection()
  reload()
}

/* --- 옆 패널 ------------------------------------------------------------- */
const current = ref<CompanyRow | null>(null)
const panel = ref(false)
const memoText = ref('')
const cancelFile = ref<File | null>(null)
function openPanel(r: CompanyRow) { current.value = r; memoText.value = r.memo; cancelFile.value = null; panel.value = true }
function savePanel() {
  if (!current.value) return
  current.value.memo = memoText.value.trim()
  if (cancelFile.value) current.value.cancelDoc = true
  notify(cancelFile.value ? '취소공문을 등록하고 메모를 저장했습니다' : '메모를 저장했습니다', 'success')
  panel.value = false
  reload()
}

/* --- 추가 인원 심사 -------------------------------------------------------- */
const review = ref<'approve' | 'hold' | 'cancel' | null>(null)
const reviewAct = ref(false)
const won = (x: number) => x.toLocaleString('ko-KR')
function decide(kind: 'approve' | 'hold' | 'cancel') { review.value = kind; reviewAct.value = true }
function doReview(p: ActionPayload) {
  const r = current.value!
  if (review.value === 'approve') { r.added += r.addReq; r.final = r.first + r.added; r.addReq = 0; r.sts = '613'; if (p.date) r.due = fmtDate(p.date) }
  else if (review.value === 'hold') r.sts = '612'
  else { r.addReq = 0; r.sts = '611' }
  reviewOpen.value = false
  notify(`${r.name} — 추가 인원 ${review.value === 'approve' ? '승인' : review.value === 'hold' ? '보류' : '승인취소'}`, 'success')
  reload()
}

const bulkLabel = (a: Action) => { const s = split(a, sel.value); return sel.value.length ? `${ACTION_LABEL[a]} ${s.ok.length}/${sel.value.length}` : ACTION_LABEL[a] }
const fmt = (x: number) => x.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['104px', '', '160px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="c-kw">검색어</label></th>
        <td>
          <div style="display: flex; gap: 6px">
            <Select v-model="f.kwType" :options="KW" aria-label="검색어 구분" style="width: 132px; flex: none" />
            <InputText id="c-kw" v-model="f.kw" fluid :placeholder="`${f.kwType} 입력`" />
          </div>
        </td>
        <th scope="row">환불수단</th>
        <td>
          <div class="ws-choices" role="radiogroup" aria-label="환불수단">
            <div v-for="[v, l] in [['', '전체'], ['C', '기업'], ['P', '개인'], ['A', '기업+개인']]" :key="v" class="ws-radio"><RadioButton v-model="f.refund" :input-id="`c-rf-${v}`" name="c-rf" :value="v" /><label :for="`c-rf-${v}`">{{ l }}</label></div>
          </div>
        </td>
      </tr>
      <template #detail>
        <tr>
          <th scope="row">발전모델</th>
          <td>
            <div class="ws-choices" role="radiogroup" aria-label="발전모델 대상">
              <div v-for="[v, l] in [['', '전체'], ['Y', '대상'], ['N', '비대상']]" :key="v" class="ws-radio"><RadioButton v-model="f.growth" :input-id="`c-g-${v}`" name="c-g" :value="v" /><label :for="`c-g-${v}`">{{ l }}</label></div>
            </div>
          </td>
          <th scope="row">취소공문</th>
          <td>
            <div class="ws-choices" role="radiogroup" aria-label="취소공문">
              <div v-for="[v, l] in [['', '전체'], ['Y', '등록'], ['N', '미등록']]" :key="v" class="ws-radio"><RadioButton v-model="f.cancelDoc" :input-id="`c-cd-${v}`" name="c-cd" :value="v" /><label :for="`c-cd-${v}`">{{ l }}</label></div>
            </div>
          </td>
        </tr>
        <tr>
          <th scope="row">장애인 채용</th>
          <td colspan="3">
            <div class="ws-choices" role="radiogroup" aria-label="장애인 근로자 채용 여부">
              <div v-for="[v, l] in [['', '전체'], ['Y', '채용함'], ['N', '채용안함']]" :key="v" class="ws-radio"><RadioButton v-model="f.hire" :input-id="`c-h-${v}`" name="c-h" :value="v" /><label :for="`c-h-${v}`">{{ l }}</label></div>
            </div>
          </td>
        </tr>
      </template>
    </WsSearch>

    <section class="ws-sec">
      <WsCountTabs v-model="tab" v-model:sub="sub" :tabs="tabs" label="참여 상태" />
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">참여 기업</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>곳</span>
          <span class="ws-desc">선택 {{ sel.length }} · {{ ctx.year }}년 {{ bizLabel(ctx.biz) }}</span>
        </div>
        <div class="ws-tit__r">
          <MultiSelect v-model="shown" :options="GROUPS" placeholder="열 묶음" aria-label="표시할 열 묶음" :max-selected-labels="0" selected-items-label="열 {0}묶음 표시" class="cols" />
          <WsDownload :total="total" :limit="20000" />
          <span class="ws-sep" aria-hidden="true" />
          <Button v-for="b in BULK.filter((x) => x.action !== 'apprCancel')" :key="b.action" :label="bulkLabel(b.action)" severity="secondary" outlined :disabled="!split(b.action, sel).ok.length" @click="run(b.action, sel)" />
          <Button :label="bulkLabel('apprCancel')" severity="danger" outlined :disabled="!split('apprCancel', sel).ok.length" @click="run('apprCancel', sel)" />
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid ref="grid" :key="shown.join()" :columns="columns" :rows="rows" height="auto" @selection-change="onSel" @row-click="openPanel" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
      <Menu ref="rowMenu" :model="menuItems" popup />
    </section>

    <details class="ws-sec rules">
      <summary class="ws-tit"><span class="ws-tit__h">상태별로 할 수 있는 처리</span><span class="ws-desc">행 메뉴 · 일괄 버튼 · 이 표가 같은 규칙(src/sp/company.ts)을 본다 — 기획 확인용</span></summary>
      <div class="ws-xscroll">
        <table class="ws-gtb">
          <thead><tr><th scope="col">상태</th><th v-for="a in (Object.keys(ACTION_LABEL) as Action[])" :key="a" scope="col">{{ ACTION_LABEL[a] }}</th></tr></thead>
          <tbody>
            <tr v-for="c in STATES_IN_SCREEN" :key="c">
              <th scope="row"><SpStatus :code="c" /></th>
              <td v-for="a in (Object.keys(ACTION_LABEL) as Action[])" :key="a" style="text-align: center">
                <span v-if="allowedByState(c).includes(a)" :aria-label="`${stateOf(c)?.label}에서 ${ACTION_LABEL[a]} 가능`">●</span>
                <span v-else class="ws-cell-zero" aria-hidden="true">·</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="ws-desc" style="margin-top: 8px">추가 인원 심사는 신청이 있는 행에서만 뜬다. 등록승인은 기초정보 심사에서, 대량 취소는 일괄 참여 취소에서 한다.</p>
    </details>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>행을 누르면 옆 패널이 열린다 — 계좌 인증 · 통장사본 · 취소공문 · 메모. <b>처리 ▾</b>는 그 상태에서 할 수 있는 것만 보인다.</li>
        <li>일괄 버튼의 숫자는 <b>선택 중 할 수 있는 곳 / 선택</b>이다. 못 하는 곳은 실행 전에 확인 팝업에 먼저 나온다.</li>
        <li>AS-IS의 전체 승인취소는 없앴다. RPA 축소판(참여개시·등록완료만 보던 화면)은 <b>참여개시 › 등록완료</b> 칩이 대신한다.</li>
      </ul>
    </div>

    <!-- 처리 확인 -->
    <WsActionDialog
      v-if="act" v-model:visible="actOpen" :header="ACTION_LABEL[act.action]"
      :target="act.skipped.length ? `${act.rows.length}곳 처리 — 선택 ${act.rows.length + act.skipped.length}곳 중 ${act.skipped.length}곳은 상태가 맞지 않아 뺀다` : `${act.rows.length}곳 처리`"
      :notice="DIALOG[act.action].notice" :danger="DIALOG[act.action].danger" :warn="DIALOG[act.action].warn"
      :reason="DIALOG[act.action].reason ? { label: `${ACTION_LABEL[act.action]} 사유`, required: true, max: 200 } : undefined"
      :date="DIALOG[act.action].date ? { label: '새 입금기한' } : undefined"
      :confirm-label="ACTION_LABEL[act.action]" @confirm="confirm"
    >
      <ul v-if="act.skipped.length" class="skip" aria-label="빠지는 곳">
        <li v-for="r in act.skipped.slice(0, 5)" :key="r.id">{{ r.name }} <SpStatus :code="r.sts" /></li>
        <li v-if="act.skipped.length > 5" class="ws-desc">외 {{ act.skipped.length - 5 }}곳</li>
      </ul>
      <p v-if="act.action === 'due'" class="ws-callout"><b>처리 경로</b> 에스크로 — 가상계좌 예치 경로로 처리하고 입금 요청을 즉시 보낸다. AS-IS는 단건 · 일괄이 서로 다른 경로를 탔는데 화면에 표시가 없었다(적용 여부는 사업 설정에서 온다고 가정).</p>
    </WsActionDialog>
    <WsResultDialog v-model:visible="result.open" :header="result.header" :ok="result.ok" :fails="result.fails" :audit-id="result.auditId" :skipped="result.skipped" />
    <WsFileView v-model:visible="docsOpen" :title="current ? `${current.name} 제출서류` : ''" :files="[{ name: '참여확인서.pdf', kind: 'PDF', size: '220KB' }, { name: '통장사본.jpg', kind: 'JPG', size: '380KB' }, { name: '재직증빙.pdf', kind: 'PDF', size: '1.1MB' }]" />

    <!-- 옆 패널 -->
    <Drawer v-model:visible="panel" position="right" :style="{ width: '600px' }" :header="current?.name ?? ''">
      <div v-if="current" class="pn">
        <div class="pn__head"><SpStatus :code="current.sts" /><span class="ws-desc">신청번호 {{ current.applyNo }} · {{ current.round }}차 · 최종수정 {{ current.updatedAt }}</span></div>
        <table class="ws-tb">
          <colgroup><col style="width: 112px" /><col /></colgroup>
          <tbody>
            <tr><th scope="row">사업자번호</th><td>{{ current.bizNo }} · {{ coFgLabel(current.coFg) }}</td></tr>
            <tr><th scope="row">소재지 · 경로</th><td>{{ current.region }} · {{ current.channel }}</td></tr>
            <tr><th scope="row">참여인원</th><td>최초 {{ current.first }} + 추가 {{ current.added }} = <b>{{ current.final }}명</b><span v-if="current.addReq" class="ws-badge ws-badge--warning" style="margin-left: 8px">추가 {{ current.addReq }}명 대기</span></td></tr>
            <tr><th scope="row">장애인 채용</th><td>{{ current.hire.yn ? `채용함 · ${current.hire.hired}명` : '채용안함' }}</td></tr>
            <tr><th scope="row">가상계좌</th><td>지정은행 {{ current.vacct }}</td></tr>
            <tr>
              <th scope="row">기업계좌</th>
              <td>
                <div class="pn__row">
                  <WsMasked :value="current.acct" kind="account" label="기업계좌번호" />
                  <span :class="current.acctOk ? 'ws-badge ws-badge--success' : 'ws-badge ws-badge--danger'">{{ current.acctOk ? '인증' : '미인증' }}</span>
                  <Button v-if="current.bankCopy" label="통장사본 보기" severity="secondary" text size="small" @click="docsOpen = true" />
                  <span v-else class="ws-desc">통장사본 없음</span>
                </div>
              </td>
            </tr>
            <tr><th scope="row">환불수단</th><td>{{ REFUND_LABEL[current.refund] }}</td></tr>
            <tr>
              <th scope="row"><label for="c-doc">취소공문</label></th>
              <td>
                <p v-if="current.cancelDoc" class="ws-desc" style="margin-bottom: 6px">등록됨 — 새로 올리면 바뀐다</p>
                <WsUpload id="c-doc" v-model="cancelFile" :accept="['png', 'gif', 'jpg', 'pdf']" />
              </td>
            </tr>
            <tr><th scope="row"><label for="c-memo">메모</label></th><td><Textarea id="c-memo" v-model="memoText" rows="3" fluid maxlength="100" /><span class="ws-desc">{{ memoText.length }} / 100자</span></td></tr>
          </tbody>
        </table>
        <div>
          <p class="pn__h">이 상태에서 할 수 있는 처리</p>
          <div class="pn__acts">
            <Button v-for="a in allowed(current).filter((x) => x !== 'cancelDoc')" :key="a" :label="ACTION_LABEL[a]" size="small" :severity="a === 'break' || a === 'apprCancel' ? 'danger' : 'secondary'" outlined @click="run(a, [current])" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="pn__foot"><Button label="닫기" severity="secondary" outlined @click="panel = false" /><Button label="저장" severity="contrast" @click="savePanel" /></div>
      </template>
    </Drawer>

    <!-- 추가 인원 심사 -->
    <Dialog v-model:visible="reviewOpen" modal header="추가 인원 심사" :style="{ width: '520px' }" :draggable="false">
      <div v-if="current" class="rv">
        <p class="rv__t">{{ current.name }} — 추가 {{ current.addReq }}명 신청</p>
        <table class="ws-gtb">
          <thead><tr><th scope="col" /><th scope="col">인원</th><th scope="col" class="g">기업+개인 분담금</th><th scope="col">지원기관 지원금</th></tr></thead>
          <tbody>
            <tr><th scope="row">지금</th><td class="ws-num">{{ current.final }}명</td><td class="ws-num g">{{ won(current.final * PER_HEAD.ci) }}원</td><td class="ws-num">{{ won(current.final * PER_HEAD.org) }}원</td></tr>
            <tr><th scope="row">추가</th><td class="ws-num">+{{ current.addReq }}명</td><td class="ws-num g">+{{ won(current.addReq * PER_HEAD.ci) }}원</td><td class="ws-num">+{{ won(current.addReq * PER_HEAD.org) }}원</td></tr>
            <tr class="is-total"><th scope="row">승인 후</th><td class="ws-num">{{ current.final + current.addReq }}명</td><td class="ws-num g">{{ won((current.final + current.addReq) * PER_HEAD.ci) }}원</td><td class="ws-num">{{ won((current.final + current.addReq) * PER_HEAD.org) }}원</td></tr>
          </tbody>
        </table>
        <p class="ws-desc">1인당 기업+개인 {{ won(PER_HEAD.ci) }}원 · 지원기관 {{ won(PER_HEAD.org) }}원(3 : 1). 승인하면 추가분 {{ won(current.addReq * PER_HEAD.ci) }}원 입금 요청이 나간다.</p>
      </div>
      <template #footer>
        <Button label="보류" severity="secondary" outlined @click="decide('hold')" />
        <Button label="승인취소" severity="danger" outlined @click="decide('cancel')" />
        <Button label="승인" @click="decide('approve')" />
      </template>
    </Dialog>
    <WsActionDialog
      v-model:visible="reviewAct"
      :header="review === 'approve' ? '추가 인원 등록승인' : review === 'hold' ? '추가신청 보류' : '추가 인원 승인취소'"
      :target="current ? `${current.name} · 추가 ${current.addReq}명` : ''"
      :date="review === 'approve' ? { label: '입금기한' } : undefined"
      :reason="review === 'hold' ? { label: '보류 사유', required: true, max: 50 } : review === 'cancel' ? { label: '승인취소 사유', required: true, max: 200 } : undefined"
      :notice="review === 'approve' ? '선택한 입금기한으로 추가분 입금 요청 LMS 및 E-Mail이 발송됩니다.' : '기업담당자에게 LMS 및 E-Mail이 발송됩니다.'"
      :danger="review === 'cancel'" :confirm-label="review === 'approve' ? '승인' : review === 'hold' ? '보류' : '승인취소'"
      @confirm="doReview"
    />
  </div>
</template>

<style scoped>
.cols { width: 170px; }
.rules > summary { cursor: pointer; list-style: none; justify-content: flex-start; }
.rules > summary::before { content: '▸'; color: var(--ws-text-muted); }
.rules[open] > summary::before { content: '▾'; }
.rules > summary + * { margin-top: var(--ws-gap-inter); }
.skip { display: grid; gap: 4px; max-height: 160px; overflow: auto; }
.skip li { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius-sm); }
.pn { display: grid; gap: var(--ws-gap-block); }
.pn__head { display: flex; align-items: center; gap: 10px; }
.pn__row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pn__h { margin-bottom: 8px; font-weight: 600; }
.pn__acts { display: flex; flex-wrap: wrap; gap: 6px; }
.pn__foot { display: flex; justify-content: flex-end; gap: 6px; }
.rv { display: grid; gap: var(--ws-gap-inter); }
.rv__t { font-weight: 600; }
</style>
