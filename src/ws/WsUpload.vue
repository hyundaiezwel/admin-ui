<script setup lang="ts">
/**
 * 파일 첨부 — 제약을 **고르기 전에** 보이고, 어긋나면 칸 아래에 바로 알린다.
 *
 * AS-IS 컨텐츠관리 6화면 공통 제약: 1MB · jpg/png · 파일명 150자 · 이미지 규격.
 * AS-IS는 저장을 눌러야 `alert`로 하나씩 알린다. 확장자 오류 문구가 엑셀 업로드에서도
 * `…파일(이미지파일)이 아닙니다.`로 나오는 복사 흔적(08 §6)이 있어, 문구를 제약에서 만든다.
 *
 * 네이티브 `<input type=file>`을 쓴다 — 키보드·스크린리더·드래그 앤 드롭을 브라우저가 준다.
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import Button from 'primevue/button'

const props = withDefaults(defineProps<{
  id: string
  accept?: string[]
  maxKb?: number
  maxName?: number
  /** 이미지 규격 [가로, 세로]. 넘기면 읽어서 비교한다 */
  size?: [number, number]
}>(), { accept: () => ['jpg', 'png'], maxKb: 1024, maxName: 150 })
const file = defineModel<File | null>({ default: null })
const emit = defineEmits<{ invalid: [message: string | null] }>()

const input = ref<HTMLInputElement | null>(null)
const error = ref<string | null>(null)
const url = ref<string | null>(null)

const rule = computed(() => {
  const parts = [`${props.accept.join(' · ')}`, props.maxKb >= 1024 ? `${props.maxKb / 1024}MB 이하` : `${props.maxKb}KB 이하`, `파일명 ${props.maxName}자 이내`]
  if (props.size) parts.push(`${props.size[0]}×${props.size[1]}px`)
  return parts.join(' / ')
})

function fail(msg: string) {
  error.value = msg
  emit('invalid', msg)
  file.value = null
  if (input.value) input.value.value = ''
}

async function pick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  error.value = null
  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
  const ok = props.accept.includes(ext) || (ext === 'jpeg' && props.accept.includes('jpg'))
  if (!ok) return fail(`${props.accept.join(', ')} 파일만 첨부할 수 있습니다.`)
  if (f.size > props.maxKb * 1024) return fail(`${rule.value.split(' / ')[1]}만 첨부할 수 있습니다. (지금 ${(f.size / 1024 / 1024).toFixed(1)}MB)`)
  if (f.name.length > props.maxName) return fail(`파일명은 ${props.maxName}자까지 가능합니다. (지금 ${f.name.length}자)`)
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = URL.createObjectURL(f)
  if (props.size) {
    const img = new Image()
    // decode()가 아니라 load — 화면에 안 보이는 탭에서는 decode가 끝나지 않는 경우가 있다
    await new Promise((res) => { img.onload = img.onerror = res; img.src = url.value! })
    if (img.naturalWidth !== props.size[0] || img.naturalHeight !== props.size[1]) {
      return fail(`이미지 규격이 맞지 않습니다. ${props.size[0]}×${props.size[1]}px이어야 합니다. (지금 ${img.naturalWidth}×${img.naturalHeight}px)`)
    }
  }
  error.value = null
  emit('invalid', null)
  file.value = f
}
function clear() { file.value = null; error.value = null; if (input.value) input.value.value = '' }
onBeforeUnmount(() => { if (url.value) URL.revokeObjectURL(url.value) })
</script>

<template>
  <div class="up">
    <div class="up__row">
      <input :id="id" ref="input" type="file" class="up__native" :accept="accept.map((a) => '.' + a).join(',')" :aria-describedby="`${id}-rule`" :aria-invalid="!!error" @change="pick" />
      <Button type="button" label="파일 선택" severity="secondary" outlined @click="input?.click()" />
      <span class="up__name">{{ file ? file.name : '선택한 파일 없음' }}</span>
      <Button v-if="file" type="button" label="지우기" severity="secondary" text size="small" @click="clear" />
    </div>
    <p :id="`${id}-rule`" class="ws-desc">{{ rule }}</p>
    <p v-if="error" class="ws-err" role="alert">{{ error }}</p>
    <img v-if="file && url" :src="url" alt="첨부 미리보기" class="up__thumb" />
  </div>
</template>

<style scoped>
.up { display: grid; gap: 4px; }
.up__row { display: flex; align-items: center; gap: 8px; }
.up__native { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.up__name { color: var(--ws-text-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.up__thumb { max-width: 320px; max-height: 120px; margin-top: 6px; border: 1px solid var(--ws-border); border-radius: var(--ws-radius-sm); object-fit: contain; }
</style>
