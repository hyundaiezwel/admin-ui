<script setup lang="ts">
/**
 * 참여 기업 등록(엑셀 일괄) — AS-IS S-003-14 (난이도 4).
 *
 * AS-IS: 양식 받기 → 상태 · 참여경로 고르기 → 올리기 → 등록. 양식이 틀리면
 * "업로드 양식이 맞지 않습니다" 한 줄이고, 어느 행이 왜 틀렸는지는 알려 주지 않는다.
 *
 * 미리보기는 네 단계 — **양식 · 조건 → 올리기 → 검증 결과(행별 오류) → 등록 결과.**
 *   - 검증과 등록을 가른다. 올리면 먼저 검사만 하고, 오류 행을 보여 준다
 *   - 오류 없는 행만 등록할지, 고쳐서 다시 올릴지 고른다. 오류 행은 오류 칸을 표시한 파일로 받는다
 *   - 유의사항(필수 칸 · 기업구분 한글 · 휴대폰 숫자만 · 장애인 채용 Y면 인원 필수)을 올리기 전에 보인다
 */
import { computed, ref } from 'vue'
import PageHead from '../../app/PageHead.vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import WsStepTrack from '../../ws/WsStepTrack.vue'
import WsUpload from '../../ws/WsUpload.vue'
import WsResultDialog from '../../ws/WsResultDialog.vue'
import { notify } from '../../ws/notify'
import { bizLabel, stateOf } from '../../sp/codes'
import { ctx } from '../../sp/context'
import { makeUploadCheck, type UploadIssue } from '@fixtures/sp'

const step = ref(0)
const sts = ref<string | null>(null)
const channel = ref<string | null>(null)
const file = ref<File | null>(null)
const checking = ref(false)
const check = ref<{ total: number; issues: UploadIssue[]; badRows: number } | null>(null)
const done = ref(0)
const auditId = ref('')
const resultOpen = ref(false)

/** 일괄 등록으로 부여할 수 있는 상태 — 심사 앞단은 접수 화면에서, 입금 뒤는 등록으로 만들지 않는다(가정) */
const STS = ['220', '410', '611'].map((c) => ({ code: c, label: stateOf(c)?.label }))
const CHANNELS = ['매스 마케팅', '사업 광고', '재 참여기업', '동반성장제도', '타기관 홈페이지', '카카오톡 채널', '지인 추천', '언론 보도자료', '기타']
const ok = computed(() => (check.value ? check.value.total - check.value.badRows : 0))

