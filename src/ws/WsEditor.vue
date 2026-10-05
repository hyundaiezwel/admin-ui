<script setup lang="ts">
/**
 * 리치 텍스트 에디터 — Tiptap 3(ProseMirror). 공지사항 본문처럼 서식 있는 글을 쓰는 칸.
 *
 * - **업로드는 밖에서 주입한다**(`uploadImage`). 이 컴포넌트는 서버를 모르고 목업도 두지 않는다.
 * - **base64 이미지를 넣지 않는다.** 붙여넣기 · 끌어 놓기 · 파일 선택 모두 `uploadImage`를 거쳐 받은 주소만 넣는다.
 * - **출력은 허용 목록 안이다**(`editor-schema.ts`). 스키마 밖 요소 · 속성은 어느 길로 들어와도 남지 않는다.
 * - 읽기 전용(`editable=false`)은 같은 스키마로 그린다 — 미리보기에 v-html을 쓰지 않기 위해서다.
 *
 * 툴바는 PrimeVue Button · Select와 `AppIcon`으로 만든다(Tiptap 공식 UI는 React 전용).
 * 키보드: Tab으로 툴바에 들어와 ←→로 버튼 사이를 옮기고, Esc로 본문에 돌아간다(로빙 tabindex).
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { EditorContent, Extension, useEditor, type Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import Image from '@tiptap/extension-image'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import FileHandler from '@tiptap/extension-file-handler'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { NodeSelection } from '@tiptap/pm/state'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Menu from 'primevue/menu'
import InputText from 'primevue/inputtext'
import AppIcon from '../app/AppIcon.vue'
import { IMAGE_LABEL, IMAGE_TYPES, LINK_ATTRS, TEXT_COLORS, isSafeImageSrc, isSafeUrl } from './editor-schema'

const props = withDefaults(defineProps<{
  modelValue: string
  uploadImage: (file: File) => Promise<{ url: string; alt?: string }>
  placeholder?: string
  /** 글자 수(공백 포함) 상한. 넘어도 막지 않고 알린다 — 붙여넣은 글을 잘라 버리면 무엇이 잘렸는지 모른다 */
  maxLength?: number
  maxImageMB?: number
  editable?: boolean
  invalid?: boolean
  ariaLabel?: string
  /** 접근성 id 접두어 — 한 화면에 에디터가 둘이면 넘긴다 */
  id?: string
}>(), { placeholder: '', maxImageMB: 10, editable: true, invalid: false, ariaLabel: '본문', id: 'ws-editor' })

const emit = defineEmits<{ 'update:modelValue': [html: string]; invalid: [message: string | null] }>()

const error = ref<string | null>(null)
function fail(msg: string | null) { error.value = msg; emit('invalid', msg) }

/* ---------- 업로드 자리표시자 — 문서 밖 장식이라 출력에 섞이지 않는다 ---------- */
const uploadKey = new PluginKey<DecorationSet>('ws-upload')
const UploadPlaceholder = new Plugin<DecorationSet>({
  key: uploadKey,
  state: {
    init: () => DecorationSet.empty,
    apply(tr, set) {
      set = set.map(tr.mapping, tr.doc)
      const m = tr.getMeta(uploadKey) as { add?: { id: string; pos: number }; remove?: string } | undefined
      if (m?.add) {
        const el = document.createElement('span')
        el.className = 'wse__uploading'
        el.setAttribute('role', 'status')
        el.textContent = '이미지 올리는 중…'
        set = set.add(tr.doc, [Decoration.widget(m.add.pos, el, { id: m.add.id })])
      }
      if (m?.remove) set = set.remove(set.find(undefined, undefined, (s) => s.id === m.remove))
      return set
    },
  },
  props: { decorations(state) { return uploadKey.getState(state) } },
})
/** 확장으로 정식 등록한다 — 만든 뒤 registerPlugin으로 붙이면 상태를 다시 짜며 자리표시자를 놓쳤다 */
const UploadExt = Extension.create({ name: 'wsUploadPlaceholder', addProseMirrorPlugins: () => [UploadPlaceholder] })
const placeholderPos = (ed: Editor, id: string) => uploadKey.getState(ed.state)?.find(undefined, undefined, (s) => s.id === id)[0]?.from

