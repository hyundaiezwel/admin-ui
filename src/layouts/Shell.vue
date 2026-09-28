<script setup lang="ts">
/**
 * 앱 셸 — 사내 관리자센터(`websquare-bo-ui`)의 골격.
 *
 *   레일      70px  로고 칸 #000 · 메뉴 칸 #2a403d · 세로 아이콘
 *   슬라이드  280px 흰색 · 검색 칸 #000 52px · **고른 1depth의 하위만** 보인다
 *   본문      패널이 열리면 280px로 밀리고 최소 폭 1210 → 1000 (.show_menu)
 *
 * 패널은 접힌 채로 시작한다 — 원본의 기본 상태가 `left:-210px`이다.
 * 패널이 본문을 **덮지 않고 민다.** 덮으면 목록을 보면서 메뉴를 고를 수 없다.
 */
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MENU, type MenuItem } from '../app/menu'
import { open } from '../app/tabs'
import AppIcon from '../app/AppIcon.vue'
import TabBar from '../app/TabBar.vue'
import WsToastHost from '../ws/WsToastHost.vue'

const route = useRoute()
const router = useRouter()
const sideOpen = ref(false)
const activeTop = ref('dashboard')
const q = ref('')

watch(
  () => route.path,
  (p) => {
    open(p)
    const top = MENU.find((m) => m.to === p || m.children?.some((c) => c.to === p))
    if (top) activeTop.value = top.id
  },
  { immediate: true },
)

function pickTop(item: MenuItem) {
  activeTop.value = item.id
  if (item.to) { router.push(item.to); return }
  sideOpen.value = true
}

// 메뉴 검색 — 입력하면 1depth 경계를 무시하고 전체에서 찾는다
const hits = (item: MenuItem) => (item.children ?? [item]).filter((c) => !q.value || c.label.includes(q.value))
</script>

<template>
  <div class="sh" :class="{ 'sh--open': sideOpen }">
    <a class="ws-skip" href="#main">본문 바로가기</a>

    <header class="sh-rail">
      <RouterLink to="/" class="sh-rail__logo" aria-label="대시보드">EZ</RouterLink>
      <nav class="sh-rail__nav" aria-label="1단계 메뉴">
        <button
          v-for="item in MENU"
          :key="item.id"
          type="button"
          class="sh-rail__btn"
          :class="{ 'is-on': activeTop === item.id }"
          :aria-label="item.label"
          :aria-current="activeTop === item.id ? 'true' : undefined"
          :title="item.label"
          @click="pickTop(item)"
        >
          <AppIcon :name="item.icon!" :size="20" />
        </button>
      </nav>
      <button class="sh-rail__toggle" type="button" :aria-expanded="sideOpen" aria-controls="sh-side" :aria-label="sideOpen ? '메뉴 닫기' : '메뉴 열기'" @click="sideOpen = !sideOpen">
        <AppIcon name="menu" :size="18" />
      </button>
    </header>

    <nav id="sh-side" class="sh-side" aria-label="메뉴" :inert="!sideOpen">
      <div class="sh-side__search">
        <input v-model="q" class="sh-side__input" type="search" placeholder="메뉴 검색" aria-label="메뉴 검색" />
      </div>
      <div class="sh-side__list">
        <template v-for="item in MENU" :key="item.id">
          <section v-if="q ? hits(item).length : activeTop === item.id" class="sh-side__group">
            <h2 class="sh-side__gtit">{{ item.label }}</h2>
            <RouterLink
              v-for="c in hits(item)"
              :key="c.id"
              class="sh-side__item"
              :class="{ 'is-on': route.path === c.to }"
              :to="c.to!"
              :aria-current="route.path === c.to ? 'page' : undefined"
            >
              <span>{{ c.label }}</span>
              <span v-if="c.count" class="sh-side__count" :aria-label="`대기 ${c.count}건`">{{ c.count }}</span>
            </RouterLink>
          </section>
        </template>
      </div>
    </nav>

    <div class="sh-main">
      <TabBar />
      <main id="main" class="sh-scroll" tabindex="-1">
        <div class="sh-contents">
          <RouterView v-slot="{ Component }">
            <!-- 탭을 오가도 조회 조건·목록이 살아 있어야 한다 -->
            <KeepAlive :max="8">
              <component :is="Component" :key="route.path" />
            </KeepAlive>
          </RouterView>
        </div>
      </main>
    </div>
    <WsToastHost />
  </div>
