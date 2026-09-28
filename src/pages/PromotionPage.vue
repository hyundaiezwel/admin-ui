<script setup lang="ts">
/**
 * 프로모션 등록·관리 — 기간 · 대상 조건 · 상태 전이.
 *
 * 요점은 **상태가 입력 가능 항목을 정한다**는 것이다. 규칙은 fixtures의 `EDITABLE` 표
 * 하나에서 읽는다 — 화면에 흩어 두면 "진행 중인데 왜 수정되지"가 난다.
 *
 * 그리드에도 같은 규칙을 건다. 예약 건만 프로모션명 칸에 편집 상자가 뜨고, 진행·종료
 * 건은 상자가 사라진다(`isLocked`). 고칠 수 없는 칸에 상자를 그리면 거짓말이다.
 */
import { computed, onMounted, ref } from 'vue'
import PageHead from '../app/PageHead.vue'
import QueryState from '../app/QueryState.vue'
import TabGrid from '../grid/TabGrid.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Checkbox from 'primevue/checkbox'
import Drawer from 'primevue/drawer'
import Dialog from 'primevue/dialog'
import WsSearch from '../ws/WsSearch.vue'
import { notify } from '../ws/notify'
import { badgeClass, badgeHtml } from '../ws/badge'
import { useMockQuery, ERROR_KEYWORD } from '../app/useMockQuery'
import { makePromotions, PROMO_STATUS, PROMO_KINDS, PROMO_TARGETS, PROMO_STATUS_TONE, EDITABLE, type Promotion } from '@fixtures/promotions'
import { won } from '@fixtures/rng'

const ALL = ref(makePromotions(240))
const f = ref<{ keyword: string; status: string | null }>({ keyword: '', status: null })
const applied = ref({ ...f.value })

const edit = ref<Promotion | null>(null)
const open = ref(false)
const noEnd = ref(false)
const confirmStop = ref(false)

const { rows, loading, error, reload } = useMockQuery(
  () =>
    ALL.value.filter(
      (p) =>
        (!applied.value.keyword || p.name.includes(applied.value.keyword) || p.id.includes(applied.value.keyword)) &&
        (!applied.value.status || p.status === applied.value.status),
    ),
  { failIf: () => applied.value.keyword.includes(ERROR_KEYWORD) },
)
onMounted(reload)

const lock = computed(() => (edit.value ? EDITABLE[edit.value.status] : EDITABLE.종료))
const isLocked = (p: Promotion) => !EDITABLE[p.status].name

const columns = [
  { title: '프로모션 ID', field: 'id', width: 112, sorter: 'string', headerFilter: 'input' },
  {
    title: '프로모션명', field: 'name', minWidth: 220, sorter: 'string', headerFilter: 'input',
    // 편집은 상태가 허락할 때만 — 편집기 자체를 막아야 상자와 동작이 어긋나지 않는다
    editor: 'input', editable: (cell: any) => !isLocked(cell.getRow().getData()),
  },
  { title: '유형', field: 'kind', width: 82, sorter: 'string' },
  { title: '대상', field: 'target', width: 130, sorter: 'string' },
  { title: '시작일', field: 'startAt', width: 104, sorter: 'string' },
  { title: '종료일', field: 'endAt', width: 104, sorter: 'string',
    formatter: (c: any) => c.getValue() ?? '<span class="ws-desc">종료일 없음</span>' },
  { title: '예산', field: 'budget', width: 118, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number', formatter: (c: any) => won(c.getValue()) },
  { title: '집행률', field: 'used', width: 92, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number',
    formatter: (c: any) => `${Math.round((c.getValue() / c.getRow().getData().budget) * 100)}%` },
  { title: '상태', field: 'status', width: 92, hozAlign: 'center', headerHozAlign: 'center', sorter: 'string',
    formatter: (c: any) => badgeHtml(c.getValue(), PROMO_STATUS_TONE[c.getValue() as keyof typeof PROMO_STATUS_TONE]) },
]

const period = ref<(Date | null)[] | null>(null)
const ymd = (d: Date | null | undefined) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null)

