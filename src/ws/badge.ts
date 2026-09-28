/**
 * 상태 → 뱃지 클래스. 픽스처가 쓰는 톤 이름(neutral·info·warning·brand·success·danger)을
 * 그대로 받는다. 그리드 포매터는 HTML 문자열을 내야 해서 컴포넌트가 아니라 함수다.
 */
export const badgeClass = (tone?: string) => (!tone || tone === 'neutral' ? 'ws-badge' : `ws-badge ws-badge--${tone}`)
export const badgeHtml = (text: string, tone?: string) => `<span class="${badgeClass(tone)}">${text ?? ''}</span>`
