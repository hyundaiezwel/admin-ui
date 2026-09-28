import { reactive } from 'vue'

/**
 * 화면 사이 넘겨주기 — 통합 검색에서 회원을 고르면 참여회원 현황이 그 이름으로 조회한다.
 * **주소(query)에 싣지 않는다.** 이름이 주소창 · 방문 기록 · 서버 로그에 남는다.
 */
export const handoff = reactive<{ member: string | null }>({ member: null })
