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
import { computed, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import PageHead from '../app/PageHead.vue'
import WsDialog from '../ws/WsDialog.vue'
import WsCheckCombo from '../ws/WsCheckCombo.vue'
import { notify } from '../ws/notify'
import { useHotkey } from '../app/useHotkey'

const empty = () => ({ name: '', code: '', category: '', channels: [] as string[], price: 0, stock: 0, taxType: '과세', openAt: '', active: true, note: '' })
const form = ref(empty())
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const dirty = ref(false)
const leaveAsk = ref(false)
let leaveNext: (() => void) | null = null

const CATEGORIES = ['상품권', '건강', '여행', '문화', '도서']
const CHANNELS = [{ value: '웹', label: '웹' }, { value: '앱', label: '앱' }, { value: '제휴몰', label: '제휴몰' }]

const noteBytes = computed(() => new TextEncoder().encode(form.value.note).length)

function validate() {
  const e: Record<string, string> = {}
  const v = form.value
  if (!v.name.trim()) e.name = '상품명을 입력하세요'
  else if (v.name.length > 50) e.name = '상품명은 50자 이하입니다'
  if (!v.code.trim()) e.code = '상품코드를 입력하세요'
  else if (!/^[A-Z0-9-]+$/.test(v.code)) e.code = '영문 대문자·숫자·하이픈만 사용합니다'
  if (!v.category) e.category = '분류를 선택하세요'
  if (!(v.price > 0)) e.price = '판매가는 1원 이상입니다'
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
  <!-- 입력 이벤트는 루트에서 한 번만 받는다 — 칸마다 @input을 달면 하나 빠뜨린 칸이 이탈 확인을 건너뛴다 -->
  <div class="ws-page" @input="dirty = true" @change="dirty = true">
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
              <input id="f-name" v-model="form.name" class="ws-input" maxlength="50" v-bind="err('name')" />
              <span v-if="errors.name" id="e-name" class="ws-err" role="alert">{{ errors.name }}</span>
              <span v-else class="ws-desc">{{ form.name.length }} / 50자</span>
            </td>
            <th scope="row" class="req"><label for="f-code">상품코드</label></th>
            <td>
              <input id="f-code" v-model="form.code" class="ws-input" placeholder="예: GIFT-0001" v-bind="err('code')" />
              <span v-if="errors.code" id="e-code" class="ws-err" role="alert">{{ errors.code }}</span>
            </td>
          </tr>
          <tr>
            <th scope="row" class="req"><label for="f-cat">분류</label></th>
            <td>
              <select id="f-cat" v-model="form.category" class="ws-select" v-bind="err('category')">
                <option value="" disabled>선택하세요</option>
                <option v-for="c in CATEGORIES" :key="c">{{ c }}</option>
              </select>
              <span v-if="errors.category" id="e-category" class="ws-err" role="alert">{{ errors.category }}</span>
            </td>
            <th scope="row">판매 채널</th>
            <td><WsCheckCombo v-model="form.channels" :options="CHANNELS" label="판매 채널" placeholder="선택하세요" /></td>
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
              <input id="f-price" v-model.number="form.price" type="number" min="0" inputmode="numeric" class="ws-input ws-input--num" v-bind="err('price')" />
              <span v-if="errors.price" id="e-price" class="ws-err" role="alert">{{ errors.price }}</span>
            </td>
            <th scope="row"><label for="f-stock">재고</label></th>
            <td><input id="f-stock" v-model.number="form.stock" type="number" min="0" inputmode="numeric" class="ws-input ws-input--num" /></td>
          </tr>
          <tr>
            <th scope="row"><span id="f-tax">과세 구분</span></th>
            <td>
              <div class="ws-choices" role="radiogroup" aria-labelledby="f-tax">
                <label v-for="t in ['과세', '면세']" :key="t" class="ws-radio"><input v-model="form.taxType" type="radio" name="tax" :value="t" />{{ t }}</label>
              </div>
            </td>
            <th scope="row"><label for="f-open">판매 시작일</label></th>
            <td><input id="f-open" v-model="form.openAt" type="date" class="ws-input" /></td>
          </tr>
          <tr>
            <th scope="row">판매 사용</th>
            <td colspan="3"><label class="ws-check"><input v-model="form.active" type="checkbox" />사용</label></td>
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
            <th scope="row"><label for="f-img">상품 이미지</label></th>
            <td>
              <div class="ws-file"><input id="f-img" type="file" accept="image/png,image/jpeg" /></div>
              <span class="ws-desc">jpg · png, 5MB 이하. 목업이라 업로드되지 않는다.</span>
            </td>
          </tr>
          <tr>
            <th scope="row"><label for="f-note">비고</label></th>
            <td>
              <textarea id="f-note" v-model="form.note" class="ws-textarea" rows="4" v-bind="err('note')" />
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
        <button type="button" class="ws-btn" @click="form = empty(); errors = {}; dirty = false">취소</button>
        <button type="button" class="ws-btn ws-btn--pri" :disabled="saving" @click="save">{{ saving ? '저장 중…' : '저장(F2)' }}</button>
      </div>
      <span />
    </div>

    <WsDialog v-model:open="leaveAsk" title="저장하지 않고 나갈까요?" width="420px">
      <p>변경한 내용이 저장되지 않았습니다.</p>
      <template #foot>
        <button type="button" class="ws-btn" @click="leaveAsk = false">계속 편집</button>
        <button type="button" class="ws-btn ws-btn--danger" @click="leaveAsk = false; dirty = false; leaveNext?.()">나가기</button>
      </template>
    </WsDialog>
  </div>
</template>
