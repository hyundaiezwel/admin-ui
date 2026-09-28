import type { AsisScreen } from './asis'

/**
 * 새 화면 요소 — AS-IS 54화면을 DS3에 얹으며 **DS에 없던 것.**
 *
 * `need`는 AS-IS 화면 속성(유형 · 외부연동 · 개인정보 등급)으로 "이 요소가 필요한 화면"을 고르는
 * 규칙이다. 분석 시트의 컬럼만 보고 판정하므로 **추정치**다 — 화면을 그리면서 고친다.
 * 설계 카드(`/sp/p/…`)도 같은 규칙으로 "이 화면에 필요한 요소"를 보여 준다.
 */
export interface Element {
  no: number
  group: '셸' | '목록·표' | '조회 영역' | '처리' | '상세·파일' | '개인정보·권한'
  name: string
  what: string
  asis: string
  /** 구현한 자리 — 없으면 식별만 */
  demo?: { label: string; to: string }
  file?: string
  need: (s: AsisScreen) => boolean
}

const any = (s: string, ...k: string[]) => k.some((x) => s.includes(x))
const ids = (...list: string[]) => (s: AsisScreen) => list.includes(s.id)
const listLike = (s: AsisScreen) => any(s.type, '조회', '처리', '집계', '일괄') && s.type !== 'CMS'

