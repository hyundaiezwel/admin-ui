import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Shell from './layouts/Shell.vue'
import { titleOf } from './app/menu'

/**
 * 해시 히스토리 — GitHub Pages는 정적 호스팅이라 깊은 주소를 새로고침하면 404가 난다.
 * 샘플 화면은 DS1과 **같은 열 개**다. 두 디자인 시스템을 같은 화면으로 나란히 비교하기 위해서다.
 * `/sp`는 지원 사업 관리 미리보기다 — 같은 셸이 두 시스템을 싣는다(menu.ts `SYSTEMS`).
 */
const routes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('./pages/LoginPage.vue') },
  {
    path: '/',
    component: Shell,
    children: [
      { path: '', component: () => import('./pages/DashboardPage.vue') },
      { path: 'cs/inquiries', component: () => import('./pages/InquiryPage.vue') },
      { path: 'cs/members', component: () => import('./pages/MemberPage.vue') },
      { path: 'sales/promotions', component: () => import('./pages/PromotionPage.vue') },
      { path: 'sales/orders', component: () => import('./pages/OrderPage.vue') },
      { path: 'sales/products', component: () => import('./pages/ProductFormPage.vue') },
      { path: 'stats', component: () => import('./pages/StatsPage.vue') },
      { path: 'system/catalog', component: () => import('./pages/CatalogPage.vue') },
      { path: 'system/codes', component: () => import('./pages/CodePage.vue') },
      // 지원 사업 관리 — IA 확정 전 미리보기. 제안 메뉴는 src/sp/menu.ts
      { path: 'sp', component: () => import('./pages/sp/IaPage.vue') },
      { path: 'sp/elements', component: () => import('./pages/sp/ElementsPage.vue') },
      { path: 'sp/intake', component: () => import('./pages/sp/IntakePage.vue') },
      { path: 'sp/basic-info', component: () => import('./pages/sp/BasicInfoPage.vue') },
      { path: 'sp/basic-info/:id', component: () => import('./pages/sp/BasicInfoDetailPage.vue') },
      { path: 'sp/company', component: () => import('./pages/sp/CompanyPage.vue') },
      { path: 'sp/bulk-cancel', component: () => import('./pages/sp/BulkCancelPage.vue') },
      { path: 'sp/scraping', component: () => import('./pages/sp/ScrapingPage.vue') },
      { path: 'sp/scraping/:id', component: () => import('./pages/sp/ScrapingDetailPage.vue') },
      { path: 'sp/remaining', component: () => import('./pages/sp/RemainingPage.vue') },
      { path: 'sp/remaining/:id', component: () => import('./pages/sp/RemainingDetailPage.vue') },
      { path: 'sp/daily-report', component: () => import('./pages/sp/DailyReportPage.vue') },
      { path: 'sp/banners', component: () => import('./pages/sp/BannerPage.vue') },
      { path: 'sp/p/:id', component: () => import('./pages/sp/PendingPage.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({ history: createWebHashHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

router.afterEach((to) => {
  document.title = `${to.path === '/login' ? '로그인' : titleOf(to.path)} — EZ Admin DS3`
})
