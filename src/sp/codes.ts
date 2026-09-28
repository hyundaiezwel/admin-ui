/**
 * 지원 사업 코드 사전 — **코드값은 미리보기용으로 지어낸 값이다.** 원본 시스템의 코드값을 쓰지 않는다.
 * 라벨과 단계 구분은 AS-IS 분석을 따른다. 코드는 단계별 백 단위다(1xx 접수·심사, 2xx 선정, … 8xx 환불).
 *
 * **라벨은 한 벌이다.** AS-IS는 같은 코드에 화면마다 다른 이름을 붙였다
 * (선정완료/신청완료, 계약파기/확인서파기, 환불요청/환불중). 미리보기는 정본 라벨만 쓴다.
 * 실제 구현에서는 백엔드 공통코드가 이 자리를 맡는다 — 화면에 라벨을 박지 않는다.
 */
import type { Tone } from '../ws/badge'

export type Stage = '접수·심사' | '선정' | '계약' | '기초정보' | '입금' | '운영' | '이탈' | '종료' | '환불'

export interface StateCode { code: string; label: string; stage: Stage; tone: Tone }

/** 기업 참여 상태 27종 (참여개시 하위 상태 6종 포함). 톤은 "다음에 사람이 할 일이 있나"로 준다 */
export const STATES: StateCode[] = [
  { code: '110', label: '심사중', stage: '접수·심사', tone: 'info' },
  { code: '120', label: '정상접수', stage: '접수·심사', tone: 'neutral' },
  { code: '130', label: '보완필요', stage: '접수·심사', tone: 'warning' },
  { code: '131', label: '심사 미대상', stage: '접수·심사', tone: 'mute' },
  { code: '139', label: '참여취소(심사미대상)', stage: '이탈', tone: 'danger' },
  { code: '210', label: '선정대기', stage: '선정', tone: 'info' },
  { code: '220', label: '선정완료', stage: '선정', tone: 'brand' },
  { code: '310', label: '계약완료', stage: '계약', tone: 'brand' },
  { code: '320', label: '미체결', stage: '계약', tone: 'warning' },
  { code: '330', label: '대기(후순위)', stage: '계약', tone: 'mute' },
  { code: '390', label: '계약파기(반려)', stage: '이탈', tone: 'danger' },
  { code: '410', label: '최종제출', stage: '기초정보', tone: 'info' },
  { code: '510', label: '등록승인(입금중)', stage: '입금', tone: 'warning' },
  { code: '520', label: '입금완료', stage: '입금', tone: 'success' },
  { code: '590', label: '참여취소(미입금)', stage: '이탈', tone: 'danger' },
  { code: '610', label: '참여개시', stage: '운영', tone: 'success' },
  { code: '611', label: '참여개시·등록완료', stage: '운영', tone: 'success' },
  { code: '612', label: '참여개시·보완필요', stage: '운영', tone: 'warning' },
  { code: '613', label: '참여개시·입금중', stage: '운영', tone: 'warning' },
  { code: '614', label: '참여개시·입금완료', stage: '운영', tone: 'success' },
  { code: '615', label: '참여개시·추가취소', stage: '운영', tone: 'mute' },
  { code: '616', label: '참여개시·추가완료', stage: '운영', tone: 'success' },
  { code: '710', label: '이용정지', stage: '종료', tone: 'danger' },
  { code: '810', label: '환불요청', stage: '환불', tone: 'warning' },
  { code: '820', label: '환불대상', stage: '환불', tone: 'info' },
  { code: '830', label: '환불완료', stage: '환불', tone: 'mute' },
  { code: '840', label: '환불실패', stage: '환불', tone: 'danger' },
]
export const stateOf = (code: string) => STATES.find((s) => s.code === code)

/** 생애주기 본선 — 상세 화면 단계 표시가 이 순서로 그린다. 이탈·종료·환불은 본선 밖 가지다 */
export const MAIN_LINE: Stage[] = ['접수·심사', '선정', '계약', '기초정보', '입금', '운영']

/** 접수 화면에서 쓰는 자격심사 상태 부분집합 */
export const SCREENING = ['110', '120', '130', '131', '139', '210', '220']
/** 기초정보 심사 화면의 부분집합 */
export const BASIC_INFO = ['410', '510', '520', '610', '320', '390', '590']

export const CO_FG = [
  { code: '1', label: '소상공인' }, { code: '2', label: '소기업' }, { code: '3', label: '중기업' },
  { code: '4', label: '중견기업' }, { code: '5', label: '비영리민간단체' }, { code: '6', label: '사회복지법인·시설' },
  { code: '7', label: '의료법인' },
]
export const coFgLabel = (c: string) => CO_FG.find((x) => x.code === c)?.label ?? c

export const BIZ = [
  { code: 'BIZ-26-01', label: '26년 기본 지원사업' },
  { code: 'BIZ-26-02', label: '26년 누적참여 5년차 이상 중기업' },
  { code: 'BIZ-26-03', label: '26년 중견기업 추가참여' },
  { code: 'BIZ-26-04', label: '26년 지역 연계 지원사업' },
]
export const bizLabel = (c: string) => BIZ.find((x) => x.code === c)?.label ?? c

export const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018]

/**
 * 역할 4등급. 조사 계정은 506뿐이라 **위 셋의 권한 범위는 미확인이다**(분석 핵심 8).
 * 미리보기의 권한 규칙은 가정이고, 화면에도 그렇게 적는다.
 */
export const ROLES = [
  { code: 'R1', label: '기관 담당자', rank: 1 },
  { code: 'R2', label: '지원담당', rank: 2 },
  { code: 'R3', label: '지원총괄', rank: 3 },
  { code: 'R4', label: '사업총괄', rank: 4 },
]

export const SUSPEND_REASONS = [
  '퇴사(이직)', '개인사유(근로자 자유의지)', '신분변경(대상 → 비대상)', '기업경영악화(인수/합병 등)',
  '복지제도 변경', '동반성장모델 지원 기한 종료', '기타',
]

export const SITES = ['중고거래 A', '중고거래 B', '중고거래 C', '중고거래 D']
export const HANDLE = [
  { code: '1', label: '조치필요', tone: 'warning' as Tone },
  { code: '2', label: '조치완료', tone: 'success' as Tone },
  { code: '3', label: '조치불가', tone: 'mute' as Tone },
  { code: '4', label: '미결', tone: 'info' as Tone },
]
export const REPORT = [
  { code: '0', label: '미제출' }, { code: '1', label: '제출완료' }, { code: '2', label: '정지철회' },
]
export const USED_AFTER = [
  { code: 'S1', label: '판매완료' }, { code: 'S0', label: '미판매' }, { code: 'U1', label: '사용' }, { code: 'U0', label: '미사용' },
]
