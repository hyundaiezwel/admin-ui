/**
 * LNB 메뉴 트리.
 *
 * 라우터가 아니라 여기가 정보구조의 정본이다 — 라우트는 화면 주소일 뿐이고,
 * "어디에 속한 화면인가"는 메뉴가 정한다. 브레드크럼·탭 제목도 이 트리에서 뽑는다.
 */
import { SP_MENU, SP_FOOT } from '../sp/menu'

export interface MenuItem {
  id: string
  label: string
  to?: string
  icon?: string
  children?: MenuItem[]
  /** 처리 대기 건수. 행 오른쪽에 숫자로 단다 — 점만 찍으면 "지금 봐야 하나"가 전달되지 않는다 */
  count?: number
  /** 지원 사업 미리보기 — 이 자리가 흡수한 AS-IS 화면 ID */
  asis?: string[]
  /** 지원 사업 미리보기 — 합치거나 옮긴 이유 */
  note?: string
  /** 지원 사업 미리보기 — 실제로 그린 화면인가(아니면 설계 카드) */
  built?: boolean
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

/**
 * 시스템 — 같은 셸이 둘을 싣는다. **주소가 정한다**(`/sp`로 시작하면 지원 사업).
 * 상태로 두면 새로고침·딥링크에서 사이드바와 본문이 서로 다른 시스템을 가리킬 수 있다.
 */
export interface SystemDef { id: 'sample' | 'sp'; label: string; home: string; menu: MenuItem[]; foot: MenuItem[] }
export const SYSTEMS: SystemDef[] = [
  { id: 'sample', label: '관리자센터', home: '/', menu: MENU, foot: MENU_FOOT },
  { id: 'sp', label: '지원 사업 관리', home: '/sp', menu: SP_MENU, foot: SP_FOOT },
]
export const systemOf = (path: string) => (path === '/sp' || path.startsWith('/sp/') ? SYSTEMS[1] : SYSTEMS[0])

/** 그룹이 품은 하위 건수의 합. 접힌 그룹도 안에 쌓인 것을 알려야 한다 */
export function groupCount(item: MenuItem): number {
  return (item.children ?? []).reduce((n, c) => n + (c.count ?? 0), 0) + (item.count ?? 0)
}

/**
 * 경로 → [1depth, 2depth] 라벨. 브레드크럼과 탭 제목이 같은 원천을 본다.
 *
 * 상세 화면(`/sp/basic-info/C-0001`)은 메뉴에 없다 — 가장 긴 접두 메뉴를 부모로 잡고
 * `detail`에 나머지를 돌려준다. 상세가 주소를 갖는 게 요점이다: AS-IS는 폼 POST로만
 * 열려서 딥링크·새로고침·탭이 안 됐다(N-3·N-4).
 */
export function trail(path: string): { top: MenuItem; leaf?: MenuItem; detail?: string } | null {
  const sys = systemOf(path)
  const all = [...sys.menu, ...sys.foot]
  for (const top of all) {
    if (top.to === path) return { top }
    const leaf = top.children?.find((c) => c.to === path)
    if (leaf) return { top, leaf }
  }
  for (const top of all) {
    for (const leaf of top.children ?? [top]) {
      if (leaf.to && leaf.to !== '/sp' && path.startsWith(leaf.to + '/')) {
        return leaf === top ? { top, detail: path.slice(leaf.to.length + 1) } : { top, leaf, detail: path.slice(leaf.to.length + 1) }
      }
    }
  }
  return null
}

export function titleOf(path: string): string {
  const t = trail(path)
  if (!t) return '화면'
  const base = t.leaf?.label ?? t.top.label
  return t.detail ? `${base} · ${t.detail}` : base
}
