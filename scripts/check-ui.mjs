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
console.log(out.length ? out.join('\n') : 'UI 규약 위반 0')
process.exit(out.length ? 1 : 0)
