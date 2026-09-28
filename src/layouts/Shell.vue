<script setup lang="ts">
/**
 * 앱 셸 — D2 A: 헤더 없는 사이드바.
 *
 * 사이드바 참조(Figma "Sidebar with Interactive Prototype")의 원래 구조다. 헤더가 없어서
 * 브랜드 · 검색 · 알림 · 사용자가 전부 사이드바에 있고, 참조 원칙 8개가 한 곳에서 선다.
 * 헤더 52px을 걷어서 세로를 돌려받는다 — 선택 시안 실측 13행(헤더가 있으면 12행).
 *
 *   위    브랜드 · 접기 · 검색
 *   가운데 주 메뉴 — 남는 공간을 전부 먹고 넘치면 여기만 스크롤
 *   아래  알림 · 도움말 · 환경설정 · 사용자(표시 설정 메뉴)
 *
 * 접으면 64px 레일(240 ÷ 3.75 — 참조 비율). 라벨을 자르지 않고, 하위는 펼침 메뉴로 낸다.
 * 색은 원본 관리자센터 레일(#2a403d)이다. 두 테마 모두 어둡다.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Menu from 'primevue/menu'
import { MENU, MENU_FOOT, groupCount, type MenuItem } from '../app/menu'
import { open as openTab } from '../app/tabs'
import { prefs, type Theme } from '../app/theme'
import AppIcon from '../app/AppIcon.vue'
import TabBar from '../app/TabBar.vue'
import Toast from 'primevue/toast'

const route = useRoute()
const router = useRouter()

const KEY = 'ds3-rail'
const rail = ref((() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })())
watch(rail, (v) => { try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* 이번 방문만 */ } })

const expanded = ref<Set<string>>(new Set())
const flyout = ref<string | null>(null)
const q = ref('')
const searchEl = ref<HTMLInputElement | null>(null)

watch(
  () => route.path,
  (p) => {
    openTab(p)
    const top = MENU.find((m) => m.children?.some((c) => c.to === p))
    if (top) expanded.value = new Set([...expanded.value, top.id])
    flyout.value = null
  },
  { immediate: true },
)

const isActive = (m: MenuItem) => m.to === route.path
const within = (m: MenuItem) => m.children?.some((c) => c.to === route.path) ?? false
function toggle(m: MenuItem) {
  const s = new Set(expanded.value)
  s.has(m.id) ? s.delete(m.id) : s.add(m.id)
  expanded.value = s
}

/** 검색하면 1depth 경계를 무시하고 잎만 보여 준다 */
const hits = computed(() => {
  if (!q.value.trim()) return null
  return MENU.flatMap((m) => (m.children ?? [m]).filter((c) => c.to && c.label.includes(q.value.trim())).map((c) => ({ ...c, group: m.label })))
})

/** 레일에서 검색을 누르면 펼치고 검색칸으로 간다 */
async function openSearch() {
  rail.value = false
  await nextTick()
  searchEl.value?.focus()
}

const fmt = (n: number) => (n > 999 ? '999+' : String(n))

/* 사용자 메뉴 — 표시 설정이 여기 들어간다(헤더가 없으니까) */
const me = ref<InstanceType<typeof Menu> | null>(null)
const THEME_LABEL: Record<Theme, string> = { light: '라이트', dark: '다크', system: '시스템 설정 따르기' }
const meItems = computed(() => [
  {
    label: '화면 테마',
    items: (['light', 'dark', 'system'] as Theme[]).map((t) => ({
      label: THEME_LABEL[t],
      icon: prefs.theme === t ? 'ws-check' : 'ws-blank',
      command: () => { prefs.theme = t },
    })),
  },
  { separator: true },
  { label: '로그아웃', command: () => router.push('/login') },
])
</script>

