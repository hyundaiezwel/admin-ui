<script setup lang="ts">
/**
 * 공통코드 — 마스터·디테일 2단 연동. 좌측을 고르면 우측이 따라온다.
 *
 * 마스터는 6행짜리 조회 전용이라 Tabulator를 띄우지 않고 정적 표(`.ws-gtb`)로 둔다 —
 * 50행 이하 조회 전용은 정적 표가 규칙이다. 두 표가 같은 치수라 섞여도 한 화면으로 읽힌다.
 *
 * 행 선택은 **행 안의 버튼**으로 받는다. `<tr>`에 click만 걸면 키보드로는 고를 수 없다.
 */
import { computed, onMounted, ref } from 'vue'
import PageHead from '../app/PageHead.vue'
import QueryState from '../app/QueryState.vue'
import WsSearch from '../ws/WsSearch.vue'
import { badgeClass } from '../ws/badge'
import { useMockQuery, ERROR_KEYWORD } from '../app/useMockQuery'

interface Group { code: string; name: string; count: number; use: 'Y' | 'N' }
interface Detail { code: string; name: string; tone: string; sort: number; use: 'Y' | 'N' }

const GROUPS: Group[] = [
  { code: 'INQ_STATUS', name: '문의 처리 상태', count: 5, use: 'Y' },
  { code: 'INQ_CHANNEL', name: '문의 채널', count: 5, use: 'Y' },
  { code: 'ORD_STATUS', name: '주문 상태', count: 6, use: 'Y' },
  { code: 'MBR_GRADE', name: '회원 등급', count: 4, use: 'Y' },
  { code: 'PRM_STATUS', name: '프로모션 상태', count: 5, use: 'Y' },
  { code: 'LEGACY_TYPE', name: '(구) 분류 코드', count: 3, use: 'N' },
]
const DETAILS: Record<string, Detail[]> = {
  INQ_STATUS: [
    { code: 'RECEIVED', name: '접수', tone: 'neutral', sort: 1, use: 'Y' },
    { code: 'PROGRESS', name: '처리중', tone: 'info', sort: 2, use: 'Y' },
    { code: 'ANSWERED', name: '답변완료', tone: 'success', sort: 3, use: 'Y' },
    { code: 'HOLD', name: '보류', tone: 'warning', sort: 4, use: 'Y' },
    { code: 'CLOSED', name: '종결', tone: 'neutral', sort: 5, use: 'Y' },
  ],
  MBR_GRADE: [
    { code: 'BASIC', name: '일반', tone: 'neutral', sort: 1, use: 'Y' },
    { code: 'SILVER', name: '실버', tone: 'info', sort: 2, use: 'Y' },
    { code: 'GOLD', name: '골드', tone: 'warning', sort: 3, use: 'Y' },
    { code: 'VIP', name: 'VIP', tone: 'brand', sort: 4, use: 'Y' },
  ],
}

const selected = ref<Group>(GROUPS[0])
const keyword = ref('')
const { rows: groups, loading, error, reload } = useMockQuery(
  () => GROUPS.filter((g) => !keyword.value || g.name.includes(keyword.value) || g.code.includes(keyword.value)),
  { latency: 300, failIf: () => keyword.value.includes(ERROR_KEYWORD) },
)
onMounted(reload)
const details = computed(() => DETAILS[selected.value.code] ?? [])
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch :cols="['72px', '', '', '', '', '']" @search="reload" @reset="keyword = ''; reload()">
      <tr>
        <th scope="row"><label for="c-kw">검색어</label></th>
        <td><input id="c-kw" v-model="keyword" class="ws-input" placeholder="그룹명 또는 코드" /></td>
        <td colspan="4" />
      </tr>
    </WsSearch>

    <div class="cols">
      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">코드 그룹</h2><span class="ws-total">총<strong>{{ groups.length }}</strong>건</span></div>
          <div class="ws-tit__r"><button type="button" class="ws-btn ws-btn--pri">그룹 추가</button></div>
        </div>
        <QueryState :loading="loading" :error="error" :empty="groups.length === 0" :lines="6" @retry="reload">
          <table class="ws-gtb">
            <caption class="ws-sr-only">코드 그룹 — 그룹명을 누르면 오른쪽에 하위 코드가 나온다</caption>
            <colgroup><col style="width: 132px" /><col /><col style="width: 56px" /><col style="width: 68px" /></colgroup>
            <thead><tr><th scope="col">그룹코드</th><th scope="col">그룹명</th><th scope="col">건수</th><th scope="col">사용</th></tr></thead>
            <tbody>
              <tr v-for="g in groups" :key="g.code" :class="{ 'is-on': g.code === selected.code }" @click="selected = g">
                <td class="code">{{ g.code }}</td>
                <td><button type="button" class="pick" :aria-pressed="g.code === selected.code" @click.stop="selected = g">{{ g.name }}</button></td>
                <td class="ws-num">{{ g.count }}</td>
                <td style="text-align: center"><span :class="badgeClass(g.use === 'Y' ? 'success' : 'mute')">{{ g.use === 'Y' ? '사용' : '미사용' }}</span></td>
              </tr>
            </tbody>
          </table>
        </QueryState>
      </section>

      <section class="ws-sec">
        <div class="ws-tit">
          <div class="ws-tit__l"><h2 class="ws-tit__h">{{ selected.name }}</h2><span class="code">{{ selected.code }}</span></div>
          <div class="ws-tit__r"><button type="button" class="ws-btn ws-btn--line">코드 추가</button></div>
        </div>
        <table v-if="details.length" class="ws-gtb">
          <caption class="ws-sr-only">{{ selected.name }} 하위 코드</caption>
          <thead><tr><th scope="col">코드</th><th scope="col">이름</th><th scope="col">뱃지</th><th scope="col">정렬</th><th scope="col">사용</th></tr></thead>
          <tbody>
            <tr v-for="d in details" :key="d.code">
              <td class="code">{{ d.code }}</td>
              <td>{{ d.name }}</td>
              <td style="text-align: center"><span :class="badgeClass(d.tone)">{{ d.name }}</span></td>
              <td class="ws-num">{{ d.sort }}</td>
              <td style="text-align: center">{{ d.use }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="ws-empty" style="border-top: 1px solid var(--ws-border-strong)">이 그룹의 하위 코드는 목업에 없습니다.</div>

        <div class="ws-msg" style="margin-top: 12px">
          <ul>
            <li>뱃지 색(<code>tone</code>)이 코드 속성으로 내려온다. 기획이 라벨·색을 바꿔도 프론트 배포가 필요 없다.</li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.cols { display: grid; grid-template-columns: minmax(0, 440px) minmax(0, 1fr); gap: var(--ws-gap-region); }
.code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: var(--ws-font-size-sm); color: var(--ws-text-sub); }
.pick { padding: 0; border: 0; background: none; color: inherit; text-align: left; cursor: pointer; }
.pick[aria-pressed='true'] { color: var(--ws-text-brand); font-weight: 700; }
.ws-gtb tbody tr { cursor: pointer; }
</style>
