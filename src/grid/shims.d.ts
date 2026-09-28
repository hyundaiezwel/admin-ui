/**
 * PoC에서 가져온 두 조각은 JS다(검증된 코드라 포팅하지 않았다).
 * 타입만 여기서 좁혀 준다 — 소비 쪽에서 `any`가 번지지 않게 하는 최소한이다.
 */
declare module 'tabulator-tables' {
  export const TabulatorFull: any
  export const Tabulator: any
}
