import { reactive, watch } from 'vue'
import { BIZ, ROLES } from './codes'

/**
 * 전역 조건 — 참여년도 × 사업 (+ 미리보기 전용 역할).
 *
 * AS-IS는 이 둘을 20개 넘는 화면이 **각자 조회 조건 첫 줄에** 둔다. 화면을 옮길 때마다
 * 다시 고르고, 탭 두 개가 서로 다른 사업을 보고 있어도 표시가 없다.
 * 미리보기는 셸에 한 번만 둔다 — 열린 탭 전부가 같은 조건을 본다.
 *
 * 역할은 권한 차이를 보여 주려고 넣은 **미리보기용 스위치**다. 실제 시스템에는 없다.
 */
const KEY = 'sp-context'
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null } })()

export const ctx = reactive<{ year: number; biz: string; role: string }>({
  year: saved?.year ?? 2026,
  biz: saved?.biz ?? BIZ[0].code,
  role: saved?.role ?? ROLES[0].code,
})
watch(ctx, (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* 이번 방문만 */ } })

/** 조건을 바꾸면 화면이 다시 조회한다. 값 자체가 아니라 "바뀌었다"만 본다 */
export const ctxKey = () => `${ctx.year}-${ctx.biz}`

/**
 * 버튼 단위 권한 — **가정이다.** AS-IS에 `이용정지 변경 권한이 없습니다` 같은 문구가 있어
 * 메뉴 권한과 동작 권한이 따로라는 것만 확인됐다. 어느 역할이 무엇을 하는지는 미확인(Q-목록).
 */
const NEED: Record<string, number> = {
  'bulk-cancel': 4,   // 비가역 대량 처리 — 사업총괄만
  suspend: 2,         // 이용정지 — 지원담당 이상
  'bulk-send': 2,     // LMS·E-Mail 일괄 발송
  'bulk-refund': 3,   // 일괄 환불요청 — 금전 처리라 지원총괄 이상
}
const rank = () => ROLES.find((r) => r.code === ctx.role)?.rank ?? 1
export const can = (action: keyof typeof NEED | string) => rank() >= (NEED[action] ?? 1)
export const needRole = (action: string) => ROLES.find((r) => r.rank === (NEED[action] ?? 1))?.label ?? ''