<template>
  <div class="sh" :class="{ 'is-rail': rail }">
    <a class="ws-skip" href="#main">본문 바로가기</a>

    <nav class="sd" aria-label="주 메뉴">
      <div class="sd__top">
        <RouterLink to="/" class="sd__brand" :aria-label="rail ? '관리자센터 — 대시보드' : undefined">
          <span class="sd__logo" aria-hidden="true">EZ</span>
          <span v-if="!rail" class="sd__name">관리자센터</span>
        </RouterLink>
        <button type="button" class="sd__fold" :aria-label="rail ? '메뉴 펼치기' : '메뉴 접기'" :aria-expanded="!rail" @click="rail = !rail">
          <AppIcon name="side" :size="18" />
        </button>
      </div>

      <div class="sd__search">
        <button v-if="rail" type="button" class="sd__row sd__row--icon" aria-label="메뉴 검색" title="메뉴 검색" @click="openSearch">
          <span class="sd__ic"><AppIcon name="search" :size="18" /></span>
        </button>
        <label v-else class="sd__q">
          <AppIcon name="search" :size="15" />
          <input ref="searchEl" v-model="q" type="search" placeholder="메뉴 검색" aria-label="메뉴 검색" @keydown.esc="q = ''" />
        </label>
      </div>

      <!-- 주 메뉴 — 남는 공간을 전부 먹는다. 넘치면 여기만 스크롤 -->
      <div class="sd__nav">
        <ul v-if="hits" class="sd__list" aria-label="검색 결과">
          <li v-for="h in hits" :key="h.id">
            <RouterLink class="sd__row sd__row--sub" :to="h.to!" @click="q = ''">
              <span class="sd__lb">{{ h.label }}</span><span class="sd__grp">{{ h.group }}</span>
            </RouterLink>
          </li>
          <li v-if="!hits.length" class="sd__none">일치하는 메뉴가 없습니다</li>
        </ul>

        <ul v-else class="sd__list">
          <li v-for="m in MENU" :key="m.id" class="sd__g" @mouseleave="flyout = null">
            <RouterLink
              v-if="m.to"
              class="sd__row" :class="{ 'is-on': isActive(m) }" :to="m.to"
              :aria-current="isActive(m) ? 'page' : undefined" :title="rail ? m.label : undefined"
              @mouseenter="flyout = null"
            >
              <span class="sd__ic"><AppIcon :name="m.icon!" :size="20" /></span>
              <span v-if="!rail" class="sd__lb">{{ m.label }}</span>
            </RouterLink>
            <button
              v-else type="button" class="sd__row" :class="{ 'is-within': within(m), 'is-on': rail && within(m) }"
              :aria-expanded="rail ? undefined : expanded.has(m.id)"
              :aria-label="groupCount(m) ? `${m.label}, 대기 ${groupCount(m)}건` : undefined"
              :title="rail ? m.label : undefined"
              @click="rail ? (flyout = flyout === m.id ? null : m.id) : toggle(m)"
              @mouseenter="rail && (flyout = m.id)"
            >
              <span class="sd__ic"><AppIcon :name="m.icon!" :size="20" /></span>
              <template v-if="!rail">
                <span class="sd__lb">{{ m.label }}</span>
                <span v-if="groupCount(m) && !expanded.has(m.id)" class="sd__cnt">{{ fmt(groupCount(m)) }}</span>
                <AppIcon name="chevron" :size="14" class="sd__chev" :class="{ 'is-open': expanded.has(m.id) }" />
              </template>
              <span v-else-if="groupCount(m)" class="sd__dot" />
            </button>

            <ul v-if="!rail && m.children && expanded.has(m.id)" class="sd__sub">
              <li v-for="c in m.children" :key="c.id">
                <RouterLink class="sd__row sd__row--sub" :class="{ 'is-on': isActive(c) }" :to="c.to!" :aria-current="isActive(c) ? 'page' : undefined">
                  <span class="sd__lb">{{ c.label }}</span>
                  <span v-if="c.count" class="sd__cnt" :aria-label="`대기 ${c.count}건`">{{ fmt(c.count) }}</span>
                </RouterLink>
              </li>
            </ul>

            <!-- 레일 펼침 메뉴 — 접혀도 하위에 갈 길이 있어야 접기가 반쪽이 아니다 -->
            <div v-if="rail && m.children && flyout === m.id" class="sd__fly" role="menu" :aria-label="m.label">
              <p class="sd__fly-h">{{ m.label }}</p>
              <RouterLink v-for="c in m.children" :key="c.id" role="menuitem" class="sd__fly-i" :class="{ 'is-on': isActive(c) }" :to="c.to!">
                <span>{{ c.label }}</span><span v-if="c.count" class="sd__cnt">{{ fmt(c.count) }}</span>
              </RouterLink>
            </div>
          </li>
        </ul>
      </div>

      <!-- 아래 — 시스템에 관한 것은 바닥에 고정 -->
      <div class="sd__foot">
        <button type="button" class="sd__row" aria-label="알림 3건" :title="rail ? '알림' : undefined">
          <span class="sd__ic"><AppIcon name="bell" :size="20" /></span>
          <span v-if="!rail" class="sd__lb">알림</span>
          <span v-if="!rail" class="sd__cnt">3</span>
          <span v-else class="sd__dot" />
        </button>
        <RouterLink v-for="f in MENU_FOOT" :key="f.id" class="sd__row" :to="f.to!" :title="rail ? f.label : undefined">
          <span class="sd__ic"><AppIcon :name="f.icon!" :size="20" /></span>
          <span v-if="!rail" class="sd__lb">{{ f.label }}</span>
        </RouterLink>
      </div>

      <button type="button" class="sd__me" aria-haspopup="menu" aria-label="사용자 메뉴 — 김하늘, 화면 테마" @click="(e) => me?.toggle(e)">
        <span class="sd__av" aria-hidden="true">김</span>
        <span v-if="!rail" class="sd__who"><b>김하늘</b><small>운영팀 · 관리자</small></span>
        <span v-if="!rail" class="sd__kebab" aria-hidden="true"><AppIcon name="kebab" :size="18" /></span>
      </button>
      <Menu ref="me" :model="meItems" popup>
        <template #itemicon="{ item }">
          <span class="me-ic" aria-hidden="true">{{ item.icon === 'ws-check' ? '✓' : '' }}</span>
        </template>
      </Menu>
    </nav>

    <div class="sh-main">
      <TabBar />
      <main id="main" class="sh-scroll" tabindex="-1">
        <RouterView v-slot="{ Component }">
          <KeepAlive :max="8">
            <component :is="Component" :key="route.path" />
          </KeepAlive>
        </RouterView>
      </main>
    </div>
    <!-- role=status — 읽고 있던 문장을 끊지 않고 다음에 읽어 준다 -->
    <Toast position="bottom-center" />
  </div>
