/**
 * 공지사항 등록 — 목업 동작. 공용 컴포넌트(`src/ws`)에는 목업을 두지 않으므로 여기 모은다.
 * 실제 구현에서는 업로드 API · 저장 API가 이 자리를 맡는다.
 */

// MOCK(notice): data 게시 대상 — 요구사항 확정 전 가정(전체 / 기업담당자 / 근로자)
export const NOTICE_TARGETS = [
  { label: '전체', value: 'ALL' },
  { label: '기업담당자', value: 'MANAGER' },
  { label: '근로자', value: 'WORKER' },
] as const

// MOCK(notice): code 글자 수 상한 — 제목 100자는 지시서, 본문 5,000자는 가정
export const TITLE_MAX = 100
export const BODY_MAX = 5000

/**
 * 본문 이미지 업로드.
 * MOCK(notice): result 이미지 업로드 — 실제는 업로드 API가 준 URL. 지금은 잠깐 기다린 뒤 브라우저 안 임시 주소(blob:)를 돌려준다
 */
export async function mockUploadImage(file: File): Promise<{ url: string; alt?: string }> {
  await new Promise((r) => setTimeout(r, 600))
  return { url: URL.createObjectURL(file), alt: file.name.replace(/\.[^.]+$/, '') }
}

/** MOCK(notice): result 저장 흉내 — 서버를 부르지 않고 지어낸 공지 번호를 돌려준다 */
export async function mockSaveNotice(): Promise<{ id: string }> {
  await new Promise((r) => setTimeout(r, 400))
  return { id: `N-${String(Math.floor(Math.random() * 9000) + 1000)}` }
}
