# WebSquare DOM 계약

> `ez-websquare-vue`(원본 화면을 Vue로 1:1 이식한 저장소, 폐기)의 `docs/porting-notes.md`를 옮겼다.
> 그 저장소의 `legacy/`·`src/` 경로는 이제 없다 — 경로는 **당시 위치**로만 읽는다. 원본 CSS·XML은 사내 자산이라
> 싣지 않았고(`reference/websquare/README.md`), DS3는 이 클래스 이름을 쓰지 않는다(`src/ws/layout.css` 머리 주석).
> 이 문서가 남는 이유는 **DS3 블록이 원본의 어느 블록에 대응하는지, 원본이 어떻게 생겼는지**를 대조할 근거이기 때문이다.

WebSquare 화면을 Vue로 옮기며 알아낸 것들.

## 1. 이 시스템에서 "퍼블리싱"이 사는 곳

렌더된 HTML이 아니다. 두 군데다.

- **화면 XML (`legacy/ui/**/*.xml`)** — DOM 구조와 class를 정하는 곳
- **`legacy/cm/css/contents.css` (129KB), `base.css` (51KB)** — 실제 생김새

엔진은 이 둘을 이어 붙이는 기계일 뿐이다. 그래서 엔진 없이도 **같은 DOM만 내면 같은 화면이 나온다.**
이 저장소 전체가 그 한 문장 위에 서 있다.

## 2. 클래스 계약

컴포넌트가 반드시 내야 하는 클래스. 바꾸면 스타일이 어긋난다.

### 레이아웃

| 클래스 | 역할 |
|---|---|
| `sub_contents` | 화면 루트. `padding:30px 48px 24px` |
| `pgtbox` | 최상단 제목·경로 영역. 36개 화면이 wframe으로 물고 있다 |
| `titbox` > `lta`/`cta`/`rta` | 제목줄. flex, 좌/중/우 |
| `tbbox` > `w2tb tb` | 입력 테이블. `w2tb_th` / `w2tb_td`, 필수는 `req` |
| `gvwbox` > `wq_gvw` | 그리드 영역 |
| `shbox` | 조회 영역. 여기 안의 `btn_cm.pri` 는 색이 따로다 |
| `btnbox`, `btn_wrap` | 버튼 묶음. `rta` 안의 `btn_wrap` 사이엔 구분선이 붙는다 |
| `msgbox` | 안내문 |

간격은 **인접 형제 선택자**로만 준다 — `.tbbox + .gvwbox { margin-top:24px }` 식으로
`contents.css` 에 40개 조합이 나열돼 있다. 그래서 순서를 바꾸면 간격이 달라진다.

### 폼

| 원본 요소 | DOM | 상태 클래스 |
|---|---|---|
| `xf:input` | `input.w2input` | `w2input_disabled` · `w2input_readonly` · `error w2input_error` |
| `xf:select1` | `div.w2selectbox_native > select.w2selectbox_native_select` | `w2selectbox_disabled` |
| `xf:select1[appearance=full]` | `.w2radio > .w2radio_item > input + label.w2radio_label` | `.vertical` |
| `xf:select` | `.w2checkbox > .w2checkbox_item > input + label.w2checkbox_label` | |
| `xf:checkcombobox` | `.w2checkcombobox > .w2checkcombobox_label` | `w2checkcombobox_open` |
| `w2:inputCalendar` | `.w2inputCalendar > .w2inputCalendar_divInput + .w2inputCalendar_div_img > button` | `w2inputCalendar_focus` · `_readOnly` |
| `xf:trigger` | `button` — class는 XML이 준다(`btn_cm pri`) | `w2trigger_disabled` |
| `w2:textbox` | `tagname` 이 태그를 정한다. 없으면 `span.w2textbox` | |

### 그리드

`contents.css` 가 `.wq_gvw` 아래 129개 규칙으로 직접 칠한다. 구조:

