/**
 * AS-IS 화면 54개 — 비공개 AS-IS 분석의 화면 목록(2depth)에서 뽑았다. 이름은 사업 식별어를 빼고 일반화했다.
 * 손으로 고치지 않는다. 원본이 바뀌면 다시 뽑는다. 행 데이터(개인정보)는 들어 있지 않다 — 구조만이다.
 */
export interface AsisScreen {
  id: string
  gnb: string
  name: string
  type: string
  write: boolean
  /** 재구축 난이도 1~5. 진입 불가·조사 제외는 null */
  level: number | null
  why: string
  ext: string
  pii: string
  /** 같은 URL을 다른 메뉴에 건 경우 원본 화면 ID */
  dup: string | null
}

export const ASIS: AsisScreen[] = [
  {"id": "S-001-01", "gnb": "업무게시판", "name": "공지사항관리", "type": "조회·등록", "write": true, "level": 2, "why": "표준 게시판", "ext": "파일", "pii": "하", "dup": null},
  {"id": "S-001-02", "gnb": "업무게시판", "name": "업무요청", "type": "처리", "write": true, "level": 3, "why": "카테고리 13·처리상태 4", "ext": "", "pii": "중", "dup": null},
  {"id": "S-001-03", "gnb": "업무게시판", "name": "부정행위 신고센터 관리", "type": "처리", "write": true, "level": 3, "why": "외부 신고 접수·답변", "ext": "Email", "pii": "중", "dup": null},
  {"id": "S-001-04", "gnb": "업무게시판", "name": "부정행위 관리(스크래핑)", "type": "조회·처리", "write": true, "level": 5, "why": "배치 스크래핑+교차집계", "ext": "배치,스크래핑", "pii": "상", "dup": null},
  {"id": "S-001-05", "gnb": "업무게시판", "name": "부적합 상품 모니터링", "type": "조회", "write": false, "level": 2, "why": "부적합 키워드 선별", "ext": "", "pii": "하", "dup": null},
  {"id": "S-002-01", "gnb": "정책 및 조직", "name": "지원사업 사업관리", "type": "등록", "write": true, "level": 4, "why": "전 화면 마스터", "ext": "", "pii": "하", "dup": null},
  {"id": "S-002-02", "gnb": "정책 및 조직", "name": "지원사업 발전모델관리", "type": "등록", "write": true, "level": 3, "why": "참여년수×기업구분", "ext": "", "pii": "하", "dup": null},
  {"id": "S-002-03", "gnb": "정책 및 조직", "name": "지원사업 인원관리", "type": "집계·등록", "write": true, "level": 3, "why": "분 단위 기간 설정. 저장 기능", "ext": "", "pii": "하", "dup": null},
  {"id": "S-002-04", "gnb": "정책 및 조직", "name": "참여불가기업관리", "type": "등록·일괄", "write": true, "level": 3, "why": "기업 블랙리스트", "ext": "", "pii": "중", "dup": null},
  {"id": "S-002-05", "gnb": "정책 및 조직", "name": "참여불가회원관리", "type": "등록", "write": true, "level": 4, "why": "개인 제재. 기간제. 관리자전용", "ext": "", "pii": "상", "dup": null},
  {"id": "S-003-01", "gnb": "회원관리", "name": "전체 기업정보", "type": "내보내기", "write": false, "level": 1, "why": "목록·조회 버튼 없음", "ext": "", "pii": "상", "dup": null},
  {"id": "S-003-02", "gnb": "회원관리", "name": "지원사업(접수·자격심사)", "type": "처리·일괄", "write": true, "level": 5, "why": "파이프라인 16지표+LMS/EM 일괄발송", "ext": "LMS,Email", "pii": "중", "dup": null},
  {"id": "S-003-03", "gnb": "회원관리", "name": "담당자관리", "type": "조회·등록", "write": true, "level": 2, "why": "등록→가입 2단계 · 관리 버튼은 기업 기초정보 상세와 같은 화면", "ext": "", "pii": "중", "dup": "S-003-04-D"},
  {"id": "S-003-04", "gnb": "회원관리", "name": "기초정보관리", "type": "처리·일괄", "write": true, "level": 5, "why": "모달 8+일괄 3종+블랙리스트 검출", "ext": "LMS,Email", "pii": "상", "dup": null},
  {"id": "S-003-05", "gnb": "회원관리", "name": "기업관리", "type": "처리·일괄", "write": true, "level": 5, "why": "모달 6+상태 15+에스크로+업로드", "ext": "LMS,Email,파일,에스크로", "pii": "상", "dup": null},
  {"id": "S-003-06", "gnb": "회원관리", "name": "동반성장 기관관리", "type": "조회·등록", "write": true, "level": 3, "why": "기관-지원기업-참가자 3계층", "ext": "", "pii": "중", "dup": null},
  {"id": "S-003-07", "gnb": "회원관리", "name": "참여회원현황", "type": "처리", "write": true, "level": 4, "why": "회원상태 8×기업상태 18+권한체크", "ext": "LMS,Email", "pii": "상", "dup": null},
  {"id": "S-003-08", "gnb": "회원관리", "name": "지원기관 입금확인", "type": "처리", "write": true, "level": 3, "why": "가상계좌 입금 완료/취소", "ext": "", "pii": "상", "dup": null},
  {"id": "S-003-09", "gnb": "회원관리", "name": "지원기관 환불내역확인", "type": "처리", "write": true, "level": 4, "why": "은행코드+환불수단 전이 제약", "ext": "", "pii": "상", "dup": null},
  {"id": "S-003-10", "gnb": "회원관리", "name": "new (RPA)기초정보관리", "type": "처리·일괄", "write": true, "level": 3, "why": "구 화면과 코드 동일, 라벨만 다름", "ext": "LMS,Email", "pii": "상", "dup": null},
  {"id": "S-003-11", "gnb": "회원관리", "name": "new (RPA)참여회원현황", "type": "처리", "write": true, "level": 3, "why": "성별·외부기관 연계 필터 추가", "ext": "LMS,Email", "pii": "상", "dup": null},
  {"id": "S-003-12", "gnb": "회원관리", "name": "new (RPA)기업관리", "type": "처리", "write": true, "level": 2, "why": "상태 2종으로 축소", "ext": "파일", "pii": "상", "dup": null},
  {"id": "S-003-13", "gnb": "회원관리", "name": "(회원별)포인트 사용기간 관리", "type": "등록", "write": true, "level": 2, "why": "금전 영향", "ext": "", "pii": "중", "dup": null},
  {"id": "S-003-14", "gnb": "회원관리", "name": "참여 기업 등록", "type": "등록", "write": true, "level": 4, "why": "엑셀 일괄. 상태 21·경로 9 지정", "ext": "파일", "pii": "상", "dup": null},
  {"id": "S-003-15", "gnb": "회원관리", "name": "일괄 참여 취소", "type": "일괄", "write": true, "level": 5, "why": "비가역 대량 처리+예외 화이트리스트", "ext": "", "pii": "상", "dup": null},
  {"id": "S-003-16", "gnb": "회원관리", "name": "참여증서 발급", "type": "등록", "write": true, "level": 2, "why": "참여년도 2019~", "ext": "문서생성", "pii": "중", "dup": null},
  {"id": "S-003-17", "gnb": "회원관리", "name": "매스마케팅", "type": "조회", "write": false, "level": 1, "why": "폼 요소 없음", "ext": "", "pii": "중", "dup": null},
  {"id": "S-004-01", "gnb": "임직원정산", "name": "포인트조회", "type": "조회·집계", "write": false, "level": 4, "why": "포인트 26종+재직상태 10", "ext": "", "pii": "상", "dup": null},
  {"id": "S-004-02", "gnb": "임직원정산", "name": "이용내역조회", "type": "조회", "write": false, "level": 4, "why": "제휴사 필터+주민번호 검색", "ext": "", "pii": "상", "dup": null},
  {"id": "S-004-03", "gnb": "임직원정산", "name": "입금확인", "type": "처리", "write": true, "level": null, "why": "**회원관리와 같은 화면. 메뉴만 다름**", "ext": "", "pii": "상", "dup": "S-003-08"},
  {"id": "S-004-04", "gnb": "임직원정산", "name": "환불확인", "type": "처리", "write": true, "level": null, "why": "**회원관리와 같은 화면. 메뉴만 다름**", "ext": "", "pii": "상", "dup": "S-003-09"},
  {"id": "S-005-01", "gnb": "정산", "name": "전자청구서", "type": "처리", "write": true, "level": 3, "why": "월별 청구서 승인", "ext": "", "pii": "중", "dup": null},
  {"id": "S-005-02", "gnb": "정산", "name": "청구내역", "type": "조회", "write": false, "level": 2, "why": "재원 2분할", "ext": "", "pii": "상", "dup": null},
  {"id": "S-005-03", "gnb": "정산", "name": "잔여금현황", "type": "집계", "write": false, "level": 3, "why": "4단계×2재원 12열", "ext": "", "pii": "상", "dup": null},
  {"id": "S-005-04", "gnb": "정산", "name": "환불내역", "type": "집계", "write": false, "level": 3, "why": "월·차수별. 개인/기업 분할", "ext": "", "pii": "상", "dup": null},
  {"id": "S-005-05", "gnb": "정산", "name": "일매출자료", "type": "집계", "write": false, "level": 1, "why": "하루 1행. 최단순", "ext": "", "pii": "하", "dup": null},
  {"id": "S-005-06", "gnb": "정산", "name": "청구서기능(결과 핸들러)", "type": "처리", "write": true, "level": null, "why": "**화면 아님. 액션 결과 alert만**", "ext": "", "pii": "하", "dup": null},
  {"id": "S-006-01", "gnb": "통계", "name": "사용현황", "type": "집계", "write": false, "level": null, "why": "**진입 불가(결함)**", "ext": "", "pii": "", "dup": null},
  {"id": "S-006-02", "gnb": "통계", "name": "기업세부현황", "type": "집계", "write": false, "level": 3, "why": "복합 컬럼+12개월 제한", "ext": "", "pii": "상", "dup": null},
  {"id": "S-006-03", "gnb": "통계", "name": "회원세부현황", "type": "조회", "write": false, "level": 3, "why": "대량 전건 목록. 개인정보 밀집", "ext": "", "pii": "상", "dup": null},
  {"id": "S-006-04", "gnb": "통계", "name": "일일 리포트", "type": "집계", "write": false, "level": 4, "why": "배치+템플릿 4탭+엑셀 3종", "ext": "배치", "pii": "상", "dup": null},
  {"id": "S-006-05", "gnb": "통계", "name": "국회요구자료 통계 리포트", "type": "집계", "write": false, "level": 4, "why": "리포트 9탭", "ext": "배치", "pii": "중", "dup": null},
  {"id": "S-006-06", "gnb": "통계", "name": "이용정지통계", "type": "집계", "write": false, "level": 2, "why": "사유 7×기업구분 7 교차표", "ext": "", "pii": "하", "dup": null},
  {"id": "S-007-01", "gnb": "정보수정", "name": "비밀번호 변경(3개월)", "type": "등록", "write": true, "level": null, "why": "**로그인 계정 변경 — 조사 제외**", "ext": "", "pii": "중", "dup": null},
  {"id": "S-008-01", "gnb": "계정관리", "name": "계정현황", "type": "조회", "write": false, "level": 2, "why": "계정 승인 이력", "ext": "", "pii": "중", "dup": null},
  {"id": "S-008-02", "gnb": "계정관리", "name": "계정신청", "type": "처리", "write": true, "level": 3, "why": "권한 부여. 승인대기 추가", "ext": "", "pii": "중", "dup": null},
  {"id": "S-009-01", "gnb": "컨텐츠관리", "name": "메인관리", "type": "CMS", "write": true, "level": 3, "why": "메인 배너. 전시기간·순서", "ext": "파일", "pii": "하", "dup": null},
  {"id": "S-009-02", "gnb": "컨텐츠관리", "name": "사업소개", "type": "CMS", "write": true, "level": 2, "why": "고정 블록 3개", "ext": "파일", "pii": "하", "dup": null},
  {"id": "S-009-03", "gnb": "컨텐츠관리", "name": "참여신청", "type": "CMS", "write": true, "level": 3, "why": "참여신청 페이지 배너", "ext": "파일", "pii": "하", "dup": null},
  {"id": "S-009-04", "gnb": "컨텐츠관리", "name": "적립금사용안내", "type": "CMS", "write": true, "level": 2, "why": "제휴사 안내. 순서 0-999999", "ext": "파일", "pii": "하", "dup": null},
  {"id": "S-009-05", "gnb": "컨텐츠관리", "name": "참여후기", "type": "CMS", "write": true, "level": 2, "why": "관리자가 등록·전시", "ext": "파일", "pii": "하", "dup": null},
  {"id": "S-009-06", "gnb": "컨텐츠관리", "name": "팝업관리", "type": "CMS", "write": true, "level": 3, "why": "상단배너/레이어팝업", "ext": "파일", "pii": "하", "dup": null},
  {"id": "S-010-01", "gnb": "고객센터", "name": "자주하는질문", "type": "CMS", "write": true, "level": 2, "why": "FAQ. 태그 분류", "ext": "파일", "pii": "하", "dup": null},
  {"id": "S-010-02", "gnb": "고객센터", "name": "자료실", "type": "CMS", "write": true, "level": 2, "why": "운영지침 배포처로 추정", "ext": "파일", "pii": "하", "dup": null},
]

export const asisById = (id: string) => ASIS.find((s) => s.id === id)
