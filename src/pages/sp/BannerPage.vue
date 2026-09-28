<script setup lang="ts">
/**
 * 메인 배너 — AS-IS S-009-01 메인관리(빌보드 · 혜택 · Left · SNS 4탭). 대외 컨텐츠 8화면의 대표.
 *
 * AS-IS 컨텐츠 화면 공통: 전시기간 · 순서(숫자 0~999999 직접 입력) · 전시여부 · 첨부 1MB jpg/png.
 * 바꾼 것:
 *   - 진행상태를 **날짜로 계산**한다(대기중 · 진행중 · 종료). AS-IS 팝업관리에만 있던 자동 상태를 전부에
 *   - 순서는 위 · 아래로 옮긴다. 숫자를 치면 두 배너가 같은 순서를 갖는 일이 생긴다
 *   - 이미지 제약을 고르기 전에 보이고, 규격이 틀리면 바로 알린다(WsUpload)
 *   - 목록에 썸네일 — 무엇이 걸려 있는지 글자만으로는 모른다
 */
import { computed, ref } from 'vue'
import PageHead from '../../app/PageHead.vue'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import WsUpload from '../../ws/WsUpload.vue'
import { fmtDate, parseDate } from '../../ws/period'
import { notify } from '../../ws/notify'
import { makeBanners, type Banner } from '@fixtures/sp'

const SLOTS = [
  { id: '빌보드', size: [1920, 600] as [number, number] },
  { id: '혜택', size: [600, 400] as [number, number] },
  { id: 'Left', size: [200, 400] as [number, number] },
  { id: 'SNS', size: [80, 80] as [number, number] },
]
const slot = ref('빌보드')
const list = ref<(Banner & { img?: string })[]>(makeBanners())
const inSlot = computed(() => list.value.filter((b) => b.slot === slot.value).sort((a, b) => a.order - b.order))

/** 진행상태 — 저장하지 않고 늘 날짜로 계산한다. 저장하면 자정마다 누가 바꿔 줘야 한다 */
function phase(b: Banner) {
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const a = parseDate(b.from)!, z = parseDate(b.to)!
  if (t < a) return { label: '대기중', tone: 'info' }
  if (t > z) return { label: '종료', tone: 'mute' }
  return { label: '진행중', tone: 'success' }
}
function move(b: Banner, d: -1 | 1) {
  const arr = inSlot.value
  const i = arr.indexOf(b), j = i + d
  if (j < 0 || j >= arr.length) return
  ;[arr[i].order, arr[j].order] = [arr[j].order, arr[i].order]
}