```
div.wq_gvw
  div.w2grid_main
    table
      thead.gridHeaderTableDefault > tr > th.gridHeaderTDDefault > nobr
      tbody               > tr > td.gridBodyDefault[inputtype] > nobr
      tfoot > tr.gridFooterTableDefault > td.gridFooterTDDefault > nobr
```

- **`nobr` 는 비표준이지만 뺄 수 없다.** 셀 안쪽 박스(테두리·hover·말줄임)를 그리는
  선택자가 전부 `nobr` 에 걸려 있다.
- `inputtype` 속성으로 셀 모양이 갈린다 — `link`/`expression`/`unit` 은 테두리를 지운다.
- 헤더 필수 표시는 `th.gridHeaderTDDefault.req nobr:after` 가 `*` 를 붙인다.

## 3. 원본과 어긋나서 손댄 곳

`src/styles/overrides.css` 에 있는 것들. 이유를 각각 주석으로 달아 뒀다.

1. **`titbox` 제목이 한 글자 폭으로 찌그러짐** — `contents.css` 가 `.w2textbox` 에
   `word-break:break-all` 을 걸고, `.lta` 는 `display:flex` 다. 엔진은 textbox를 한 겹 더
   감싸서 `h3` 가 직접 flex 아이템이 되지 않았다. 제목에서만 줄바꿈을 막았다.
2. **탭이 세로로 쌓임** — `contents.css` 는 탭의 생김새만 덮어썼고, 가로 배치는
   엔진 스킨(`stylesheet_ext.css`)이 갖고 있었다. 그 스킨은 벤더 라이선스라 안 싣는다.
3. **그리드 헤더 고정** — 엔진은 헤더/바디를 별도 테이블로 쪼개 스크롤을 동기화했다.
   한 테이블 + `position:sticky` 로 같은 그림을 낸다.
4. **`html { font-size: 10px }`** — 원본 CSS가 `1.4rem = 14px` 을 전제로 쓴다.

## 4. 자동 변환이 안 되는 것

### 화면 스크립트

`scwin.onpageload`, `com.win.confirm`, `com.data.validateGridView`, `com.sbm.execute` …
전부 엔진 전역 API다. 기계 번역이 안 된다. 원문은 `src/pages/generated/*.legacy.js` 에
그대로 남겨 뒀다(import되지 않는다). 옮길 때 이 짝을 보고 손으로 옮긴다.

`com.win.alert` / `com.win.confirm` 만 `src/runtime/dialog.ts` 에 대응물을 만들어 뒀다.

### 외부 위젯

FusionCharts · CKEditor · FullCalendar · UDC 3종은 자리 표시만 한다.
원본에서도 외부 라이브러리를 물고 있던 자리라 퍼블리싱 이식 대상이 아니다.

### wframe

원본은 화면 안에 다른 화면을 끼워 넣는다(`w2:wframe`). 여기서는 각 화면이 독립 라우트라
wframe 자리에 "어느 화면인지"만 표시한다. `pgtbox` 만 예외로 컴포넌트화했다 — 36개 화면이
공통으로 물고 있어서 그게 자연스럽다.

## 5. 변환기가 XML을 읽는 법

`fast-xml-parser` 를 `preserveOrder: true` 로 쓴다. 순서가 곧 DOM 순서라 보존이 필수다.

주의할 점 둘:

- 노드는 `{ 'tag': [children], ':@': {attrs} }` 꼴이다. 태그 이름은 `:@` 아닌 유일한 키.
- **CDATA는 스칼라가 아니라 배열이다** — `{ __cdata: [{ '#text': '...' }] }`.
  `textOf` 가 재귀로 내려가야 한다. 안 그러면 `[object Object]` 가 박힌다.

배열(옵션·컬럼)은 템플릿 속성에 인라인하지 않고 `script setup` 상수로 올린다.
속성에 JSON을 넣으면 따옴표를 엔티티로 바꿔야 하는데, 그러면 `vue-tsc` 가 표현식을 못 읽는다.
