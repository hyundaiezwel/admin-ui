import { ref, watch } from 'vue'
import { useMockQuery } from './useMockQuery'

/**
 * 서버 페이징 목업 — 조건에 맞는 전체 중 **한 쪽만** 돌려준다. 실제 API의 `page`·`size`·`total` 자리다.
 * 쪽이나 쪽당 건수가 바뀌면 다시 조회한다. 조건이 바뀌면 화면이 `first = 0`으로 되돌린다.
 */
export function usePaged<T>(all: () => T[], opts: { failIf?: () => boolean; size?: number } = {}) {
  const first = ref(0)
  const size = ref(opts.size ?? 20)
  const total = ref(0)
  const q = useMockQuery(() => {
    const a = all()
    total.value = a.length
    return a.slice(first.value, first.value + size.value)
  }, { failIf: opts.failIf })
  watch([first, size], () => q.reload())
  /** 조건을 바꿔 새로 조회 — 첫 쪽으로 돌아간다 */
  const search = () => (first.value === 0 ? q.reload() : (first.value = 0))
  return { ...q, first, size, total, search }
}
