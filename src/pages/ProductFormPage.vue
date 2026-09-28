<script setup lang="ts">
/**
 * 상품 등록·수정 — 입력 타입 풀세트. 저장 검증과 미저장 이탈 확인이 목적이다.
 *
 * 원본 등록 화면의 배치 — 구획 제목(titbox) + 입력 표(tbbox) 반복 + 하단 버튼줄(btnbox).
 * 입력 표는 한 줄에 라벨·칸 두 쌍이다. 저장은 진회색, 확정 팝업만 초록이다.
 *
 * 비고는 **바이트**로 센다 — 원본 업무 시스템이 DB 컬럼 길이를 바이트로 잡는다.
 * 글자 수로 세면 한글 500자는 통과하고 저장할 때 잘린다.
 */
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import PageHead from '../app/PageHead.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import DatePicker from 'primevue/datepicker'
import RadioButton from 'primevue/radiobutton'
import Checkbox from 'primevue/checkbox'
import Textarea from 'primevue/textarea'
import FileUpload from 'primevue/fileupload'
import Dialog from 'primevue/dialog'
import { notify } from '../ws/notify'
import { useHotkey } from '../app/useHotkey'

const empty = () => ({ name: '', code: '', category: null as string | null, channels: [] as string[], price: 0 as number | null, stock: 0 as number | null, taxType: '과세', openAt: null as Date | null, active: true, note: '' })
const form = ref(empty())
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const dirty = ref(false)
const leaveAsk = ref(false)
let leaveNext: (() => void) | null = null

const CATEGORIES = ['상품권', '건강', '여행', '문화', '도서']
const CHANNELS = ['웹', '앱', '제휴몰']

/* 칸마다 @input을 달지 않는다 — 폼 전체를 한 번 본다. PrimeVue의 선택·날짜 칸은 input 이벤트를
   올리지 않아서 루트 @input으로는 이탈 확인을 건너뛴다(DS2 방식이 여기서 깨진다) */
watch(form, () => { dirty.value = true }, { deep: true })

const noteBytes = computed(() => new TextEncoder().encode(form.value.note).length)

function validate() {
  const e: Record<string, string> = {}
  const v = form.value
  if (!v.name.trim()) e.name = '상품명을 입력하세요'
  else if (v.name.length > 50) e.name = '상품명은 50자 이하입니다'
  if (!v.code.trim()) e.code = '상품코드를 입력하세요'
  else if (!/^[A-Z0-9-]+$/.test(v.code)) e.code = '영문 대문자·숫자·하이픈만 사용합니다'
  if (!v.category) e.category = '분류를 선택하세요'
  if (!v.price || v.price <= 0) e.price = '판매가는 1원 이상입니다'
  if (noteBytes.value > 1500) e.note = `비고는 1,500byte 이하입니다 (현재 ${noteBytes.value.toLocaleString()})`
  errors.value = e
  return Object.keys(e).length === 0
}

function save() {
  if (!validate()) {
    notify('입력값을 확인하세요', 'danger')
    // 첫 오류 칸으로 옮긴다 — 긴 폼에서 어디가 틀렸는지 찾게 하지 않는다
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    return
  }
  saving.value = true
  setTimeout(() => { saving.value = false; dirty.value = false; notify('상품을 저장했습니다', 'success') }, 500)
}
useHotkey('F2', save)

onBeforeRouteLeave((_to, _from, next) => {
  if (!dirty.value) return next()
  leaveNext = () => next()
  leaveAsk.value = true
})

const err = (k: string) => (errors.value[k] ? { 'aria-invalid': 'true' as const, 'aria-describedby': `e-${k}` } : {})
</script>

