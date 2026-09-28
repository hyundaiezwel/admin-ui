<script setup lang="ts">
/**
 * 적발 건 상세 — AS-IS S-001-04-D (상세 32항목).
 *
 * AS-IS는 이 상세에서 `참여불가회원 등록` 팝업(S-001-04-P)을 따로 열고, 이용정지는
 * 참여회원현황(S-003-07)까지 가서 걸어야 한다. 적발 → 제재가 세 화면에 흩어져 있다.
 * 여기서는 한 화면 아래 버튼줄에서 **이용정지 → 참여불가 등록**으로 이어진다.
 *
 * 절차 단계(수집 → 대조 → 소명 → 조치 → 제재)를 위에 그린다 — 운영지침의 적발 절차이다.
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHead from '../../app/PageHead.vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import RadioButton from 'primevue/radiobutton'
import Textarea from 'primevue/textarea'
import WsStepTrack from '../../ws/WsStepTrack.vue'
import WsMasked from '../../ws/WsMasked.vue'
import WsFileView from '../../ws/WsFileView.vue'
import WsActionDialog, { type ActionPayload } from '../../ws/WsActionDialog.vue'
import SpStatus from '../../sp/SpStatus.vue'
import { notify } from '../../ws/notify'
import { HANDLE, REPORT, SUSPEND_REASONS, USED_AFTER } from '../../sp/codes'
import { ctx, ctxKey, can, needRole } from '../../sp/context'
import { memo } from '../../sp/stores'
import { makeScraping, type ScrapRow } from '@fixtures/sp'

const route = useRoute()
const router = useRouter()
const row = computed(() => memo('scrap', ctxKey(), () => makeScraping(ctxKey(), ctx.year)).find((r) => r.id === route.params.id) as ScrapRow | undefined)

const form = reactive({ usedAfter: '', report: '', handle: '', memo: '' })
const base = ref('')
watch(row, (r) => { if (r) { Object.assign(form, { usedAfter: r.usedAfter, report: r.report, handle: r.handle, memo: '' }); base.value = JSON.stringify(form) } }, { immediate: true })
const dirty = computed(() => JSON.stringify(form) !== base.value)
function save() {
  if (!row.value) return
  Object.assign(row.value, { usedAfter: form.usedAfter, report: form.report, handle: form.handle })
  base.value = JSON.stringify(form)
  notify('조치 내용을 저장했습니다', 'success')
}

/** 절차 위치 — 조치완료면 제재 단계, 소명서가 들어왔으면 조치 단계 … */
const step = computed(() => {
  const r = row.value
  if (!r) return 0
  if (r.matched?.sts === '710') return 4
  if (r.handle === '2') return 3
  if (r.report !== '0') return 2
  return r.matched ? 2 : 1
})
const suspendOpen = ref(false)
const docsOpen = ref(false)
function suspend(p: ActionPayload) {
  if (row.value?.matched) row.value.matched.sts = '710'
  form.handle = row.value!.handle = '2'
  base.value = JSON.stringify(form)
  notify(`이용정지했습니다 — 사유: ${p.option === '기타' ? p.text : p.option}`, 'success')
}
</script>

