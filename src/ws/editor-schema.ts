/**
 * 에디터 출력 허용 목록 — **정본은 이 파일 하나다.**
 *
 * `WsEditor`가 내보내는 HTML은 여기 적힌 요소 · 속성 · 스타일만 담는다. 서버 쪽 sanitizer
 * (OWASP Java HTML Sanitizer)의 정책을 만들 때 이 목록을 그대로 옮긴다 — 둘이 어긋나면
 * 저장 뒤 다시 열었을 때 서식이 조용히 사라진다. 바꾸면 `docs/decisions/editor-selection.md` §4도 고친다.
 *
 * 브라우저 쪽에서 실제로 걸러 내는 일은 ProseMirror 스키마가 한다. 스키마에 없는 요소 · 속성은
 * 붙여넣기 · setContent 어느 길로 들어와도 문서에 남지 않는다. 이 파일은 그 스키마가 무엇을
 * 허용하는지 **사람과 서버가 읽을 수 있게** 적어 둔 것이고, 시험(`WsEditor.spec.ts`)이 출력과 대조한다.
 */

/** 요소 → 허용 속성. `style`은 아래 `ALLOWED_STYLES`의 속성만 */
export const ALLOWED_ELEMENTS: Record<string, readonly string[]> = {
  p: ['style'],
  h2: ['style'],
  h3: ['style'],
  h4: ['style'],
  strong: [],
  em: [],
  u: [],
  s: [],
  a: ['href', 'target', 'rel'],
  br: [],
  span: ['style'],
  ul: [],
  ol: ['start', 'type'],
  li: [],
  img: ['src', 'alt'],
  table: [],
  thead: [],
  tbody: [],
  tr: [],
  th: ['colspan', 'rowspan', 'style'],
  td: ['colspan', 'rowspan', 'style'],
}

/** style 안에서 허용하는 속성 — 글자색(span)과 정렬(p · h · th · td)뿐 */
export const ALLOWED_STYLES = ['color', 'text-align'] as const

/** 링크 주소 스킴 — 이 밖은 링크로 만들지 않는다(javascript: · data: · vbscript: …) */
export const LINK_PROTOCOLS = ['http:', 'https:', 'mailto:'] as const

/** 링크에 늘 붙는 속성 — 새 창으로 열고, 열린 쪽이 이 창을 건드리지 못하게 한다 */
export const LINK_ATTRS = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const

/** 이미지 형식 — 확장자가 아니라 MIME으로 본다 */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
export const IMAGE_LABEL = 'jpg · png · gif · webp'

/** 주소가 허용된 스킴인가. 상대 주소 · 스킴 없는 주소는 받지 않는다(어디로 갈지 저장 시점에 정해지지 않는다) */
export function isSafeUrl(raw: string): boolean {
  const url = raw.trim()
  if (!url) return false
  // 제어 문자 · 공백을 끼워 스킴 검사를 피하는 수법(java\tscript:)을 먼저 막는다
  if (/[\u0000-\u001f\u007f\s]/.test(url)) return false
  try {
    return (LINK_PROTOCOLS as readonly string[]).includes(new URL(url).protocol)
  } catch {
    return false
  }
}

/** 이미지 주소 — 업로드가 돌려준 주소만. data: (base64)는 받지 않는다. blob:은 목업 업로드용 */
export function isSafeImageSrc(raw: string): boolean {
  const src = raw.trim()
  if (!src || /^data:/i.test(src)) return false
  try {
    return ['http:', 'https:', 'blob:'].includes(new URL(src, 'https://x.invalid/').protocol)
  } catch {
    return false
  }
}

/** 글자색 팔레트 — 흰 바탕 4.5:1 이상. 값은 hex로 저장된다(var()는 서버 sanitizer · 대외 화면이 모른다) */
export const TEXT_COLORS = [
  { label: '빨강', value: '#c62828' },
  { label: '주황', value: '#b45309' },
  { label: '초록', value: '#2e7d32' },
  { label: '파랑', value: '#1565c0' },
  { label: '보라', value: '#6a1b9a' },
  { label: '회색', value: '#5f6368' },
] as const