<template>
    <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">기본 정보</h2></div>
        <div class="ws-tit__r"><span class="ws-desc"><span class="ws-req" />는 필수 항목</span></div>
      </div>
      <table class="ws-tb">
        <colgroup><col style="width: 140px" /><col /><col style="width: 140px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row" class="req"><label for="f-name">상품명</label></th>
            <td>
              <InputText id="f-name" v-model="form.name" fluid maxlength="50" :invalid="!!errors.name" v-bind="err('name')" />
              <span v-if="errors.name" id="e-name" class="ws-err" role="alert">{{ errors.name }}</span>
              <span v-else class="ws-desc">{{ form.name.length }} / 50자</span>
            </td>
            <th scope="row" class="req"><label for="f-code">상품코드</label></th>
            <td>
              <InputText id="f-code" v-model="form.code" fluid placeholder="예: GIFT-0001" :invalid="!!errors.code" v-bind="err('code')" />
              <span v-if="errors.code" id="e-code" class="ws-err" role="alert">{{ errors.code }}</span>
            </td>
          </tr>
          <tr>
            <th scope="row" class="req"><label for="f-cat">분류</label></th>
            <td>
              <Select v-model="form.category" input-id="f-cat" :options="CATEGORIES" placeholder="선택하세요" fluid :invalid="!!errors.category" :aria-describedby="errors.category ? 'e-category' : undefined" />
              <span v-if="errors.category" id="e-category" class="ws-err" role="alert">{{ errors.category }}</span>
            </td>
            <th scope="row">판매 채널</th>
            <td><MultiSelect v-model="form.channels" :options="CHANNELS" display="chip" placeholder="선택하세요" aria-label="판매 채널" fluid /></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">판매 조건</h2></div></div>
      <table class="ws-tb">
        <colgroup><col style="width: 140px" /><col /><col style="width: 140px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row" class="req"><label for="f-price">판매가 (원)</label></th>
            <td>
              <InputNumber v-model="form.price" input-id="f-price" locale="ko-KR" :min="0" suffix=" 원" fluid :invalid="!!errors.price" :aria-describedby="errors.price ? 'e-price' : undefined" />
              <span v-if="errors.price" id="e-price" class="ws-err" role="alert">{{ errors.price }}</span>
            </td>
            <th scope="row"><label for="f-stock">재고</label></th>
            <td><InputNumber v-model="form.stock" input-id="f-stock" locale="ko-KR" :min="0" show-buttons fluid /></td>
          </tr>
          <tr>
            <th scope="row"><span id="f-tax">과세 구분</span></th>
            <td>
              <div class="ws-choices" role="radiogroup" aria-labelledby="f-tax">
                <div v-for="t in ['과세', '면세']" :key="t" class="ws-radio"><RadioButton v-model="form.taxType" :input-id="`tax-${t}`" name="tax" :value="t" /><label :for="`tax-${t}`">{{ t }}</label></div>
              </div>
            </td>
            <th scope="row"><label for="f-open">판매 시작일</label></th>
            <td><DatePicker v-model="form.openAt" input-id="f-open" date-format="yy-mm-dd" show-icon fluid /></td>
          </tr>
          <tr>
            <th scope="row">판매 사용</th>
            <td colspan="3"><div class="ws-check"><Checkbox v-model="form.active" input-id="f-active" binary /><label for="f-active">사용</label></div></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">첨부 · 비고</h2></div></div>
      <table class="ws-tb">
        <colgroup><col style="width: 140px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row">상품 이미지</th>
            <td>
              <FileUpload mode="basic" accept="image/png,image/jpeg" :max-file-size="5000000" choose-label="파일 선택" :auto="false" custom-upload />
              <span class="ws-desc">jpg · png, 5MB 이하. 목업이라 업로드되지 않는다.</span>
            </td>
          </tr>
          <tr>
            <th scope="row"><label for="f-note">비고</label></th>
            <td>
              <Textarea id="f-note" v-model="form.note" rows="4" fluid :invalid="!!errors.note" v-bind="err('note')" />
              <span v-if="errors.note" id="e-note" class="ws-err" role="alert">{{ errors.note }}</span>
              <span v-else class="ws-desc" style="display: block; text-align: right">{{ noteBytes.toLocaleString() }} / 1,500 byte</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="ws-btnbox">
      <span />
      <div class="ws-btnbox__c">
        <Button label="취소" severity="secondary" outlined @click="form = empty(); errors = {}; $nextTick(() => (dirty = false))" />
        <Button :label="saving ? '저장 중…' : '저장(F2)'" severity="contrast" :loading="saving" @click="save" />
      </div>
      <span />
    </div>

    <Dialog v-model:visible="leaveAsk" modal header="저장하지 않고 나갈까요?" :style="{ width: '420px' }">
      <p>변경한 내용이 저장되지 않았습니다.</p>
      <template #footer>
        <Button label="계속 편집" severity="secondary" outlined @click="leaveAsk = false" />
        <Button label="나가기" severity="danger" @click="leaveAsk = false; dirty = false; leaveNext?.()" />
      </template>
    </Dialog>
  </div>
</template>
