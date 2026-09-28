<script setup lang="ts">
/**
 * 설계 카드 — 아직 그리지 않은 제안 메뉴 자리.
 *
 * 빈 화면을 띄우는 대신 이 자리가 흡수한 AS-IS 화면의 근거(유형 · 난이도 · 외부연동 ·
 * 개인정보)와 **필요한 새 요소**를 보여 준다. 메뉴를 전부 눌러 볼 수 있어야 IA 검토가 된다.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageHead from '../../app/PageHead.vue'
import { trail } from '../../app/menu'
import { asisById } from '../../sp/asis'
import { ELEMENTS } from '../../sp/elements'

const route = useRoute()
const leaf = computed(() => { const t = trail(route.path); return t?.leaf ?? t?.top })
const screens = computed(() => (leaf.value?.asis ?? []).map((id) => ({ id, s: asisById(id) })))
const needs = computed(() => ELEMENTS.filter((e) => screens.value.some((x) => x.s && e.need(x.s))))
const lvl = (n: number | null | undefined) => (n == null ? '미정' : `${n} / 5`)
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <p class="ws-callout"><b>설계 카드</b> 아직 그리지 않은 자리다. 아래는 AS-IS 분석에서 가져온 근거와, 이 화면을 그릴 때 쓸 요소다.</p>
    <p v-if="leaf?.note" class="ws-callout ws-callout--warn"><b>바꾼 점</b> {{ leaf.note }}</p>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">흡수한 AS-IS 화면</h2><span class="ws-total">총<strong>{{ screens.length }}</strong>건</span></div></div>
      <table class="ws-gtb">
        <thead><tr><th scope="col">ID</th><th scope="col">AS-IS 메뉴 › 화면</th><th scope="col">유형</th><th scope="col">쓰기</th><th scope="col">난이도</th><th scope="col">난이도 근거</th><th scope="col">외부연동</th><th scope="col">개인정보</th></tr></thead>
        <tbody>
          <tr v-for="x in screens" :key="x.id">
            <td><code>{{ x.id }}</code></td>
            <template v-if="x.s">
              <td>{{ x.s.gnb }} › {{ x.s.name }}</td>
              <td>{{ x.s.type }}</td>
              <td style="text-align: center">{{ x.s.write ? '○' : '—' }}</td>
              <td style="text-align: center">{{ lvl(x.s.level) }}</td>
              <td>{{ x.s.why || '—' }}</td>
              <td>{{ x.s.ext || '—' }}</td>
              <td style="text-align: center"><span v-if="x.s.pii" class="ws-badge" :class="{ 'ws-badge--danger': x.s.pii === '상', 'ws-badge--warning': x.s.pii === '중' }">{{ x.s.pii }}</span></td>
            </template>
            <td v-else colspan="7">메인 대시보드 — 메뉴 밖 화면(G-006). 공지 탭 2 · 빠른 메뉴 7칸</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ws-sec">
      <div class="ws-tit"><div class="ws-tit__l"><h2 class="ws-tit__h">이 화면에 쓸 새 요소</h2><span class="ws-desc">분석 속성으로 고른 추정</span></div></div>
      <ul class="nd">
        <li v-for="e in needs" :key="e.no">
          <b>{{ e.name }}</b><span>{{ e.what }}</span>
          <RouterLink v-if="e.demo" :to="e.demo.to" class="lk">{{ e.demo.label }}에서 보기 →</RouterLink>
          <span v-else class="ws-badge ws-badge--mute">식별만</span>
        </li>
        <li v-if="!needs.length" class="ws-desc">기본 블록(조회 영역 · 목록 · 입력 표)만으로 된다.</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.nd { display: grid; gap: 6px; }
.nd li { display: grid; grid-template-columns: 220px 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--ws-border-lighter); border-radius: var(--ws-radius); }
.lk { color: var(--ws-text-link); white-space: nowrap; }
code { color: var(--ws-text-sub); font-size: var(--ws-font-size-sm); }
</style>
