<script setup lang="ts">
/** 상태 뱃지 — 라벨은 코드 사전 한 곳에서 온다. 화면이 라벨 문자열을 들지 않는다 */
import { computed } from 'vue'
import { badgeClass } from '../ws/badge'
import { stateOf } from './codes'
const props = defineProps<{ code: string }>()
const s = computed(() => stateOf(props.code))
</script>

<template>
  <span :class="badgeClass(s?.tone)" :title="`상태 코드 ${code}`">{{ s?.label ?? code }}</span>
</template>
