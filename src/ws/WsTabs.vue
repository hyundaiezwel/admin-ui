<script setup lang="ts">
/**
 * 탭 — 원본 `w2tabcontrol` (`.tabbox > .wq_tab`).
 *
 * 원본 실측
 *   탭줄 35px · 밑줄 1px #ccc
 *   활성 탭 흰 배경 · 테두리 #ced4da · 아랫변은 흰색으로 밑줄을 덮는다 · 모서리 6 6 0 0
 *
 * 키보드는 원본 엔진이 안 하던 것을 더한다 — WAI-ARIA 탭 패턴. 탭 목록은 Tab 한 번으로
 * 들어가고 좌우 화살표로 옮긴다(roving tabindex). 탭마다 Tab을 누르게 하면 탭이
 * 여덟 개인 화면에서 본문까지 여덟 번을 눌러야 한다.
 */
import { nextTick, ref } from 'vue'

const props = defineProps<{ tabs: { id: string; label: string; count?: number }[] }>()
const active = defineModel<string>({ required: true })
const list = ref<HTMLElement | null>(null)

async function move(dir: 1 | -1 | 'first' | 'last') {
  const i = props.tabs.findIndex((t) => t.id === active.value)
  const n = props.tabs.length
  const next = dir === 'first' ? 0 : dir === 'last' ? n - 1 : (i + dir + n) % n
  active.value = props.tabs[next].id
  await nextTick()
  list.value?.querySelector<HTMLElement>(`[data-id="${active.value}"]`)?.focus()
}
</script>

<template>
  <div class="ws-tabs">
    <div
      ref="list"
      class="ws-tabs__list"
      role="tablist"
      @keydown.right.prevent="move(1)"
      @keydown.left.prevent="move(-1)"
      @keydown.home.prevent="move('first')"
      @keydown.end.prevent="move('last')"
    >
      <button
        v-for="t in tabs"
        :key="t.id"
        :data-id="t.id"
        type="button"
        role="tab"
        class="ws-tabs__tab"
        :class="{ 'is-on': t.id === active }"
        :aria-selected="t.id === active"
        :tabindex="t.id === active ? 0 : -1"
        @click="active = t.id"
      >
        {{ t.label }}<span v-if="t.count != null" class="ws-tabs__count">{{ t.count }}</span>
      </button>
    </div>
    <div class="ws-tabs__panel" role="tabpanel" tabindex="0">
      <slot :active="active" />
    </div>
  </div>
</template>

<style>
.ws-tabs__list {
  display: flex;
  gap: 2px;
  height: var(--ws-tab-h);
  border-bottom: 1px solid var(--ws-border);
}
.ws-tabs__tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: calc(var(--ws-tab-h) + 1px); /* 1px 내려 밑줄을 덮는다 */
  padding: 0 20px;
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: var(--ws-radius) var(--ws-radius) 0 0;
  background: var(--ws-surface-head);
  color: var(--ws-text-sub);
  cursor: pointer;
}
.ws-tabs__tab:hover { color: var(--ws-text); }
.ws-tabs__tab.is-on {
  z-index: 1;
  background: var(--ws-surface);
  border-color: var(--ws-border-grid);
  color: var(--ws-text);
  font-weight: 700;
}
.ws-tabs__count { color: var(--ws-text-brand); font-weight: 600; font-variant-numeric: tabular-nums; }
.ws-tabs__panel { padding-top: var(--ws-gap-region); }
.ws-tabs__panel:focus-visible { box-shadow: none; }
</style>
