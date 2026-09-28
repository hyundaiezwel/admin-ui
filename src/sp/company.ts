import type { CompanyRow } from '@fixtures/sp'

/**
 * 참여 기업 관리 — 상태별로 할 수 있는 처리.
 *
 * AS-IS는 행마다 버튼이 다르게 뜬다(어떤 행은 확인서파기 · 인원변경, 어떤 행은 신청만). 규칙이 화면
 * 템플릿 안에 흩어져 있어 "이 상태에서 무엇을 할 수 있나"를 한 곳에서 볼 수 없다.
 * 여기서는 **표 하나**로 둔다 — 행 메뉴 · 일괄 버튼의 적격 판정 · 화면 아래 규칙표가 전부 이것을 본다.
 * 실제 구현에서는 상태 전이가 도메인 서비스에 있고(백엔드 규칙 3), 화면은 서버가 준 허용 목록을 그린다.
 */
export type Action = 'start' | 'due' | 'apprCancel' | 'break' | 'addReview' | 'cancelDoc' | 'docs'

export const ACTION_LABEL: Record<Action, string> = {
  start: '참여개시',
  due: '입금기한 변경',
  apprCancel: '승인취소',
  break: '확인서 파기',
  addReview: '추가 인원 심사',
  cancelDoc: '취소공문 등록',
  docs: '제출서류 보기',
}

/** 상태 → 허용 처리. 추가 인원 심사는 신청이 있을 때만(행 조건) */
const BY_STATE: Record<string, Action[]> = {
  '410': ['docs'],                                  // 최종제출 — 등록승인은 기초정보 심사에서 한다
  '510': ['due', 'apprCancel', 'break', 'docs'],    // 등록승인(입금중)
  '520': ['start', 'break', 'docs'],                // 입금완료
  '610': ['addReview', 'docs'], '611': ['addReview', 'docs'], '612': ['addReview', 'docs'],
  '613': ['addReview', 'due', 'docs'],              // 추가 분담금 입금중
  '614': ['addReview', 'docs'], '615': ['docs'], '616': ['addReview', 'docs'],
  '590': ['cancelDoc', 'docs'], '710': ['cancelDoc', 'docs'], '810': ['cancelDoc', 'docs'], '830': ['docs'],
}
export const STATES_IN_SCREEN = Object.keys(BY_STATE)

export function allowed(r: CompanyRow): Action[] {
  return (BY_STATE[r.sts] ?? ['docs']).filter((a) => a !== 'addReview' || r.addReq > 0)
}
/** 규칙표용 — 행 조건을 빼고 상태만으로 */
export const allowedByState = (code: string): Action[] => BY_STATE[code] ?? []

/** 일괄로 할 수 있는 처리와 그 결과 상태. 결과 상태가 없으면 상태를 안 바꾸는 처리다 */
export const BULK: { action: Action; to?: string }[] = [
  { action: 'start', to: '611' },
  { action: 'due' },
  { action: 'apprCancel', to: '410' },
]

/** 상태 탭 — AS-IS 라디오 15개를 업무 단계 여섯으로 묶는다. 참여개시만 하위 칩을 편다 */
export const TABS = [
  { id: 'all', label: '전체', codes: STATES_IN_SCREEN },
  { id: 'final', label: '최종제출', codes: ['410'] },
  { id: 'wait', label: '입금 대기', codes: ['510'] },
  { id: 'paid', label: '입금완료', codes: ['520'] },
  { id: 'active', label: '참여개시', codes: ['610', '611', '612', '613', '614', '615', '616'] },
  { id: 'end', label: '종료·환불', codes: ['590', '710', '810', '830'] },
]

/** 1인당 분담금 — 기업+개인 3 : 지원기관 1. 금액은 미리보기 가정값 */
export const PER_HEAD = { ci: 300_000, org: 100_000 }
export const REFUND_LABEL = { C: '기업 계좌', P: '개인 계좌', A: '기업+개인' } as const
