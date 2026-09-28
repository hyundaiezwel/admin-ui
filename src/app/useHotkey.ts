import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'

/**
 * 화면 단축키 — 원본 버튼 라벨의 `조회(F2)` · `저장(F2)`.
 *
 * 화면이 KeepAlive에 들어 있어서 **보이는 화면에서만** 받아야 한다. 안 그러면 탭 여덟 개가
 * 전부 F2를 받아 여덟 번 조회한다. 그래서 activated/deactivated에 붙였다 뗀다.
 * 입력 중(IME 조합 중)에는 받지 않는다 — 한글 조합이 끊긴다.
 */
export function useHotkey(key: string, fn: () => void) {
  const h = (e: KeyboardEvent) => {
    if (e.key !== key || e.isComposing) return
    e.preventDefault()
    fn()
  }
  const on = () => window.addEventListener('keydown', h)
  const off = () => window.removeEventListener('keydown', h)
  onMounted(on)
  onActivated(on)
  onDeactivated(off)
  onUnmounted(off)
}
