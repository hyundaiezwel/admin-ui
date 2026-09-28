import { reactive, watch } from 'vue'

/**
 * 표시 설정 — 지금은 테마 하나(D4). 고대비·글자 확대는 다음 단계다.
 *
 * 토큰은 `html[data-theme="dark"]`에서만 바뀐다. 그래서 "시스템"도 여기서 풀어서
 * 속성으로 박는다 — CSS에 prefers-color-scheme을 따로 두면 다크 값이 두 곳에 생긴다.
 * 선택은 이 브라우저에만 남긴다(개인 편의 설정이라 서버에 둘 이유가 없다).
 */
export type Theme = 'light' | 'dark' | 'system'
const KEY = 'ds3-theme'
const read = (): Theme => { try { return (localStorage.getItem(KEY) as Theme) || 'system' } catch { return 'system' } }

export const prefs = reactive<{ theme: Theme; resolved: 'light' | 'dark' }>({ theme: read(), resolved: 'light' })

const mq = window.matchMedia('(prefers-color-scheme: dark)')
function apply() {
  prefs.resolved = prefs.theme === 'system' ? (mq.matches ? 'dark' : 'light') : prefs.theme
  document.documentElement.dataset.theme = prefs.resolved
}
mq.addEventListener('change', () => prefs.theme === 'system' && apply())
watch(() => prefs.theme, (t) => { try { localStorage.setItem(KEY, t) } catch { /* 저장 못 해도 이번 방문엔 적용된다 */ } apply() })
apply()
