<script setup lang="ts">
/**
 * 로그인 — 원본 `ui/public/login.xml`.
 *
 * 원본 실측
 *   상자 600px · 안쪽 38 136 32 · 테두리 #eaeaea · 모서리 15 · 그림자
 *   제목 20px/700 가운데 · 아래 24
 *   입력 40px · 안쪽 10 12 · 모서리 6 · 칸 사이 20 (마지막만 12)
 *   버튼 초록 40px · 모서리 8 · 15px/600
 *
 * 칸이 셋이다 — **도메인**(ooo.ezwel.com의 ooo) · 아이디 · 비밀번호. 고객사마다 관리자센터가
 * 따로 떠 있어서 어느 고객사인지를 먼저 받는다. 이 칸을 빼면 원본 화면이 아니다.
 *
 * 비밀번호 보기 토글은 원본에도 있다(`btn_pwDisp`). 버튼 이름을 상태에 맞춰 바꾼다.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const base = import.meta.env.BASE_URL
const f = ref({ domain: '', id: '', pw: '' })
const show = ref(false)
const error = ref('')
const busy = ref(false)

function submit() {
  error.value = ''
  if (!f.value.domain || !f.value.id || !f.value.pw) {
    error.value = '도메인 · 아이디 · 비밀번호를 모두 입력하세요.'
    return
  }
  busy.value = true
  setTimeout(() => { busy.value = false; router.push('/') }, 400)
}
</script>

<template>
  <div class="lg" :style="{ backgroundImage: `url(${base}img/login_bg.svg)` }">
    <div class="lg__box">
      <img class="lg__logo" :src="`${base}img/login_logo.svg`" alt="현대이지웰" width="200" height="29" />
      <form class="lg__card" novalidate @submit.prevent="submit">
        <h1 class="lg__tit">관리자센터 로그인</h1>
        <ul class="lg__fields">
          <li>
            <label class="ws-sr-only" for="lg-dom">도메인</label>
            <input id="lg-dom" v-model="f.domain" class="lg__in" placeholder="ooo.ezwel.com의 ooo을 입력" autocomplete="organization" />
          </li>
          <li>
            <label class="ws-sr-only" for="lg-id">아이디</label>
            <input id="lg-id" v-model="f.id" class="lg__in" placeholder="아이디 입력" autocomplete="username" />
          </li>
          <li class="lg__pw">
            <label class="ws-sr-only" for="lg-pw">비밀번호</label>
            <input id="lg-pw" v-model="f.pw" class="lg__in" :type="show ? 'text' : 'password'" placeholder="비밀번호 입력" autocomplete="current-password" />
            <button type="button" class="lg__eye" :aria-pressed="show" :aria-label="show ? '비밀번호 숨기기' : '비밀번호 보기'" @click="show = !show">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /><path v-if="!show" d="M3 3l18 18" /></svg>
            </button>
          </li>
          <li>
            <p v-if="error" class="ws-err" role="alert" style="margin: 0 0 8px">{{ error }}</p>
            <button type="submit" class="lg__btn" :disabled="busy">{{ busy ? '로그인 중…' : '로그인' }}</button>
          </li>
        </ul>
      </form>
      <div class="lg__msg">
        <ul>
          <li>비밀번호를 5회 틀리면 계정이 잠긴다. 잠금 해제는 관리자에게 요청한다.</li>
          <li>목업이라 어떤 값을 넣어도 들어간다.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lg { position: relative; min-height: 100%; overflow-y: auto; background: var(--ws-login-bg) no-repeat center / cover; }
.lg__box { position: absolute; left: 50%; top: 50%; width: min(600px, calc(100% - 32px)); translate: -50% -272px; }
.lg__logo { display: block; margin: 0 auto; }
.lg__card {
  margin-top: 40px; padding: 38px 136px 32px;
  border: 1px solid var(--ws-border-soft); border-radius: 15px; background: var(--ws-surface);
  box-shadow: 0 5px 20px rgb(0 0 0 / 0.12);
}
@media (max-width: 640px) { .lg__card { padding: 32px 24px; } .lg__box { translate: -50% -50%; } }
.lg__tit { margin-bottom: 24px; font-size: 20px; line-height: 28px; font-weight: 700; text-align: center; }
.lg__fields { display: flex; flex-direction: column; gap: 20px; }
.lg__fields li:last-child { margin-top: -8px; } /* 원본 li:last-child{margin-top:12px} */
.lg__in {
  width: 100%; height: 40px; padding: 10px 12px;
  border: 1px solid var(--ws-field-border); border-radius: var(--ws-radius); background: var(--ws-surface);
}
.lg__in::placeholder { color: var(--ws-text-muted); }
.lg__in:hover { border-color: var(--ws-text-muted); }
.lg__in:focus { outline: none; border-color: var(--ws-field-border-focus); box-shadow: 0 0 0 1px var(--ws-field-border-focus); }
.lg__pw { position: relative; }
.lg__pw .lg__in { padding-right: 44px; }
.lg__eye { position: absolute; right: 4px; top: 4px; display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: var(--ws-radius); background: none; color: var(--ws-text-muted); cursor: pointer; }
.lg__eye:hover { color: var(--ws-text); }
.lg__btn {
  width: 100%; height: 40px; border: 1px solid var(--ws-action-search); border-radius: 8px;
  background: var(--ws-action-search); color: var(--ws-text-inverse); font-size: 15px; font-weight: 600; cursor: pointer;
}
.lg__btn:hover { background: var(--ws-action-search-hover); border-color: var(--ws-action-search-hover); }
.lg__btn:disabled { opacity: 0.6; cursor: wait; }
.lg__msg { margin-top: 42px; color: var(--ws-login-fg); font-size: var(--ws-font-size-md); line-height: 18px; }
.lg__msg li { position: relative; padding-left: 10px; }
.lg__msg li + li { margin-top: 4px; }
.lg__msg li::before { content: ''; position: absolute; left: 0; top: 8px; width: 3px; height: 3px; border-radius: 50%; background: var(--ws-login-fg); }
</style>
