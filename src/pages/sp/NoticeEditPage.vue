<script setup lang="ts">
/**
 * 공지사항 등록 — AS-IS S-001-01(공지사항관리). 본문을 리치 텍스트 에디터(`WsEditor`, Tiptap 3)로 쓴다.
 *
 * **항목은 요구사항 확정 전 가정이다**(MOCK 표식). 저장 · 업로드는 목업이고(`src/sp/notice.ts`) 서버를 부르지 않는다.
 * 미리보기는 v-html이 아니라 같은 에디터를 읽기 전용으로 그린다 — 화면에 보이는 것과 저장되는 것이 같은 스키마를 지난다.
 */
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import RadioButton from 'primevue/radiobutton'
import PageHead from '../../app/PageHead.vue'
import WsEditor from '../../ws/WsEditor.vue'
import WsPeriod from '../../ws/WsPeriod.vue'
import WsUpload from '../../ws/WsUpload.vue'
import type { Range } from '../../ws/period'
import { BODY_MAX, NOTICE_TARGETS, TITLE_MAX, mockSaveNotice, mockUploadImage } from '../../sp/notice'

const router = useRouter()
const form = reactive({
  title: '',
  target: 'ALL' as string,
  period: [null, null] as Range,
  pinned: false,
  file: null as File | null,
  body: '',
})
const bodyErr = ref<string | null>(null)
const fileErr = ref<string | null>(null)
const touched = ref(false)

/** 본문 글자 수 — 태그를 뺀 글자(공백 포함). 에디터 안 카운터와 같은 축 */
const bodyText = computed(() => new DOMParser().parseFromString(form.body, 'text/html').body.textContent ?? '')
const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.title.trim()) e.title = '제목을 입력해 주세요.'
  else if (form.title.length > TITLE_MAX) e.title = `제목은 ${TITLE_MAX}자까지 쓸 수 있습니다.`
  const [s, t] = form.period
  if (!s || !t) e.period = '게시 기간을 정해 주세요.'
  else if (s > t) e.period = '게시 종료일이 시작일보다 앞섭니다.'
  if (!bodyText.value.trim() && !/<img/.test(form.body)) e.body = '본문을 입력해 주세요.'
  else if (bodyText.value.length > BODY_MAX) e.body = `본문은 ${BODY_MAX.toLocaleString()}자까지 쓸 수 있습니다.`
  return e
})
const firstError = computed(() => Object.values(errors.value)[0] ?? bodyErr.value ?? fileErr.value)

