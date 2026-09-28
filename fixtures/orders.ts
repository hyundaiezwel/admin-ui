import { rng, NAMES } from './rng'

export type OrderStatus = '결제대기' | '결제완료' | '배송중' | '배송완료' | '취소' | '환불'

export interface Order {
  id: string
  orderedAt: string
  customer: string
  product: string
  qty: number
  amount: number
  fee: number
  settle: number
  status: OrderStatus
  channel: string
}

const STATUS: OrderStatus[] = ['결제대기', '결제완료', '배송중', '배송완료', '취소', '환불']
const PRODUCTS = ['복지포인트 상품권', '건강검진 패키지', '호텔 숙박권', '도서 구매권', '문화공연 티켓', '리조트 이용권', '영화 예매권']
const CHANNELS = ['웹', '앱', '제휴몰']

export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  결제대기: 'neutral', 결제완료: 'info', 배송중: 'info', 배송완료: 'success', 취소: 'neutral', 환불: 'danger',
}

export function makeOrders(count: number, seed = 777777): Order[] {
  const r = rng(seed)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  return Array.from({ length: count }, (_, i) => {
    const qty = 1 + Math.floor(r() * 5)
    const unit = 10000 + Math.floor(r() * 40) * 5000
    const amount = qty * unit
    const fee = Math.round(amount * 0.035)
    return {
      id: `ORD-${String(1000000 + i).slice(1)}`,
      orderedAt: `2026-09-${String((i % 28) + 1).padStart(2, '0')} ${String(Math.floor(r() * 24)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}`,
      customer: pick(NAMES),
      product: pick(PRODUCTS),
      qty,
      amount,
      fee,
      settle: amount - fee,
      status: pick(STATUS),
      channel: pick(CHANNELS),
    }
  })
}

export { STATUS as ORDER_STATUS, PRODUCTS, CHANNELS as ORDER_CHANNELS }