</template>

<style scoped>
.sh { position: relative; height: 100%; overflow: hidden; background: var(--ws-surface); }

/* --- 레일 ------------------------------------------------------------------ */
.sh-rail {
  position: absolute; left: 0; top: 0; bottom: 0; z-index: 30;
  display: flex; flex-direction: column; width: var(--ws-shell-rail-w);
  background: var(--ws-shell-rail-bg);
}
.sh-rail__logo {
  display: grid; place-items: center; flex: none; height: var(--ws-shell-search-h);
  color: var(--ws-text-inverse); font-weight: 700; text-decoration: none;
}
.sh-rail__logo:hover { text-decoration: none; }
.sh-rail__nav { flex: 1; padding: 8px 0; background: var(--ws-shell-rail-nav-bg); }
.sh-rail__btn {
  display: grid; place-items: center; width: 100%; height: 56px;
  border: 0; background: none; color: var(--ws-shell-rail-fg); cursor: pointer;
}
.sh-rail__btn:hover { color: var(--ws-text-inverse); background: rgb(0 0 0 / 0.2); }
.sh-rail__btn.is-on { color: var(--ws-text-inverse); background: var(--ws-shell-rail-on-bg); box-shadow: inset 3px 0 0 var(--ws-brand); }
.sh-rail__toggle { flex: none; height: 44px; border: 0; background: var(--ws-shell-rail-on-bg); color: var(--ws-shell-rail-fg); cursor: pointer; }
.sh-rail__toggle:hover { color: var(--ws-text-inverse); }

/* --- 슬라이드 패널 --------------------------------------------------------- */
.sh-side {
  position: absolute; top: 0; bottom: 0; z-index: 20;
  left: calc(var(--ws-shell-rail-w) - var(--ws-shell-side-w));
  width: var(--ws-shell-side-w); padding-left: var(--ws-shell-rail-w);
  display: flex; flex-direction: column;
  background: var(--ws-surface); border-right: 1px solid var(--ws-border);
  transition: left 0.3s;
}
.sh--open .sh-side { left: 0; }
.sh-side__search { flex: none; height: var(--ws-shell-search-h); padding: 10px 12px; background: var(--ws-shell-side-search-bg); }
.sh-side__input {
  width: 100%; height: 32px; padding: 0 12px; border: 0; border-radius: var(--ws-radius-xs);
  background: var(--ws-shell-side-input-bg); color: var(--ws-text-inverse); font-size: var(--ws-font-size-md);
}
.sh-side__input::placeholder { color: var(--ws-shell-side-placeholder); }
.sh-side__list { flex: 1; overflow: auto; padding: 16px 12px; display: flex; flex-direction: column; gap: 16px; }
.sh-side__gtit { margin: 0 0 6px; padding: 0 10px; color: var(--ws-text-muted); font-size: var(--ws-font-size-sm); font-weight: 700; }
.sh-side__item {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 9px 10px; border-radius: var(--ws-radius-xs);
  color: var(--ws-text-sub); text-decoration: none;
}
.sh-side__item:hover { background: var(--ws-surface-head); text-decoration: none; }
.sh-side__item.is-on { background: var(--ws-surface-selected); color: var(--ws-text-brand); font-weight: 700; }
.sh-side__count {
  min-width: 20px; padding: 0 6px; border-radius: var(--ws-radius-pill);
  background: var(--ws-text-danger); color: var(--ws-text-inverse);
  font-size: var(--ws-font-size-sm); font-weight: 700; text-align: center; line-height: 18px;
  font-variant-numeric: tabular-nums;
}

/* --- 본문 ------------------------------------------------------------------ */
.sh-main {
  position: absolute; top: 0; right: 0; bottom: 0; left: var(--ws-shell-rail-w);
  display: flex; flex-direction: column; min-width: 0;
  transition: left 0.3s;
}
.sh--open .sh-main { left: var(--ws-shell-side-w); }
.sh-scroll { flex: 1; min-height: 0; overflow: auto; }
.sh-scroll:focus { outline: none; }
.sh-contents { min-width: var(--ws-shell-min-w); }
.sh--open .sh-contents { min-width: var(--ws-shell-min-w-open); }
</style>
