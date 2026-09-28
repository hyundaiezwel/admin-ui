<script setup lang="ts">
/**
 * 첨부 미리보기 — 옆 패널. 목록 맥락을 가리지 않는다.
 *
 * AS-IS는 제출서류 · 통장사본 · 계좌 미리보기가 **각각 다른 팝업 창**이다(S-003-02-V,
 * S-003-04-V2, S-003-09-V). 하나로 모으고, 여러 파일은 왼쪽 목록으로 넘긴다.
 * 목업이라 문서 본문은 줄 모양으로만 그린다.
 */
import { ref, watch } from 'vue'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import { notify } from './notify'

export interface ViewFile { name: string; kind: string; size: string }
defineProps<{ title: string; files: ViewFile[] }>()
const visible = defineModel<boolean>('visible', { required: true })
const at = ref(0)
watch(visible, (v) => { if (v) at.value = 0 })
</script>

<template>
  <Drawer v-model:visible="visible" position="right" :style="{ width: '760px' }" :header="title">
    <div class="fv">
      <ul class="fv__list" aria-label="첨부 파일">
        <li v-for="(f, i) in files" :key="f.name">
          <button type="button" class="fv__f" :aria-current="i === at ? 'true' : undefined" @click="at = i">
            <b>{{ f.name }}</b><small>{{ f.kind }} · {{ f.size }}</small>
          </button>
        </li>
      </ul>
      <figure class="fv__doc" :aria-label="`${files[at]?.name} 미리보기`">
        <div class="fv__paper" aria-hidden="true">
          <span class="fv__h" />
          <span v-for="i in 14" :key="i" class="fv__l" :style="{ width: `${60 + ((i * 37) % 38)}%` }" />
          <span class="fv__stamp">목업 문서</span>
        </div>
        <figcaption class="ws-desc">{{ files[at]?.name }} — 실제 화면에서는 PDF·이미지 뷰어가 뜬다</figcaption>
      </figure>
    </div>
    <template #footer>
      <div class="fv__foot">
        <Button label="원본 내려받기" severity="secondary" outlined @click="notify(`${files[at]?.name} 내려받기(미리보기)`)" />
        <Button label="닫기" @click="visible = false" />
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.fv { display: grid; grid-template-columns: 200px 1fr; gap: var(--ws-gap-block); min-height: 100%; }
.fv__list { display: grid; align-content: start; gap: 4px; }
.fv__f {
  display: grid; gap: 2px; width: 100%; padding: 8px 10px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius);
  background: var(--ws-surface); color: var(--ws-text); font: inherit; text-align: left; cursor: pointer;
}
.fv__f small { color: var(--ws-text-muted); }
.fv__f[aria-current='true'] { border-color: var(--ws-action-search); background: var(--ws-surface-selected); }
.fv__f:focus-visible { outline: none; box-shadow: var(--ws-focus-ring); }
.fv__doc { margin: 0; display: grid; gap: 8px; align-content: start; }
.fv__paper {
  position: relative; display: grid; align-content: start; gap: 10px; aspect-ratio: 1 / 1.414; padding: 40px 36px;
  border: 1px solid var(--ws-border); background: var(--ws-surface); box-shadow: 0 2px 8px rgb(0 0 0 / 0.08);
}
.fv__h { width: 50%; height: 14px; margin-bottom: 12px; background: var(--ws-border); }
.fv__l { height: 8px; background: var(--ws-border-lighter); }
.fv__stamp { position: absolute; right: 28px; bottom: 28px; padding: 4px 10px; border: 2px solid var(--ws-text-danger); color: var(--ws-text-danger); font-weight: 700; rotate: -8deg; }
.fv__foot { display: flex; justify-content: flex-end; gap: 6px; }
</style>
