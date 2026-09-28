import { reactive } from 'vue'

/**
 * 가벼운 알림 — "저장했습니다" 같은 **확인이 필요 없는** 결과.
 *
 * 확인이 필요한 것(삭제 확인·오류로 진행 불가)은 이걸 쓰지 않고 `WsDialog`를 연다.
 * 원본의 `com.alert`가 전부 모달이라 저장할 때마다 확인 버튼을 눌러야 했다 — 그건
 * 작업 흐름을 끊는다. 결과 통지는 흘려보내고, 판단이 필요한 것만 멈춰 세운다.
 */
export type Tone = 'info' | 'success' | 'danger'
export const toasts = reactive<{ id: number; text: string; tone: Tone }[]>([])
let seq = 0

export function notify(text: string, tone: Tone = 'info', ms = 3200) {
  const id = ++seq
  toasts.push({ id, text, tone })
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id)
    if (i >= 0) toasts.splice(i, 1)
  }, ms)
}
