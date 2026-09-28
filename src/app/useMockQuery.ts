import { ref, shallowRef, type Ref } from 'vue'

/**
 * 목업용 비동기 조회.
 *
 * 왜 필요한가 — 고정 데이터를 그대로 뿌리면 **로딩과 오류 상태를 그릴 기회가 없다.**
 * 원칙 §8⑦은 정상·빈·오류·로딩 넷을 요구하는데, 동기 배열은 정상과 빈만 만든다.
 * 그래서 인위적 지연을 넣어 네 상태를 전부 실제로 통과시킨다.
 *
 * 오류를 보려면 **검색어에 `오류`를 넣는다.** 화면마다 안내를 띄워 둔다 —
 * 데모에서 오류 화면을 보여 줄 방법이 없으면 그 상태는 만든 것이 아니다.
 */
export interface MockQuery<T> {
  rows: Ref<T[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  reload: () => Promise<void>
}

export const ERROR_KEYWORD = '오류'

export function useMockQuery<T>(
  loader: () => T[],
  opts: { latency?: number; failIf?: () => boolean } = {},
): MockQuery<T> {
  const rows = shallowRef<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 늦게 끝난 조회가 최신 결과를 덮지 않게 한다 — 실제 API에서도 같은 문제가 난다 */
  let latest = 0

  async function reload() {
    const seq = ++latest
    loading.value = true
    error.value = null
    await new Promise((r) => setTimeout(r, opts.latency ?? 450))
    if (seq !== latest) return

    if (opts.failIf?.()) {
      error.value = 'QUERY_FAILED: 조회에 실패했습니다. 잠시 후 다시 시도하세요.'
      rows.value = []
    } else {
      rows.value = loader()
    }
    loading.value = false
  }

  return { rows, loading, error, reload }
}
