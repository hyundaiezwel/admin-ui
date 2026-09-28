<script setup lang="ts">
/**
 * 회원 관리 — 조회 전용 그리드 + 상세 패널.
 *
 * `editable`을 끈 예다. 편집 칸이 없으니 셀 안 상자도 없다 — 원본도 읽기 전용 셀은
 * 상자를 그리지 않는다(`:not(.w2grid_default_readonly)`).
 */
import { onMounted, ref } from 'vue'
import PageHead from '../app/PageHead.vue'
import QueryState from '../app/QueryState.vue'
import TabGrid from '../grid/TabGrid.vue'
import WsDialog from '../ws/WsDialog.vue'
import WsSearch from '../ws/WsSearch.vue'
import { badgeClass, badgeHtml } from '../ws/badge'
import { useMockQuery, ERROR_KEYWORD } from '../app/useMockQuery'
import { makeMembers, GRADES, MEMBER_STATUS, GRADE_TONE, MEMBER_STATUS_TONE, type Member } from '@fixtures/members'
import { won } from '@fixtures/rng'

const ALL = makeMembers(1200)
const f = ref({ keyword: '', grade: '', status: '' })
const applied = ref({ ...f.value })
const detail = ref<Member | null>(null)

const { rows, loading, error, reload } = useMockQuery(
  () =>
    ALL.filter((m) => {
      const a = applied.value
      return (
        (!a.keyword || m.name.includes(a.keyword) || m.id.includes(a.keyword) || m.email.includes(a.keyword)) &&
        (!a.grade || m.grade === a.grade) &&
        (!a.status || m.status === a.status)
      )
    }),
  { failIf: () => applied.value.keyword.includes(ERROR_KEYWORD) },
)
onMounted(reload)

const columns = [
  { title: '회원번호', field: 'id', width: 110, sorter: 'string', headerFilter: 'input' },
  { title: '이름', field: 'name', width: 96, sorter: 'string', headerFilter: 'input' },
  { title: '이메일', field: 'email', minWidth: 200, sorter: 'string' },
  { title: '등급', field: 'grade', width: 88, hozAlign: 'center', headerHozAlign: 'center', sorter: 'string',
    formatter: (c: any) => badgeHtml(c.getValue(), GRADE_TONE[c.getValue() as keyof typeof GRADE_TONE]) },
  { title: '상태', field: 'status', width: 88, hozAlign: 'center', headerHozAlign: 'center', sorter: 'string',
    formatter: (c: any) => badgeHtml(c.getValue(), MEMBER_STATUS_TONE[c.getValue() as keyof typeof MEMBER_STATUS_TONE]) },
  { title: '보유 포인트', field: 'point', width: 118, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number',
    formatter: (c: any) => won(c.getValue()) },
  { title: '주문', field: 'orderCount', width: 72, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number' },
  { title: '가입일', field: 'joinedAt', width: 106, sorter: 'string' },
  { title: '최근 로그인', field: 'lastLoginAt', width: 112, sorter: 'string' },
]

function search() { applied.value = { ...f.value }; reload() }
function reset() { f.value = { keyword: '', grade: '', status: '' }; search() }

// 옆 패널은 boolean만 받는다 — 선택 객체를 그대로 물리면 닫을 때 타입이 어긋난다
const open = ref(false)
function show(m: Member) { detail.value = m; open.value = true }
</script>

<template>
  <div class="ws-page">
    <PageHead />

    <WsSearch @search="search" @reset="reset">
      <tr>
        <th scope="row"><label for="m-kw">검색어</label></th>
        <td><input id="m-kw" v-model="f.keyword" class="ws-input" placeholder="이름 · 회원번호 · 이메일" /></td>
        <th scope="row"><label for="m-gr">등급</label></th>
        <td>
          <select id="m-gr" v-model="f.grade" class="ws-select">
            <option value="">전체</option>
            <option v-for="g in GRADES" :key="g">{{ g }}</option>
          </select>
        </td>
        <th scope="row"><label for="m-st">상태</label></th>
        <td>
          <select id="m-st" v-model="f.status" class="ws-select">
            <option value="">전체</option>
            <option v-for="s in MEMBER_STATUS" :key="s">{{ s }}</option>
          </select>
        </td>
      </tr>
    </WsSearch>

    <section class="ws-sec">
      <div class="ws-tit">
        <div class="ws-tit__l">
          <h2 class="ws-tit__h">회원 목록</h2>
          <span class="ws-total">총<strong>{{ rows.length.toLocaleString('ko-KR') }}</strong>명</span>
        </div>
        <div class="ws-tit__r">
          <span class="ws-desc">행을 누르면 상세가 열린다</span>
        </div>
      </div>
      <div class="ws-gv">
        <QueryState :loading="loading" :error="error" :empty="rows.length === 0" :lines="12" @retry="reload">
          <TabGrid :columns="columns" :rows="rows" height="500px" @row-click="show" />
        </QueryState>
      </div>
    </section>

    <WsDialog v-model:open="open" side width="480px" :title="detail ? `${detail.name} (${detail.id})` : '회원 상세'">
      <table v-if="detail" class="ws-tb">
        <colgroup><col style="width: 112px" /><col /></colgroup>
        <tbody>
          <tr><th scope="row">이메일</th><td>{{ detail.email }}</td></tr>
          <tr><th scope="row">등급</th><td><span :class="badgeClass(GRADE_TONE[detail.grade])">{{ detail.grade }}</span></td></tr>
          <tr><th scope="row">상태</th><td><span :class="badgeClass(MEMBER_STATUS_TONE[detail.status])">{{ detail.status }}</span></td></tr>
          <tr><th scope="row">보유 포인트</th><td class="ws-num" style="text-align: left">{{ won(detail.point) }} P</td></tr>
          <tr><th scope="row">누적 주문</th><td class="ws-num" style="text-align: left">{{ detail.orderCount }} 건</td></tr>
          <tr><th scope="row">가입일</th><td>{{ detail.joinedAt }}</td></tr>
          <tr><th scope="row">최근 로그인</th><td>{{ detail.lastLoginAt }}</td></tr>
        </tbody>
      </table>
      <template #foot>
        <button type="button" class="ws-btn" @click="open = false">닫기</button>
      </template>
    </WsDialog>
  </div>
</template>
