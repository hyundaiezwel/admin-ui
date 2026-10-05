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
  img: ['src', 'alt', 'style'],
  table: ['style'],
  colgroup: [],
  col: ['style'],
  thead: [],
  tbody: [],
  tr: [],
  th: ['colspan', 'rowspan', 'style'],
  td: ['colspan', 'rowspan', 'style'],
}

/** style 안에서 허용하는 속성 — 요소마다 다르다. 폭은 퍼센트(1~100%)만 */
export const ELEMENT_STYLES: Record<string, readonly string[]> = {
  p: ['text-align'], h2: ['text-align'], h3: ['text-align'], h4: ['text-align'], th: ['text-align'], td: ['text-align'],
  span: ['color'],
  img: ['width'],
  table: ['width'],
  col: ['width'],
}
/** 어느 요소에든 나올 수 있는 style 속성 전체 */
export const ALLOWED_STYLES = ['color', 'text-align', 'width'] as const

/** 이미지 폭 버튼 · 끌기 한계 — 퍼센트로 저장한다(대외 화면 폭이 달라도 비율이 유지된다) */
export const IMAGE_WIDTHS = [25, 50, 75, 100] as const
export const IMAGE_MIN_PCT = 10

/** 폭 값(`40%` · `40`)을 1~100 정수 퍼센트로. 퍼센트가 아니면(px 등) null */
export function parsePct(v: string | null | undefined): number | null {
  if (!v) return null
  const m = String(v).trim().match(/^(\d+(?:\.\d+)?)\s*%$/)
  if (!m) return null
  const n = Math.round(Number(m[1]))
  return n <= 0 ? null : Math.min(100, n)
}

/** 이미지 끌기 — 시작 폭(%) · 끈 거리(px) · 본문 폭(px) → 새 폭(%). 10~100 정수 */
export function dragPct(startPct: number, dx: number, containerPx: number, minPct: number = IMAGE_MIN_PCT): number {
  if (containerPx <= 0) return startPct
  const next = startPct + (dx / containerPx) * 100
  return Math.max(minPct, Math.min(100, Math.round(next)))
}
/** 표 모서리 끌기 하한 — 더 좁으면 칸 안 글자가 한 자씩 쌓인다 */
export const TABLE_MIN_PCT = 30

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

/**
 * 이미지 주소 — 업로드가 돌려준 주소만 받는다.
 * - data:(base64) · file:(Word 임시 파일) · http:(혼합 콘텐츠)는 받지 않는다. blob:은 목업 업로드용
 * - `hosts`를 주면 그 호스트의 https 주소만 — 붙여넣은 외부 이미지(추적 픽셀 · 남의 서버 핫링크)를 막는다.
 *   상대 주소(`/files/…`)는 같은 서버라 받는다
 */
export function isSafeImageSrc(raw: string, hosts?: readonly string[]): boolean {
  const src = raw.trim()
  if (!src) return false
  let u: URL
  try { u = new URL(src, 'https://same-origin.invalid/') } catch { return false }
  if (u.protocol === 'blob:') return true
  if (u.protocol !== 'https:') return false
  if (u.hostname === 'same-origin.invalid') return true
  return !hosts || hosts.includes(u.hostname)
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

/**
 * 붙여넣은 글자색을 팔레트로 맞춘다 — Word · 웹 문서의 임의 색(`rgb(255,0,0)` · 이름 색)이 그대로 저장되면
 * 서버 허용 목록과 어긋나고 화면마다 색이 늘어난다. 가장 가까운 팔레트 색으로 바꾸고,
 * 검정에 가장 가까우면 '기본색'(null)으로 둔다. 값을 못 읽으면 null.
 */
export function nearestTextColor(css: string | null | undefined): string | null {
  if (!css) return null
  const rgb = parseColor(css)
  if (!rgb) return null
  const cands: [string | null, number[]][] = [[null, [34, 34, 34]], ...TEXT_COLORS.map((c) => [c.value, hexRgb(c.value)] as [string, number[]])]
  let best: string | null = null
  let d = Infinity
  for (const [v, c] of cands) {
    // 사람 눈 가중치(빨강 · 초록 · 파랑 2:4:3) — 단순 RGB 거리보다 "비슷해 보이는" 색을 고른다
    const dist = 2 * (rgb[0] - c[0]) ** 2 + 4 * (rgb[1] - c[1]) ** 2 + 3 * (rgb[2] - c[2]) ** 2
    if (dist < d) { d = dist; best = v }
  }
  return best
}
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
function parseColor(css: string): number[] | null {
  const s = css.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(s)) return hexRgb(s)
  if (/^#[0-9a-f]{3}$/.test(s)) return hexRgb('#' + [...s.slice(1)].map((c) => c + c).join(''))
  const m = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/)
  if (m) return m.slice(1, 4).map(Number)
  // 이름 색(red · navy …)은 브라우저에게 맡긴다
  if (typeof document === 'undefined') return null
  const el = document.createElement('span')
  el.style.color = s
  if (!el.style.color) return null
  document.body.appendChild(el)
  const c = getComputedStyle(el).color
  el.remove()
  const n = c.match(/(\d+)[\s,]+(\d+)[\s,]+(\d+)/)
  return n ? n.slice(1, 4).map(Number) : null
}
