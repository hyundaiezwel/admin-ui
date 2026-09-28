import { reactive } from 'vue'

/** 세션 목업 — 30분, 2분 전에 알림. 실제로는 서버가 준 만료 시각이다 */
const LEN = 30 * 60_000
export const session = reactive({ expiresAt: Date.now() + LEN, warnSec: 120 })
export const extend = () => { session.expiresAt = Date.now() + LEN }
/** 미리보기 — 알림을 바로 보게 남은 시간을 당긴다 */
export const previewExpiry = () => { session.expiresAt = Date.now() + 70_000 }
