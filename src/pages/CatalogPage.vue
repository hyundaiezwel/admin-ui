<script setup lang="ts">
/**
 * 컴포넌트 카탈로그 — 토큰 · 교정 · PrimeVue 컨트롤 · 구조.
 *
 * 대비 수치는 문구로 적지 않는다. 화면에서 토큰을 읽어 그 자리에서 계산한다 —
 * 토큰이 바뀌었는데 카탈로그 숫자가 그대로면 카탈로그가 거짓말을 한다.
 * 다크 값은 테마 속성을 한 번 바꿔 읽고 **같은 작업 안에서** 되돌린다. 칠하기 전이라 깜빡이지 않는다.
 */
import { onMounted, ref, watch } from 'vue'
import PageHead from '../app/PageHead.vue'
import { prefs } from '../app/theme'
import { notify } from '../ws/notify'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import DatePicker from 'primevue/datepicker'
import AutoComplete from 'primevue/autocomplete'
import Checkbox from 'primevue/checkbox'
import RadioButton from 'primevue/radiobutton'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'
import ProgressBar from 'primevue/progressbar'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Dialog from 'primevue/dialog'
import Drawer from 'primevue/drawer'

const hex2rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const lum = (h: string) => { const [r, g, b] = hex2rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const cr = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

/** 두 테마의 토큰 값을 읽는다. 속성을 바꿨다 되돌리는 사이에 칠하지 않으므로 화면은 그대로다 */
function readBoth(names: string[]) {
  const root = document.documentElement
  const was = root.dataset.theme
  const read = () => Object.fromEntries(names.map((n) => [n, getComputedStyle(root).getPropertyValue(n).trim()]))
  root.dataset.theme = 'light'; const light = read()
  root.dataset.theme = 'dark'; const dark = read()
  root.dataset.theme = was
  return { light, dark }
}

/** 원본에서 고친 8건. 원본 값은 역사적 사실이라 박아 두고, 교정 값은 토큰에서 읽는다 */
const FIXES = [
  { what: '조회·팝업 확인 버튼', token: '--ws-action-search', orig: '#009782', fg: '--ws-text-inverse', bg: 'self', need: 4.5 },
  { what: '보조 버튼', token: '--ws-action-sub', orig: '#aaaaaa', fg: '--ws-text-inverse', bg: 'self', need: 4.5 },
  { what: '입력 테두리', token: '--ws-field-border', orig: '#cccccc', fg: 'self', bg: '--ws-surface', need: 3 },
  { what: '브랜드 글자', token: '--ws-text-brand', orig: '#009782', fg: 'self', bg: '--ws-surface-head', need: 4.5 },
  { what: '위험 글자 · 필수 *', token: '--ws-text-danger', orig: '#f04452', fg: 'self', bg: '--ws-surface-head', need: 4.5 },
  { what: '성공 글자', token: '--ws-text-success', orig: '#00af7a', fg: 'self', bg: '--ws-surface-head', need: 4.5 },
  { what: '링크', token: '--ws-text-link', orig: '#1573e1', fg: 'self', bg: '--ws-surface-head', need: 4.5 },
  { what: '설명 글자', token: '--ws-text-muted', orig: '#727272', fg: 'self', bg: '--ws-surface-head', need: 4.5 },
]
type Row = { what: string; token: string; orig: string; before: number; light: string; lr: number; dark: string; dr: number; need: number }
const fixes = ref<Row[]>([])

function measure() {
  const names = [...new Set(FIXES.flatMap((f) => [f.token, f.fg, f.bg]).filter((n) => n.startsWith('--')))]
  const { light, dark } = readBoth(names)
  const LIGHT_BG = { '--ws-surface': '#ffffff', '--ws-surface-head': '#f3f5f6', '--ws-text-inverse': '#ffffff' } as Record<string, string>
  fixes.value = FIXES.map((f) => {
    const pair = (T: Record<string, string>, v: string) => [f.fg === 'self' ? v : T[f.fg], f.bg === 'self' ? v : T[f.bg]]
    const [of, ob] = pair(LIGHT_BG, f.orig)
    const [lf, lb] = pair(light, light[f.token])
    const [df, db] = pair(dark, dark[f.token])
    return { what: f.what, token: f.token, orig: f.orig, before: cr(of, ob), light: light[f.token], lr: cr(lf, lb), dark: dark[f.token], dr: cr(df, db), need: f.need }
  })
}
onMounted(measure)
watch(() => prefs.resolved, measure)

const DIMS = [
  ['--ws-control-h', '입력 · 선택 · 버튼', '.w2input · .btn_cm'],
  ['--ws-grid-head-h', '그리드 헤더', '.gridHeaderTDDefault'],
  ['--ws-grid-row-h', '그리드 행', '.gridBodyDefault'],
  ['--ws-form-row-h', '입력 표 행', '.tb .w2tb_th'],
  ['--ws-search-row-h', '조회 표 행', '.shbox .tb .w2tb_th'],
  ['--ws-tab-h', '탭줄', '.w2tabcontrol_tabhost'],
  ['--ws-popup-head-h', '팝업 머리', '.w2window_header'],
  ['--ws-radius', '모서리(최빈)', '6px 27회'],
]
const dims = ref<string[][]>([])
onMounted(() => { const cs = getComputedStyle(document.documentElement); dims.value = DIMS.map(([t, n, s]) => [t, n, s, cs.getPropertyValue(t).trim()]) })

/* 컨트롤 표본 — 32px 정렬을 눈으로 확인하는 줄 */
const probe = ref<HTMLElement | null>(null)
const heights = ref('')
onMounted(() => requestAnimationFrame(() => {
  const els = probe.value ? [...probe.value.querySelectorAll<HTMLElement>('.p-inputtext, .p-select, .p-multiselect, .p-datepicker, .p-inputnumber, .p-button')] : []
  heights.value = els.map((e) => Math.round(e.getBoundingClientRect().height)).join(' · ')
}))

const tab = ref('controls')
const dlg = ref(false)
const side = ref(false)
const combo = ref<string[]>(['웹'])
const seg = ref('30일')
const range = ref<Date[] | null>(null)
const num = ref<number | null>(1200000)
const who = ref('')
const hits = ref<string[]>([])
const NAMES = ['김하늘', '이준서', '박서연', '최민재', '정유진']
const chk = ref(true)
const tax = ref('과세')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">원본에서 고친 값</h2><span class="ws-total">총<strong>{{ fixes.length }}</strong>건</span></div>
        <div class="ws-tit__r"><span class="ws-desc">같은 색상·채도에서 명도만 내렸다 — 모양 유지, 값만 고침. 다크는 DS3에서 새로 짰다</span></div>
      </div>
      <table class="ws-gtb">
        <caption class="ws-sr-only">원본 WebSquare 값과 교정 값, 다크 값의 대비 비교</caption>
        <colgroup><col style="width: 170px" /><col /><col style="width: 72px" /><col /><col style="width: 72px" /><col /><col style="width: 72px" /><col style="width: 64px" /></colgroup>
        <thead><tr><th scope="col">자리</th><th scope="col">원본</th><th scope="col">대비</th><th scope="col">라이트</th><th scope="col">대비</th><th scope="col">다크</th><th scope="col">대비</th><th scope="col">기준</th></tr></thead>
        <tbody>
          <tr v-for="f in fixes" :key="f.token">
            <td>{{ f.what }}</td>
            <td><span class="sw" :style="{ background: f.orig }" /><code>{{ f.orig }}</code></td>
            <td class="ws-num bad">{{ f.before.toFixed(2) }}</td>
            <td><span class="sw" :style="{ background: f.light }" /><code>{{ f.light }}</code></td>
            <td class="ws-num" :class="f.lr >= f.need ? 'ok' : 'bad'">{{ f.lr.toFixed(2) }}</td>
            <td><span class="sw" :style="{ background: f.dark }" /><code>{{ f.dark }}</code></td>
            <td class="ws-num" :class="f.dr >= f.need ? 'ok' : 'bad'">{{ f.dr.toFixed(2) }}</td>
            <td class="ws-num">{{ f.need }}:1</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">치수</h2></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">토큰</th><th scope="col">자리</th><th scope="col">원본</th><th scope="col">값</th></tr></thead>
        <tbody><tr v-for="d in dims" :key="d[0]"><td><code>{{ d[0] }}</code></td><td>{{ d[1] }}</td><td class="ws-desc">{{ d[2] }}</td><td class="ws-num">{{ d[3] }}</td></tr></tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">컴포넌트 — PrimeVue 4.5.5</h2></div></div>
      <Tabs v-model:value="tab">
        <TabList>
          <Tab value="controls">컨트롤</Tab>
          <Tab value="blocks">구조</Tab>
          <Tab value="feedback">피드백</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="controls">
            <table class="ws-tb">
              <colgroup><col style="width: 140px" /><col /></colgroup>
              <tbody>
                <tr>
                  <th scope="row">버튼</th>
                  <td>
                    <div class="row">
                      <Button label="기본" severity="secondary" outlined />
                      <Button label="저장(F2)" severity="contrast" />
                      <Button label="조회(F2)" />
                      <Button label="보조" severity="secondary" />
                      <Button label="CSV다운" severity="secondary" outlined class="ws-line" />
                      <Button label="삭제" severity="danger" outlined />
                      <Button label="작게" size="small" severity="secondary" outlined />
                      <Button label="비활성" disabled />
                    </div>
                    <p class="ws-desc">초록(조회)은 찾기·확정에만, 진회색(저장)은 일반 주버튼 — 원본의 두 주버튼 규칙이다. 다크에서 저장은 밝은 회색으로 뒤집힌다.</p>
                  </td>
                </tr>
                <tr>
                  <th scope="row">한 줄 정렬</th>
                  <td>
                    <div ref="probe" class="row">
                      <InputText placeholder="입력" aria-label="입력" />
                      <Select :options="['전체', '웹', '앱']" placeholder="선택" aria-label="선택" style="width: 120px" />
                      <MultiSelect v-model="combo" :options="['웹', '앱', '전화']" aria-label="다중 선택" style="width: 160px" />
                      <DatePicker v-model="range" selection-mode="range" date-format="yy-mm-dd" show-icon placeholder="기간" aria-label="기간" style="width: 240px" />
                      <InputNumber v-model="num" locale="ko-KR" aria-label="금액" style="width: 140px" />
                      <Button label="조회(F2)" />
                    </div>
                    <p class="ws-desc">높이 <b class="ws-num">{{ heights }}</b>px — 프리셋이 Aura 기본값(38 · 42 · 39)을 32로 맞춘다.</p>
                  </td>
                </tr>
                <tr>
                  <th scope="row">입력 상태</th>
                  <td>
                    <div class="row">
                      <InputText placeholder="기본" aria-label="기본 입력" />
                      <InputText model-value="읽기 전용" readonly aria-label="읽기 전용 입력" />
                      <InputText model-value="비활성" disabled aria-label="비활성 입력" />
                      <InputText model-value="오류" invalid aria-label="오류 입력" />
                      <AutoComplete v-model="who" :suggestions="hits" placeholder="담당자 — '김'" aria-label="담당자" @complete="(e) => (hits = NAMES.filter((n) => n.includes(e.query)))" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <th scope="row">선택 · 체크</th>
                  <td>
                    <div class="row">
                      <div class="ws-check"><Checkbox v-model="chk" input-id="cat-chk" binary /><label for="cat-chk">사용</label></div>
                      <div class="ws-radio"><RadioButton v-model="tax" input-id="cat-r1" name="cat-r" value="과세" /><label for="cat-r1">과세</label></div>
                      <div class="ws-radio"><RadioButton v-model="tax" input-id="cat-r2" name="cat-r" value="면세" /><label for="cat-r2">면세</label></div>
                      <SelectButton v-model="seg" :options="['7일', '30일', '90일']" :allow-empty="false" aria-label="기간" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <th scope="row">뱃지</th>
                  <td>
                    <div class="row">
                      <span class="ws-badge">기본</span>
                      <span class="ws-badge ws-badge--brand">브랜드</span>
                      <span class="ws-badge ws-badge--info">처리중</span>
                      <span class="ws-badge ws-badge--success">완료</span>
                      <span class="ws-badge ws-badge--warning">보류</span>
                      <span class="ws-badge ws-badge--danger">초과</span>
                      <span class="ws-badge ws-badge--mute">미사용</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th scope="row">여러 줄 · 진행</th>
                  <td>
                    <div class="row" style="align-items: flex-start">
                      <Textarea rows="3" placeholder="여러 줄 입력" aria-label="여러 줄 입력" style="width: 320px" />
                      <ProgressBar :value="62" style="width: 200px; height: 8px" aria-label="진행률 62%" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </TabPanel>

          <TabPanel value="blocks">
            <div class="blocks">
              <div class="ws-msg">
                <p class="ws-msg__tit">화면 한 장의 순서</p>
                <ul>
                  <li><code>.ws-page</code> — 원본 sub_contents. 안쪽 30 48 24, 블록 사이 24</li>
                  <li><code>.ws-pgt</code> — 원본 pgtbox. 제목 20/700 · 칩 · 오른쪽 경로. 아래 18</li>
                  <li><code>.ws-sh</code> — 원본 shbox. 조회 영역. 한 줄 폼 · 초록 조회 · 접기 손잡이</li>
                  <li><code>.ws-sec</code> = <code>.ws-tit</code> + 내용 — 제목줄 → 내용 12, 구획 사이 24(24 = 12 × 2)</li>
                  <li><code>.ws-page--canvas</code> + <code>.ws-card</code> — 대시보드·통계에만. 목록·폼은 평면</li>
                  <li><code>.ws-btnbox</code> — 원본 btnbox. 하단 버튼줄</li>
                </ul>
              </div>
              <table class="ws-tb">
                <colgroup><col style="width: 140px" /><col /><col style="width: 140px" /><col /></colgroup>
                <tbody>
                  <tr><th scope="row" class="req">필수 라벨</th><td><InputText fluid aria-label="필수 라벨" /></td><th scope="row">일반 라벨</th><td><InputText fluid aria-label="일반 라벨" /></td></tr>
                  <tr><th scope="row">설명 붙은 칸</th><td colspan="3"><InputText fluid aria-label="설명 붙은 칸" /><span class="ws-desc">설명은 칸 아래 12px — 원본 .desc</span></td></tr>
                </tbody>
              </table>
            </div>
          </TabPanel>

          <TabPanel value="feedback">
            <div class="row">
              <Button label="팝업 열기" severity="secondary" outlined @click="dlg = true" />
              <Button label="옆 패널 열기" severity="secondary" outlined @click="side = true" />
              <Button label="알림 띄우기" severity="secondary" outlined @click="notify('저장했습니다', 'success')" />
            </div>
            <p class="ws-desc" style="margin-top: 8px">확인이 필요 없는 결과는 알림으로 흘려보내고, 판단이 필요한 것만 팝업으로 세운다 — 원본 com.alert는 전부 모달이었다.</p>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </section>

    <Dialog v-model:visible="dlg" modal header="팝업 제목" :style="{ width: '480px' }">
      <p>머리 48px · 제목 16/700 — 원본 w2popup_window 치수를 PrimeVue Dialog에 입혔다.</p>
      <template #footer>
        <Button label="취소" severity="secondary" outlined @click="dlg = false" />
        <Button label="확인" @click="dlg = false" />
      </template>
    </Dialog>
    <Drawer v-model:visible="side" position="right" header="옆 패널" :style="{ width: '440px' }">
      <p>목록 맥락을 유지해야 하는 상세·편집에 쓴다.</p>
    </Drawer>
  </div>
</template>

<style scoped>
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.row + .ws-desc { margin-top: 8px; display: block; }
.sw { display: inline-block; width: 16px; height: 16px; margin-right: 8px; border: 1px solid var(--ws-border); border-radius: 3px; vertical-align: -3px; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: var(--ws-font-size-sm); }
.ok { color: var(--ws-text-success); font-weight: 600; }
.bad { color: var(--ws-text-danger); }
.blocks > * + * { margin-top: var(--ws-gap-region); }
</style>