/** 파일 검사 → 자리표시자 → 업로드 → 주소로 바꿔 넣기. 실패하면 자리표시자를 지우고 알린다 */
async function insertFiles(files: File[], at?: number) {
  const ed = editor.value
  if (!ed) return
  for (const file of files) {
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) { fail(`${IMAGE_LABEL} 이미지만 넣을 수 있습니다. (${file.name})`); continue }
    if (file.size > props.maxImageMB * 1024 * 1024) { fail(`이미지는 ${props.maxImageMB}MB까지 넣을 수 있습니다. (지금 ${(file.size / 1024 / 1024).toFixed(1)}MB)`); continue }
    const id = Math.random().toString(36).slice(2)
    const pos = at ?? ed.state.selection.from
    ed.view.dispatch(ed.state.tr.setMeta(uploadKey, { add: { id, pos } }))
    try {
      const res = await props.uploadImage(file)
      const where = placeholderPos(ed, id)
      ed.view.dispatch(ed.state.tr.setMeta(uploadKey, { remove: id }))
      if (where == null) continue // 올리는 사이 자리가 지워졌다
      if (!isSafeImageSrc(res.url)) { fail('업로드가 돌려준 이미지 주소를 쓸 수 없습니다.'); continue }
      // 이미지 뒤에 빈 문단을 같이 넣어 커서를 그쪽으로 보낸다 — 이미지가 선택된 채로 남으면 다음 입력(표 넣기 등)이 이미지를 덮어쓴다
      ed.chain().focus().insertContentAt(where, [{ type: 'image', attrs: { src: res.url, alt: res.alt ?? file.name.replace(/\.[^.]+$/, '') } }, { type: 'paragraph' }]).run()
      fail(null)
    } catch {
      ed.view.dispatch(ed.state.tr.setMeta(uploadKey, { remove: id }))
      fail(`이미지를 올리지 못했습니다. 다시 시도해 주세요. (${file.name})`)
    }
  }
}

/* ---------- 확장 구성 ---------- */
/** 표 — Tiptap 기본 출력의 colgroup · 너비 style을 빼 허용 목록 안에 둔다(크기 조절은 쓰지 않는다) */
/** 링크 — 기본 확장은 붙여넣은 <a class>를 살린다. class를 속성에서 빼 허용 목록(href · target · rel) 안에 둔다 */
const SafeLink = Link.extend({
  addAttributes() {
    const { class: _drop, ...rest } = (this.parent?.() ?? {}) as Record<string, unknown>
    return rest as ReturnType<NonNullable<typeof this.parent>>
  },
})
/** 이미지 — 기본 확장은 width · height · title도 살린다. 허용 목록(src · alt)만 남긴다 */
const SafeImage = Image.extend({
  addAttributes() {
    const { src, alt } = (this.parent?.() ?? {}) as Record<string, unknown>
    return { src, alt } as ReturnType<NonNullable<typeof this.parent>>
  },
})
const PlainTable = Table.extend({ renderHTML({ HTMLAttributes }) { return ['table', HTMLAttributes, ['tbody', 0]] } })

