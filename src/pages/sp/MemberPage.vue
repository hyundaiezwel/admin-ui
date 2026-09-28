<script setup lang="ts">
/**
 * 참여회원 현황 — AS-IS S-003-07 + S-003-11 RPA 사본(난이도 4).
 *
 * 근로자 단위 화면. 회원명 · 생년월일 · ID · 환불계좌가 한 행에 있는 **개인정보 밀집** 화면이다.
 * 미리보기에서 바꾼 것:
 *   ① 회원 상태 8개 → 건수 탭 5개(환불 넷은 하위 칩). 기업 상태 18개는 조회 조건 선택으로
 *   ② **개인정보 열은 기본으로 숨긴다.** 생년월일 · ID · 환불계좌는 열 묶음을 켜야 보이고, 켜도 가려져 있다
 *   ③ 행 버튼(환불계좌등록 · 이용정지) → 처리 메뉴. 상태에 맞는 것만
 *   ④ 환불금액에 **지원기관 몫 제외**를 계산으로 보인다(AS-IS는 머리글 주석 한 줄)
 *   ⑤ 환불계좌 등록에 **계좌 확인**(예금주 일치) 단계
 *   ⑥ 일괄 이용정지 · 일괄 환불요청은 역할 권한(가정)과 적격 건수를 버튼에 싣는다
 *   ⑦ 성별 라벨을 한 벌로 — AS-IS는 이 화면 남성/여성, 이용내역은 남자/여자
 */
import { computed, onMounted, ref, watch } from 'vue'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import MultiSelect from 'primevue/multiselect'
import RadioButton from 'primevue/radiobutton'
import Select from 'primevue/select'
import WsSearch from '../../ws/WsSearch.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import WsCountTabs, { type CountTab } from '../../ws/WsCountTabs.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import WsResultDialog, { type ResultItem } from '../../ws/WsResultDialog.vue'
import WsUpload from '../../ws/WsUpload.vue'
import WsMasked from '../../ws/WsMasked.vue'
import { mask } from '../../ws/mask'
import { badgeHtml } from '../../ws/badge'
import { notify } from '../../ws/notify'
import { fmtDate } from '../../ws/period'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { statusHtml } from '../../sp/status'
import { SUSPEND_REASONS, bizLabel, stateOf } from '../../sp/codes'
import { ctx, ctxKey, can, needRole } from '../../sp/context'
import { memo } from '../../sp/stores'
import { makeMembers, MEMBER_STS, type MemberRow } from '@fixtures/sp'
import { MEMBER_ACT_LABEL, MEMBER_TO, memberActions, type MemberAct } from '../../sp/member'

const KW = ['회원명', '기업명', '사업자번호', 'ID']
const CO_STS = ['610', '611', '614', '616', '710']
const blank = () => ({ kwType: '회원명', kw: '', coSts: '', growth: '', gender: '', partner: '', paid: '' })
const f = ref(blank())
const applied = ref(blank())
const tab = ref('all')
const sub = ref<string | null>(null)

const all = computed(() => memo('member', ctxKey(), () => makeMembers(ctxKey(), ctx.year)))
const byForm = (r: MemberRow) => {
  const a = applied.value
  const k = a.kw.trim()
  const field = { 회원명: r.name, 기업명: r.company, 사업자번호: r.bizNo, ID: r.loginId }[a.kwType] ?? ''
  return (!k || field.includes(k)) && (!a.coSts || r.coSts === a.coSts) && (!a.growth || (a.growth === 'Y') === r.growth) &&
    (!a.gender || r.gender === a.gender) && (!a.partner || (a.partner === 'Y') === r.partner) && (!a.paid || (a.paid === 'Y') === r.paid)
}
const base = computed(() => all.value.filter(byForm))
const TABS = [
  { id: 'all', label: '전체', codes: MEMBER_STS.map((m) => m.code) as string[] },
  { id: 'join', label: '미가입', codes: ['M0'] },
  { id: 'use', label: '이용중', codes: ['M1'] },
  { id: 'stop', label: '이용정지', codes: ['M2'] },
  { id: 'refund', label: '환불', codes: ['M3', 'M4', 'M5', 'M6'] },
]
const codesOf = () => (sub.value ? [sub.value] : TABS.find((t) => t.id === tab.value)!.codes)
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => base.value.filter((r) => codesOf().includes(r.sts)), {
  failIf: () => applied.value.kw.includes(ERROR_KEYWORD),
})
onMounted(reload)
watch(ctxKey, () => requery())
watch([tab, sub], () => requery())
function search() { applied.value = { ...f.value }; requery() }
function reset() { f.value = blank(); tab.value = 'all'; sub.value = null; search() }
const stsOf = (c: string) => MEMBER_STS.find((m) => m.code === c)!
const tabs = computed<CountTab[]>(() => TABS.map((t) => ({
  id: t.id, label: t.label, count: base.value.filter((r) => t.codes.includes(r.sts)).length,
  subs: t.id === 'refund' ? t.codes.map((c) => ({ id: c, label: stsOf(c).label, count: base.value.filter((r) => r.sts === c).length })) : undefined,
})))

