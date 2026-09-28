import { reactive, readonly } from 'vue'
import type { Router } from 'vue-router'
import { titleOf } from './menu'

/**
 * 멀티 탭 상태.
 *
 * Pinia를 안 쓴다 — 상태가 배열 하나와 현재 경로뿐이라 스토어가 얹을 구조가 없다.
 *
 * 탭은 **경로 단위**다. 같은 화면을 두 번 열면 새 탭이 아니라 기존 탭으로 이동한다 —
 * 업무 시스템에서 같은 목록이 두 탭에 떠 있으면 어느 쪽이 최신인지 알 수 없다.
 */
export interface Tab {
  path: string
  title: string
  /** 대시보드는 항상 열려 있고 닫히지 않는다 */
  fixed?: boolean
}

const state = reactive<{ items: Tab[]; active: string }>({
  items: [{ path: '/', title: '대시보드', fixed: true }],
  active: '/',
})

export const tabs = readonly(state)

export function open(path: string) {
  if (!state.items.some((t) => t.path === path)) {
    state.items.push({ path, title: titleOf(path) })
  }
  state.active = path
}

export function close(path: string, router: Router) {
  const i = state.items.findIndex((t) => t.path === path)
  if (i < 0 || state.items[i].fixed) return
  state.items.splice(i, 1)
  // 닫은 탭이 현재 탭이면 **왼쪽 탭**으로 간다. 오른쪽으로 보내면 방금 연 탭으로 튀어
  // 사용자가 어디로 갔는지 놓친다
  if (state.active === path) {
    const next = state.items[Math.max(0, i - 1)]
    router.push(next.path)
  }
}

export function closeOthers(path: string, router: Router) {
  state.items = state.items.filter((t) => t.fixed || t.path === path)
  if (state.active !== path) router.push(path)
}
