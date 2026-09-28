import { badgeHtml } from '../ws/badge'
import { MAIN_LINE, stateOf } from './codes'

/** 상태 코드 → 뱃지. 그리드 포매터는 HTML 문자열이 필요해서 함수로도 둔다 */
export const statusHtml = (code: string) => {
  const s = stateOf(code)
  return badgeHtml(s?.label ?? code, s?.tone)
}

/**
 * 상태 → 생애주기 단계 위치. 본선 밖(이탈 · 종료 · 환불)은 **마지막으로 지난 본선 단계**에
 * 가지로 단다 — "어디서 빠졌나"가 보여야 한다. 코드로 어느 단계에서 빠졌는지 알 수 있는 것만 판정한다.
 */
const LEFT_AT: Record<string, number> = { '139': 0, '390': 2, '590': 4, '710': 5, '810': 5, '820': 5, '830': 5, '840': 5 }
export function lifecycle(code: string) {
  const s = stateOf(code)
  if (!s) return { current: 0, branch: undefined }
  const i = MAIN_LINE.indexOf(s.stage)
  if (i >= 0) return { current: i, branch: undefined }
  return { current: LEFT_AT[code] ?? 0, branch: { label: s.label, tone: s.tone === 'danger' ? ('danger' as const) : s.tone === 'warning' ? ('warning' as const) : ('mute' as const) } }
}
