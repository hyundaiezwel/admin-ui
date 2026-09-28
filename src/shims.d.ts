declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const c: DefineComponent<object, object, any>
  export default c
}

/** PrimeVue가 타입을 안 내보내는 내부 버스. notify()가 컴포넌트 밖에서 토스트를 띄우는 데 쓴다 */
declare module 'primevue/toasteventbus' {
  const bus: { emit(event: 'add', message: Record<string, unknown>): void }
  export default bus
}