/** 환불금액 — 잔여 포인트 중 지원기관 몫(1/4)은 돌려주지 않는다. 개인 2 : 기업 1 */
const refundOf = (r: MemberRow) => ({ person: Math.round(r.remain / 2), company: Math.round(r.remain / 4), org: r.remain - Math.round(r.remain / 2) - Math.round(r.remain / 4) })

/* --- 목록 --------------------------------------------------------------- */
const grid = ref<InstanceType<typeof TabGrid> | null>(null)
const sel = ref<MemberRow[]>([])
const GROUPS = ['개인정보(생년월일 · ID)', '환불(계좌 · 금액)', '연계 · 입금 · 사용기한']
const shown = ref<string[]>([])
const won = (x: number) => x.toLocaleString('ko-KR')
const columns = computed(() => [
  { title: '번호', field: 'no', width: 72, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '기업명', field: 'company', minWidth: 160 },
  { title: '회원명', field: 'name', width: 90, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => mask(c.getValue(), 'name') },
  ...(shown.value.includes(GROUPS[0]) ? [
    { title: '생년월일', field: 'birth', width: 104, hozAlign: 'center', headerHozAlign: 'center', cssClass: 'ws-col-g', formatter: (c: any) => mask(c.getValue(), 'birth') },
    { title: 'ID', field: 'loginId', width: 110, formatter: (c: any) => mask(c.getValue(), 'id') },
  ] : []),
  { title: '기업 상태', field: 'coSts', width: 150, hozAlign: 'center', headerHozAlign: 'center', cssClass: 'ws-col-g', formatter: (c: any) => statusHtml(c.getValue()) },
  { title: '회원 상태', field: 'sts', width: 96, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => { const s = stsOf(c.getValue()); return badgeHtml(s.label, s.tone) } },
  { title: '잔여포인트', field: 'remain', width: 108, hozAlign: 'right', headerHozAlign: 'center', sorter: 'number', formatter: (c: any) => won(c.getValue()) },
  ...(shown.value.includes(GROUPS[1]) ? [{ title: '환불', headerHozAlign: 'center', cssClass: 'ws-col-g', columns: [
    { title: '환불계좌', field: 'refundAcct', width: 170, cssClass: 'ws-col-g', formatter: (c: any) => (c.getValue() ? mask(c.getValue(), 'account') : '<span class="ws-desc">미등록</span>') },
    { title: '기업', field: 'remain', width: 90, hozAlign: 'right', headerHozAlign: 'center', headerSort: false, formatter: (c: any) => won(refundOf(c.getRow().getData()).company) },
    { title: '개인', field: 'remain', width: 90, hozAlign: 'right', headerHozAlign: 'center', headerSort: false, formatter: (c: any) => won(refundOf(c.getRow().getData()).person) },
  ] }] : []),
  ...(shown.value.includes(GROUPS[2]) ? [
    { title: '동반성장', field: 'partner', width: 84, hozAlign: 'center', headerHozAlign: 'center', cssClass: 'ws-col-g', formatter: (c: any) => (c.getValue() ? '참가' : '—') },
    { title: '입금', field: 'paid', width: 70, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? '입금' : '미입금') },
    { title: '사용기한', field: 'useUntil', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  ] : []),
  { title: '이용정지일', field: 'stopAt', width: 100, hozAlign: 'center', headerHozAlign: 'center', cssClass: 'ws-col-g' },
  {
    title: '처리', field: 'id', width: 84, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
    formatter: (c: any) => (actionsOf(c.getRow().getData()).length ? '<button type="button" class="ws-cellbtn" aria-haspopup="menu">처리 ▾</button>' : ''),
    cellClick: (e: MouseEvent, c: any) => openRowMenu(e, c.getRow().getData()),
  },
])

