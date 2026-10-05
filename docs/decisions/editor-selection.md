# 리치 텍스트 에디터 선정 — Tiptap 3

작성 2026-10-05 · 대상 `src/ws/WsEditor.vue` · `src/ws/editor-schema.ts` · `src/pages/sp/NoticeEditPage.vue`

관리자가 공지사항 본문을 쓸 때 쓸 에디터를 DS3에 먼저 만들었다. 나중에 실제 관리자 저장소로 컴포넌트를 그대로 옮긴다.

---

## 1. 정해진 조건

| 조건 | 내용 |
|---|---|
| 에디터 | **Tiptap 3**(MIT). `@tiptap/*` 전부 같은 버전, 3.30.5 이상 고정(보안 권고) |
| 대안 | 한글 입력 PoC에서 막히면 PrimeVue 4 Editor(Quill 2, `quill@2.0.2`)를 같은 시나리오로 비교 |
| PrimeVue | 4.5.5 고정 — 5.0부터 상용 |
| 제외 | GPL · 상용 에디터(CKEditor 5, TinyMCE 등) |
| 이미지 | base64로 넣지 않는다. 업로드 함수가 돌려준 주소만 |

## 2. 설치한 패키지 — 전부 MIT

`3.31.4`로 정확히 고정했다(`npm i -E`). 3.30.5 이상 조건을 채운다.

| 패키지 | 버전 | 라이선스 | 쓰는 곳 |
|---|---|---|---|
| `@tiptap/core` · `@tiptap/pm` · `@tiptap/vue-3` | 3.31.4 | MIT | 본체 · ProseMirror 묶음 · Vue 바인딩 |
| `@tiptap/starter-kit` | 3.31.4 | MIT | 기본 노드 · 마크 · 실행 취소 |
| `@tiptap/extension-link` | 3.31.4 | MIT | 링크(StarterKit 포함분을 끄고 따로 등록 — §3) |
| `@tiptap/extension-text-style` | 3.31.4 | MIT | TextStyle + Color |
| `@tiptap/extension-text-align` | 3.31.4 | MIT | 정렬 |
| `@tiptap/extension-image` | 3.31.4 | MIT | 이미지 |
| `@tiptap/extension-table` | 3.31.4 | MIT | Table · TableRow · TableHeader · TableCell |
| `@tiptap/extension-file-handler` | 3.31.4 | MIT | 붙여넣기 · 끌어 놓기 → 업로드 |
| `@tiptap/extensions` | 3.31.4 | MIT | Placeholder · CharacterCount |

lockfile 대조 결과 이번에 새로 들어온 패키지는 53개이고 모두 MIT다(ProseMirror · linkifyjs 등 간접 의존 포함).
`entities`(BSD-2)는 원래 있던 jsdom · Vue 컴파일러의 의존성이라 이번 추가분이 아니다.

ProseMirror 실버전: `prosemirror-view` 1.42.6 · `prosemirror-model` 1.25.12 · `prosemirror-tables` 1.8.5.

## 3. 확장 구성 — 지시서와 다른 점

| 지시서 | 실제 | 이유 |
|---|---|---|
| StarterKit | 쓴다. `heading`은 2·3·4만, `code` · `codeBlock` · `blockquote` · `horizontalRule` **끔** | 허용 목록 밖 요소를 만들지 않게 |
| Link(StarterKit 안) | StarterKit의 `link`를 끄고 **`class` 속성을 뺀 Link**를 따로 등록 | Tiptap 3 StarterKit에 Link가 들어 있다. 그런데 기본 Link는 붙여넣은 `<a class>`의 class를 살려 허용 목록을 넘었다(시험이 잡음) |
| Underline | StarterKit에 포함 — 따로 넣지 않음 | Tiptap 3에서 StarterKit으로 들어왔다 |
| Image `allowBase64:false` | 그대로 + **`width` · `height` · `title` 속성을 뺀 Image** | 기본 Image가 붙여넣은 width 등을 살렸다(시험이 잡음) |
| Table 계열 | 그대로 + **출력의 `colgroup` · 너비 style을 뺀 Table**, `resizable:false` | 기본 출력이 `style="min-width"` · `<colgroup>`을 낸다. 편집 화면 DOM에는 남지만 내보내는 HTML에는 없다 |
| Placeholder · CharacterCount | `@tiptap/extensions`에서 | Tiptap 3에서 패키지가 합쳐졌다 |
| Color + TextStyle | `@tiptap/extension-text-style` 한 패키지 | Tiptap 3에서 Color가 이 패키지로 들어왔다 |
| FileHandler | 그대로 + 형식이 틀린 파일은 `handleDrop/handlePaste`가 먼저 막고 알린다 | FileHandler는 형식이 틀린 파일을 조용히 버린다 — 사용자가 왜 안 들어갔는지 모른다 |
| 업로드 자리표시자 | ProseMirror 장식(Decoration) | 문서 밖이라 출력 HTML에 섞이지 않는다 |

