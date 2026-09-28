import ToastEventBus from 'primevue/toasteventbus'

/**
 * 가벼운 알림 — "저장했습니다" 같은 **확인이 필요 없는** 결과.
 *
 * 확인이 필요한 것(삭제 확인·오류로 진행 불가)은 이걸 쓰지 않고 Dialog를 연다.
 * 원본 `com.alert`가 전부 모달이라 저장할 때마다 확인을 눌러야 했다 — 결과 통지는
 * 흘려보내고, 판단이 필요한 것만 멈춰 세운다.
 *
 * 컴포넌트 밖(검증 함수 등)에서도 부르므로 useToast() 대신 이벤트 버스로 보낸다.
 */
export type Tone = 'info' | 'success' | 'warning' | 'danger'
export function notify(text: string, tone: Tone = 'info', ms = 3200) {
  ToastEventBus.emit('add', { severity: tone === 'danger' ? 'error' : tone === 'warning' ? 'warn' : tone, summary: text, life: ms })
}
