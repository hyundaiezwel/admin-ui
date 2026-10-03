# 접근성

목표는 **WCAG 2.1 AA**다. DS1(`@ezwel/ui`) 접근성 문서에서 **토큰·컴포넌트와 무관한 규칙만** 옮겼다.
대비 값은 이 문서가 아니라 `src/ws/tokens.css`와 `npm run check:contrast`가 정본이다.

---

## 1. 이미 공통이 해 주는 것

| 요구 | 어디서 |
|---|---|
| 글자 대비 4.5:1 | `tokens.css` 교정값 + 빌드 안의 `check:contrast`(라이트·다크) |
| 포커스 표시 | `base.css` `:focus-visible` 링(`--ws-focus-ring`) |
| 본문 바로가기 | `Shell.vue` 첫 요소 `.ws-skip` → `<main id="main" tabindex="-1">` |
| 화면에서만 숨김 | `.ws-sr-only` |
| 모션 축소 | `base.css` `prefers-reduced-motion` |
| 모달 포커스 가두기·복귀 | `src/lib/useFocusTrap` |
| 겹친 모달 Esc | `src/lib/useEscapeToClose` — 가장 위 하나만 닫는다 |

`--ws-text-disabled`는 대비 요건 면제(비활성)다. **경계선만으로 정보를 전달하지 않는다.**

## 2. 색에만 기대지 않기 (WCAG 1.4.1)

| 곳 | 색 외 단서 |
|---|---|
| 상태 배지 | 라벨 글자를 항상 넣는다 |
| 필수 항목 | `*` + 스크린리더용 "(필수)" |
| 검증 오류 | 필드 아래 문구. 빨간 테두리만 두지 않는다 |
| 선택된 행 | 배경 + 좌측 막대(또는 굵기) |
| 차트 | 범례를 반드시 남기고, 계열이 셋 이상이면 직접 라벨·툴팁으로 이름을 읽게 한다 |

적록 색각이 가장 흔하다. **성공(초록)과 위험(빨강)을 나란히 두고 색으로만 가르지 않는다.**

## 3. 키보드

1. **Tab만으로 주요 동작에 닿는가.** `<div @click>`은 닿지 않는다 — `<button>`.
2. **포커스가 보이는가.** 링을 지우지 않는다(`outline: none`만 쓰고 대체 표시를 안 주는 것 금지).
3. **포커스 순서 = 시각 순서인가.** `position: absolute`로 옮긴 요소가 흔한 원인.
4. **모달에서 Tab이 뒤로 새지 않는가, 닫으면 원래 자리로 오는가.** `useFocusTrap`.
5. **키보드 함정이 없는가.** 들어가서 Tab으로 못 나오는 위젯(날짜 선택 등).

단축키를 늘리려면 입력 중에도 눌리는지 먼저 확인한다.

## 4. 스크린리더

| 요소 | 필요한 것 |
|---|---|
| 아이콘 버튼 | `aria-label` |
| 장식 아이콘 | `aria-hidden="true"` |
| 입력 | `<label for>` |
| 오류 | `aria-describedby` + `role="alert"` |
| 모달 | `role="dialog"` `aria-modal="true"` + 이름 |
| 표 | `<th scope="col">`, 필요하면 `<caption class="ws-sr-only">` |
| 접기 | `aria-expanded` + `aria-controls` |
| 페이저 | `<nav aria-label>` + 현재 쪽 `aria-current="page"` |
| 동적 갱신 | `aria-live="polite"` — 토스트·건수 |

`display: none`은 스크린리더도 못 읽는다. 화면에서만 숨기려면 `.ws-sr-only`.
`aria-live="assertive"`는 쓰지 않는다 — 읽던 것을 끊는다. 정말 끊어야 하는 것(세션 만료)은 모달로.

## 5. 포인터

| 요구 | 값 |
|---|---|
| 목표 최소 | 24×24 CSS px (WCAG 2.5.8) |
| 호버 전용 정보 | 금지. 툴팁은 포커스로도 열린다 |
| 드래그 전용 동작 | 금지. 버튼·키보드 대안을 둔다 |

표 행 안 아이콘 버튼이 자주 걸린다 — 작은 아이콘을 그대로 두지 말고 버튼 상자로 감싼다.

## 6. 점검

- **자동** — `npx @axe-core/cli http://localhost:5320/<경로>`. 라벨 누락·대비·ARIA 오용은 잡지만
  포커스 순서·색 외 단서는 못 잡는다(실제 문제의 절반쯤).
- **수동(화면 완성 시)** — 마우스를 치우고 Tab만으로 끝까지 · 브라우저 200% 확대 · 다크 테마 ·
  VoiceOver(`⌘F5`)나 NVDA로 폼 한 번 통과 · DevTools 색각 시뮬레이션(적록).

## 7. 자주 나는 실수

| 증상 | 원인 | 고치는 법 |
|---|---|---|
| Tab이 버튼을 건너뛴다 | `<div @click>` | `<button>` |
| 포커스가 안 보인다 | 링 제거 | 지우지 않는다 |
| 모달 뒤로 포커스가 샌다 | 트랩 없음 | `useFocusTrap` |
| 스크린리더가 "버튼"만 읽는다 | 아이콘만 있는 버튼 | `aria-label` |
| 확대하면 버튼이 사라진다 | 고정 폭 + `overflow: hidden` | `flex-wrap`(`.ws-cluster`) |