/* --- 상태별 처리 — 규칙은 src/sp/member.ts ---------------------------------- */
type Act = MemberAct
const LABEL = MEMBER_ACT_LABEL
const actionsOf = memberActions
const rowMenu = ref<InstanceType<typeof Menu> | null>(null)
const menuRow = ref<MemberRow | null>(null)
const menuItems = computed(() => (menuRow.value ? actionsOf(menuRow.value) : []).map((a) => ({
  label: LABEL[a], class: a === 'stop' ? 'is-danger' : undefined, command: () => run(a, [menuRow.value!]),
})))
function openRowMenu(e: MouseEvent, r: MemberRow) {
  if (!actionsOf(r).length) return
  menuRow.value = r
  const btn = (e.target as HTMLElement).closest('button')
  rowMenu.value?.toggle({ currentTarget: btn, target: btn } as unknown as Event)
}
const split = (a: Act, list: MemberRow[]) => ({ ok: list.filter((r) => actionsOf(r).includes(a)), no: list.filter((r) => !actionsOf(r).includes(a)) })

const act = ref<{ a: Act; rows: MemberRow[]; skipped: MemberRow[] } | null>(null)
const actOpen = ref(false)
const result = ref<{ open: boolean; header: string; ok: number; fails: ResultItem[]; skipped?: number; auditId?: string }>({ open: false, header: '', ok: 0, fails: [] })
function run(a: Act, list: MemberRow[]) {
  if (a === 'account') { openAccount(list[0]); return }
  const s = split(a, list)
  act.value = { a, rows: s.ok, skipped: s.no }
  actOpen.value = true
}
const refundSum = computed(() => (act.value?.rows ?? []).reduce((t, r) => { const x = refundOf(r); return { p: t.p + x.person, c: t.c + x.company, o: t.o + x.org } }, { p: 0, c: 0, o: 0 }))
function confirm(p: ActionPayload) {
  const a = act.value!
  const to = MEMBER_TO[a.a]
  a.rows.forEach((r) => { if (to) r.sts = to; if (a.a === 'stop') r.stopAt = fmtDate(new Date()) })
  result.value = {
    open: true, header: `${LABEL[a.a]} 결과${p.option ? ` — ${p.option === '기타' ? p.text : p.option}` : ''}`, ok: a.rows.length, skipped: a.skipped.length,
    auditId: `AUD-${Date.now().toString(36).toUpperCase()}`,
    fails: a.rows.filter((_, i) => i % 9 === 4).map((r) => ({ target: `${mask(r.name, 'name')} (${r.company})`, reason: 'EMAIL 주소 정보가 없어 E-Mail 전송 실패', kind: 'notice' as const })),
  }
  grid.value?.clearSelection()
  reload()
}
const bulkLabel = (a: Act) => { const s = split(a, sel.value); return sel.value.length ? `${LABEL[a]} ${s.ok.length}/${sel.value.length}` : `일괄 ${LABEL[a]}` }

