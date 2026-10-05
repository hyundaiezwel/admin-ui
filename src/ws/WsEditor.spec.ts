import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import WsEditor from './WsEditor.vue'
import { ALLOWED_ELEMENTS, ALLOWED_STYLES } from './editor-schema'

// jsdom에는 matchMedia가 없다 — PrimeVue Select가 마운트 때 부른다
window.matchMedia ??= ((q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia

type Exposed = {
  /** defineExpose는 ref를 벗겨 넘긴다 */
  editor: import('@tiptap/vue-3').Editor
  insertFiles: (files: File[], at?: number) => Promise<void>
  setLink: (url: string) => boolean
}

function setup(props: Record<string, unknown> = {}) {
  const w = mount(WsEditor, {
    props: { modelValue: '', uploadImage: vi.fn(async () => ({ url: 'https://cdn.example.com/a.png' })), ...props },
    global: { plugins: [PrimeVue], directives: { tooltip: Tooltip } },
    attachTo: document.body,
  })
  const vm = w.vm as unknown as Exposed
  return { w, vm, ed: () => vm.editor }
}

/** 출력 HTML이 허용 목록 안인지 — 요소 · 속성 · style 속성 */
function assertAllowed(html: string) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  for (const el of doc.body.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase()
    expect(Object.keys(ALLOWED_ELEMENTS), `요소 ${tag}`).toContain(tag)
    for (const a of el.getAttributeNames()) {
      expect(ALLOWED_ELEMENTS[tag], `${tag}[${a}]`).toContain(a)
      if (a === 'style') {
        for (const decl of el.getAttribute('style')!.split(';').map((d) => d.split(':')[0].trim()).filter(Boolean)) {
          expect(ALLOWED_STYLES as readonly string[], `style ${decl}`).toContain(decl)
        }
      }
    }
  }
}

const png = (name = 'a.png', size = 10) => new File([new Uint8Array(size)], name, { type: 'image/png' })

describe('WsEditor', () => {
  it('v-model — 바깥 값을 그리고, 고치면 HTML을 내보낸다. 빈 본문은 빈 문자열', async () => {
    const { w, ed } = setup({ modelValue: '<p>안녕하세요</p>' })
    expect(ed().getHTML()).toBe('<p>안녕하세요</p>')
    ed().commands.insertContent(' 공지')
    const out = w.emitted('update:modelValue')!.at(-1)![0] as string
    expect(out).toContain('공지')
    await w.setProps({ modelValue: '<p>바뀐 값</p>' })
    expect(ed().getHTML()).toBe('<p>바뀐 값</p>')
    ed().commands.clearContent(true)
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toBe('')
    w.unmount()
  })

  it('base64 이미지는 들어가지 않는다', () => {
    const { ed, w } = setup()
    ed().commands.setContent('<p>a</p><img src="data:image/png;base64,iVBORw0KGgo=" alt="x"><p>b</p>')
    expect(ed().getHTML()).not.toContain('<img')
    expect(ed().getHTML()).not.toContain('base64')
    w.unmount()
  })

  it('업로드가 성공하면 돌려받은 주소로 넣는다', async () => {
    const upload = vi.fn(async () => ({ url: 'https://cdn.example.com/notice/1.png', alt: '안내 이미지' }))
    const { vm, ed, w } = setup({ uploadImage: upload })
    await vm.insertFiles([png()])
    await flushPromises()
    expect(upload).toHaveBeenCalledOnce()
    expect(ed().getHTML()).toContain('src="https://cdn.example.com/notice/1.png"')
    expect(ed().getHTML()).toContain('alt="안내 이미지"')
    w.unmount()
  })

  it('이미지를 넣은 뒤 표를 넣어도 이미지가 남는다 — 넣은 이미지가 선택된 채로 남아 덮어쓰이지 않게', async () => {
    const { vm, ed, w } = setup()
    await vm.insertFiles([png()])
    await flushPromises()
    ed().chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()
    expect(ed().getHTML()).toContain('<img')
    expect(ed().getHTML()).toContain('<table>')
    w.unmount()
  })

  it('업로드가 실패하면 넣지 않고 invalid를 알린다', async () => {
    const { vm, ed, w } = setup({ uploadImage: vi.fn(async () => { throw new Error('500') }) })
    await vm.insertFiles([png()])
    await flushPromises()
    expect(ed().getHTML()).not.toContain('<img')
    expect(String(w.emitted('invalid')!.at(-1)![0])).toContain('올리지 못했습니다')
    w.unmount()
  })

  it('형식 · 용량이 맞지 않는 파일은 업로드하지 않는다', async () => {
    const upload = vi.fn(async () => ({ url: 'https://cdn.example.com/x.png' }))
    const { vm, w } = setup({ uploadImage: upload, maxImageMB: 1 })
    await vm.insertFiles([new File(['x'], 'a.svg', { type: 'image/svg+xml' })])
    await vm.insertFiles([png('big.png', 2 * 1024 * 1024)])
    expect(upload).not.toHaveBeenCalled()
    expect(w.emitted('invalid')!.map((e) => String(e[0]))).toEqual([expect.stringContaining('이미지만'), expect.stringContaining('1MB')])
    w.unmount()
  })

  it('javascript: 링크는 거부한다 — 툴바로도, 붙여넣기로도', () => {
    const { vm, ed, w } = setup({ modelValue: '<p>여기</p>' })
    ed().commands.selectAll()
    expect(vm.setLink('javascript:alert(1)')).toBe(false)
    expect(vm.setLink('java\tscript:alert(1)')).toBe(false)
    expect(ed().getHTML()).not.toContain('href')
    expect(String(w.emitted('invalid')!.at(-1)![0])).toContain('http')
    expect(vm.setLink('https://example.com/notice')).toBe(true)
    expect(ed().getHTML()).toContain('href="https://example.com/notice"')
    expect(ed().getHTML()).toContain('rel="noopener noreferrer nofollow"')
    ed().commands.setContent('<p><a href="javascript:alert(1)">나쁜 링크</a></p>')
    expect(ed().getHTML()).not.toContain('javascript')
    w.unmount()
  })

  it('글자 수 상한을 넘으면 invalid를 알린다', () => {
    const { ed, w } = setup({ maxLength: 5 })
    ed().commands.insertContent('가나다라마바사')
    expect(String(w.emitted('invalid')!.at(-1)![0])).toContain('5자')
    w.unmount()
  })

  it('허용 목록 밖 요소 · 속성은 붙여넣어도 남지 않는다', () => {
    const { ed, w } = setup()
    const dirty = `
      <h1 class="x" onclick="alert(1)">제목</h1>
      <script>alert(1)</script><style>p{color:red}</style>
      <iframe src="https://evil.example"></iframe>
      <p style="color: #c62828; font-size: 40px; background: url(x)" data-x="1">본문 <span style="color:#1565c0;font-weight:700">파랑</span>
        <strong>굵게</strong> <code>코드</code> <a href="https://example.com" onmouseover="x()" class="y">링크</a></p>
      <blockquote>인용</blockquote><pre>코드블록</pre><hr>
      <table style="width:500px" class="t"><colgroup><col style="width:100px"></colgroup>
        <tr><th>머리</th><td onclick="x()">칸</td></tr></table>
      <img src="https://cdn.example.com/a.png" width="999" onerror="x()" alt="그림">`
    const view = ed().view as unknown as { pasteHTML?: (h: string) => boolean }
    // 브라우저에서는 붙여넣기 경로(pasteHTML). jsdom에는 ClipboardEvent가 없어 같은 스키마 파싱인 setContent로 대신한다
    try { if (!view.pasteHTML?.(dirty)) ed().commands.setContent(dirty) } catch { ed().commands.setContent(dirty) }
    const html = ed().getHTML()
    assertAllowed(html)
    expect(html).not.toMatch(/script|iframe|onclick|onerror|onmouseover|class=|font-size|background|<code|<pre|<hr|<blockquote|<h1|colgroup|width/)
    expect(html).toContain('제목')
    expect(html).toContain('파랑')
    expect(html).toContain('<table>')
    w.unmount()
  })

  it('읽기 전용이면 툴바를 숨기고 편집할 수 없다', () => {
    const { w, ed } = setup({ modelValue: '<p>미리보기</p>', editable: false })
    expect(w.find('[role="toolbar"]').exists()).toBe(false)
    expect(ed().isEditable).toBe(false)
    w.unmount()
  })
  it('붙여넣은 이미지는 허용 호스트의 https만 남고, 버린 개수를 알린다', () => {
    const { ed, w } = setup({ imageHosts: ['files.example.com'] })
    const html = '<p>a</p><img src="https://files.example.com/ok.png"><img src="https://tracker.example.net/p.gif"><img src="http://files.example.com/x.png"><img src="file:///C:/Temp/clip_image002.png"><img src="/files/rel.png">'
    // 붙여넣기 경로의 HTML 변환(알림) — jsdom에는 ClipboardEvent가 없어 훅을 직접 부른다
    ed().view.someProp('transformPastedHTML', (f) => f(html, ed().view))
    ed().commands.setContent(html)
    const out = ed().getHTML()
    expect(out).toContain('https://files.example.com/ok.png')
    expect(out).toContain('/files/rel.png')
    expect(out).not.toMatch(/tracker|http:\/\/|file:/)
    expect(String(w.emitted('invalid')!.at(-1)![0])).toContain('3개')
    w.unmount()
  })

  it('붙여넣은 글자색은 가장 가까운 팔레트 색으로, 검정 계열은 기본색으로', () => {
    const { ed, w } = setup()
    ed().commands.setContent('<p><span style="color: rgb(255, 0, 0)">빨강</span> <span style="color:#0000ff">파랑</span> <span style="color: navy">남색</span> <span style="color:#111">검정</span></p>')
    ed().commands.insertContent(' ')
    const out = w.emitted('update:modelValue')!.at(-1)![0] as string
    expect(out).toContain('color: #c62828')
    expect(out).toContain('color: #1565c0')
    expect(out).not.toMatch(/rgb\(|#0000ff|navy|#111/)
    expect(out).toContain('검정')
    expect(out.match(/color:/g)?.length).toBe(3)
    w.unmount()
  })

  it('앞뒤 빈 문단은 내보내지 않는다', async () => {
    const { vm, w } = setup()
    await vm.insertFiles([png()])
    await flushPromises()
    const out = w.emitted('update:modelValue')!.at(-1)![0] as string
    expect(out.startsWith('<img')).toBe(true)
    expect(out.endsWith('<p></p>')).toBe(false)
    w.unmount()
  })
})

describe('탭 닫기 확인(leaveGuards)', () => {
  it('화면이 거절하면 탭을 닫지 않는다', async () => {
    const { open, close, tabs, leaveGuards } = await import('../app/tabs')
    const router = { push: vi.fn() } as unknown as import('vue-router').Router
    open('/sp/notice/new')
    leaveGuards.set('/sp/notice/new', () => false)
    close('/sp/notice/new', router)
    expect(tabs.items.some((t) => t.path === '/sp/notice/new')).toBe(true)
    leaveGuards.set('/sp/notice/new', () => true)
    close('/sp/notice/new', router)
    expect(tabs.items.some((t) => t.path === '/sp/notice/new')).toBe(false)
  })
})