function runCheck() {
  checking.value = true
  setTimeout(() => { check.value = makeUploadCheck(file.value?.name ?? 'x'); checking.value = false; step.value = 2 }, 700)
}
function register() {
  done.value = ok.value
  auditId.value = `AUD-${Date.now().toString(36).toUpperCase()}`
  step.value = 3
  resultOpen.value = true
}
function restart() { step.value = 0; file.value = null; check.value = null }
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <WsStepTrack :steps="[{ label: '양식 · 조건' }, { label: '올리기' }, { label: '검증 결과', sub: '행별 오류' }, { label: '등록 결과' }]" :current="step" label="엑셀 일괄 등록 단계" />
    </section>

    <template v-if="step === 0">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">양식과 등록 조건</h2><span class="ws-desc">{{ ctx.year }}년 {{ bizLabel(ctx.biz) }}</span></div>
          <div class="ws-tit__r"><Button label="업로드 양식 받기" severity="secondary" outlined class="ws-line" @click="notify('양식을 내려받았습니다(미리보기)')" /></div>
        </div>
        <table class="ws-tb">
          <colgroup><col style="width: 140px" /><col /><col style="width: 140px" /><col /></colgroup>
          <tbody>
            <tr>
              <th scope="row" class="req"><label for="up-s">부여할 상태</label></th>
              <td><Select v-model="sts" input-id="up-s" :options="STS" option-label="label" option-value="code" placeholder="선택" fluid /></td>
              <th scope="row" class="req"><label for="up-c">참여경로</label></th>
              <td><Select v-model="channel" input-id="up-c" :options="CHANNELS" placeholder="선택" fluid /></td>
            </tr>
          </tbody>
        </table>
      </section>
      <div class="ws-msg">
        <p class="ws-msg__tit">양식 유의사항 — 올리기 전에</p>
        <ul>
          <li>붉은색 칸은 필수다. 대표자명을 비우면 "대표자"로 임시 등록되니 나중에 고친다.</li>
          <li>기업구분은 한글로 — 소상공인 · 소기업 · 중기업 · 중견기업 · 비영리민간단체 · 사회복지법인·시설 · 의료법인.</li>
          <li>휴대폰은 숫자만(01012345678). 장애인 근로자 채용 여부가 Y면 채용인원 · 참여인원이 필수다.</li>
        </ul>
      </div>
      <div class="ws-btnbox"><div class="ws-btnbox__c"><Button label="다음 — 파일 올리기" :disabled="!sts || !channel" @click="step = 1" /></div></div>
    </template>

    <template v-if="step === 1">
      <section class="ws-sec">
        <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">파일 올리기</h2><span class="ws-desc">{{ stateOf(sts!)?.label }} · {{ channel }}으로 등록</span></div></div>
        <table class="ws-tb">
          <colgroup><col style="width: 140px" /><col /></colgroup>
          <tbody><tr><th scope="row" class="req"><label for="up-f">엑셀 파일</label></th><td><WsUpload id="up-f" v-model="file" :accept="['xlsx', 'xls']" :max-kb="5120" /></td></tr></tbody>
        </table>
        <p class="ws-callout" style="margin-top: 12px"><b>검증만 한다</b> 올리면 먼저 행마다 검사해 오류를 보여 준다. 등록은 다음 단계에서 고른다.</p>
      </section>
      <div class="ws-btnbox"><div class="ws-btnbox__c">
        <Button label="이전" severity="secondary" outlined @click="step = 0" />
        <Button :label="checking ? '검사 중…' : '검증하기'" :loading="checking" :disabled="!file" @click="runCheck" />
      </div></div>
    </template>

    <template v-if="step === 2 && check">
      <section class="ws-sec">
        <dl class="sm">
          <div><dt>전체 행</dt><dd>{{ check.total }}</dd></div>
          <div class="is-ok"><dt>정상</dt><dd>{{ ok }}</dd></div>
          <div class="is-bad"><dt>오류 행</dt><dd>{{ check.badRows }}</dd></div>
          <div><dt>오류 칸</dt><dd>{{ check.issues.length }}</dd></div>
        </dl>
      </section>
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">행별 오류</h2><span class="ws-desc">{{ file?.name }}</span></div>
          <div class="ws-tit__r"><Button label="오류 표시 파일 받기" severity="secondary" outlined class="ws-line" @click="notify('오류 칸에 표시한 파일을 내려받았습니다(미리보기)')" /></div>
        </div>
        <table class="ws-gtb">
          <thead><tr><th scope="col" style="width: 72px">행</th><th scope="col" style="width: 140px">칸</th><th scope="col" style="width: 180px">넣은 값</th><th scope="col">오류</th></tr></thead>
          <tbody>
            <tr v-for="x in check.issues" :key="x.row + x.col">
              <td class="ws-num">{{ x.row }}</td><td>{{ x.col }}</td>
              <td><code v-if="x.value">{{ x.value }}</code><span v-else class="ws-desc">(비어 있음)</span></td>
              <td class="err">{{ x.msg }}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <div class="ws-btnbox"><div class="ws-btnbox__c">
        <Button label="고쳐서 다시 올리기" severity="secondary" outlined @click="step = 1; file = null" />
        <Button :label="`오류 없는 ${ok}행만 등록`" severity="contrast" :disabled="!ok" @click="register" />
      </div></div>
    </template>

    <template v-if="step === 3">
      <p class="ws-callout"><b>완료</b> {{ done }}곳을 {{ stateOf(sts!)?.label }} 상태로 등록했다. 오류 {{ check?.badRows }}행은 등록하지 않았다. 감사 기록 <code>{{ auditId }}</code>. 등록한 기업은 접수·자격심사에서 확인한다.</p>
      <div class="ws-btnbox"><div class="ws-btnbox__c"><Button label="새로 올리기" @click="restart" /></div></div>
    </template>

    <WsResultDialog v-model:visible="resultOpen" header="엑셀 일괄 등록 결과" :ok="done" :fails="[]" :skipped="check?.badRows" :audit-id="auditId" />
  </div>
</template>

<style scoped>
.sm { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.sm div { padding: 12px 16px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); }
.sm dt { color: var(--ws-text-sub); font-size: var(--ws-font-size-md); }
.sm dd { margin-top: 2px; font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.sm .is-ok dd { color: var(--ws-text-success); }
.sm .is-bad { border-color: var(--ws-text-danger); }
.sm .is-bad dd { color: var(--ws-text-danger); }
.err { color: var(--ws-text-danger); }
</style>
