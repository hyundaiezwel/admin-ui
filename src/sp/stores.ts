/**
 * 목업 데이터 캐시 — 목록과 상세가 **같은 행 객체**를 본다. 목록에서 승인하면 상세에서도 승인으로 보인다.
 * 전역 조건 키마다 한 벌. 실제 구현에서는 서버가 이 자리다.
 */
const cache = new Map<string, unknown>()
export function memo<T>(ns: string, key: string, make: () => T): T {
  const k = `${ns}:${key}`
  if (!cache.has(k)) cache.set(k, make())
  return cache.get(k) as T
}
export const basicStore = <T>(key: string, make: () => T) => memo('basic', key, make)
