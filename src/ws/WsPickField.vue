<script setup lang="ts">
/**
 * 찾아서 고르는 칸 — 읽기 전용 칸 + 찾기 + 선택취소.
 *
 * AS-IS의 기업/부서 트리 팝업(G-003)과 `전체고객사보기`(S-005-03-P) 자리다. 바꾼 것:
 *   - 칸에 **바로 타자를 치면 팝업이 그 검색어로 열린다.** AS-IS는 칸이 readonly라 타자가 안 먹었다
 *   - 대상이 만 곳 단위라 트리를 다 펼치지 않는다 — 검색이 먼저, 결과는 50건까지
 * 트리(부서 계층)가 필요한 화면은 같은 칸에 목록 대신 PrimeVue Tree를 끼운다.
 */
import { computed, nextTick, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

export interface PickItem { id: string; label: string; sub?: string }
const props = defineProps<{ id: string; items: PickItem[]; header: string; placeholder?: string }>()
const model = defineModel<PickItem | null>({ default: null })

const open = ref(false)
const q = ref('')
const at = ref<string | null>(null)
const hits = computed(() => {
  const k = q.value.trim()
  const all = k ? props.items.filter((i) => i.label.includes(k) || i.sub?.includes(k)) : props.items
  return { list: all.slice(0, 50), total: all.length }
})

async function show(seed = '') {
  q.value = seed
  at.value = model.value?.id ?? null
  open.value = true
  await nextTick()
  document.getElementById(`${props.id}-q`)?.focus()
}
function choose() {
  model.value = props.items.find((i) => i.id === at.value) ?? null
  open.value = false
}
/** 읽기 전용 칸에서 글자를 치면 그 글자로 검색을 연다 */
function typed(e: KeyboardEvent) {
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); show(e.key) }
  else if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); show() }
}
</script>

<template>
  <div class="pk">
    <InputText :id="id" :model-value="model?.label ?? ''" readonly fluid :placeholder="placeholder ?? '찾기로 선택'" class="pk__v" @keydown="typed" @click="show()" />
    <Button type="button" label="찾기" severity="secondary" outlined @click="show()" />
    <Button v-if="model" type="button" severity="secondary" text aria-label="선택 취소" v-tooltip.bottom="'선택 취소'" @click="model = null">
      <template #icon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></template>
    </Button>
  </div>

  <Dialog v-model:visible="open" modal :header="header" :style="{ width: '480px' }" :draggable="false">
    <InputText :id="`${id}-q`" v-model="q" fluid placeholder="이름 또는 번호" aria-label="검색어" />
    <p class="ws-desc pk__cnt">{{ hits.total.toLocaleString('ko-KR') }}건<template v-if="hits.total > 50"> — 50건까지 보인다. 검색어를 더 넣으세요</template></p>
    <ul class="pk__list" role="listbox" :aria-label="header">
      <li v-for="i in hits.list" :key="i.id" role="option" :aria-selected="at === i.id" tabindex="0" class="pk__i" @click="at = i.id" @dblclick="at = i.id; choose()" @keydown.enter="at = i.id; choose()">
        <span>{{ i.label }}</span><small v-if="i.sub">{{ i.sub }}</small>
      </li>
      <li v-if="!hits.list.length" class="pk__none">일치하는 항목이 없습니다</li>
    </ul>
    <template #footer>
      <Button label="취소" severity="secondary" outlined @click="open = false" />
      <Button label="선택" :disabled="!at" @click="choose" />
    </template>
  </Dialog>
</template>

<style scoped>
.pk { display: flex; align-items: center; gap: 6px; }
.pk__v { cursor: pointer; }
.pk__cnt { margin: 8px 0; }
.pk__list { max-height: 320px; overflow: auto; border: 1px solid var(--ws-border); border-radius: var(--ws-radius); }
.pk__i { display: flex; justify-content: space-between; gap: 8px; padding: 8px 12px; cursor: pointer; }
.pk__i + .pk__i { border-top: 1px solid var(--ws-border-lighter); }
.pk__i:hover { background: var(--ws-surface-hover); }
.pk__i[aria-selected='true'] { background: var(--ws-surface-selected); color: var(--ws-text-brand); font-weight: 600; }
.pk__i:focus-visible { outline: none; box-shadow: inset var(--ws-focus-ring); }
.pk__i small { color: var(--ws-text-muted); }
.pk__none { padding: 24px; color: var(--ws-text-muted); text-align: center; }
</style>
