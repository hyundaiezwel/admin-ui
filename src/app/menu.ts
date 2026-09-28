/**
 * LNB 메뉴 트리.
 *
 * 라우터가 아니라 여기가 정보구조의 정본이다 — 라우트는 화면 주소일 뿐이고,
 * "어디에 속한 화면인가"는 메뉴가 정한다. 브레드크럼·탭 제목도 이 트리에서 뽑는다.
 */
export interface MenuItem {
  id: string
  label: string
  to?: string
  icon?: string
  children?: MenuItem[]
  /** 처리 대기 건수. 행 오른쪽에 숫자로 단다 — 점만 찍으면 "지금 봐야 하나"가 전달되지 않는다 */
  count?: number
}

export const MENU: MenuItem[] = [
  { id: 'dashboard', label: '대시보드', to: '/', icon: 'grid' },
  {
    id: 'cs',
    label: '고객 지원',
    icon: 'chat',
    children: [
      { id: 'inquiries', label: '문의 답변 관리', to: '/cs/inquiries', count: 12 },
      { id: 'members', label: '회원 관리', to: '/cs/members' },
    ],
  },
  {
    id: 'sales',
    label: '영업 관리',
    icon: 'cart',
    children: [
      { id: 'promotions', label: '프로모션 등록·관리', to: '/sales/promotions' },
      { id: 'orders', label: '주문·정산 관리', to: '/sales/orders' },
      { id: 'products', label: '상품 등록·수정', to: '/sales/products' },
    ],
  },
  { id: 'stats', label: '통계', to: '/stats', icon: 'chart' },
  {
    id: 'system',
    label: '시스템 관리',
    icon: 'cog',
    children: [
      { id: 'catalog', label: '컴포넌트 카탈로그', to: '/system/catalog' },
      { id: 'codes', label: '공통코드', to: '/system/codes' },
    ],
  },
]

/**
 * 하단 고정 구역. 주 메뉴와 성격이 달라서 자리도 다르다 —
 * "어디로 가나"가 아니라 "시스템에 관한 것"이다. 메뉴가 길어져도 바닥에 붙어 있다.
 */
export const MENU_FOOT: MenuItem[] = [
  { id: 'help', label: '도움말', to: '/system/catalog', icon: 'info' },
  { id: 'prefs', label: '환경설정', to: '/system/codes', icon: 'cog' },
]

/** 그룹이 품은 하위 건수의 합. 접힌 그룹도 안에 쌓인 것을 알려야 한다 */
export function groupCount(item: MenuItem): number {
  return (item.children ?? []).reduce((n, c) => n + (c.count ?? 0), 0) + (item.count ?? 0)
}

/** 경로 → [1depth, 2depth] 라벨. 브레드크럼과 탭 제목이 같은 원천을 본다 */
export function trail(path: string): { top: MenuItem; leaf?: MenuItem } | null {
  for (const top of MENU) {
    if (top.to === path) return { top }
    const leaf = top.children?.find((c) => c.to === path)
    if (leaf) return { top, leaf }
  }
  return null
}

export function titleOf(path: string): string {
  const t = trail(path)
  return t ? (t.leaf?.label ?? t.top.label) : '화면'
}
