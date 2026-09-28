/**
 * 기간 조건 — 빠른 선택과 조회 범위 검증.
 *
 * AS-IS는 범위를 넘기면 조회 버튼을 누른 뒤에야 `alert('최대 4년까지 조회가 가능합니다.')`를 띄운다.
 * 여기서는 같은 규칙을 **입력하는 자리에서** 알리고, 조회는 막는다. 화면과 조회가 같은 함수를 본다.
 */
export type Range = [Date | null, Date | null]
export interface PeriodLimit { maxYears?: number; maxMonths?: number }

export const PRESETS = [
  { label: '오늘', days: 0 },
  { label: '1주일', days: 7 },
  { label: '1개월', months: 1 },
  { label: '6개월', months: 6 },
  { label: '12개월', months: 12 },
] as const
export type Preset = (typeof PRESETS)[number]

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export function presetRange(p: Preset, today = new Date()): [Date, Date] {
  const to = startOfDay(today)
  const from = new Date(to)
  if ('months' in p) from.setMonth(from.getMonth() - p.months)
  else from.setDate(from.getDate() - p.days)
  return [from, to]
}

export function samePreset(r: Range, p: Preset) {
  const [a, b] = presetRange(p)
  return !!r[0] && !!r[1] && +startOfDay(r[0]) === +a && +startOfDay(r[1]) === +b
}

/** 문구는 AS-IS 원문을 다듬어 쓴다 — 운영자가 이미 아는 말이다 */
export function periodError(r: Range, lim: PeriodLimit = {}): string | null {
  const [a, b] = r
  if (!a || !b) return null
  if (a > b) return '시작일이 종료일보다 늦습니다.'
  const edge = new Date(a)
  if (lim.maxYears) {
    edge.setFullYear(edge.getFullYear() + lim.maxYears)
    if (b > edge) return `최대 ${lim.maxYears}년까지 조회할 수 있습니다.`
  } else if (lim.maxMonths) {
    edge.setMonth(edge.getMonth() + lim.maxMonths)
    if (b > edge) return `최대 ${lim.maxMonths}개월까지 조회할 수 있습니다.`
  }
  return null
}

export const fmtDate = (d: Date | null) =>
  d ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` : ''
export const parseDate = (s: string) => {
  const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
}
