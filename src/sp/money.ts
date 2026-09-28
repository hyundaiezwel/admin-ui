/**
 * 금액 단위 — 합계가 수백억이라 원 단위로는 자릿수를 세야 읽힌다.
 * 단위를 바꿔도 **반올림 표시만** 바뀐다. 계산은 늘 원 단위 정수다.
 */
export const UNITS = ['원', '천원', '백만원', '억원'] as const
export type Unit = (typeof UNITS)[number]
const DIV: Record<Unit, number> = { 원: 1, 천원: 1_000, 백만원: 1_000_000, 억원: 100_000_000 }

export function money(n: number, unit: Unit = '원'): string {
  const v = n / DIV[unit]
  return v.toLocaleString('ko-KR', { maximumFractionDigits: unit === '억원' ? 1 : 0 })
}
