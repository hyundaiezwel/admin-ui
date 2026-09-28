import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Shell from './layouts/Shell.vue'
import { titleOf } from './app/menu'

/**
 * 해시 히스토리 — GitHub Pages는 정적 호스팅이라 깊은 주소를 새로고침하면 404가 난다.
 * 화면은 DS1과 **같은 열 개**다. 두 디자인 시스템을 같은 화면으로 나란히 비교하기 위해서다.
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
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({ history: createWebHashHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

router.afterEach((to) => {
  document.title = `${to.path === '/login' ? '로그인' : titleOf(to.path)} — EZ Admin DS3`
})