<template>
  <div v-if="!row" class="ws-page">
    <PageHead title="적발 건 상세" />
    <div class="ws-empty"><p>이 적발 건은 지금 전역 조건에 없습니다.</p><Button label="목록으로" severity="secondary" outlined @click="router.push('/sp/scraping')" /></div>
  </div>

  <div v-else class="ws-page">
    <PageHead :title="`${row.id} · ${row.title}`" />

    <section class="ws-sec">
      <WsStepTrack
        :steps="[{ label: '수집', sub: row.site }, { label: '대조', sub: row.matched ? '참여자 특정' : '특정 못 함' }, { label: '소명', sub: REPORT.find((x) => x.code === row!.report)?.label }, { label: '조치' }, { label: '제재', sub: '이용정지 · 참여불가' }]"
        :current="step" label="부정사용 적발 절차"
      />
    </section>

    <div class="ws-split">
      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">게시글</h2><span class="ws-fresh ws-fresh--batch">{{ row.batch ? '배치 수집' : '수동 등록' }} · {{ row.runAt }}</span></div></div>
        <table class="ws-tb">
          <colgroup><col style="width: 120px" /><col /></colgroup>
          <tbody>
            <tr><th scope="row">거래사이트</th><td>{{ row.site }}</td></tr>
            <tr><th scope="row">글제목</th><td>{{ row.title }}</td></tr>
            <tr><th scope="row">글내용</th><td>{{ row.body }}</td></tr>
            <tr><th scope="row">닉네임</th><td>{{ row.nick }}</td></tr>
            <tr><th scope="row">연락처</th><td><WsMasked :value="row.phone" kind="phone" label="게시자 연락처" /></td></tr>
            <tr><th scope="row">이메일</th><td><WsMasked :value="row.email" kind="email" label="게시자 이메일" /></td></tr>
            <tr><th scope="row">게시글</th><td>{{ row.deleted ? '삭제됨' : '게시 중' }}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">대조 · 판정</h2></div></div>
        <table class="ws-tb">
          <colgroup><col style="width: 140px" /><col /></colgroup>
          <tbody>
            <tr>
              <th scope="row">특정된 참여자</th>
              <td>
                <template v-if="row.matched"><div class="mt"><WsMasked :value="row.matched.name" kind="name" label="참여자 이름" /><span>{{ row.matched.company }}</span><SpStatus :code="row.matched.sts" /></div></template>
                <span v-else class="ws-desc">닉네임 · 연락처 · 이메일로 참여자를 특정하지 못했다</span>
              </td>
            </tr>
            <tr>
              <th scope="row"><label for="sd-used">게시 후 포인트</label></th>
              <td><Select v-model="form.usedAfter" input-id="sd-used" :options="USED_AFTER" option-label="label" option-value="code" style="width: 160px" /><span class="ws-desc">게시글 이후 포인트를 썼는지 — 판정 근거</span></td>
            </tr>
            <tr>
              <th scope="row"><label for="sd-rep">소명서</label></th>
              <td>
                <div class="mt">
                  <Select v-model="form.report" input-id="sd-rep" :options="REPORT" option-label="label" option-value="code" style="width: 160px" />
                  <Button v-if="form.report !== '0'" label="소명서 보기" severity="secondary" text size="small" @click="docsOpen = true" />
                </div>
              </td>
            </tr>
            <tr>
              <th scope="row">조치여부</th>
              <td>
                <div class="ws-choices" role="radiogroup" aria-label="조치여부">
                  <div v-for="h in HANDLE" :key="h.code" class="ws-radio"><RadioButton v-model="form.handle" :input-id="`sd-h-${h.code}`" name="sd-h" :value="h.code" /><label :for="`sd-h-${h.code}`">{{ h.label }}</label></div>
                </div>
              </td>
            </tr>
            <tr><th scope="row"><label for="sd-memo">조치 메모</label></th><td><Textarea id="sd-memo" v-model="form.memo" rows="3" fluid maxlength="200" /></td></tr>
          </tbody>
        </table>
      </section>
    </div>

    <div class="ws-actionbar">
      <div class="ws-actionbar__l">
        <span v-if="!can('suspend')" class="ws-desc">이용정지는 {{ needRole('suspend') }} 이상(가정)</span>
        <span v-if="dirty">고친 내용이 있다 — 저장 전</span>
      </div>
      <Button label="목록" severity="secondary" outlined @click="router.push('/sp/scraping')" />
      <Button v-if="row.matched?.sts === '710'" label="참여불가 회원 등록 →" severity="secondary" outlined @click="router.push('/sp/p/banmem')" />
      <Button v-else label="이용정지" severity="danger" outlined :disabled="!row.matched || !can('suspend')" @click="suspendOpen = true" />
      <Button label="저장" severity="contrast" :disabled="!dirty" @click="save" />
    </div>

    <WsActionDialog
      v-model:visible="suspendOpen" header="이용정지 사유 선택" :target="row.matched ? `${row.matched.company} 소속 참여자 1명` : ''" danger
      :reason="{ label: '이용정지 사유', options: SUSPEND_REASONS, other: '기타', max: 200 }"
      notice="선택 및 입력 내용으로 회원에게 「협약파기」 LMS 및 E-Mail이 발송됩니다."
      confirm-label="이용정지" @confirm="suspend"
    >
      <p class="ws-desc">화면 이름은 「이용정지」, 회원에게 가는 문구는 「협약파기」다 — AS-IS 용어 그대로다. 정리 대상.</p>
    </WsActionDialog>
    <WsFileView v-model:visible="docsOpen" :title="`${row.id} 소명서`" :files="[{ name: '소명서.pdf', kind: 'PDF', size: '310KB' }, { name: '거래내역_캡처.png', kind: 'PNG', size: '540KB' }]" />
  </div>
</template>

<style scoped>
.mt { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
</style>
