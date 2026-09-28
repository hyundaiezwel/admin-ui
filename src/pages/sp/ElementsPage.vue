<script setup lang="ts">
/**
 * 새 화면 요소 — AS-IS 패턴 중 DS3에 없던 것과, 그것이 필요한 AS-IS 화면 수.
 *
 * "필요 화면"은 분석 시트 속성으로 고른 **추정치**다(elements.ts `need`). 화면을 실제로 그리면
 * 틀린 게 나온다 — 그때 규칙을 고친다. 구현한 요소는 쓰인 화면으로 바로 간다.
 */
import { computed, ref } from 'vue'
import PageHead from '../../app/PageHead.vue'
import SelectButton from 'primevue/selectbutton'
import { ELEMENTS } from '../../sp/elements'
import { ASIS } from '../../sp/asis'

const filter = ref('전체')
const rows = computed(() =>
  ELEMENTS.map((e) => ({ ...e, hits: ASIS.filter(e.need) }))
    .filter((e) => filter.value === '전체' || (filter.value === '구현' ? !!e.demo : !e.demo)),
)
const built = ELEMENTS.filter((e) => e.demo).length
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <p class="ws-callout"><b>{{ ELEMENTS.length }}건</b> — 구현 {{ built }} · 식별만 {{ ELEMENTS.length - built }}. 필요 화면 수는 AS-IS 54화면의 유형 · 외부연동 · 개인정보 등급으로 고른 추정치다.</p>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l"><h2 class="ws-tit__h">요소 목록</h2></div>
        <div class="ws-tit__r"><SelectButton v-model="filter" :options="['전체', '구현', '식별만']" :allow-empty="false" aria-label="구현 여부" /></div>
      </div>
      <table class="ws-gtb">
        <thead>
          <tr><th scope="col" style="width: 44px">#</th><th scope="col" style="width: 110px">분류</th><th scope="col" style="width: 200px">요소</th><th scope="col">무엇을 하나</th><th scope="col">AS-IS 근거</th><th scope="col" style="width: 84px">필요 화면</th><th scope="col" style="width: 170px">보기</th></tr>
        </thead>
        <tbody>
          <tr v-for="e in rows" :key="e.no">
            <td class="ws-num">{{ e.no }}</td>
            <td>{{ e.group }}</td>
            <td><b>{{ e.name }}</b><br /><code v-if="e.file" class="fi">{{ e.file }}</code></td>
            <td>{{ e.what }}</td>
            <td class="ws-desc" style="font-size: var(--ws-font-size-md)">{{ e.asis }}</td>
            <td class="ws-num" :title="e.hits.map((h) => `${h.id} ${h.name}`).join('\n')">{{ e.hits.length || '—' }}</td>
            <td>
              <RouterLink v-if="e.demo" :to="e.demo.to" class="lk">{{ e.demo.label }} →</RouterLink>
              <span v-else class="ws-badge ws-badge--mute">식별만</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.fi { color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }
.lk { color: var(--ws-text-link); }
.ws-gtb td { vertical-align: top; line-height: 20px; padding-block: 8px; }
</style>