const preview = ref(false)
const saving = ref(false)
const done = ref<{ id: string } | null>(null)
async function save() {
  touched.value = true
  if (Object.keys(errors.value).length || bodyErr.value || fileErr.value) return
  saving.value = true
  try { done.value = await mockSaveNotice() } finally { saving.value = false }
}
const targetLabel = computed(() => NOTICE_TARGETS.find((t) => t.value === form.target)?.label ?? '')
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">공지 내용</h2></div></div>
      <table class="ws-tb">
        <colgroup><col style="width: 160px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row" class="req"><label for="nt-title">제목</label><span class="ws-sr-only">(필수)</span></th>
            <td>
              <InputText id="nt-title" v-model="form.title" fluid :maxlength="TITLE_MAX" placeholder="공지 제목" :invalid="touched && !!errors.title" aria-describedby="nt-title-n" />
              <span id="nt-title-n" class="ws-desc">{{ form.title.length }} / {{ TITLE_MAX }}자</span>
              <span v-if="touched && errors.title" class="ws-err" role="alert">{{ errors.title }}</span>
            </td>
          </tr>
          <tr>
            <!-- MOCK(notice): data 게시 대상 선택지는 가정 -->
            <th scope="row">게시 대상</th>
            <td>
              <div class="opts" role="radiogroup" aria-label="게시 대상">
                <label v-for="t in NOTICE_TARGETS" :key="t.value" class="opt"><RadioButton v-model="form.target" :value="t.value" :input-id="`nt-t-${t.value}`" />{{ t.label }}</label>
              </div>
            </td>
          </tr>
          <tr>
            <th scope="row" class="req"><label for="nt-period">게시 기간</label><span class="ws-sr-only">(필수)</span></th>
            <td>
              <WsPeriod id="nt-period" v-model="form.period" />
              <span v-if="touched && errors.period" class="ws-err" role="alert">{{ errors.period }}</span>
            </td>
          </tr>
          <tr>
            <th scope="row">상단 고정</th>
            <td><label class="opt"><Checkbox v-model="form.pinned" binary input-id="nt-pin" />목록 맨 위에 고정</label></td>
          </tr>
          <tr>
            <!-- MOCK(notice): ui 첨부 제약(형식 · 용량)은 WsUpload 기본값을 그대로 쓴 가정 -->
            <th scope="row"><label for="nt-file">첨부파일</label></th>
            <td><WsUpload id="nt-file" v-model="form.file" :accept="['pdf', 'hwp', 'docx', 'xlsx', 'jpg', 'png']" :max-kb="10240" @invalid="fileErr = $event" /></td>
          </tr>
          <tr>
            <th scope="row" class="req"><span id="nt-body-l">본문</span><span class="ws-sr-only">(필수)</span></th>
            <td class="body">
              <WsEditor
                id="nt-body" v-model="form.body" :upload-image="mockUploadImage" :max-length="BODY_MAX"
                placeholder="공지 본문을 입력하세요. 이미지는 붙여넣거나 끌어 놓아도 됩니다."
                aria-label="공지 본문" :invalid="touched && !!errors.body" @invalid="bodyErr = $event"
              />
              <span v-if="touched && errors.body && !bodyErr" class="ws-err" role="alert">{{ errors.body }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="ws-btnbox">
      <span />
      <div class="ws-btnbox__c">
        <Button label="취소" severity="secondary" outlined @click="router.back()" />
        <Button label="미리보기" severity="secondary" outlined @click="preview = true" />
        <Button label="저장" severity="contrast" :loading="saving" @click="save" />
      </div>
      <span />
    </div>
    <p v-if="touched && firstError" class="ws-err sum" role="alert">{{ firstError }}</p>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>게시 대상 · 본문 글자 수 상한(5,000자)은 요구사항 확정 전 가정입니다.</li>
        <li>저장과 이미지 업로드는 목업입니다 — 서버로 보내지 않고, 이미지는 이 브라우저 안에서만 보입니다.</li>
      </ul>
    </div>

    <Dialog v-model:visible="preview" modal header="미리보기" :style="{ width: '760px' }" :dismissable-mask="false">
      <article class="pv">
        <header class="pv__h">
          <span v-if="form.pinned" class="ws-badge ws-badge--brand">고정</span>
          <h3 class="pv__t">{{ form.title || '(제목 없음)' }}</h3>
          <p class="pv__m">{{ targetLabel }} · {{ form.period[0]?.toLocaleDateString('ko-KR') ?? '—' }} ~ {{ form.period[1]?.toLocaleDateString('ko-KR') ?? '—' }}</p>
        </header>
        <WsEditor id="nt-preview" :model-value="form.body" :upload-image="mockUploadImage" :editable="false" aria-label="공지 본문 미리보기" />
      </article>
    </Dialog>

    <!-- MOCK(notice): result 저장 결과 — 실제 저장 응답이 아니다 -->
    <Dialog :visible="!!done" modal header="저장했습니다" :style="{ width: '400px' }" :closable="false">
      <p>공지 <b>{{ done?.id }}</b>를 저장했습니다(목업).</p>
      <template #footer><Button label="확인" severity="contrast" @click="done = null" /></template>
    </Dialog>
  </div>
</template>

<style scoped>
.opts { display: flex; flex-wrap: wrap; gap: 8px 20px; }
.opt { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.ws-tb td.body { padding: 8px 10px; }
.sum { margin-top: 8px; text-align: center; }
.pv { display: grid; gap: 12px; }
.pv__h { display: grid; gap: 4px; padding-bottom: 10px; border-bottom: 1px solid var(--ws-border); }
.pv__t { margin: 0; font-size: var(--ws-font-size-lg); font-weight: 700; }
.pv__m { margin: 0; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
</style>