const editor = useEditor({
  content: props.modelValue,
  editable: props.editable,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      code: false, codeBlock: false, blockquote: false, horizontalRule: false,
      link: false,
    }),
    SafeLink.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      HTMLAttributes: { ...LINK_ATTRS },
      isAllowedUri: (url) => isSafeUrl(url),
    }),
    TextStyle,
    Color,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    SafeImage.configure({ allowBase64: false, inline: false }),
    PlainTable.configure({ resizable: false }),
    TableRow, TableHeader, TableCell,
    FileHandler.configure({
      allowedMimeTypes: [...IMAGE_TYPES],
      onDrop: (_ed, files, pos) => { void insertFiles(files, pos) },
      onPaste: (_ed, files) => { void insertFiles(files) },
    }),
    Placeholder.configure({ placeholder: () => props.placeholder }),
    CharacterCount,
    UploadExt,
  ],
  editorProps: {
    attributes: {
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': props.ariaLabel,
      'aria-describedby': `${props.id}-count ${props.id}-err`,
      class: 'wse__doc',
    },
    // 형식 검사에 걸린 파일도 FileHandler가 거르면 알릴 길이 없다 — 넣을 수 없는 파일은 여기서 먼저 알린다
    handleDrop: (_v, e) => rejectFiles((e as DragEvent).dataTransfer?.files),
    handlePaste: (_v, e) => rejectFiles(e.clipboardData?.files),
  },
  onUpdate: ({ editor: ed }) => {
    const html = ed.isEmpty ? '' : ed.getHTML()
    emit('update:modelValue', html)
    checkLength()
  },
})

function rejectFiles(list?: FileList | null): boolean {
  const bad = [...(list ?? [])].filter((f) => !(IMAGE_TYPES as readonly string[]).includes(f.type))
  if (bad.length) { fail(`${IMAGE_LABEL} 이미지만 넣을 수 있습니다. (${bad.map((f) => f.name).join(', ')})`); return true }
  return false
}

/* ---------- 글자 수 ---------- */
const count = computed(() => editor.value?.storage.characterCount.characters() ?? 0)
const over = computed(() => props.maxLength != null && count.value > props.maxLength)
function checkLength() {
  if (props.maxLength == null) return
  if (over.value) fail(`본문은 ${props.maxLength.toLocaleString()}자까지 쓸 수 있습니다. (지금 ${count.value.toLocaleString()}자)`)
  else if (error.value?.startsWith('본문은')) fail(null)
}

/* ---------- 바깥 값 · 편집 여부 동기화 ---------- */
watch(() => props.modelValue, (v) => {
  const ed = editor.value
  if (!ed) return
  const cur = ed.isEmpty ? '' : ed.getHTML()
  if (v !== cur) { ed.commands.setContent(v || '', { emitUpdate: false }); checkLength() }
})
watch(() => props.editable, (v) => editor.value?.setEditable(v))
onBeforeUnmount(() => editor.value?.destroy())

