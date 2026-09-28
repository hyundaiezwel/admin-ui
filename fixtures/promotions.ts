import { rng } from './rng'

/** 예약 → 진행 → 종료. 중단은 진행 중에만 갈 수 있다 */
export type PromoStatus = '작성중' | '예약' | '진행' | '종료' | '중단'

export interface Promotion {
  id: string
  name: string
  kind: '할인' | '포인트' | '쿠폰' | '사은품'
  startAt: string
  endAt: string | null
  target: string
  budget: number
  used: number
  status: PromoStatus
}

export const PROMO_STATUS_TONE: Record<PromoStatus, string> = {
  작성중: 'neutral', 예약: 'info', 진행: 'success', 종료: 'neutral', 중단: 'danger',
}

/**
 * 상태별로 고칠 수 있는 항목이 다르다. 화면이 이 표를 보고 입력을 잠근다 —
 * 상태 판단을 화면마다 흩어 두면 규칙이 갈라진다.
 */
export const EDITABLE: Record<PromoStatus, { name: boolean; period: boolean; target: boolean; budget: boolean; note: string }> = {
  작성중: { name: true, period: true, target: true, budget: true, note: '전 항목 수정 가능' },
  예약: { name: true, period: true, target: true, budget: true, note: '시작 전이라 전 항목 수정 가능' },
  진행: { name: false, period: true, target: false, budget: true, note: '진행 중 — 종료일 단축과 예산 증액만 가능' },
  종료: { name: false, period: false, target: false, budget: false, note: '종료된 프로모션은 읽기 전용' },
  중단: { name: false, period: false, target: false, budget: false, note: '중단된 프로모션은 읽기 전용' },
}

const KINDS: Promotion['kind'][] = ['할인', '포인트', '쿠폰', '사은품']
const STATUS: PromoStatus[] = ['작성중', '예약', '진행', '종료', '중단']
const TARGETS = ['전체 회원', 'VIP 등급', '신규 가입 30일', '휴면 회원', '수도권 거주']

export function makePromotions(count: number, seed = 31337): Promotion[] {
  const r = rng(seed)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  return Array.from({ length: count }, (_, i) => {
    const budget = (1 + Math.floor(r() * 50)) * 1000000
    return {
      id: `PRM-${String(1000 + i).slice(1)}`,
      name: `${pick(['가을', '추석', '연말', '신규회원', '복지포인트', '주말특가'])} ${pick(KINDS)} 프로모션 ${i + 1}`,
      kind: pick(KINDS),
      startAt: `2026-${String((i % 12) + 1).padStart(2, '0')}-01`,
      endAt: r() > 0.15 ? `2026-${String((i % 12) + 1).padStart(2, '0')}-28` : null,
      target: pick(TARGETS),
      budget,
      used: Math.floor(budget * r()),
      status: pick(STATUS),
    }
  })
}

export { KINDS as PROMO_KINDS, STATUS as PROMO_STATUS, TARGETS as PROMO_TARGETS }