</template>

<style scoped>
.sh { display: flex; height: 100%; overflow: hidden; background: var(--ws-surface); }

/* --- 사이드바 ------------------------------------------------------------- */
.sd {
  flex: none; display: flex; flex-direction: column; width: var(--ws-side-w);
  background: var(--ws-side-bg); color: var(--ws-side-fg);
  transition: width 0.2s ease;
}
.is-rail .sd { width: var(--ws-side-w-rail); }

.sd__top { flex: none; display: flex; align-items: center; gap: 8px; height: var(--ws-shell-search-h); padding: 0 8px 0 16px; border-bottom: 1px solid var(--ws-side-line); }
.is-rail .sd__top { flex-direction: column; justify-content: center; gap: 2px; height: auto; padding: 8px 0; }
.sd__brand { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; color: var(--ws-text-inverse); text-decoration: none; }
.is-rail .sd__brand { flex: none; }
.sd__brand:hover { text-decoration: none; }
.sd__logo { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: var(--ws-radius); background: var(--ws-brand); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0; }
.sd__name { font-size: 15px; font-weight: 700; white-space: nowrap; }
.sd__fold { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: var(--ws-radius); background: none; color: var(--ws-side-muted); cursor: pointer; }
.sd__fold:hover { background: var(--ws-side-hover); color: var(--ws-text-inverse); }

.sd__search { flex: none; padding: 12px 8px 4px; }
.sd__q { display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 10px; border-radius: var(--ws-radius); background: var(--ws-side-search-bg); color: var(--ws-shell-side-placeholder); }
.sd__q input { flex: 1; min-width: 0; height: 100%; border: 0; background: none; color: var(--ws-text-inverse); font-size: var(--ws-font-size-md); }
.sd__q input::placeholder { color: var(--ws-shell-side-placeholder); }
.sd__q input:focus { outline: none; }
.sd__q:focus-within { box-shadow: 0 0 0 1px var(--ws-side-muted); }

.sd__nav { flex: 1; min-height: 0; overflow-y: auto; overflow-x: visible; padding: 4px 8px; }
.sd__list { display: flex; flex-direction: column; gap: var(--ws-space-0-5, 2px); }
.sd__g { position: relative; }