/* ---------- 툴바 ---------- */
const is = (name: string, attrs?: Record<string, unknown>) => !!editor.value?.isActive(name, attrs)
const run = (fn: (c: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => { if (editor.value) fn(editor.value.chain().focus()).run() }

const BLOCKS = [{ label: '본문', value: 'p' }, { label: '제목 2', value: 'h2' }, { label: '제목 3', value: 'h3' }, { label: '제목 4', value: 'h4' }]
const block = computed({
  get: () => (is('heading', { level: 2 }) ? 'h2' : is('heading', { level: 3 }) ? 'h3' : is('heading', { level: 4 }) ? 'h4' : 'p'),
  set: (v: string) => run((c) => (v === 'p' ? c.setParagraph() : c.setHeading({ level: Number(v[1]) as 2 | 3 | 4 }))),
})
const COLORS = [{ label: '기본색', value: '' }, ...TEXT_COLORS]
const color = computed({
  get: () => (editor.value?.getAttributes('textStyle').color as string | undefined) ?? '',
  set: (v: string) => run((c) => (v ? c.setColor(v) : c.unsetColor())),
})

/* 링크 · 대체 텍스트 — 툴바 아래 한 줄에서 고친다(prompt()는 쓰지 않는다) */
const bar = ref<null | 'link' | 'alt'>(null)
const linkUrl = ref('')
const altText = ref('')
const imageSelected = computed(() => editor.value?.state.selection instanceof NodeSelection && editor.value.state.selection.node.type.name === 'image')
function openLink() { linkUrl.value = (editor.value?.getAttributes('link').href as string | undefined) ?? ''; bar.value = 'link' }
/** 링크 걸기 — 허용 스킴이 아니면 거부한다. 시험이 부를 수 있게 노출한다 */
function setLink(url: string): boolean {
  const ed = editor.value
  if (!ed) return false
  if (!isSafeUrl(url)) { fail('링크는 http · https · mailto 주소만 걸 수 있습니다.'); return false }
  ed.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  fail(null)
  bar.value = null
  return true
}
function unsetLink() { run((c) => c.extendMarkRange('link').unsetLink()); bar.value = null }
function openAlt() { altText.value = (editor.value?.getAttributes('image').alt as string | undefined) ?? ''; bar.value = 'alt' }
function applyAlt() { run((c) => c.updateAttributes('image', { alt: altText.value.trim() })); bar.value = null }

const fileInput = ref<HTMLInputElement | null>(null)
function pickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  void insertFiles([...(input.files ?? [])])
  input.value = ''
}

const tableMenu = ref<InstanceType<typeof Menu> | null>(null)
const tableItems = computed(() => {
  const inTable = is('table')
  return [
    { label: '표 넣기(3×3, 머리행)', command: () => run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })) },
    { separator: true },
    { label: '위에 행 추가', disabled: !inTable, command: () => run((c) => c.addRowBefore()) },
    { label: '아래에 행 추가', disabled: !inTable, command: () => run((c) => c.addRowAfter()) },
    { label: '왼쪽에 열 추가', disabled: !inTable, command: () => run((c) => c.addColumnBefore()) },
    { label: '오른쪽에 열 추가', disabled: !inTable, command: () => run((c) => c.addColumnAfter()) },
    { label: '행 삭제', disabled: !inTable, command: () => run((c) => c.deleteRow()) },
    { label: '열 삭제', disabled: !inTable, command: () => run((c) => c.deleteColumn()) },
    { label: '표 삭제', disabled: !inTable, command: () => run((c) => c.deleteTable()) },
  ]
})

/* 로빙 tabindex — 툴바 안에서 Tab 한 번에 들어가고 ←→ · Home · End로 옮긴다, Esc는 본문으로 */
const toolbar = ref<HTMLElement | null>(null)
function items(): HTMLElement[] { return [...(toolbar.value?.querySelectorAll<HTMLElement>('[data-tb]') ?? [])] }
function roam(e: KeyboardEvent) {
  const list = items()
  const i = list.indexOf(document.activeElement?.closest('[data-tb]') as HTMLElement)
  if (e.key === 'Escape') { e.preventDefault(); editor.value?.commands.focus(); return }
  if (i < 0) return
  const next = e.key === 'ArrowRight' ? (i + 1) % list.length : e.key === 'ArrowLeft' ? (i - 1 + list.length) % list.length : e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : -1
  if (next < 0) return
  e.preventDefault()
  list.forEach((el, j) => { el.tabIndex = j === next ? 0 : -1 })
  ;(list[next].querySelector<HTMLElement>('input,[role=combobox]') ?? list[next]).focus()
}
function initRoving() { items().forEach((el, j) => { el.tabIndex = j === 0 ? 0 : -1 }) }
watch(toolbar, (el) => { if (el) requestAnimationFrame(initRoving) })

defineExpose({ editor, insertFiles, setLink })
</script>

