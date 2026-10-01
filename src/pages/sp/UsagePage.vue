<script setup lang="ts">
/**
 * 이용내역 조회 — AS-IS S-004-02 (난이도 4).
 *
 * 포인트 사용 건별 내역. 미리보기에서 바꾼 것:
 *   ① **주민번호 검색을 뺐다.** AS-IS는 주민번호를 검색 키로 받는다(목록에는 없고 입력으로만).
 *      이름 · 사번으로 충분하고, 주민번호 입력 칸이 있으면 화면이 수집 경로가 된다 — 결정 필요 항목
 *   ② 날짜 기준(적용일자 · 승인일자 · 매입일자)을 기간 칸의 기준 선택으로. 기간이 필수라 기본값 1개월
 *   ③ 카드 승인 · 매입 두 날짜를 2단 머리글로
 *   ④ 조회 결과 합계(건수 · 사용 · 취소)를 목록 위에 — 목록을 끝까지 넘기지 않아도 된다
 *   ⑤ 제휴사는 실명 대신 업종 + 기호(공개 저장소)
 */
import { computed, onMounted, ref, watch } from 'vue'
import PageHead from '../../app/PageHead.vue'
import QueryState from '../../app/QueryState.vue'
import TabGrid from '../../grid/TabGrid.vue'
import InputText from 'primevue/inputtext'
import RadioButton from 'primevue/radiobutton'
import Select from 'primevue/select'
import WsSearch from '../../ws/WsSearch.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsPager from '../../ws/WsPager.vue'
import WsDownload from '../../ws/WsDownload.vue'
import { parseDate, periodError, presetRange, PRESETS, type Range } from '../../ws/period'
import { mask } from '../../ws/mask'
import { notify } from '../../ws/notify'
import { usePaged } from '../../app/usePaged'
import { ERROR_KEYWORD } from '../../app/useMockQuery'
import { bizLabel } from '../../sp/codes'
import { ctx, ctxKey } from '../../sp/context'
import { memo } from '../../sp/stores'
import { makeUsage, PARTNERS, PAY_KIND, type UsageRow } from '@fixtures/sp'

const blank = () => ({ range: presetRange(PRESETS[2]) as Range, basis: '적용일자', partner: '', kind: '', age: 0, gender: '', kwType: '이름', kw: '' })
const f = ref(blank())
const applied = ref(blank())
const all = computed(() => memo('usage', ctxKey(), () => makeUsage(ctxKey(), ctx.year)))
const hit = (r: UsageRow) => {
  const a = applied.value
  const dStr = a.basis === '승인일자' ? r.approve : a.basis === '매입일자' ? r.buy : r.at
  const d = parseDate(dStr)
  const k = a.kw.trim()
  return !!d && (!a.range[0] || d >= a.range[0]) && (!a.range[1] || d <= a.range[1]) &&
    (!a.partner || r.item.startsWith(a.partner)) && (!a.kind || r.kind === a.kind) && (!a.age || r.age === a.age) &&
    (!a.gender || r.gender === a.gender) && (!k || (a.kwType === '이름' ? r.name : r.empNo).includes(k))
}
const list = computed(() => all.value.filter(hit))
const { rows, loading, error, reload, first, size, total, search: requery } = usePaged(() => list.value, { failIf: () => applied.value.kw.includes(ERROR_KEYWORD) })
onMounted(reload)
watch(ctxKey, () => requery())
function search() {
  if (!f.value.range[0] || !f.value.range[1]) return notify('조회 기간을 넣으세요 — 이용내역은 기간이 필수다', 'warning')
  if (periodError(f.value.range, { maxMonths: 12 })) return notify('조회 기간은 최대 12개월입니다', 'danger')
  applied.value = { ...f.value }
  requery()
}
function reset() { f.value = blank(); search() }

