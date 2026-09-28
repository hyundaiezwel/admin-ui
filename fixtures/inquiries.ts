/**
 * 문의 답변 관리 화면의 목업 데이터.
 *
 * 두 스파이크가 **같은 데이터**를 본다 — 라이브러리 차이 말고 다른 변수가 끼면
 * 밀도·대비 측정이 의미를 잃는다.
 */
export type Channel = '웹' | '앱' | '전화' | '카카오' | '이메일'
export type Status = '접수' | '처리중' | '답변완료' | '보류' | '종결'

export interface Inquiry {
  id: string
  channel: Channel
  category: string
  title: string
  customer: string
  assignee: string
  status: Status
  /** 최초 응답까지 남은 시간(시간). 음수면 SLA 초과 */
  slaLeft: number
  createdAt: string
  replyCount: number
}

const CHANNELS: Channel[] = ['웹', '앱', '전화', '카카오', '이메일']
const STATUSES: Status[] = ['접수', '처리중', '답변완료', '보류', '종결']
const CATEGORIES = ['배송', '환불', '상품문의', '결제', '회원정보', '포인트', '쿠폰']
const NAMES = ['김하늘', '이준서', '박서연', '최민재', '정유진', '강도현', '윤채원', '임태양']
const TITLES = [
  '주문한 상품이 아직 배송되지 않았습니다',
  '환불 처리가 언제 완료되나요',
  '쿠폰이 적용되지 않습니다',
  '포인트가 소멸되었는데 복구 가능한가요',
  '결제 수단을 변경하고 싶습니다',
  '수령인 주소를 잘못 입력했습니다',
  '상품 옵션을 바꿀 수 있나요',
]

/** 시드 고정 난수 — 실행마다 데이터가 달라지면 측정값을 비교할 수 없다 */
function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
}

export function makeInquiries(count: number, seed = 20260919): Inquiry[] {
  const r = rng(seed)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  return Array.from({ length: count }, (_, i) => {
    const day = String((i % 28) + 1).padStart(2, '0')
    return {
      id: `INQ-${String(100000 + i).slice(1)}`,
      channel: pick(CHANNELS),
      category: pick(CATEGORIES),
      title: pick(TITLES),
      customer: pick(NAMES),
      assignee: pick(NAMES),
      status: pick(STATUSES),
      slaLeft: Math.round((r() * 48 - 12) * 10) / 10,
      createdAt: `2026-09-${day} ${String(Math.floor(r() * 24)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}`,
      replyCount: Math.floor(r() * 5),
    }
  })
}

/** 상태 → EzBadge tone. 화면이 아니라 공통코드가 줄 값이라는 전제다 */
export const STATUS_TONE: Record<Status, string> = {
  접수: 'neutral',
  처리중: 'info',
  답변완료: 'success',
  보류: 'warning',
  종결: 'neutral',
}

export const ASSIGNEES = NAMES
export { CHANNELS, STATUSES, CATEGORIES }
