<script setup lang="ts">
/**
 * 다중 선택 — 원본 `xf:checkcombobox` (`.w2checkcombobox > .w2checkcombobox_label`).
 *
 * `<details>`로 연다. 열고 닫기·Enter/Space·스크린리더의 "펼침/접힘"을 브라우저가 한다.
 * 안은 네이티브 체크박스다 — 원본도 펼치면 체크박스 목록이다.
 *
 * 바깥을 누르면 닫는다. `<details>`는 기본으로 안 닫혀서 그것만 직접 붙인다.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{ options: { value: string; label: string }[]; placeholder?: string; label: string }>(),
  { placeholder: '전체' },
)
const model = defineModel<string[]>({ default: () => [] })
const el = ref<HTMLDetailsElement | null>(null)

const summary = computed(() => {
  if (!model.value.length || model.value.length === props.options.length) return props.placeholder
  const first = props.options.find((o) => o.value === model.value[0])?.label ?? ''
  return model.value.length === 1 ? first : `${first} 외 ${model.value.length - 1}`
})

function toggle(v: string, on: boolean) {
  model.value = on ? [...model.value, v] : model.value.filter((x) => x !== v)
}

const outside = (e: MouseEvent) => { if (el.value?.open && !el.value.contains(e.target as Node)) el.value.open = false }
onMounted(() => document.addEventListener('click', outside))
onBeforeUnmount(() => document.removeEventListener('click', outside))
</script>

<template>
  <details ref="el" class="ws-cc">
    <summary class="ws-select ws-cc__sum" :aria-label="`${label}: ${summary}`">{{ summary }}</summary>
    <div class="ws-cc__pop" role="group" :aria-label="label">
      <label v-for="o in options" :key="o.value" class="ws-check">
        <input type="checkbox" :checked="model.includes(o.value)" @change="toggle(o.value, ($event.target as HTMLInputElement).checked)" />
        {{ o.label }}
      </label>
    </div>
  </details>
</template>

<style>
.ws-cc { position: relative; }
.ws-cc__sum { display: flex; align-items: center; list-style: none; user-select: none; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.ws-cc__sum::-webkit-details-marker { display: none; }
.ws-cc[open] > .ws-cc__sum { border-color: var(--ws-field-border-focus); }
.ws-cc__pop {
  position: absolute; z-index: 20; left: 0; top: calc(100% + 4px); min-width: 100%;
  display: flex; flex-direction: column; gap: 8px; padding: 10px 12px;
  border: 1px solid var(--ws-field-border); border-radius: var(--ws-radius);
  background: var(--ws-surface); box-shadow: 0 4px 12px rgb(0 0 0 / 0.1);
  white-space: nowrap;
}
</style>
