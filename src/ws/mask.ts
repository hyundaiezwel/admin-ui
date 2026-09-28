/**
 * 개인정보 가림 — 목록은 늘 가리고, 상세에서만 연다.
 *
 * AS-IS는 엑셀 반출은 사유 등록으로 통제하면서 **화면 조회는 평문**이다(분석 09 개인정보).
 * 여기서는 목록이 가린 값만 싣고, 원문은 상세의 `WsMasked`가 열람 기록과 함께 연다.
 */
export type MaskKind = 'phone' | 'email' | 'name' | 'account' | 'birth' | 'id'

export function mask(v: string, kind: MaskKind): string {
  if (!v) return ''
  if (kind === 'phone') return v.replace(/^(\d{3})-?(\d{3,4})-?(\d{4})$/, '$1-****-$3')
  if (kind === 'birth') return v.replace(/^(\d{4})\D?\d{2}\D?\d{2}$/, '$1.**.**')
  if (kind === 'id') return v.length <= 3 ? `${v[0]}**` : `${v.slice(0, 3)}${'*'.repeat(Math.min(6, v.length - 3))}`
  if (kind === 'account') return v.slice(0, 3) + v.slice(3, -2).replace(/\d/g, '*') + v.slice(-2)
  if (kind === 'email') return v.replace(/^(.{2})[^@]*(@.*)$/, '$1***$2')
  return v.length <= 2 ? `${v[0]}*` : `${v[0]}${'*'.repeat(v.length - 2)}${v[v.length - 1]}`
}