## 4. 출력 허용 목록

정본은 `src/ws/editor-schema.ts`다. 서버 sanitizer(OWASP Java HTML Sanitizer) 정책을 만들 때 그대로 옮긴다.

| 요소 | 허용 속성 |
|---|---|
| `p` · `h2` · `h3` · `h4` | `style`(text-align) |
| `strong` · `em` · `u` · `s` · `br` | — |
| `a` | `href`(http · https · mailto만), `target="_blank"`, `rel="noopener noreferrer nofollow"` |
| `span` | `style`(color) |
| `ul` · `li` | — |
| `ol` | `start` · `type` |
| `img` | `src`(업로드 주소 — data: 금지), `alt` |
| `table` · `thead` · `tbody` · `tr` | — |
| `th` · `td` | `colspan` · `rowspan` · `style`(text-align) |

- `style`은 `color`와 `text-align`만.
- 빈 본문은 `''`(빈 `<p></p>`를 내보내지 않는다).
- 글자색은 hex로 저장한다(`#c62828` 등 6색, 흰 바탕 4.5:1 이상). `var(--ws-*)`는 서버 · 대외 화면이 모른다.
  다크 테마 편집 화면에서는 일부 색이 어두운 면 위에서 옅게 보인다 — 공지는 밝은 대외 화면에 나가므로 감수했다.

## 5. 한글 입력 PoC

**이번 작업에서는 실제 IME로 확인하지 못했다.** 브라우저 자동화의 글자 입력은 조합(composition) 이벤트를 만들지 않아,
IME 문제를 재현할 수 없다. 자동화로 확인한 것은 완성형 한글의 입력 · 줄바꿈 · 단축키(⌘B) 적용 뒤 입력까지다(macOS Chrome, 2026-10-05).

아래 표는 사람이 실제 IME로 채운다. Tiptap 3.31.4 · prosemirror-view 1.42.6 기준.

| # | 시나리오 | 기대 | Win11 Chrome | Win11 Edge | macOS Safari | macOS Chrome | iOS Safari | Android Chrome |
|---|---|---|---|---|---|---|---|---|
| 1 | 한글 조합 중 Enter | 마지막 글자가 남고 줄이 바뀜 | | | | | | |
| 2 | 목록 첫 항목에서 한글 입력 | 첫 글자 정상 | | | | | | |
| 3 | 텍스트를 선택한 뒤 한글 입력 | 선택 영역이 바뀌고 조합 정상 | | | | | | |
| 4 | 입력 직후 바로 미리보기 · 저장 | 마지막 음절 포함 | | | | | | |
| 5 | 굵게 · 링크 적용 직후 한글 입력 | 서식 유지, 조합 정상 | | | | | | |
| 6 | 표 칸 안에서 한글 입력, Tab 이동 | 정상 | | | | | | |
| 7 | 웹 · Word · 한글(HWP) 문서에서 붙여넣기 | 허용 목록만 남고 깨지지 않음 | | | | | | |
| 8 | 실행 취소 | 음절 · 단어 단위로 자연스럽게 | | | | | | |

재현 절차: `npm run dev` → `http://localhost:5320/#/sp/notice/new` → 본문 칸에서 시나리오대로 입력 →
4번은 "미리보기"를 누른 직후 다이얼로그 본문을 본다 · 7번은 미리보기에서 서식이 허용 목록대로 남았는지 본다.
결과 칸에는 `통과` / `실패: 증상` / `미확인`을 적는다. 실패가 하나라도 있으면 같은 시나리오로 PrimeVue Editor(Quill 2.0.2)를 비교한다.

## 6. 판정

- **Tiptap 3로 진행한다** — 토큰 · PrimeVue 4 툴바로 에디터를 만들 수 있고, 허용 목록 · base64 금지 · 링크 스킴 제한을
  스키마와 시험(`WsEditor.spec.ts` 9건)으로 지킬 수 있음을 확인했다.
- **한글 IME는 판정 보류** — §5 표가 채워질 때까지. Quill 비교는 실패 사례가 나오면 한다.

## 7. 남은 것

- 서버 sanitizer 정책을 §4와 맞춘다(실제 관리자 저장소 작업).
- 공지 목록 · 상세 화면은 설계 카드 단계다(이번 범위는 등록 화면).
