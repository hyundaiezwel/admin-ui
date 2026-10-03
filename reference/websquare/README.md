# WebSquare 원본 참조 자료

DS3 토큰(`src/ws/tokens.css`)이 값을 뽑아 온 원본의 **집계 결과만** 남긴다.
원본 CSS·이미지·화면 XML·엔진 파일은 사내 자산이라 이 공개 저장소에 싣지 않는다.

## 출처

- 이식 저장소 `ez-websquare-vue`(폐기)의 `docs/color-usage.json`을 그대로 옮겼다.
- 그 저장소의 원본 수집본은 **2026-09-18**에 사내 개발 서버에서 받은 관리자센터(WebSquare 5) UI 소스다.
  화면 XML·스크립트·CSS·이미지·폰트 864개(약 22MB), 메뉴 등록 화면 62개 중 61개(나머지 1개는 원래 없는 테스트 경로).
- 엔진 본체는 수집본에도 없었다(라이선스). 스킨 CSS·이미지만 있었다.

## 파일

| 파일 | 내용 |
|---|---|
| `color-usage.json` | 원본 `base.css`·`contents.css`에 나오는 색 값과 출현 횟수(빈도순). `tokens.css` 주석의 "원본 N회"가 이 숫자다 |

원본 대비 DOM·클래스 구조는 [`docs/websquare-dom-contract.md`](../../docs/websquare-dom-contract.md).