<template>
  <div class="wse" :class="{ 'is-readonly': !editable, 'is-invalid': invalid || !!error || over }">
    <div v-if="editable" ref="toolbar" class="wse__tb" role="toolbar" :aria-label="`${ariaLabel} 서식`" @keydown="roam">
      <div class="wse__g">
        <Button data-tb text severity="secondary" aria-label="실행 취소" v-tooltip.bottom="'실행 취소 (Ctrl+Z)'" :disabled="!editor?.can().undo()" @click="run((c) => c.undo())"><AppIcon name="undo" :size="16" /></Button>
        <Button data-tb text severity="secondary" aria-label="다시 실행" v-tooltip.bottom="'다시 실행 (Ctrl+Shift+Z)'" :disabled="!editor?.can().redo()" @click="run((c) => c.redo())"><AppIcon name="redo" :size="16" /></Button>
      </div>
      <div class="wse__g">
        <span data-tb class="wse__sel"><Select v-model="block" :options="BLOCKS" option-label="label" option-value="value" aria-label="문단 형식" class="wse__block" /></span>
      </div>
      <div class="wse__g">
        <Button data-tb text severity="secondary" aria-label="굵게" :aria-pressed="is('bold')" :class="{ 'is-on': is('bold') }" v-tooltip.bottom="'굵게 (Ctrl+B)'" @click="run((c) => c.toggleBold())"><b class="wse__glyph">B</b></Button>
        <Button data-tb text severity="secondary" aria-label="기울임" :aria-pressed="is('italic')" :class="{ 'is-on': is('italic') }" v-tooltip.bottom="'기울임 (Ctrl+I)'" @click="run((c) => c.toggleItalic())"><i class="wse__glyph">I</i></Button>
        <Button data-tb text severity="secondary" aria-label="밑줄" :aria-pressed="is('underline')" :class="{ 'is-on': is('underline') }" v-tooltip.bottom="'밑줄 (Ctrl+U)'" @click="run((c) => c.toggleUnderline())"><u class="wse__glyph">U</u></Button>
        <Button data-tb text severity="secondary" aria-label="취소선" :aria-pressed="is('strike')" :class="{ 'is-on': is('strike') }" v-tooltip.bottom="'취소선'" @click="run((c) => c.toggleStrike())"><s class="wse__glyph">S</s></Button>
        <span data-tb class="wse__sel">
          <Select v-model="color" :options="COLORS" option-label="label" option-value="value" aria-label="글자색" class="wse__color">
            <template #value="{ value }"><span class="wse__sw" :style="{ background: value || 'var(--ws-text)' }" aria-hidden="true" /></template>
            <template #option="{ option }"><span class="wse__sw" :style="{ background: option.value || 'var(--ws-text)' }" aria-hidden="true" />{{ option.label }}</template>
          </Select>
        </span>
      </div>
      <div class="wse__g">
        <Button v-for="a in (['left', 'center', 'right'] as const)" :key="a" data-tb text severity="secondary" :aria-label="{ left: '왼쪽 정렬', center: '가운데 정렬', right: '오른쪽 정렬' }[a]" :aria-pressed="is('paragraph', { textAlign: a }) || is('heading', { textAlign: a })" :class="{ 'is-on': editor?.isActive({ textAlign: a }) }" @click="run((c) => c.setTextAlign(a))"><AppIcon :name="`align-${a}`" :size="16" /></Button>
      </div>
      <div class="wse__g">
        <Button data-tb text severity="secondary" aria-label="글머리 목록" :aria-pressed="is('bulletList')" :class="{ 'is-on': is('bulletList') }" @click="run((c) => c.toggleBulletList())"><AppIcon name="list-ul" :size="16" /></Button>
        <Button data-tb text severity="secondary" aria-label="번호 목록" :aria-pressed="is('orderedList')" :class="{ 'is-on': is('orderedList') }" @click="run((c) => c.toggleOrderedList())"><AppIcon name="list-ol" :size="16" /></Button>
      </div>
      <div class="wse__g">
        <Button data-tb text severity="secondary" aria-label="링크" :aria-pressed="is('link')" :class="{ 'is-on': is('link') }" :aria-expanded="bar === 'link'" @click="openLink"><AppIcon name="link" :size="16" /></Button>
        <Button data-tb text severity="secondary" aria-label="링크 해제" :disabled="!is('link')" @click="unsetLink"><AppIcon name="unlink" :size="16" /></Button>
        <Button data-tb text severity="secondary" aria-label="이미지 넣기" v-tooltip.bottom="`이미지 넣기 — ${IMAGE_LABEL}, ${maxImageMB}MB 이하`" @click="fileInput?.click()"><AppIcon name="image" :size="16" /></Button>
        <Button data-tb text severity="secondary" aria-label="대체 텍스트" :disabled="!imageSelected" :aria-expanded="bar === 'alt'" @click="openAlt"><span class="wse__glyph wse__glyph--sm">ALT</span></Button>
        <Button data-tb text severity="secondary" aria-label="표" aria-haspopup="menu" @click="(e) => tableMenu?.toggle(e)"><AppIcon name="table" :size="16" /></Button>
        <Menu ref="tableMenu" :model="tableItems" popup />
      </div>
      <div class="wse__g">
        <Button data-tb text severity="secondary" aria-label="서식 지우기" @click="run((c) => c.unsetAllMarks().clearNodes())"><AppIcon name="eraser" :size="16" /></Button>
      </div>
      <input ref="fileInput" type="file" class="wse__file" :accept="IMAGE_TYPES.join(',')" multiple tabindex="-1" aria-hidden="true" @change="pickFiles" />
    </div>

    <form v-if="editable && bar === 'link'" class="wse__bar" @submit.prevent="setLink(linkUrl)">
      <label :for="`${id}-link`">링크 주소</label>
      <InputText :id="`${id}-link`" v-model="linkUrl" placeholder="https:// 또는 mailto:" class="wse__barin" autofocus @keydown.esc.prevent="bar = null; editor?.commands.focus()" />
      <Button type="submit" label="적용" severity="secondary" outlined size="small" />
      <Button type="button" label="닫기" severity="secondary" text size="small" @click="bar = null; editor?.commands.focus()" />
    </form>
    <form v-if="editable && bar === 'alt'" class="wse__bar" @submit.prevent="applyAlt">
      <label :for="`${id}-alt`">대체 텍스트</label>
      <InputText :id="`${id}-alt`" v-model="altText" placeholder="이미지가 담은 내용" class="wse__barin" autofocus @keydown.esc.prevent="bar = null; editor?.commands.focus()" />
      <Button type="submit" label="적용" severity="secondary" outlined size="small" />
      <Button type="button" label="닫기" severity="secondary" text size="small" @click="bar = null; editor?.commands.focus()" />
    </form>

    <EditorContent :editor="editor" class="wse__body" />

    <div v-if="editable" class="wse__ft">
      <p :id="`${id}-err`" class="ws-err wse__err" role="alert">{{ error ?? '' }}</p>
      <p :id="`${id}-count`" class="wse__count" :class="{ 'is-over': over }" aria-live="polite">
        <template v-if="maxLength != null">{{ count.toLocaleString() }} / {{ maxLength.toLocaleString() }}자 <span class="ws-sr-only">— {{ over ? `${(count - maxLength).toLocaleString()}자 넘었습니다` : `${(maxLength - count).toLocaleString()}자 남았습니다` }}</span></template>
        <template v-else>{{ count.toLocaleString() }}자</template>
      </p>
    </div>
  </div>