const sum = computed(() => ({
  n: list.value.length,
  use: list.value.filter((r) => !r.cancel).reduce((t, r) => t + r.point, 0),
  cancel: list.value.filter((r) => r.cancel).reduce((t, r) => t + r.point, 0),
}))
const won = (x: number) => x.toLocaleString('ko-KR')
const columns = [
  { title: '번호', field: 'no', width: 72, hozAlign: 'right', headerHozAlign: 'center' },
  { title: '적용일자', field: 'at', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '시간', field: 'time', width: 64, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '카드', headerHozAlign: 'center', cssClass: 'ws-col-g', columns: [
    { title: '승인', field: 'approve', width: 100, hozAlign: 'center', headerHozAlign: 'center', cssClass: 'ws-col-g' },
    { title: '매입', field: 'buy', width: 100, hozAlign: 'center', headerHozAlign: 'center' },
  ] },
  { title: '이름', field: 'name', width: 80, hozAlign: 'center', headerHozAlign: 'center', cssClass: 'ws-col-g', formatter: (c: any) => mask(c.getValue(), 'name') },
  { title: '사번', field: 'empNo', width: 80, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '구분', field: 'kind', width: 110, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '카테고리', field: 'category', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '이용내역', field: 'item', minWidth: 180 },
  { title: '포인트유형', field: 'ptype', width: 90, hozAlign: 'center', headerHozAlign: 'center' },
  { title: '상태', field: 'cancel', width: 70, hozAlign: 'center', headerHozAlign: 'center', formatter: (c: any) => (c.getValue() ? '<span class="ws-badge ws-badge--danger">취소</span>' : '사용') },
  { title: '포인트', field: 'point', width: 100, hozAlign: 'right', headerHozAlign: 'center', sorter: 'number', formatter: (c: any) => (c.getValue() < 0 ? `<span class="neg">${won(c.getValue())}</span>` : won(c.getValue())) },
]
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['104px', '', '160px', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row" class="req"><label for="us-from">기간</label></th>
        <td colspan="3"><WsPeriod id="us-from" v-model="f.range" v-model:basis="f.basis" :bases="['적용일자', '승인일자', '매입일자']" :limit="{ maxMonths: 12 }" /></td>
      </tr>
      <tr>
        <th scope="row"><label for="us-p">제휴사</label></th>
        <td><Select v-model="f.partner" input-id="us-p" :options="['', ...PARTNERS].map((v) => ({ v, l: v || '전체' }))" option-label="l" option-value="v" placeholder="전체" filter fluid /></td>
        <th scope="row"><label for="us-k">구분</label></th>
        <td><Select v-model="f.kind" input-id="us-k" :options="['', ...PAY_KIND].map((v) => ({ v, l: v || '전체' }))" option-label="l" option-value="v" placeholder="전체" fluid /></td>
      </tr>
      <tr>
        <th scope="row"><label for="us-kw">검색어</label></th>
        <td>
          <div class="ws-kw">
            <Select v-model="f.kwType" :options="['이름', '사번']" aria-label="검색어 구분" class="ws-kw__type" />
            <InputText id="us-kw" v-model="f.kw" fluid :placeholder="`${f.kwType} 입력`" />
          </div>
        </td>
        <th scope="row">성별</th>
        <td>
          <div class="ws-choices" role="radiogroup" aria-label="성별">
            <div v-for="[v, l] in [['', '전체'], ['M', '남성'], ['F', '여성']]" :key="v" class="ws-radio"><RadioButton v-model="f.gender" :input-id="`us-g-${v}`" name="us-g" :value="v" /><label :for="`us-g-${v}`">{{ l }}</label></div>
          </div>
        </td>
      </tr>
      <template #detail>
        <tr>
          <th scope="row">연령</th>
          <td colspan="3">
            <div class="ws-choices" role="radiogroup" aria-label="연령">
              <div v-for="[v, l] in [[0, '전체'], [20, '20대'], [30, '30대'], [40, '40대'], [50, '50대 이상']]" :key="v" class="ws-radio"><RadioButton v-model="f.age" :input-id="`us-a-${v}`" name="us-a" :value="v" /><label :for="`us-a-${v}`">{{ l }}</label></div>
            </div>
          </td>
        </tr>
      </template>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">이용내역</h2>
          <span class="ws-fresh ws-fresh--live">실시간</span>
          <span class="ws-desc">{{ applied.basis }} 기준 · {{ ctx.year }}년 {{ bizLabel(ctx.biz) }}</span>
        </div>
        <div class="ws-tit__r"><WsDownload :total="total" :limit="50000" /></div>
      </div>
      <dl class="sm" aria-label="조회 결과 합계">
        <div><dt>건수</dt><dd>{{ won(sum.n) }}</dd></div>
        <div><dt>사용</dt><dd>{{ won(sum.use) }}<small>원</small></dd></div>
        <div><dt>취소</dt><dd class="neg">{{ won(sum.cancel) }}<small>원</small></dd></div>
        <div><dt>순사용</dt><dd>{{ won(sum.use + sum.cancel) }}<small>원</small></dd></div>
      </dl>
      <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="10" @retry="reload">
        <TabGrid :columns="columns" :rows="rows" height="auto" />
      </QueryState>
      <WsPager v-model:first="first" v-model:rows="size" :total="total" />
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>AS-IS의 <b>주민번호 검색은 뺐다</b> — 이름 · 사번으로 찾는다. 필요하면 기획 결정 후 되살린다.</li>
        <li>카드 결제는 승인일과 매입일이 다르다. 정산은 매입일, 포인트 차감은 적용일 기준이다.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.sm { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: var(--ws-gap-inter); }
.sm div { padding: 10px 16px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); }
.sm dt { color: var(--ws-text-sub); font-size: var(--ws-font-size-md); }
.sm dd { margin-top: 2px; font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.sm dd small { margin-left: 2px; font-size: var(--ws-font-size-md); font-weight: 400; }
.neg { color: var(--ws-text-danger); }
:deep(.neg) { color: var(--ws-text-danger); }
</style>
