# EZ Admin Design System 3

DS1과 DS2에서 나은 쪽을 골라 합친 어드민 디자인 시스템과 목업.

> 이 저장소(`ez-admin-design-system-2`)가 DS3를 담는다(2026-09-28 교체).
> 이전 DS2 — WebSquare 값 · 네이티브 컨트롤 · 다크 없음 — 는 태그 [`ds2-native`](https://github.com/hyundaiezwel/ez-admin-design-system-2/tree/ds2-native)에 있다.

| | 가져온 곳 |
|---|---|
| 치수 · 화면 골격 · 버튼 뜻 | DS2 — WebSquare 원본 실측 (32 · 34/35 · 모서리 6 · 14px) |
| 컨트롤 | DS1 — PrimeVue 4. 값은 DS2 토큰을 가리킨다 |
| 다크 모드 · 검증 방식 | DS1 — 두 테마를 빌드에서 같이 잰다 |
| 셸 | 새로 짰다 — 머리줄 없는 사이드바 |

```bash
npm install
npm run dev     # http://localhost:5320
npm run build   # 대비 검사(라이트·다크) → 타입 검사 → 빌드
```

같은 화면 열 장(DS1·DS2와 같은 목록)을 PrimeVue로 다시 짰다.

---

## 결정 — D1~D5

2026-09-28 선택지 화면에서 골랐다.

| | 고른 것 | 뜻 |
|---|---|---|
| D1 컨트롤 | **B PrimeVue 4** | 입력·선택·날짜·팝업·토스트를 PrimeVue가 맡는다. v5는 상용이라 4.5에 묶었다 |
| D2 셸 | **A 머리줄 없는 사이드바** | 브랜드·검색·메뉴·알림·사용자가 전부 왼쪽 240px 안. 접으면 64px 레일 |
| D3 면 | **C 섞기** | 대시보드·통계는 카드, 목록·폼은 평평하게 |
| D4 다크 | **켠다** | 사용자 메뉴에서 라이트 · 다크 · 시스템 |
| D5 제목줄 → 내용 | **B 12px** | 원본 `.titbox{margin-bottom:12px}` 그대로 |

**D1의 값.** 첫 로드가 DS2의 두 배다 — gzip JS·CSS 114KB 대 55KB. PrimeVue 테마 엔진과
셸이 쓰는 Toast·Menu·Tooltip이 첫 청크에 들어간다. 차트(211KB)·그리드(106KB)는 쓰는 화면에서만 받는다.

**D3의 경계.** 루트에 `.ws-page--canvas`를 붙인 화면만 카드다. 판단은 "훑어보는 화면인가, 일하는 화면인가"다.
카드는 덩어리를 갈라 보여 주지만, 조회 → 그리드 → 버튼줄이 한 흐름인 목록에서는 흐름을 끊는다.

```html
<div class="ws-page ws-page--canvas">   <!-- 대시보드 · 통계 -->
  <section class="ws-sec ws-card">…</section>
</div>
<div class="ws-page">                   <!-- 목록 · 폼 — 카드 없음 -->
```

캔버스(`#f5f6f8`)에 바로 놓이는 컨트롤 테두리는 `--ws-field-border-canvas`다. 흰 면 기준 테두리 `#939393`은
캔버스에서 2.9로 떨어진다.

---

## PrimeVue를 토큰에 묶는 법

**색을 프리셋에 적지 않는다.** `src/ws/preset.ts`의 색은 전부 `var(--ws-*)`다. 라이트·다크 두 벌이
같은 매핑을 가리키고, 값을 바꾸는 건 `tokens.css`의 `[data-theme='dark']` 블록 하나다.
그래서 대비 검사도 `tokens.css` 한 곳만 보면 된다.

```js
// main.ts
theme: {
  preset: WsPreset,
  options: { darkModeSelector: '[data-theme="dark"]', cssLayer: { name: 'primevue', order: 'reset, primevue' } },
}
```

**레이어 순서가 규칙이다.** `reset < primevue < 레이어 밖(우리 보정)`.

- 전역 리셋(`button { color: inherit }` 등)은 `@layer reset`에 둔다. 레이어 밖에 두면 PrimeVue를 이긴다 —
  실제로 조회 버튼 글자가 본문색을 물려받아 3.44로 떨어졌다.
- 우리 보정(`primevue.css`)은 레이어 밖이라 특정성과 무관하게 PrimeVue를 이긴다.

**높이 32는 두 곳이 같이 맞춘다.** 높이 = 테두리 2 + 안쪽 위아래 + 줄 높이.

| | 안쪽 위아래 (프리셋) | 줄 높이 (CSS) | 합 |
|---|---|---|---|
| 입력 · 선택 · 버튼 | 5 + 5 | 20 | 32 |
| 세그먼트(SelectButton) | 5 + 5 | 20 | 32 |
| 작은 버튼 | 1 + 1 | 20 | 24 |
| 로그인 | 9 + 9 | 20 | 40 |

Aura는 입력 글자 크기를 토큰이 아니라 CSS에 `1rem`으로 박는다. 그래서 글자 14 · 줄 높이 20은
`primevue.css`가 맡는다. Aura 기본값 그대로면 같은 크기끼리도 입력 38 · 선택 42 · 버튼 39로 흩어진다.

**버튼 뜻** — 원본 규칙을 severity로 옮겼다.

| 원본 | 자리 | PrimeVue |
|---|---|---|
| `.shbox .btn_cm.pri` 초록 | 조회 · 팝업 확인 | `severity` 없음 (primary) |
| `.btn_cm.pri` 진회색 | 저장 · 등록 | `severity="contrast"` |
| `.btn_cm.sec` 회색 | 보조 | `severity="secondary"` |
| `.btn_cm` 흰색 | 기본 | `severity="secondary" outlined` |
| — | 위험 | `severity="danger" outlined` |
| 윤곽 알약 | 그리드 제목줄 보조(CSV·행추가) | `severity="secondary" outlined class="ws-line"` |

세그먼트는 고른 칸을 저장 버튼 색으로 채운다. Aura 기본은 회색 판 위 흰 칸이라 고른 칸과 판이 1.1:1이다.

---

## 다크

원본에 다크가 없어서 새로 짠 층이다. 규칙 셋.

1. **색 계열은 라이트와 같다.** 초록은 초록, 링크는 파랑이다. 명도만 옮긴다
2. **면은 세 단계로만 쌓는다.** 캔버스 `#14181b` < 면 `#1b2024` < 머리 `#252c31`. 그림자 대신 명도로 층을 가르고, 카드는 그림자를 끄고 선 `#2b3237`을 준다
3. **값은 빌드에서 잰다.** `check:contrast`가 라이트와 같은 쌍을 다크에서도 잰다 — 110쌍, 미달 0

뒤집히는 건 저장 버튼 하나다(진회색 `#444` → 밝은 회색 `#d6dce0` + 검은 글자). 어두운 바탕에 어두운 버튼은 안 보인다.
사이드 알림 숫자는 전용 토큰 `--ws-count-bg`를 쓴다. 위험 글자색에 흰 글자를 얹으면 다크에서 2.48이다.

Tabulator 기본 스킨(`tabulator_simple`)은 행 글자 `#333` · 범위 강조 `#d6d6d6`을 박아 둔다. 다크에서 행이 안 보여서
`tabulator-ws.css` 끝에서 더 높은 특정성으로 토큰에 다시 묶었다.

---

## 셸 — 머리줄 없는 사이드바

```
┌──────────┬─────────────────────────────┐
│ 브랜드 ⟨ │ 탭줄 (180px 고정 폭)          │
│ 메뉴 검색 │                             │
│ 메뉴     │ 화면 (KeepAlive 8장)         │
│   ⋮      │                             │
│ 알림 3   │                             │
│ 도움말    │                             │
│ 환경설정  │                             │
│ 사용자 ▸ │                             │
└──────────┴─────────────────────────────┘
```

- **사용자 카드 → 메뉴**에서 화면 테마(라이트 · 다크 · 시스템)와 로그아웃. 테마는 `localStorage`의 `ds3-theme`
- **접기(레일 64px)** 상태는 `ds3-rail`. 레일에서 그룹 아이콘에 올리면 옆으로 하위 메뉴가 뜬다 — 접어도 하위에 갈 길이 있어야 접기가 반쪽이 아니다
- 레일에서는 메뉴 영역의 스크롤을 푼다. `overflow-y: auto`면 x도 `auto`로 계산돼 옆으로 뜨는 메뉴가 잘린다

---

## 구조

```
src/ws/           디자인 시스템 층
  tokens.css        값 — DS2 원본 실측 + 캔버스·카드·사이드바 + 다크 블록
  preset.ts         PrimeVue 프리셋 — 색은 전부 var(--ws-*)
  primevue.css      PrimeVue 보정 — 글자 14 · 줄 높이 20 · 팝업 머리 · 탭
  base.css          전역 — @layer reset · 글꼴 · 포커스 링
  layout.css        화면 블록 — page · pgt · sh · sec/tit · tb · gtb · btnbox · card
  controls.css      PrimeVue가 맡지 않는 것 — 뱃지 · 체크 배치 · 빈 상태
  WsSearch.vue      조회 영역 — 목록 화면 다섯 장이 같이 쓴다
  notify.ts         토스트 — PrimeVue ToastEventBus
src/grid/         Tabulator 래퍼 + WebSquare 스킨
src/app/          셸 조각 · 차트 래퍼 · 조회 상태 · 테마
src/pages/        화면 열 장
```

### 새 화면 만드는 순서

1. 루트는 `.ws-page`, 첫 자식은 `<PageHead />`. 대시보드·통계면 `.ws-page--canvas`를 더하고 구획에 `.ws-card`
2. 목록이면 `<WsSearch>`에 `<tr>`만 넘긴다 — 라벨·칸 세 쌍이 한 줄
3. 구획은 `.ws-sec` = `.ws-tit`(왼쪽 제목·건수 / 오른쪽 버튼) + 내용. 제목줄 → 내용 12px
4. 컨트롤은 PrimeVue를 그대로 쓴다. 크기 prop을 주지 않으면 32다
5. 조회는 primary, 저장은 contrast — 위 버튼 표
6. 목록은 `<QueryState>`로 감싼다 — 로딩 · 오류 · 빈 · 정상
7. 입력 표는 `.ws-tb`, 필수는 `th.req`

---

## 실측

9화면 + 로그인 × 라이트·다크 전수.

| | 결과 |
|---|---|
| 블록 간격 | `[18, 24]` — 제목 영역 아래 18, 나머지 24 |
| 컨트롤 높이 | 32 (로그인 40) — 입력 · 선택 · 다중선택 · 숫자 · 날짜 · 자동완성 · 버튼 · 세그먼트 |
| 그리드 행 | 35 |
| 그려진 글자 대비 | 미달 0 — 화면당 33~439개 글자 요소, 로고 제외 |
| 콘솔 오류 · 경고 | 0 |

대비는 토큰 쌍(`check:contrast`)과 화면에 그려진 색(실측) 두 번 잰다. 토큰 쌍만 보면
Aura 기본값이 새는 자리를 못 잡는다 — 세그먼트가 슬레이트 회색 4.34로 남아 있던 것을 실측이 잡았다.

**실측 함정.** 숨은 브라우저 창에서는 CSS 전환이 멈춰, 윤곽 버튼이 전환 첫 프레임 색(1.40)으로 읽힌다.
재기 전에 `transition: none`을 주입한다.

### 옮기면서 잡은 것

- **이중 축 차트가 죽어 있었다.** `EzChart`가 `yAxis`를 객체로 펼쳐, 배열(이중 축)이 `{0:…, 1:…}`이 됐다.
  setOption이 "yAxis 0 not found"로 중간에 죽고, 그 뒤로 인스턴스가 "main process" 오류를 계속 낸다. **DS1·DS2에도 같은 코드가 있다**
- **체크박스 누름 영역이 16px이었다.** DS2의 `.ws-check input { width: 16px }`이 PrimeVue 체크박스의 투명 입력에 걸려
  20px 상자 안에서 16px만 눌렸다. 네이티브 클래스를 지우면서 풀렸다
- **Tabulator 경고 둘.** 우리 키 `paste`를 컬럼 정의에 둔 채 넘겨 "Invalid column definition" — `TabGrid`가 넘기기 전에 뺀다.
  주문 그리드의 `frozen`은 범위 선택과 섞이면 동작이 보장되지 않아 뺐다

---

## 감수한 것

- **첫 로드 114KB** — D1의 값. 위 결정 표
- **차트 선 셋 이상 라이트 화면** — 참조 팔레트의 주황·초록·하늘이 흰 바탕 3:1 미달이다. `check:contrast`가 경고 3건으로 찍는다(DS1 v1.6.1 · DS2와 같은 결정)
- **차트 패턴 없음** — 적록 색각이상 여유가 없다. 범례를 빼면 안 된다
- **레일 메뉴가 화면 높이를 넘으면** 스크롤이 없다. 지금 레일 아이콘은 열한 개(메뉴 다섯 · 바닥 셋 · 검색 · 접기 · 사용자)로 600px 안에 든다. 늘면 펼침 메뉴를 `position: fixed`로 바꾼다

## 다음 단계

- 고대비 모드 · 글자 배율 (DS1에 있다)
