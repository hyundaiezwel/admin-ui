// UI 규약 정적 검사 — src/pages 아래 .vue 화면이 docs/ui-conventions.md 의 규칙을 지키는지 본다. 서버 없이 돈다.
//   npm run check:ui   (어기면 exit 1)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.vue') ? [p] : [] })
const out = []
for (const f of walk('src/pages')) {
  const src = readFileSync(f, 'utf8')
  const hit = (id, msg) => out.push(`${f}  ${id} ${msg}`)
  const style = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
  const flexCls = new Set([...style.matchAll(/\.([\w-]+)\s*\{[^}]*display:\s*flex/g)].map((m) => m[1]))
  if (/class="cond"/.test(src) || /<h2[^>]*>조회 조건<\/h2>/.test(src)) hit('UI-01', '조회 영역은 WsSearch')
  if (/const\s+(year|biz)\s*=\s*ref\(ctx\.(year|biz)\)/.test(src)) hit('UI-03', '참여년도·사업은 상단 전역 조건(화면에 복사 금지)')
  if (/(l|label):\s*'전체',\s*(v|value):\s*''/.test(src)) hit('UI-04', "'전체' 선택지 값은 'ALL'")
  if (/<input[^>]*type="file"/.test(src)) hit('UI-17', '파일은 WsUpload')
  const sh = src.match(/<WsSearch[\s\S]*?<\/WsSearch>/)?.[0] ?? ''
  if (/style="[^"]*width/.test(sh)) hit('UI-02', '조회 영역 인라인 폭 금지(cols · .ws-kw 로)')
  if ([...src.matchAll(/<t[dh]\b[^>]*class="([^"]+)"/g)].some((m) => m[1].split(/\s+/).some((c) => flexCls.has(c))) || /\bt[dh]\b[^{,]*\{[^}]*display:\s*flex/.test(style)) hit('UI-07', '표 칸(td·th)에 flex 금지 — 안쪽 div 에')
}

// UI-30 예약 클래스 — DS1 어드민 목업에서 `.ez-grid`(Tabulator 래퍼)를 디자인 시스템이 `display:grid` 프리미티브로
// 선언하자 표 본문 높이가 0이 됐다. 콘솔 오류도 타입 오류도 없었다. 그래서 src/ws/*.css 가 정의한 `ws-` 이름을
// 화면·셸 쪽(src/ws 밖의 .vue·.css)이 줄머리에서 그 클래스 자체를 다시 정의하면 막는다(`.ws-gtb td`처럼 안쪽을
// 다듬는 하위 선택자는 허용 — 이름의 뜻을 바꾸지 않는다). 예약어는 하드코딩하지 않고 CSS에서 읽는다.
const wsDir = 'src/ws'
const reserved = new Set(readdirSync(wsDir).filter((n) => n.endsWith('.css'))
  .flatMap((n) => [...readFileSync(join(wsDir, n), 'utf8').matchAll(/^\.(ws-[\w-]+)\s*\{/gm)].map((m) => m[1])))
const walkAll = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (p === wsDir ? [] : walkAll(p)) : /\.(vue|css)$/.test(p) ? [p] : [] })
for (const f of walkAll('src')) {
  for (const m of readFileSync(f, 'utf8').matchAll(/^\s*\.(ws-[\w-]+)(?=\s*[,{]|:)/gm)) {
    if (reserved.has(m[1])) out.push(`${f}  UI-30 .${m[1]} 은 src/ws 예약 클래스 — 다시 정의하지 말고 이름을 한정한다`)
  }
}

console.log(out.length ? out.join('\n') : `UI 규약 위반 0 (예약 클래스 ${reserved.size}개 대조)`)
process.exit(out.length ? 1 : 0)