/* --- 등록 · 수정 --------------------------------------------------------- */
const open = ref(false)
const editing = ref<Banner | null>(null)
const form = ref({ title: '', link: '', range: [null, null] as (Date | null)[], show: true, file: null as File | null })
const fileErr = ref<string | null>(null)
const touched = ref(false)
const size = computed(() => SLOTS.find((s) => s.id === slot.value)!.size)
function openNew() { editing.value = null; form.value = { title: '', link: '', range: [new Date(), null], show: true, file: null }; touched.value = false; open.value = true }
function openEdit(b: Banner) { editing.value = b; form.value = { title: b.title, link: b.link, range: [parseDate(b.from), parseDate(b.to)], show: b.show, file: null }; touched.value = false; open.value = true }
const errors = computed(() => ({
  title: !form.value.title.trim() ? '제목을 입력하세요.' : '',
  link: form.value.link && !/^https?:\/\//.test(form.value.link) ? 'http:// 또는 https://로 시작해야 합니다.' : '',
  range: !form.value.range[0] || !form.value.range[1] ? '전시 시작일과 종료일을 고르세요.' : form.value.range[0] > form.value.range[1] ? '시작일이 종료일보다 늦습니다.' : '',
  file: !editing.value && !form.value.file ? (fileErr.value ?? '이미지를 첨부하세요.') : '',
}))
function save() {
  touched.value = true
  if (Object.values(errors.value).some(Boolean)) return
  const v = { title: form.value.title.trim(), link: form.value.link, from: fmtDate(form.value.range[0]), to: fmtDate(form.value.range[1]), show: form.value.show }
  const img = form.value.file ? URL.createObjectURL(form.value.file) : undefined
  if (editing.value) Object.assign(editing.value, v, img ? { img } : {})
  else list.value.push({ id: `BN-${String(list.value.length + 1).padStart(3, '0')}`, slot: slot.value, order: inSlot.value.length + 1, tint: '#2f80ed', img, ...v })
  open.value = false
  notify(editing.value ? '배너를 고쳤습니다' : '배너를 등록했습니다', 'success')
}
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <section class="ws-sec">
      <Tabs v-model:value="slot">
        <TabList>
          <Tab v-for="s in SLOTS" :key="s.id" :value="s.id">{{ s.id }} 배너 <span class="cnt">{{ list.filter((b) => b.slot === s.id).length }}</span></Tab>
        </TabList>
      </Tabs>
    </section>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">{{ slot }} 배너</h2><span class="ws-total">총<strong>{{ inSlot.length }}</strong>건</span><span class="ws-desc">규격 {{ size[0] }}×{{ size[1] }}px · 위에 있을수록 먼저 나간다</span></div>
        <div class="ws-tit__r"><Button label="배너 등록" severity="contrast" @click="openNew" /></div>
      </div>
      <table class="ws-gtb">
        <thead>
          <tr><th scope="col" style="width: 84px">순서</th><th scope="col" style="width: 150px">미리보기</th><th scope="col">제목</th><th scope="col" style="width: 210px">전시기간</th><th scope="col" style="width: 92px">진행상태</th><th scope="col" style="width: 84px">전시</th><th scope="col" style="width: 72px">수정</th></tr>
        </thead>
        <tbody>
          <tr v-for="(b, i) in inSlot" :key="b.id">
            <td>
              <div class="od">
                <span class="ws-num">{{ i + 1 }}</span>
                <button type="button" class="ws-cellbtn" :disabled="i === 0" :aria-label="`${b.title} 위로`" @click="move(b, -1)">▲</button>
                <button type="button" class="ws-cellbtn" :disabled="i === inSlot.length - 1" :aria-label="`${b.title} 아래로`" @click="move(b, 1)">▼</button>
              </div>
            </td>
            <td>
              <img v-if="b.img" :src="b.img" :alt="`${b.title} 배너`" class="th" />
              <span v-else class="th th--mock" :style="{ background: `linear-gradient(135deg, ${b.tint}, color-mix(in srgb, ${b.tint} 45%, white))` }" aria-hidden="true" />
            </td>
            <td><b>{{ b.title }}</b><br /><span class="ws-desc">{{ b.link }}</span></td>
            <td style="text-align: center">{{ b.from }} ~ {{ b.to }}</td>
            <td style="text-align: center"><span class="ws-badge" :class="`ws-badge--${phase(b).tone}`">{{ phase(b).label }}</span></td>
            <td style="text-align: center"><ToggleSwitch v-model="b.show" :aria-label="`${b.title} 전시`" /></td>
            <td style="text-align: center"><button type="button" class="ws-cellbtn" @click="openEdit(b)">수정</button></td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="ws-msg">
      <p class="ws-msg__tit">안내</p>
      <ul>
        <li>진행상태는 전시기간과 오늘 날짜로 정해진다. 전시를 끄면 기간 안이어도 나가지 않는다.</li>
        <li>등록할 때 규격이 다른 이미지를 올려 보면 제약 안내가 바로 뜬다.</li>
      </ul>
    </div>

    <Drawer v-model:visible="open" position="right" :style="{ width: '560px' }" :header="editing ? `${slot} 배너 수정` : `${slot} 배너 등록`">
      <table class="ws-tb">
        <colgroup><col style="width: 110px" /><col /></colgroup>
        <tbody>
          <tr>
            <th scope="row" class="req"><label for="bn-t">제목</label></th>
            <td><InputText id="bn-t" v-model="form.title" fluid maxlength="50" :invalid="touched && !!errors.title" /><span v-if="touched && errors.title" class="ws-err">{{ errors.title }}</span></td>
          </tr>
          <tr>
            <th scope="row"><label for="bn-l">링크</label></th>
            <td><InputText id="bn-l" v-model="form.link" fluid placeholder="https://" :invalid="touched && !!errors.link" /><span v-if="touched && errors.link" class="ws-err">{{ errors.link }}</span></td>
          </tr>
          <tr>
            <th scope="row" class="req"><label for="bn-r">전시기간</label></th>
            <td>
              <!-- 시작 · 종료를 따로 둔다 — 범위 한 칸은 타자를 못 친다(AS-IS 날짜 readonly와 같은 문제) -->
              <div class="rg">
                <DatePicker v-model="form.range[0]" input-id="bn-r" date-format="yy.mm.dd" placeholder="시작 YYYY.MM.DD" show-icon icon-display="input" :invalid="touched && !!errors.range" aria-label="전시 시작일" />
                <span aria-hidden="true">~</span>
                <DatePicker v-model="form.range[1]" date-format="yy.mm.dd" placeholder="종료 YYYY.MM.DD" show-icon icon-display="input" :min-date="form.range[0] ?? undefined" :invalid="touched && !!errors.range" aria-label="전시 종료일" />
              </div>
              <span v-if="touched && errors.range" class="ws-err">{{ errors.range }}</span>
            </td>
          </tr>
          <tr>
            <th scope="row" :class="{ req: !editing }"><label for="bn-f">이미지</label></th>
            <td>
              <WsUpload id="bn-f" v-model="form.file" :size="size" @invalid="fileErr = $event" />
              <span v-if="touched && errors.file && !fileErr" class="ws-err">{{ errors.file }}</span>
            </td>
          </tr>
          <tr><th scope="row">전시</th><td><ToggleSwitch v-model="form.show" aria-label="전시" /></td></tr>
        </tbody>
      </table>
      <template #footer>
        <div class="ft"><Button label="취소" severity="secondary" outlined @click="open = false" /><Button label="저장" severity="contrast" @click="save" /></div>
      </template>
    </Drawer>
  </div>
</template>

<style scoped>
.cnt { margin-left: 4px; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.od { display: flex; align-items: center; gap: 4px; }
.od .ws-num { width: 18px; }
.od .ws-cellbtn { width: 24px; padding: 0; }
.od .ws-cellbtn:disabled { opacity: 0.4; cursor: default; }
.th { display: block; width: 132px; height: 44px; border-radius: var(--ws-radius-sm); object-fit: cover; }
.th--mock { border: 1px solid var(--ws-border-lighter); }
.rg { display: flex; align-items: center; gap: 6px; }
.rg > :not(span) { flex: 1; }
.ft { display: flex; justify-content: flex-end; gap: 6px; }
</style>
