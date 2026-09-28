<script setup lang="ts">
/**
 * 문의 답변 관리 — 편집 그리드 + 범위 복붙 + 답변 패널.
 *
 * WebSquare 목록 화면의 표준 배치를 따른다.
 *   화면 제목(pgtbox) → 조회 영역(shbox) → 목록 구획(titbox + gvwbox) → 안내문(msgbox)
 * 조회는 초록, 저장·확정은 진회색 — 원본의 두 주버튼 규칙 그대로다.
 */
import { onMounted, ref } from 'vue'
import PageHead from '../app/PageHead.vue'
import QueryState from '../app/QueryState.vue'
import TabGrid from '../grid/TabGrid.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import AutoComplete from 'primevue/autocomplete'
import Textarea from 'primevue/textarea'
import Drawer from 'primevue/drawer'
import Dialog from 'primevue/dialog'
import WsSearch from '../ws/WsSearch.vue'
import { notify } from '../ws/notify'
import { badgeClass } from '../ws/badge'
import { useMockQuery, ERROR_KEYWORD } from '../app/useMockQuery'
import { INQUIRY_COLUMNS, INQUIRY_PASTE_RULES } from '../grid/inquiryColumns'
import { makeInquiries, CHANNELS, STATUSES, ASSIGNEES, STATUS_TONE, type Inquiry } from '@fixtures/inquiries'

const ALL = makeInquiries(2000)

const f = ref<{ keyword: string; channel: string | null; status: string | null; assignee: string }>({ keyword: '', channel: null, status: null, assignee: '' })
const assigneeHits = ref<string[]>([])
const newAssignee = ref<string | null>(null)
const applied = ref({ ...f.value })

const selectedCount = ref(0)
const pasteMsg = ref('')
const replyOpen = ref(false)
const bulkOpen = ref(false)
const reply = ref('')
const current = ref<Inquiry | null>(null)

const { rows, loading, error, reload } = useMockQuery(
  () =>
    ALL.filter((r) => {
      const a = applied.value
      return (
        (!a.keyword || r.title.includes(a.keyword) || r.id.includes(a.keyword)) &&
        (!a.channel || r.channel === a.channel) &&
        (!a.status || r.status === a.status) &&
        (!a.assignee || r.assignee === a.assignee)
      )
    }),
  { failIf: () => applied.value.keyword.includes(ERROR_KEYWORD) },
)
onMounted(reload)

const grid = ref<InstanceType<typeof TabGrid> | null>(null)

function search() {
  applied.value = { ...f.value }
  reload()
}
function reset() {
  f.value = { keyword: '', channel: null, status: null, assignee: '' }
  search()
}

/** 한글 조합 중에도 후보가 따라오는지가 이 칸의 확인 지점이다 */
function searchAssignee(e: { query: string }) {
  assigneeHits.value = ASSIGNEES.filter((n) => !e.query || n.includes(e.query))
}