function openEdit(row: Promotion) {
  edit.value = { ...row }
  noEnd.value = row.endAt === null
  period.value = [new Date(row.startAt), row.endAt ? new Date(row.endAt) : null]
  open.value = true
}
/** 범위 선택기는 [시작, 끝]을 준다. 끝을 아직 안 골랐으면 null — 그때는 시작만 반영한다 */
function onPeriod(v: Date | (Date | null)[] | Date[] | null | undefined) {
  if (!edit.value || !Array.isArray(v)) return
  edit.value.startAt = ymd(v[0]) ?? edit.value.startAt
  if (!noEnd.value) edit.value.endAt = ymd(v[1])
}
function save() {
  if (!edit.value) return
  const i = ALL.value.findIndex((p) => p.id === edit.value!.id)
  const next = { ...edit.value, endAt: noEnd.value ? null : edit.value.endAt }
  i >= 0 ? (ALL.value[i] = next) : ALL.value.unshift(next)
  reload()
  notify(`${edit.value.id} 저장했습니다`, 'success')
  open.value = false
}
function stop() {
  if (!edit.value) return
  edit.value.status = '중단'
  confirmStop.value = false
  save()
}
function search() { applied.value = { ...f.value }; reload() }
function reset() { f.value = { keyword: '', status: null }; search() }
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['72px', '', '132px', '', '', '']" @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="p-kw">검색어</label></th>
        <td><InputText id="p-kw" v-model="f.keyword" fluid placeholder="프로모션명 또는 ID" /></td>
        <th scope="row"><label for="p-st">상태</label></th>
        <td>
          <Select v-model="f.status" input-id="p-st" :options="[...PROMO_STATUS]" placeholder="전체" show-clear fluid />
        </td>
        <td colspan="2" />
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">프로모션 목록</h2>
          <span class="ws-total">총<strong>{{ rows.length }}</strong>건</span>
          <span class="ws-desc">예약 건만 이름을 바로 고칠 수 있다</span>
        </div>
        <div class="ws-tit__r">
          <Button label="프로모션 등록" severity="contrast" @click="openEdit(makePromotions(1, Date.now())[0])" />
        </div>
      </div>
      <div class="ws-gv">
        <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="12" @retry="reload">
          <TabGrid :columns="columns" :rows="rows" editable :is-locked="isLocked" height="440px" @row-click="openEdit" />
        </QueryState>
      </div>
    </section>

    <Drawer v-model:visible="open" position="right" :style="{ width: '600px' }" :header="edit ? `${edit.id} 편집` : '편집'">
      <template v-if="edit">
        <!-- 왜 잠겼는지를 화면이 말해 준다. 비활성만 시키면 사용자는 고장으로 읽는다 -->
        <div class="state">
          <span :class="badgeClass(PROMO_STATUS_TONE[edit.status])">{{ edit.status }}</span>
          <span class="ws-desc">{{ lock.note }}</span>
        </div>

        <table class="ws-tb">
          <colgroup><col style="width: 112px" /><col /></colgroup>
          <tbody>
            <tr>
              <th scope="row" class="req"><label for="e-name">프로모션명</label></th>
              <td><InputText id="e-name" v-model="edit.name" fluid :readonly="!lock.name" required /></td>
            </tr>
            <tr>
              <th scope="row"><label for="e-kind">유형</label></th>
              <td>
                <Select v-model="edit.kind" input-id="e-kind" :options="[...PROMO_KINDS]" fluid :disabled="!lock.name" />
              </td>
            </tr>
            <tr>
              <th scope="row" class="req"><span id="e-period">기간</span></th>
              <td>
                <div class="ws-range">
                  <!-- 한 칸 범위 선택 — 시작일보다 앞선 종료일은 달력에서 못 고른다 -->
                  <DatePicker v-model="period" selection-mode="range" date-format="yy-mm-dd" show-icon :manual-input="false"
                    :disabled="!lock.period" aria-labelledby="e-period" placeholder="시작일 ~ 종료일" style="width: 260px" @update:model-value="onPeriod" />
                  <div class="ws-check"><Checkbox v-model="noEnd" input-id="e-noend" binary :disabled="!lock.period" /><label for="e-noend">종료일 없음</label></div>
                </div>
              </td>
            </tr>
            <tr>
              <th scope="row"><label for="e-target">대상 조건</label></th>
              <td>
                <Select v-model="edit.target" input-id="e-target" :options="[...PROMO_TARGETS]" fluid :disabled="!lock.target" />
              </td>
            </tr>
            <tr>
              <th scope="row"><label for="e-budget">예산 (원)</label></th>
              <td>
                <InputNumber v-model="edit.budget" input-id="e-budget" locale="ko-KR" :min="0" :step="1000000" fluid :disabled="!lock.budget" />
                <span class="ws-desc">집행 {{ won(edit.used) }}원 · {{ Math.round((edit.used / edit.budget) * 100) }}%</span>
              </td>
            </tr>
          </tbody>
        </table>

        <section>
          <h3 class="ws-desc" style="margin-bottom: 8px; font-weight: 500">고객 화면 미리보기</h3>
          <div class="prev">
            <p class="prev__kind">{{ edit.kind }}</p>
            <p class="prev__name">{{ edit.name }}</p>
            <p class="ws-desc">{{ edit.startAt }} ~ {{ noEnd ? '상시' : edit.endAt }}</p>
          </div>
        </section>
      </template>

      <template #footer>
        <div class="foot">
          <Button v-if="edit?.status === '진행'" label="중단" severity="danger" outlined style="margin-right: auto" @click="confirmStop = true" />
          <Button label="취소" severity="secondary" outlined @click="open = false" />
          <Button label="저장" severity="contrast" :disabled="edit?.status === '종료' || edit?.status === '중단'" @click="save" />
        </div>
      </template>
    </Drawer>

    <Dialog v-model:visible="confirmStop" modal header="프로모션 중단" :style="{ width: '420px' }">
      <p><b>{{ edit?.name }}</b> 을(를) 중단합니다.</p>
      <p class="ws-desc" style="margin-top: 6px">중단하면 되돌릴 수 없고, 남은 예산은 집행되지 않습니다.</p>
      <template #footer>
        <Button label="취소" severity="secondary" outlined @click="confirmStop = false" />
        <Button label="중단" severity="danger" @click="stop" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.foot { display: flex; justify-content: flex-end; gap: 6px; }
:deep(.p-drawer-content) > * + * { margin-top: var(--ws-gap-region); }
.state { display: flex; align-items: center; gap: var(--ws-gap-intra); padding: 10px 12px; background: var(--ws-surface-head); border-radius: var(--ws-radius); }
.prev { padding: 16px; border: 1px dashed var(--ws-border); border-radius: var(--ws-radius-lg); background: var(--ws-surface-raised); }
.prev__kind { font-size: var(--ws-font-size-sm); font-weight: 700; color: var(--ws-text-brand); }
.prev__name { margin: 4px 0; font-size: 18px; font-weight: 700; }
</style>