/* 행 40 · 아이콘 상자 20 고정 — 라벨 시작점이 한 축에 선다(DS1 navigation.md §2-3) */
.sd__row {
  position: relative; display: flex; align-items: center; gap: 8px; width: 100%; height: 40px; padding: 0 12px;
  border: 0; border-radius: var(--ws-radius); background: none; color: var(--ws-side-fg);
  font: inherit; text-align: left; text-decoration: none; cursor: pointer;
}
.sd__row:hover { background: var(--ws-side-hover); text-decoration: none; }
.sd__ic { flex: none; display: grid; place-items: center; width: 20px; }
.sd__lb { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd__row--sub { height: 36px; padding-left: 40px; color: var(--ws-side-sub); font-size: var(--ws-font-size-md); }
.sd__row.is-on { background: var(--ws-side-on-bg); color: var(--ws-text-inverse); font-weight: 700; box-shadow: inset 3px 0 0 var(--ws-brand); }
.sd__row.is-within { color: var(--ws-text-inverse); font-weight: 700; }
.sd__chev { flex: none; color: var(--ws-side-muted); transition: transform 0.15s; }
.sd__chev.is-open { transform: rotate(180deg); }
.sd__sub { margin: 2px 0 4px; display: flex; flex-direction: column; gap: 2px; }
.sd__grp { flex: none; font-size: var(--ws-font-size-sm); color: var(--ws-side-muted); }
.sd__none { padding: 12px; color: var(--ws-side-muted); font-size: var(--ws-font-size-md); }

.sd__cnt { flex: none; min-width: 20px; padding: 0 6px; border-radius: 10px; background: var(--ws-count-bg); color: var(--ws-text-inverse); font-size: var(--ws-font-size-sm); font-weight: 700; line-height: 18px; text-align: center; font-variant-numeric: tabular-nums; }
.sd__dot { position: absolute; top: 8px; right: 12px; width: 6px; height: 6px; border-radius: 50%; background: var(--ws-count-bg); }

.is-rail .sd__row { justify-content: center; padding: 0; }
.is-rail .sd__nav, .is-rail .sd__search { padding-inline: 8px; }
/* 레일에서는 스크롤을 푼다 — overflow-y:auto면 x도 auto로 계산돼 옆으로 뜨는 펼침 메뉴가 잘린다.
   ponytail: 레일 아이콘이 화면 높이를 넘게 늘면 펼침 메뉴를 position:fixed로 바꾼다 */
.is-rail .sd__nav { overflow: visible; }

.sd__fly {
  position: absolute; z-index: 40; left: calc(100% + 8px); top: 0; min-width: 200px; padding: 6px;
  border: 1px solid var(--ws-border); border-radius: var(--ws-radius-lg); background: var(--ws-surface); color: var(--ws-text);
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.16);
}
/* 아이콘 → 메뉴로 마우스를 옮길 때 8px 틈에서 mouseleave가 나 닫히지 않게 다리를 놓는다 */
.sd__fly::before { content: ''; position: absolute; top: 0; bottom: 0; right: 100%; width: 10px; }
.sd__fly-h { padding: 6px 10px; font-size: var(--ws-font-size-sm); font-weight: 700; color: var(--ws-text-muted); }
.sd__fly-i { display: flex; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: var(--ws-radius); color: var(--ws-text); text-decoration: none; }
.sd__fly-i:hover { background: var(--ws-surface-hover); text-decoration: none; }
.sd__fly-i.is-on { background: var(--ws-surface-selected); color: var(--ws-text-brand); font-weight: 700; }

.sd__foot { flex: none; display: flex; flex-direction: column; gap: 2px; padding: 8px; border-top: 1px solid var(--ws-side-line); }

.sd__me {
  flex: none; display: flex; align-items: center; gap: 10px; margin: 0 8px 8px; padding: 10px;
  border: 0; border-radius: var(--ws-radius-lg); background: var(--ws-side-hover); color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.sd__me:hover { background: rgb(0 0 0 / 0.28); }
.is-rail .sd__me { justify-content: center; margin: 0 8px 8px; padding: 8px 0; background: none; }
.sd__av { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--ws-side-avatar); color: #fff; font-size: 13px; font-weight: 700; }
.sd__who { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.sd__who b { color: var(--ws-text-inverse); font-size: var(--ws-font-size); }
.sd__who small { color: var(--ws-side-muted); font-size: var(--ws-font-size-sm); }
.sd__kebab { flex: none; color: var(--ws-side-muted); }
.me-ic { display: inline-block; width: 14px; color: var(--ws-text-brand); font-weight: 700; }

/* --- 본문 ----------------------------------------------------------------- */
.sh-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.sh-scroll { flex: 1; min-height: 0; overflow: auto; background: var(--ws-surface); }
.sh-scroll:focus { outline: none; }
</style>