export const ELEMENTS: Element[] = [
  { no: 1, group: '셸', name: '전역 조건 선택기', what: '참여년도 × 사업을 셸에서 한 번 고른다. 열린 탭 전부가 같은 조건을 본다', asis: '연도 · 사업 · 발전모델이 20개 넘는 화면의 조회 첫 줄에 반복(핵심 9)', demo: { label: '상단바', to: '/sp/intake' }, file: 'sp/SpContext.vue · app/TopBar.vue', need: (s) => listLike(s) && !any(s.gnb, '계정', '정보수정', '업무게시판') },
  { no: 2, group: '셸', name: '메뉴 옆 처리 대기 건수', what: '미처리 건수를 해당 메뉴 옆 숫자로. 그룹을 접어도 합이 보인다', asis: '상단 바의 금일등록 · 미처리 · 처리중 3개 숫자(08 §1)', demo: { label: '사이드바', to: '/sp/intake' }, file: 'layouts/Shell.vue', need: ids('G-006', 'S-003-02', 'S-003-04', 'S-003-08', 'S-001-04', 'S-001-02') },
  { no: 3, group: '셸', name: '시스템 전환', what: '같은 셸에 여러 관리 시스템. 브랜드를 누르면 바꾼다', asis: '(미리보기 전용 — 샘플 화면과 지원 사업을 오간다)', demo: { label: '상단바 브랜드', to: '/sp' }, file: 'app/TopBar.vue', need: () => false },
  { no: 4, group: '셸', name: '세션 만료 알림', what: '만료 2분 전 초 단위 안내 · 새로고침 없이 연장 · 쓰는 중이면 자동 연장', asis: 'G-004 — 만료 뒤 모달, 연장은 새로고침이라 쓰던 내용이 날아간다', demo: { label: '상단바 사용자 › 세션 만료 알림 보기', to: '/sp' }, file: 'app/SessionGuard.vue', need: () => false },
  { no: 5, group: '목록·표', name: '서버 페이징', what: '쪽 번호 + 쪽당 5~100건. 쪽을 넘기면 선택이 풀린다', asis: '거의 전 목록(기본 20건). 회원 십만 단위 · 기업 만 단위', demo: { label: '접수·자격심사 목록', to: '/sp/intake' }, file: 'ws/WsPager.vue', need: listLike },
  { no: 6, group: '목록·표', name: '2단 머리글 집계표', what: '묶음 머리글 + 묶음 경계 굵은 선 + 합계 행 + 숫자 누르면 그 조건으로 조회', asis: '접수 파이프라인 16지표 · 사이트 5×조치 5 · 잔여금 12열 · 이용정지 7×7', demo: { label: '접수 파이프라인', to: '/sp/intake' }, file: 'ws/layout.css .ws-gtb .g', need: (s) => any(s.type, '집계') || ids('S-003-02', 'S-001-04')(s) },
  { no: 7, group: '목록·표', name: '복합 셀 → 열 분할', what: '한 칸 줄바꿈 값을 2단 머리글 열로 나눈다. 행 35 유지, 칸마다 정렬', asis: '참여인원(최초/추가/최종) · 배정/사용/환불 포인트 · 담당자명/휴대폰/이메일', demo: { label: '기초정보 심사 목록', to: '/sp/basic-info' }, file: 'Tabulator column groups', need: ids('S-003-04', 'S-003-05', 'S-003-07', 'S-004-01', 'S-005-02', 'S-005-03', 'S-006-02', 'S-003-10', 'S-003-11') },
  { no: 8, group: '목록·표', name: '금액 단위 · 재원 쌍', what: '원 · 천원 · 백만원 · 억원 전환. 기업+개인 / 지원기관 쌍과 3:1 확인', asis: '수백억 합계를 원 단위로 표기, 재원 2분할 금액 열(핵심 1)', demo: { label: '잔여금 현황', to: '/sp/remaining' }, file: 'sp/money.ts', need: (s) => any(s.gnb, '정산', '임직원정산') || ids('S-003-08', 'S-003-09')(s) },
  { no: 9, group: '목록·표', name: '그리드 칸 안 버튼 · 링크', what: '행마다 변경 · 보기 · 상세 링크. 행 35 안에 24px', asis: '변경 · 미리보기 · 상세내역 · 글 상세보기 칸', demo: { label: '접수 목록 변경 · 서류 칸', to: '/sp/intake' }, file: 'ws/controls.css .ws-cellbtn', need: (s) => s.write && listLike(s) },
  { no: 10, group: '조회 영역', name: '기간 입력', what: '기준 선택 + 시작~종료(타자 가능) + 빠른 선택 + 범위 제한을 칸 아래에서 알림', asis: '오늘 · 1주일 · 1개월 · 6개월 · 12개월, 최대 4년 · 12개월 제한을 alert로(08 §3·§6)', demo: { label: '접수·자격심사 조회', to: '/sp/intake' }, file: 'ws/WsPeriod.vue', need: (s) => listLike(s) && !ids('S-003-01', 'S-003-17')(s) },
  { no: 11, group: '조회 영역', name: '선택지 많은 라디오 줄', what: '상태 8 · 기업구분 7을 한 줄에. 넘치면 접힌다(상세조회)', asis: '자격심사 상태 8 · 기업구분 7 · 조치여부 5 라디오', demo: { label: '접수·자격심사 조회', to: '/sp/intake' }, file: 'ws/controls.css .ws-choices', need: (s) => listLike(s) && s.type !== '집계' },
  { no: 12, group: '조회 영역', name: '찾아서 고르는 칸', what: '읽기 전용 칸 + 찾기 + 선택취소. 칸에 타자를 치면 그 글자로 찾기가 열린다', asis: '기업/부서 트리 팝업 · 전체고객사보기 — 칸이 readonly라 타자가 안 먹었다', demo: { label: '잔여금 고객사', to: '/sp/remaining' }, file: 'ws/WsPickField.vue', need: ids('S-004-01', 'S-004-02', 'S-005-03', 'S-005-02', 'S-006-03') },
  { no: 13, group: '처리', name: '처리 확인 팝업(대외 통지)', what: '대상 건수 + 사유 · 날짜 + "LMS · E-Mail이 나간다"를 버튼 바로 위에', asis: '모달 21개 — 거의 전부 기업담당자 LMS · E-Mail 발송 동반(A2)', demo: { label: '기초정보 등록승인', to: '/sp/basic-info' }, file: 'ws/WsActionDialog.vue', need: (s) => any(s.ext, 'LMS', 'Email') },
  { no: 14, group: '처리', name: '경고 후 계속', what: '막지 않고 알린다. 건수와 해당 대상을 보여 주고 확인하면 넘어간다', asis: '참여불가회원 알림 — 페이지 이동 / 다음단계 / 닫기', demo: { label: '기초정보 등록승인', to: '/sp/basic-info' }, need: ids('S-003-04', 'S-003-10', 'S-003-05') },
  { no: 15, group: '처리', name: '되돌릴 수 없는 일괄 처리 흐름', what: '조건 → 대상 확인(드라이런 · 예외) → 건수 입력 확인 → 결과 · 감사 기록', asis: '일괄 참여 취소 · 전체 승인취소 · 일괄 이용정지 — 되돌리기 없음(핵심 10)', demo: { label: '일괄 참여 취소', to: '/sp/bulk-cancel' }, file: 'pages/sp/BulkCancelPage.vue', need: (s) => any(s.type, '일괄') },
  { no: 16, group: '처리', name: '부분 실패 결과 보고', what: '처리 완료 · 처리 실패 · 통지 실패(상태는 바뀜)를 따로 센다. 실패 목록 · 재발송', asis: '"선정완료 처리 되었으나 SMS 발송 실패하였습니다" — 처리와 발송이 분리', demo: { label: '접수 선정 처리', to: '/sp/intake' }, file: 'ws/WsResultDialog.vue', need: (s) => any(s.ext, 'LMS', 'Email') || any(s.type, '일괄') },
  { no: 17, group: '처리', name: '상태 뱃지 · 생애주기 단계', what: '27개 상태를 코드 사전 한 벌로. 상세에 본선 6단계 + 이탈 가지', asis: '같은 코드에 화면마다 다른 라벨 6건(핵심 2)', demo: { label: '기초정보 상세', to: '/sp/basic-info' }, file: 'sp/SpStatus.vue · ws/WsStepTrack.vue', need: (s) => any(s.type, '처리') },
  { no: 18, group: '상세·파일', name: '긴 상세 — 구획 바로가기 · 하단 버튼줄', what: '위에 따라오는 구획 바로가기, 아래 따라오는 저장. 고친 게 있으면 저장이 켜진다', asis: '기초정보 상세 2,000px+ · 적발 상세 32항목, 저장은 맨 아래', demo: { label: '기초정보 상세', to: '/sp/basic-info' }, file: 'ws/WsAnchorNav.vue · .ws-actionbar', need: ids('S-003-04', 'S-003-05', 'S-001-04', 'S-003-07', 'S-004-01', 'S-002-01', 'S-005-01') },
  { no: 19, group: '상세·파일', name: '첨부 미리보기', what: '옆 패널 하나에 여러 파일. 목록 맥락을 가리지 않는다', asis: '제출서류 · 통장사본 · 계좌 미리보기가 각각 다른 팝업 창', demo: { label: '접수 목록 서류 칸', to: '/sp/intake' }, file: 'ws/WsFileView.vue', need: ids('S-003-02', 'S-003-04', 'S-003-05', 'S-003-09', 'S-001-04', 'S-005-01') },
  { no: 20, group: '상세·파일', name: '업로드 제약', what: '용량 · 확장자 · 파일명 길이 · 이미지 규격을 고르기 전에 보이고 바로 검증', asis: '1MB · jpg/png · 150자 · 규격 — 저장 시 alert, 문구 복사 흔적 `(이미지파일)`', demo: { label: '메인 배너 등록', to: '/sp/banners' }, file: 'ws/WsUpload.vue', need: (s) => any(s.ext, '파일') },
  { no: 21, group: '상세·파일', name: '엑셀 업로드(양식 · 행별 오류)', what: '양식 받기 → 올리기 → 행별 오류 보고 → 고쳐서 다시', asis: '참여 기업 등록 — "업로드 양식이 맞지 않습니다" 한 줄뿐', demo: { label: '참여 기업 등록', to: '/sp/upload' }, file: 'pages/sp/UploadPage.vue', need: ids('S-003-14', 'S-002-04') },
  { no: 22, group: '상세·파일', name: '컨텐츠 진행상태 자동', what: '전시기간과 오늘로 대기중 · 진행중 · 종료를 계산. 순서는 위 · 아래로', asis: '팝업관리에만 자동 상태, 순서는 숫자 직접 입력(0~999999)', demo: { label: '메인 배너', to: '/sp/banners' }, file: 'pages/sp/BannerPage.vue', need: (s) => s.type === 'CMS' },
  { no: 23, group: '상세·파일', name: '집계 기준 표시', what: '실시간 · 배치(기준 시각)를 제목 옆에. 두 화면 숫자가 다를 때 이유가 보인다', asis: '일일 리포트에만 빨간 본문 안내 — 같은 지표가 화면마다 다르다(D-10)', demo: { label: '일일 리포트', to: '/sp/daily-report' }, file: 'ws/layout.css .ws-fresh', need: (s) => any(s.ext, '배치') || any(s.type, '집계') },
  { no: 24, group: '상세·파일', name: '탭 넘침', what: '9탭 이상 · 긴 탭 이름 — 좌우 넘김', asis: '국회요구자료 9탭 · 참여신청 8탭', demo: { label: '국회요구자료', to: '/sp/assembly' }, file: 'PrimeVue Tabs scrollable', need: ids('S-006-05', 'S-009-03') },
  { no: 25, group: '개인정보·권한', name: '엑셀 다운로드 세 관문', what: '건수 상한을 버튼 옆에 미리 + 재인증 + 반출 사유(선택 3 · 직접 10~200자)', asis: '전 화면 공통 모듈 C-001, 상한 1만 · 2만 · 5만', demo: { label: '모든 목록의 엑셀 버튼', to: '/sp/intake' }, file: 'ws/WsDownload.vue', need: (s) => (s.pii === '상' || s.pii === '중') && s.type !== 'CMS' },
  { no: 26, group: '개인정보·권한', name: '개인정보 가림 · 열람 기록', what: '목록은 늘 가리고 상세에서 열면 기록', asis: '반출은 통제하면서 조회는 평문(09 개인정보)', demo: { label: '스크래핑 목록 · 상세', to: '/sp/scraping' }, file: 'ws/mask.ts · ws/WsMasked.vue', need: (s) => s.pii === '상' },
  { no: 27, group: '개인정보·권한', name: '버튼 단위 권한', what: '권한이 없으면 버튼을 끄고 필요한 역할을 옆에 적는다(숨기지 않는다)', asis: '"이용정지 변경 권한이 없습니다" — 메뉴 권한과 동작 권한이 따로(핵심 8)', demo: { label: '일괄 참여 취소 최종 확인', to: '/sp/bulk-cancel' }, file: 'sp/context.ts can()', need: (s) => s.write && any(s.type, '처리', '일괄') },
  { no: 28, group: '목록·표', name: '건수 붙은 상태 탭', what: '상태를 업무 단계 몇 개로 묶어 건수를 먼저 보이고, 누르면 바로 거른다. 하위 상태만 칩으로 편다', asis: '기업관리 상태 라디오 15개 — 몇 건인지는 하나씩 눌러 봐야 안다', demo: { label: '참여 기업 관리', to: '/sp/company' }, file: 'ws/WsCountTabs.vue', need: (s) => any(s.type, '처리') && listLike(s) },
  { no: 29, group: '처리', name: '상태별 허용 처리(행 메뉴)', what: '행마다 다른 버튼 대신 처리 메뉴 하나 — 그 상태에서 할 수 있는 것만. 규칙은 표 한 곳', asis: '상태에 따라 행 버튼이 확인서파기 · 인원변경 또는 신청으로 바뀐다 — 규칙이 템플릿에 흩어짐', demo: { label: '참여 기업 관리 처리 ▾', to: '/sp/company' }, file: 'sp/company.ts', need: (s) => s.write && any(s.type, '처리') },
  { no: 30, group: '처리', name: '일괄 적격 미리보기', what: '일괄 버튼에 "할 수 있는 곳 / 선택"을 싣고, 빠지는 곳을 실행 전에 보인다', asis: '"총 N건중 M건 성공" 알림 하나 — 어느 곳이 빠졌는지 실행 뒤에도 모른다(에스크로 R-1)', demo: { label: '참여 기업 관리 일괄 버튼', to: '/sp/company' }, need: (s) => any(s.type, '일괄') },
  { no: 31, group: '처리', name: '처리 경로 표시', what: '같은 버튼이 다른 경로(에스크로 등)를 타면 확인 팝업에 드러낸다', asis: '단건은 일반, 일괄은 에스크로 경로 — 버튼 모양이 같아 운영자가 모른다(에스크로 R-3)', demo: { label: '참여 기업 관리 입금기한 변경', to: '/sp/company' }, need: ids('S-003-04', 'S-003-10', 'S-003-05', 'S-003-08') },
  { no: 32, group: '목록·표', name: '열 묶음 표시 설정', what: '열이 많은 목록은 기본 열만 두고 계좌 · 첨부 같은 묶음을 켜고 끈다', asis: '기업관리 20열 · 참여회원현황 · 포인트조회 — 한 화면에 다 안 들어간다', demo: { label: '참여 기업 관리 열 묶음', to: '/sp/company' }, need: ids('S-003-05', 'S-003-07', 'S-004-01', 'S-004-02', 'S-003-04', 'S-005-03') },
  { no: 33, group: '조회 영역', name: '조회 전 필수 조건 안내', what: '필수 조건(기업 등)을 고르기 전에는 목록 자리에 무엇을 골라야 하는지 적는다 — 빈 결과와 구분', asis: '포인트조회 — 기업을 안 고르면 "총 0건"만. 이유를 말하지 않는다', demo: { label: '포인트 조회', to: '/sp/point' }, need: ids('S-004-01', 'S-004-02', 'S-005-03') },
  { no: 34, group: '개인정보·권한', name: '개인정보 열 기본 숨김', what: '생년월일 · ID · 계좌는 열 묶음을 켜야 보이고, 켜도 가려져 있다', asis: '참여회원현황 — 회원명 · 생년월일 · ID · 환불계좌가 한 행에 평문', demo: { label: '참여회원 현황 열 묶음', to: '/sp/member' }, need: (s) => s.pii === '상' && listLike(s) },
  { no: 35, group: '처리', name: '계좌 확인(예금주 일치)', what: '환불계좌는 예금주 확인을 통과해야 저장된다. 통장사본을 같이 받는다', asis: '계좌인증 칸은 있는데 어디서 인증하는지 화면에 없다', demo: { label: '참여회원 현황 › 환불계좌 등록', to: '/sp/member' }, need: ids('S-003-07', 'S-003-09', 'S-003-05', 'S-003-04') },
]
