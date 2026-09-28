import type { MemberRow } from '@fixtures/sp'

/**
 * 참여회원 현황 — 회원 상태별로 할 수 있는 처리. 행 메뉴 · 일괄 버튼 · docs/state-rules.md가 이것을 본다.
 *
 *   미가입 M0 ─가입─▶ 이용중 M1 ─이용정지─▶ 이용정지 M2 ─환불요청─▶ 환불요청 M3 ─▶ 환불대상 M4 ─▶ 환불완료 M5
 *                                                                                          └▶ 환불실패 M6 ─계좌 수정─▶ M3
 * 환불요청은 환불계좌가 있어야 한다. 환불대상 · 완료는 배치(익월 중순)가 옮긴다 — 화면에서 하지 않는다.
 */
export type MemberAct = 'stop' | 'account' | 'refund' | 'invite'
export const MEMBER_ACT_LABEL: Record<MemberAct, string> = { stop: '이용정지', account: '환불계좌 등록', refund: '환불요청', invite: '가입 안내 발송' }
/** 처리 → 결과 상태. 계좌 등록은 상태를 바꾸지 않는다(환불실패만 환불요청으로 되돌린다) */
export const MEMBER_TO: Partial<Record<MemberAct, string>> = { stop: 'M2', refund: 'M3', invite: 'M0' }

export function memberActions(r: Pick<MemberRow, 'sts' | 'refundAcct'>): MemberAct[] {
  if (r.sts === 'M0') return ['invite']
  if (r.sts === 'M1') return ['stop']
  if (r.sts === 'M2') return r.refundAcct ? ['refund', 'account'] : ['account']
  if (r.sts === 'M3' || r.sts === 'M6') return ['account']
  return []
}
