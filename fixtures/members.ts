import { rng, NAMES } from './rng'

export type Grade = '일반' | '실버' | '골드' | 'VIP'
export type MemberStatus = '활성' | '휴면' | '탈퇴'

export interface Member {
  id: string
  name: string
  email: string
  grade: Grade
  status: MemberStatus
  point: number
  orderCount: number
  joinedAt: string
  lastLoginAt: string
}

const GRADES: Grade[] = ['일반', '실버', '골드', 'VIP']
const STATUS: MemberStatus[] = ['활성', '휴면', '탈퇴']

export const GRADE_TONE: Record<Grade, string> = { 일반: 'neutral', 실버: 'info', 골드: 'warning', VIP: 'brand' }
export const MEMBER_STATUS_TONE: Record<MemberStatus, string> = { 활성: 'success', 휴면: 'warning', 탈퇴: 'neutral' }

export function makeMembers(count: number, seed = 424242): Member[] {
  const r = rng(seed)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  return Array.from({ length: count }, (_, i) => {
    const name = pick(NAMES)
    return {
      id: `M${String(200000 + i).slice(1)}`,
      name,
      email: `user${1000 + i}@example.com`,
      grade: pick(GRADES),
      status: pick(STATUS),
      point: Math.floor(r() * 90000),
      orderCount: Math.floor(r() * 60),
      joinedAt: `202${3 + (i % 3)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      lastLoginAt: `2026-09-${String((i % 19) + 1).padStart(2, '0')}`,
    }
  })
}

export { GRADES, STATUS as MEMBER_STATUS }