</template>

<style scoped>
.wse { display: grid; border: 1px solid var(--ws-field-border); border-radius: var(--ws-radius); background: var(--ws-field-bg); }
.wse:focus-within { border-color: var(--ws-field-border-focus); box-shadow: 0 0 0 1px var(--ws-field-border-focus); }
.wse.is-invalid { border-color: var(--ws-text-danger); }
.wse.is-readonly { border-color: var(--ws-border); background: var(--ws-surface); box-shadow: none; }

.wse__tb { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 4px; padding: 4px 6px; border-bottom: 1px solid var(--ws-border); background: var(--ws-surface-head); border-radius: var(--ws-radius) var(--ws-radius) 0 0; }
.wse__g { display: flex; align-items: center; gap: 2px; }
.wse__g + .wse__g { padding-left: 4px; border-left: 1px solid var(--ws-border); }
.wse__tb :deep(.p-button) { width: 30px; height: 30px; padding: 0; color: var(--ws-text-sub); }
.wse__tb :deep(.p-button.is-on) { background: var(--ws-surface-selected); color: var(--ws-text-brand); }
.wse__glyph { font-size: 15px; line-height: 1; font-family: Georgia, 'Times New Roman', serif; }
.wse__glyph--sm { font-family: inherit; font-size: 10.5px; font-weight: 700; letter-spacing: 0; }
.wse__sel { display: inline-flex; border-radius: var(--ws-radius); }
.wse__block { width: 104px; }
.wse__color { width: 64px; }
.wse__sw { display: inline-block; width: 14px; height: 14px; margin-right: 8px; border-radius: 3px; vertical-align: -2px; border: 1px solid var(--ws-border); }
.wse__file { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }

.wse__bar { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-bottom: 1px solid var(--ws-border); background: var(--ws-surface); }
.wse__bar label { flex: none; font-size: var(--ws-font-size-sm); color: var(--ws-text-sub); }
.wse__barin { flex: 1; min-width: 0; }

.wse__body :deep(.wse__doc) { min-height: 280px; max-height: 640px; overflow-y: auto; padding: 14px 16px; color: var(--ws-text); line-height: 1.7; outline: none; word-break: keep-all; overflow-wrap: anywhere; }
/* 포커스는 바깥 틀(.wse:focus-within)이 보인다 — 전역 링이 편집 영역에 한 겹 더 그려지지 않게 */
.wse__body :deep(.wse__doc:focus-visible) { outline: none; box-shadow: none; }
.is-readonly .wse__body :deep(.wse__doc) { min-height: 0; max-height: none; }
.wse__body :deep(.wse__doc > * + *) { margin-top: 8px; }
.wse__body :deep(h2) { font-size: 20px; font-weight: 700; }
.wse__body :deep(h3) { font-size: 17px; font-weight: 700; }
.wse__body :deep(h4) { font-size: 15px; font-weight: 700; }
.wse__body :deep(ul), .wse__body :deep(ol) { padding-left: 22px; }
.wse__body :deep(ul) { list-style: disc; }
.wse__body :deep(ol) { list-style: decimal; }
.wse__body :deep(a) { color: var(--ws-text-link); text-decoration: underline; }
.wse__body :deep(img) { display: block; max-width: 100%; height: auto; border-radius: var(--ws-radius-sm); }
.wse__body :deep(img.ProseMirror-selectednode) { outline: 2px solid var(--ws-field-border-focus); outline-offset: 2px; }
.wse__body :deep(table) { width: 100%; border-collapse: collapse; table-layout: fixed; }
.wse__body :deep(th), .wse__body :deep(td) { padding: 6px 8px; border: 1px solid var(--ws-border-strong); vertical-align: top; }
.wse__body :deep(th) { background: var(--ws-surface-head); font-weight: 700; }
.wse__body :deep(.selectedCell) { background: var(--ws-surface-selected); }
.wse__body :deep(p.is-editor-empty:first-child::before) { content: attr(data-placeholder); float: left; height: 0; color: var(--ws-text-muted); pointer-events: none; }
.wse__body :deep(.wse__uploading) { display: inline-block; padding: 6px 10px; border: 1px dashed var(--ws-border-strong); border-radius: var(--ws-radius-sm); color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); }

.wse__ft { display: flex; align-items: flex-start; gap: 12px; padding: 4px 10px 6px; border-top: 1px solid var(--ws-border); }
.wse__err { flex: 1; min-height: 1em; margin: 0; }
.wse__count { flex: none; margin: 0; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); font-variant-numeric: tabular-nums; }
.wse__count.is-over { color: var(--ws-text-danger); font-weight: 700; }
</style>
