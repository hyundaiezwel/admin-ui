<script setup lang="ts">
/**
 * 컴포넌트 카탈로그 — 토큰 · 교정 · 컨트롤 · 구조 전부.
 *
 * 대비 수치는 **문구로 적지 않는다.** 화면에서 토큰을 읽어 그 자리에서 계산한다 —
 * 토큰이 바뀌었는데 카탈로그의 숫자가 그대로면 카탈로그가 거짓말을 한다.
 */
import { onMounted, ref } from 'vue'
import PageHead from '../app/PageHead.vue'
import WsTabs from '../ws/WsTabs.vue'
import WsDialog from '../ws/WsDialog.vue'
import WsCheckCombo from '../ws/WsCheckCombo.vue'
import { notify } from '../ws/notify'

const hex2rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const lum = (h: string) => { const [r, g, b] = hex2rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const cr = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const tok = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()

/** 교정 8건. 원본 값은 역사적 사실이라 박아 두고, 교정 값은 토큰에서 읽는다 */
const FIXES = [
  { what: '조회·팝업 확인 버튼', token: '--ws-action-search', orig: '#009782', fg: '#ffffff', bg: 'self', need: 4.5 },
  { what: '보조 버튼', token: '--ws-action-sub', orig: '#aaaaaa', fg: '#ffffff', bg: 'self', need: 4.5 },
  { what: '입력 테두리', token: '--ws-field-border', orig: '#cccccc', fg: 'self', bg: '#ffffff', need: 3 },
  { what: '브랜드 글자', token: '--ws-text-brand', orig: '#009782', fg: 'self', bg: '#f3f5f6', need: 4.5 },
  { what: '위험 글자 · 필수 *', token: '--ws-text-danger', orig: '#f04452', fg: 'self', bg: '#f3f5f6', need: 4.5 },
  { what: '성공 글자', token: '--ws-text-success', orig: '#00af7a', fg: 'self', bg: '#f3f5f6', need: 4.5 },
  { what: '링크', token: '--ws-text-link', orig: '#1573e1', fg: 'self', bg: '#f3f5f6', need: 4.5 },
  { what: '설명 글자', token: '--ws-text-muted', orig: '#727272', fg: 'self', bg: '#f3f5f6', need: 4.5 },
]
const fixes = ref<any[]>([])

const DIMS = [
  ['--ws-control-h', '입력 · 버튼', '.w2input · .btn_cm'],
  ['--ws-grid-head-h', '그리드 헤더', '.gridHeaderTDDefault'],
  ['--ws-grid-row-h', '그리드 행', '.gridBodyDefault'],
  ['--ws-form-row-h', '입력 표 행', '.tb .w2tb_th'],
  ['--ws-search-row-h', '조회 표 행', '.shbox .tb .w2tb_th'],
  ['--ws-tab-h', '탭줄', '.w2tabcontrol_tabhost'],
  ['--ws-popup-head-h', '팝업 머리', '.w2window_header'],
  ['--ws-radius', '모서리(최빈)', '6px 27회'],
]
const GAPS = [
  ['--ws-gap-adjacent', '붙은 것', '제목줄 버튼 사이'],
  ['--ws-gap-item', '안내문 줄', '.msgbox p + ul'],
  ['--ws-gap-intra', '폼 칸 안', '.w2tb_td .titbox + .gvwbox'],
  ['--ws-gap-inter', '제목줄 → 내용', '.titbox{margin-bottom}'],
  ['--ws-gap-block', '조회 영역 안', '.shbox_inner'],
  ['--ws-gap-region', '최상위 블록 사이', '27개 규칙'],
]
const dims = ref<string[][]>([])
const gaps = ref<string[][]>([])

onMounted(() => {
  fixes.value = FIXES.map((f) => {
    const now = tok(f.token)
    const pair = (v: string) => [f.fg === 'self' ? v : f.fg, f.bg === 'self' ? v : f.bg]
    const [of, ob] = pair(f.orig)
    const [nf, nb] = pair(now)
    return { ...f, now, before: cr(of, ob), after: cr(nf, nb) }
  })
  dims.value = DIMS.map(([t, n, s]) => [t, n, s, tok(t)])
  gaps.value = GAPS.map(([t, n, s]) => [t, n, s, tok(t)])
})

const tab = ref('controls')
const TABS = [{ id: 'controls', label: '컨트롤' }, { id: 'blocks', label: '구조' }, { id: 'feedback', label: '피드백', count: 3 }]
const dlg = ref(false)
const side = ref(false)
const combo = ref<string[]>(['web'])
const seg = ref('30일')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">원본에서 고친 값</h2><span class="ws-total">총<strong>{{ fixes.length }}</strong>건</span></div>
        <div class="ws-tit__r"><span class="ws-desc">같은 색상·채도에서 명도만 내렸다 — 모양 유지, 값만 고침</span></div>
      </div>
      <table class="ws-gtb">
        <caption class="ws-sr-only">원본 WebSquare 값과 교정 값의 대비 비교</caption>
        <colgroup><col style="width: 180px" /><col /><col style="width: 90px" /><col /><col style="width: 90px" /><col style="width: 72px" /></colgroup>
        <thead><tr><th scope="col">자리</th><th scope="col">원본</th><th scope="col">대비</th><th scope="col">교정</th><th scope="col">대비</th><th scope="col">기준</th></tr></thead>
        <tbody>
          <tr v-for="f in fixes" :key="f.token">
            <td>{{ f.what }}</td>
            <td><span class="sw" :style="{ background: f.orig }" /><code>{{ f.orig }}</code></td>
            <td class="ws-num" style="color: var(--ws-text-danger)">{{ f.before.toFixed(2) }}</td>
            <td><span class="sw" :style="{ background: f.now }" /><code>{{ f.now }}</code> <span class="ws-desc">{{ f.token }}</span></td>
            <td class="ws-num" style="color: var(--ws-text-success); font-weight: 600">{{ f.after.toFixed(2) }}</td>
            <td class="ws-num">{{ f.need }}:1</td>
          </tr>
        </tbody>
      </table>
      <div class="ws-msg" style="margin-top: 12px">
        <ul>
          <li>글자의 기준면은 흰색이 아니라 <b>머리 면 #f3f5f6</b>이다 — 폼 라벨 칸·그리드 헤더에 색 글자가 올라간다.</li>
          <li>표·그리드의 <code>#ccc</code> 선은 고치지 않았다. 장식선이라 WCAG 1.4.11 대상이 아니고, 입력 테두리만 컨트롤 경계를 알리는 유일한 선이다.</li>
        </ul>
      </div>
    </section>

    <div class="ws-split">
      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">치수</h2></div></div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">토큰</th><th scope="col">자리</th><th scope="col">원본</th><th scope="col">값</th></tr></thead>
          <tbody><tr v-for="d in dims" :key="d[0]"><td><code>{{ d[0] }}</code></td><td>{{ d[1] }}</td><td class="ws-desc">{{ d[2] }}</td><td class="ws-num">{{ d[3] }}</td></tr></tbody>
        </table>
      </section>
      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">간격 사다리</h2></div></div>
        <table class="ws-gtb">
          <thead><tr><th scope="col">토큰</th><th scope="col">자리</th><th scope="col">값</th><th scope="col" style="width: 40%">크기</th></tr></thead>
          <tbody><tr v-for="g in gaps" :key="g[0]"><td><code>{{ g[0] }}</code></td><td>{{ g[1] }}</td><td class="ws-num">{{ g[3] }}</td><td><span class="bar" :style="{ width: g[3] }" /></td></tr></tbody>
        </table>
      </section>
    </div>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">컴포넌트</h2></div></div>
      <WsTabs v-model="tab" :tabs="TABS">
        <template #default="{ active }">
          <!-- 컨트롤 -->
          <table v-if="active === 'controls'" class="ws-tb">
            <colgroup><col style="width: 140px" /><col /></colgroup>
            <tbody>
              <tr>
                <th scope="row">버튼</th>
                <td>
                  <div class="row">
                    <button type="button" class="ws-btn">기본</button>
                    <button type="button" class="ws-btn ws-btn--pri">저장(F2)</button>
                    <button type="button" class="ws-btn ws-btn--search">조회(F2)</button>
                    <button type="button" class="ws-btn ws-btn--sec">보조</button>
                    <button type="button" class="ws-btn ws-btn--line">CSV다운</button>
                    <button type="button" class="ws-btn ws-btn--danger">삭제</button>
                    <button type="button" class="ws-btn ws-btn--sm">작게</button>
                    <button type="button" class="ws-btn" disabled>비활성</button>
                  </div>
                  <p class="ws-desc">초록(조회)은 찾기·확정에만, 진회색(저장)은 일반 주버튼 — 원본의 두 주버튼 규칙이다.</p>
                </td>
              </tr>
              <tr>
                <th scope="row">입력 상태</th>
                <td>
                  <div class="row">
                    <input class="ws-input ws-input--auto" placeholder="기본" aria-label="기본 입력" />
                    <input class="ws-input ws-input--auto" value="읽기 전용" readonly aria-label="읽기 전용 입력" />
                    <input class="ws-input ws-input--auto" value="비활성" disabled aria-label="비활성 입력" />
                    <input class="ws-input ws-input--auto" value="오류" aria-invalid="true" aria-label="오류 입력" />
                    <input class="ws-input ws-input--auto ws-input--num" value="1,200,000" aria-label="숫자 입력" />
                  </div>
                </td>
              </tr>
              <tr>
                <th scope="row">선택</th>
                <td>
                  <div class="row">
                    <select class="ws-select" style="width: 160px" aria-label="선택"><option>전체</option><option>웹</option></select>
                    <div style="width: 180px"><WsCheckCombo v-model="combo" label="채널" :options="[{ value: 'web', label: '웹' }, { value: 'app', label: '앱' }, { value: 'tel', label: '전화' }]" /></div>
                    <input type="date" class="ws-input" aria-label="날짜" />
                    <div class="ws-seg" role="radiogroup" aria-label="기간">
                      <label v-for="r in ['7일', '30일', '90일']" :key="r"><input v-model="seg" type="radio" name="cat-seg" :value="r" /><span>{{ r }}</span></label>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <th scope="row">체크 · 라디오</th>
                <td>
                  <div class="ws-choices">
                    <label class="ws-check"><input type="checkbox" checked />사용</label>
                    <label class="ws-check"><input type="checkbox" />미사용</label>
                    <label class="ws-radio"><input type="radio" name="cat-r" checked />과세</label>
                    <label class="ws-radio"><input type="radio" name="cat-r" />면세</label>
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
                <th scope="row">파일 · 진행</th>
                <td>
                  <div class="row">
                    <div class="ws-file"><input type="file" aria-label="파일 선택" /></div>
                    <progress class="ws-progress" value="62" max="100" style="width: 200px" aria-label="진행률 62%" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 구조 -->
          <div v-else-if="active === 'blocks'" class="blocks">
            <div class="ws-msg">
              <p class="ws-msg__tit">화면 한 장의 순서</p>
              <ul>
                <li><code>.ws-page</code> — 원본 sub_contents. 안쪽 30 48 24, 블록 사이 24</li>
                <li><code>.ws-pgt</code> — 원본 pgtbox. 제목 20/700 · 칩 · 오른쪽 경로. 아래 18</li>
                <li><code>.ws-sh</code> — 원본 shbox. 조회 영역. 한 줄 폼 · 초록 조회 · 접기 손잡이</li>
                <li><code>.ws-sec</code> = <code>.ws-tit</code> + 내용 — 원본 titbox + gvwbox/tbbox. 사이 12</li>
                <li><code>.ws-btnbox</code> — 원본 btnbox. 하단 버튼줄, 버튼 안쪽 27</li>
                <li><code>.ws-msg</code> — 원본 msgbox. 안내문 13px</li>
              </ul>
            </div>
            <table class="ws-tb">
              <colgroup><col style="width: 140px" /><col /><col style="width: 140px" /><col /></colgroup>
              <tbody>
                <tr><th scope="row" class="req">필수 라벨</th><td><input class="ws-input" aria-label="필수 라벨" /></td><th scope="row">일반 라벨</th><td><input class="ws-input" aria-label="일반 라벨" /></td></tr>
                <tr><th scope="row">설명 붙은 칸</th><td colspan="3"><input class="ws-input" aria-label="설명 붙은 칸" /><span class="ws-desc">설명은 칸 아래 12px — 원본 .desc</span></td></tr>
              </tbody>
            </table>
          </div>

          <!-- 피드백 -->
          <div v-else class="row">
            <button type="button" class="ws-btn" @click="dlg = true">팝업 열기</button>
            <button type="button" class="ws-btn" @click="side = true">옆 패널 열기</button>
            <button type="button" class="ws-btn" @click="notify('저장했습니다', 'success')">알림 띄우기</button>
            <p class="ws-desc" style="flex-basis: 100%">확인이 필요 없는 결과는 알림으로 흘려보내고, 판단이 필요한 것만 팝업으로 세운다 — 원본 com.alert는 전부 모달이었다.</p>
          </div>
        </template>
      </WsTabs>
    </section>

    <WsDialog v-model:open="dlg" title="팝업 제목" width="480px">
      <p>머리 48px · #f6f7f9 · 제목 16/700 — 원본 w2popup_window 실측이다.</p>
      <p class="ws-desc">Esc · 배경 클릭 · 닫기 버튼으로 닫힌다. 포커스는 안에 갇힌다(네이티브 dialog).</p>
      <template #foot>
        <button type="button" class="ws-btn" @click="dlg = false">취소</button>
        <button type="button" class="ws-btn ws-btn--search" @click="dlg = false">확인</button>
      </template>
    </WsDialog>
    <WsDialog v-model:open="side" side title="옆 패널" width="440px">
      <p>목록 맥락을 유지해야 하는 상세·편집에 쓴다.</p>
      <template #foot><button type="button" class="ws-btn" @click="side = false">닫기</button></template>
    </WsDialog>
  </div>
</template>

<style scoped>
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.row + .ws-desc { margin-top: 8px; display: block; }
.sw { display: inline-block; width: 16px; height: 16px; margin-right: 8px; border: 1px solid rgb(0 0 0 / 0.12); border-radius: 3px; vertical-align: -3px; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: var(--ws-font-size-sm); }
.bar { display: block; height: 10px; background: var(--ws-action-search); border-radius: 2px; }
.blocks > * + * { margin-top: var(--ws-gap-region); }
</style>