function openReply(row: Inquiry) {
  current.value = row
  reply.value = ''
  replyOpen.value = true
}
function saveReply() {
  replyOpen.value = false
  notify(`${current.value?.id} 답변을 등록했습니다`, 'success')
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="q-kw">검색어</label></th>
        <td><InputText id="q-kw" v-model="f.keyword" fluid placeholder="문의번호 또는 제목" /></td>
        <th scope="row"><label for="q-ch">채널</label></th>
        <td>
          <Select v-model="f.channel" input-id="q-ch" :options="[...CHANNELS]" placeholder="전체" show-clear fluid />
        </td>
        <th scope="row"><label for="q-st">상태</label></th>
        <td>
          <Select v-model="f.status" input-id="q-st" :options="[...STATUSES]" placeholder="전체" show-clear fluid />
        </td>
      </tr>
      <template #detail>
        <tr>
          <th scope="row"><label for="q-as">담당자</label></th>
          <td>
            <!-- 한글 IME 조합 중 동작을 확인하는 칸이다. PrimeVue AutoComplete는 compositionend 뒤에 검색한다 -->
            <AutoComplete v-model="f.assignee" input-id="q-as" :suggestions="assigneeHits" placeholder="이름 1자 이상" fluid @complete="searchAssignee" />
          </td>
          <td colspan="4" />
        </tr>
      </template>
    </WsSearch>

    <!-- 목록 -->
    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">문의 목록</h2>
          <span class="ws-total">총<strong>{{ rows.length.toLocaleString('ko-KR') }}</strong>건</span>
          <span class="ws-desc">선택 {{ selectedCount }}건</span>
        </div>
        <div class="ws-tit__r">
          <Button label="CSV다운" severity="secondary" outlined class="ws-line" @click="grid?.exportCsv('inquiries.csv')" />
          <Button label="담당자 일괄 변경" severity="secondary" outlined class="ws-line" :disabled="!selectedCount" @click="bulkOpen = true" />
          <span class="ws-sep" aria-hidden="true" />
          <Button label="선택 종결" severity="danger" outlined :disabled="!selectedCount" />
          <Button label="답변 등록" severity="contrast" :disabled="!current" @click="replyOpen = true" />
        </div>
      </div>

      <div class="ws-gv">
        <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="11" @retry="reload">
          <TabGrid
            ref="grid"
            :columns="INQUIRY_COLUMNS"
            :rows="rows"
            :paste-rules="INQUIRY_PASTE_RULES"
            editable
            height="460px"
            @selection-change="selectedCount = $event"
            @paste-report="pasteMsg = $event.summary"
            @row-click="openReply"
          />
        </QueryState>
        <p v-if="pasteMsg" class="ws-desc" role="status" style="margin-top: 8px">{{ pasteMsg }}</p>
      </div>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>테두리가 있는 칸은 고칠 수 있다. 셀을 드래그해 범위를 잡고 <kbd>⌘C</kbd> / <kbd>⌘V</kbd>로 복사·붙여넣기 한다.</li>
        <li>규칙에 맞지 않는 값이 하나라도 있으면 <b>전량 거부</b>된다 — 일부만 들어가면 어디까지 반영됐는지 알 수 없다.</li>
        <li>상태 확인 — 검색어에 <b>오류</b>를 넣으면 실패 화면이, 없는 값을 넣으면 빈 화면이 나온다.</li>
      </ul>
    </div>

    <!-- 답변 — 목록 맥락을 유지해야 해서 옆 패널이다 -->
    <Drawer v-model:visible="replyOpen" position="right" :style="{ width: '560px' }" :header="current ? `${current.id} 답변 등록` : '답변 등록'">
      <div v-if="current" class="rp">
        <table class="ws-tb">
          <colgroup><col style="width: 88px" /><col /><col style="width: 88px" /><col /></colgroup>
          <tbody>
            <tr><th scope="row">채널</th><td>{{ current.channel }}</td><th scope="row">분류</th><td>{{ current.category }}</td></tr>
            <tr><th scope="row">고객</th><td>{{ current.customer }}</td><th scope="row">상태</th><td><span :class="badgeClass(STATUS_TONE[current.status])">{{ current.status }}</span></td></tr>
            <tr><th scope="row">제목</th><td colspan="3">{{ current.title }}</td></tr>
          </tbody>
        </table>
        <div>
          <label class="ws-req" for="rp-body" style="display: block; margin-bottom: 8px; font-weight: 500">답변 내용</label>
          <Textarea id="rp-body" v-model="reply" rows="10" maxlength="1500" fluid placeholder="고객에게 보낼 답변을 입력하세요" />
          <p class="ws-desc" style="text-align: right">{{ reply.length.toLocaleString() }} / 1,500자</p>
        </div>
      </div>
      <template #footer>
        <div class="rp__foot">
          <Button label="취소" severity="secondary" outlined @click="replyOpen = false" />
          <Button label="등록" :disabled="!reply.trim()" @click="saveReply" />
        </div>
      </template>
    </Drawer>

    <Dialog v-model:visible="bulkOpen" modal header="담당자 일괄 변경" :style="{ width: '420px' }">
      <p style="margin-bottom: 12px">선택한 <b>{{ selectedCount }}건</b>의 담당자를 변경합니다.</p>
      <Select v-model="newAssignee" :options="ASSIGNEES" placeholder="새 담당자" aria-label="새 담당자" fluid />
      <template #footer>
        <Button label="취소" severity="secondary" outlined @click="bulkOpen = false" />
        <Button label="확인" :disabled="!newAssignee" @click="bulkOpen = false; notify('담당자를 변경했습니다', 'success')" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.rp > * + * { margin-top: var(--ws-gap-region); }
.rp__foot { display: flex; justify-content: flex-end; gap: 6px; }
kbd {
  padding: 1px 4px; border: 1px solid var(--ws-border); border-radius: var(--ws-radius-sm);
  background: var(--ws-surface-head); font-family: ui-monospace, monospace; font-size: var(--ws-font-size-sm);
}
</style>