/* --- 환불계좌 등록 — 계좌 확인을 거쳐야 저장된다 ------------------------------ */
const acctOpen = ref(false)
const acctRow = ref<MemberRow | null>(null)
const acct = ref({ bank: '', no: '', holder: '', file: null as File | null })
const checked = ref<'none' | 'ok' | 'bad'>('none')
function openAccount(r: MemberRow) {
  acctRow.value = r
  acct.value = { bank: '', no: '', holder: '', file: null }
  checked.value = 'none'
  acctOpen.value = true
}
/** 목업 — 예금주가 회원명과 같으면 확인된다. 실제로는 계좌 실명 조회 API다 */
function verify() { checked.value = acct.value.holder.trim() === acctRow.value?.name ? 'ok' : 'bad' }
watch(() => [acct.value.bank, acct.value.no, acct.value.holder], () => { checked.value = 'none' })
function saveAccount() {
  const r = acctRow.value!
  r.refundAcct = `${acct.value.bank.replace('은행', '')} ${acct.value.no}`
  if (r.sts === 'M6') r.sts = 'M3'
  acctOpen.value = false
  notify(`${mask(r.name, 'name')} 환불계좌를 등록했습니다`, 'success')
  reload()
}
const acctReady = computed(() => !!acct.value.bank && /^[\d-]{8,20}$/.test(acct.value.no) && checked.value === 'ok')
const fmt = (x: number) => x.toLocaleString('ko-KR')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['104px', '', '160px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="m-kw">검색어</label></th>
        <td>
          <div style="display: flex; gap: 6px">
            <Select v-model="f.kwType" :options="KW" aria-label="검색어 구분" style="width: 120px; flex: none" />
            <InputText id="m-kw" v-model="f.kw" fluid :placeholder="`${f.kwType} 입력`" />
          </div>
        </td>
        <th scope="row"><label for="m-co">기업 상태</label></th>
        <td><Select v-model="f.coSts" input-id="m-co" :options="[{ code: '', label: '전체' }, ...CO_STS.map((c) => ({ code: c, label: stateOf(c)?.label }))]" option-label="label" option-value="code" placeholder="전체" fluid /></td>
      </tr>
      <template #detail>
        <tr>
          <th scope="row">성별</th>
          <td>
            <div class="ws-choices" role="radiogroup" aria-label="성별">
              <div v-for="[v, l] in [['', '전체'], ['M', '남성'], ['F', '여성']]" :key="v" class="ws-radio"><RadioButton v-model="f.gender" :input-id="`m-g-${v}`" name="m-g" :value="v" /><label :for="`m-g-${v}`">{{ l }}</label></div>
            </div>
          </td>
          <th scope="row">발전모델</th>
          <td>
            <div class="ws-choices" role="radiogroup" aria-label="발전모델 대상">
              <div v-for="[v, l] in [['', '전체'], ['Y', '대상'], ['N', '비대상']]" :key="v" class="ws-radio"><RadioButton v-model="f.growth" :input-id="`m-gr-${v}`" name="m-gr" :value="v" /><label :for="`m-gr-${v}`">{{ l }}</label></div>
            </div>
          </td>
        </tr>
        <tr>
          <th scope="row">동반성장 연계</th>
          <td>
            <div class="ws-choices" role="radiogroup" aria-label="동반성장 연계 참가">
              <div v-for="[v, l] in [['', '전체'], ['Y', '참가'], ['N', '미참가']]" :key="v" class="ws-radio"><RadioButton v-model="f.partner" :input-id="`m-p-${v}`" name="m-p" :value="v" /><label :for="`m-p-${v}`">{{ l }}</label></div>
            </div>
          </td>
          <th scope="row">입금 여부</th>
          <td>
            <div class="ws-choices" role="radiogroup" aria-label="입금 여부">
              <div v-for="[v, l] in [['', '전체'], ['Y', '입금'], ['N', '미입금']]" :key="v" class="ws-radio"><RadioButton v-model="f.paid" :input-id="`m-pd-${v}`" name="m-pd" :value="v" /><label :for="`m-pd-${v}`">{{ l }}</label></div>
            </div>
          </td>
        </tr>
      </template>
    </WsSearch>

    <section class="ws-sec"><WsCountTabs v-model="tab" v-model:sub="sub" :tabs="tabs" label="회원 상태" /></section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">참여회원</h2>
          <span class="ws-total">총<strong>{{ fmt(total) }}</strong>명</span>
          <span class="ws-desc">선택 {{ sel.length }} · {{ ctx.year }}년 {{ bizLabel(ctx.biz) }}</span>
        </div>
        <div class="ws-tit__r">
          <MultiSelect v-model="shown" :options="GROUPS" placeholder="열 묶음" aria-label="표시할 열 묶음" :max-selected-labels="0" selected-items-label="열 {0}묶음 표시" class="cols" />
          <WsDownload :total="total" :limit="20000" />
          <span class="ws-sep" aria-hidden="true" />
          <span v-if="!can('bulk-refund') || !can('suspend')" class="ws-desc">
            {{ [!can('suspend') ? `이용정지는 ${needRole('suspend')}` : '', !can('bulk-refund') ? `환불요청은 ${needRole('bulk-refund')}` : ''].filter(Boolean).join(' · ') }} 이상
          </span>
          <Button :label="bulkLabel('refund')" severity="secondary" outlined :disabled="!split('refund', sel).ok.length || !can('bulk-refund')" @click="run('refund', sel)" />
          <Button :label="bulkLabel('stop')" severity="danger" outlined :disabled="!split('stop', sel).ok.length || !can('suspend')" @click="run('stop', sel)" />
        </div>
      </div>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid ref="grid" :key="shown.join()" :columns="columns" :rows="rows" height="auto" @selection-change="sel = (grid?.selectedData() ?? []) as MemberRow[]" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
      <Menu ref="rowMenu" :model="menuItems" popup />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>생년월일 · ID · 환불계좌는 <b>열 묶음을 켜야</b> 보이고, 켜도 가려져 있다. 반출은 엑셀 다운로드의 사유 등록을 거친다.</li>
        <li>환불금액은 잔여 포인트에서 <b>지원기관 몫(1/4)을 뺀</b> 값이다 — 개인 2 : 기업 1. 지원기관 몫은 회수한다.</li>
        <li>이용정지를 하면 회원에게 안내가 나간다. AS-IS 통지 문구는 「협약파기」다 — 용어 통일 필요.</li>
      </ul>
    </div>

    <WsActionDialog
      v-if="act" v-model:visible="actOpen" :header="LABEL[act.a]" :danger="act.a === 'stop'"
      :target="act.skipped.length ? `${act.rows.length}명 처리 — 선택 ${act.rows.length + act.skipped.length}명 중 ${act.skipped.length}명은 상태가 맞지 않아 뺀다` : `${act.rows.length}명 처리`"
      :reason="act.a === 'stop' ? { label: '이용정지 사유', options: SUSPEND_REASONS, other: '기타', max: 200 } : undefined"
      :notice="act.a === 'stop' ? '회원에게 이용정지 안내 LMS 및 E-Mail이 발송됩니다(AS-IS 문구: 협약파기).' : act.a === 'refund' ? '기업담당자에게 환불 요청 안내가 발송됩니다. 환불은 익월 중순에 일괄 처리된다.' : '회원가입 안내 LMS가 발송됩니다.'"
      :confirm-label="LABEL[act.a]" @confirm="confirm"
    >
      <table v-if="act.a === 'refund'" class="ws-gtb">
        <thead><tr><th scope="col">개인 환불</th><th scope="col">기업 환불</th><th scope="col">지원기관 회수</th></tr></thead>
        <tbody><tr><td class="ws-num">{{ won(refundSum.p) }}원</td><td class="ws-num">{{ won(refundSum.c) }}원</td><td class="ws-num">{{ won(refundSum.o) }}원</td></tr></tbody>
      </table>
    </WsActionDialog>
    <WsResultDialog v-model:visible="result.open" :header="result.header" :ok="result.ok" :fails="result.fails" :skipped="result.skipped" :audit-id="result.auditId" />

    <Dialog v-model:visible="acctOpen" modal header="환불계좌 등록" :style="{ width: '520px' }" :draggable="false">
      <div v-if="acctRow" class="ac">
        <p class="ac__row"><WsMasked :value="acctRow.name" kind="name" label="회원 이름" /><span>· {{ acctRow.company }} — 잔여 {{ won(acctRow.remain) }}원 중 개인 환불 {{ won(refundOf(acctRow).person) }}원</span></p>
        <table class="ws-tb">
          <colgroup><col style="width: 100px" /><col /></colgroup>
          <tbody>
            <tr><th scope="row" class="req"><label for="ac-bank">은행</label></th><td><Select v-model="acct.bank" input-id="ac-bank" :options="['국민은행', '신한은행', '우리은행', '기업은행', '농협은행', '하나은행', '카카오뱅크']" placeholder="은행 선택" fluid /></td></tr>
            <tr><th scope="row" class="req"><label for="ac-no">계좌번호</label></th><td><InputText id="ac-no" v-model="acct.no" inputmode="numeric" maxlength="20" fluid placeholder="숫자와 - 만, 20자 이내" /></td></tr>
            <tr>
              <th scope="row" class="req"><label for="ac-h">예금주</label></th>
              <td>
                <div class="ac__row">
                  <InputText id="ac-h" v-model="acct.holder" maxlength="8" style="width: 160px" />
                  <Button label="계좌 확인" severity="secondary" outlined :disabled="!acct.bank || !acct.no || !acct.holder" @click="verify" />
                  <span v-if="checked === 'ok'" class="ws-badge ws-badge--success" role="status">예금주 일치</span>
                  <span v-else-if="checked === 'bad'" class="ws-badge ws-badge--danger" role="status">예금주 불일치</span>
                </div>
                <span class="ws-desc">목업: 예금주가 회원 이름과 같으면 일치한다 — 이름은 위 <b>보기</b>로 연다(열람 기록)</span>
              </td>
            </tr>
            <tr><th scope="row"><label for="ac-f">통장사본</label></th><td><WsUpload id="ac-f" v-model="acct.file" :accept="['jpg', 'png', 'pdf']" /></td></tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <Button label="취소" severity="secondary" outlined @click="acctOpen = false" />
        <Button label="등록" severity="contrast" :disabled="!acctReady" @click="saveAccount" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.cols { width: 170px; }
.ac { display: grid; gap: var(--ws-gap-inter); }
.ac__row { display: flex; align-items: center; gap: 8px; }
</style>
