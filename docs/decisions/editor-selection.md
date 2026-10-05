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
| Table 계열 | `resizable:true`(열 경계 끌기). 출력은 **퍼센트 colgroup**으로 바꾸고 칸의 `colwidth`는 내보내지 않는다 | 기본 출력(px colwidth · `min-width`)은 대외 화면 폭이 다르면 넘친다. 열 하나만 끌면 나머지 열 폭이 비어 저장 결과가 화면과 달라져서, 화면에서 잰 폭으로 빈 열을 채운다 |
| Image 크기 | 직접 만든 NodeView — 오른쪽 아래 손잡이 끌기 + 툴바 25 · 50 · 75 · 100% | Tiptap `resize`는 px로 저장한다. 퍼센트 하나로 맞추려고 직접 만들었다 |
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
| `img` | `style`(width 1~100%), `src`(https만 — `imageHosts`를 주면 그 호스트만, 상대 주소 · 목업 blob: 허용 / data: · file: · http: 금지), `alt` |
| `table` · `thead` · `tbody` · `tr` · `colgroup` | — |
| `col` | `style`(width %) — 표 열 너비, 합 100 |
| `th` · `td` | `colspan` · `rowspan` · `style`(text-align) |

- `style`은 요소마다 정해진 것만: `span`→color, `p`·`h*`·`th`·`td`→text-align, `img`·`col`→width(퍼센트만, px 금지).
- 이미지 폭 100%는 값 없이 저장한다(원본 폭, 본문보다 넓으면 본문 폭). 표 전체 폭은 늘 100%.
- 빈 본문은 `''`(빈 `<p></p>`를 내보내지 않는다).
- 글자색은 hex로 저장한다(`#c62828` 등 6색, 흰 바탕 4.5:1 이상). `var(--ws-*)`는 서버 · 대외 화면이 모른다.
  **붙여넣은 색은 가장 가까운 팔레트 색으로 맞춘다**(`nearestTextColor` — 눈 가중 거리). 검정 계열은 기본색(색 없음)이 된다.
  브라우저가 style을 `rgb()`로 바꿔 쓰는 경우가 있어 출력 단계에서 hex로 고정한다.
- 앞뒤 빈 문단은 떼고 내보낸다(가운데 빈 문단은 사용자가 띄운 줄이라 둔다).
- 붙여넣은 이미지 중 받을 수 없는 주소는 스키마가 지우고, 지운 개수를 `invalid`로 알린다.
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
  스키마와 시험(`WsEditor.spec.ts` 20건)으로 지킬 수 있음을 확인했다.
- **한글 IME는 판정 보류** — §5 표가 채워질 때까지. Quill 비교는 실패 사례가 나오면 한다.

## 7. 남은 것 — 실제 관리자 저장소로 옮길 때 점검할 것

어드민 에디터에서 보통 중점으로 보는 축(보안 · 붙여넣기 · 기존 데이터 · 입력 유실 · 화면 일치 · IME · 서버 정합 · 이미지)으로 정리했다.
이 저장소는 public이라 실데이터로 볼 수 없는 것들이다.

| 축 | 점검 | 방법 |
|---|---|---|
| 기존 데이터 | AS-IS 공지(font 태그 · 표 너비 · 옛 이미지 경로)를 열고 다시 저장했을 때 사라지는 것 | 실공지 표본 수십 건을 불러와 전후 비교 |
| 서버 정합 | 클라이언트 출력이 서버 sanitizer를 지난 뒤 같은가 · 상한을 글자/바이트/HTML 길이 중 무엇으로 세나 | §4 목록으로 계약 시험 |
| 화면 일치 | 대외 사이트 CSS에서 제목 · 표 · 목록 · 이미지 | 대외 화면에 같은 HTML을 넣어 대조 |
| 이미지 | 업로드 후 본문에서 지웠거나 저장하지 않고 나간 파일(고아) 정리 · 업로드 호스트(`imageHosts`) 실값 | 서버 정책 |
| 입력 유실 | 셸 KeepAlive는 화면 8개까지만 살린다 — 넘으면 오래된 탭의 입력이 조용히 사라진다. 세션 만료 시 임시 저장 | 셸 · 세션 정책 |
| 성능 | 엑셀 표 수백 행 · 이미지 수십 장 붙여넣기 | 실측 |
| IME | §5 표 | 사람이 실측 |
| 접근성 | VoiceOver · NVDA로 툴바 · 본문 · 오류 통과 | 수동 |


- 서버 sanitizer 정책을 §4와 맞춘다(실제 관리자 저장소 작업).
- 공지 목록 · 상세 화면은 설계 카드 단계다(이번 범위는 등록 화면).
