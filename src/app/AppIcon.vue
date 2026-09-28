<script setup lang="ts">
import { ICONS } from './icons'

/** 장식 아이콘은 스크린리더에서 빼고, 의미가 있으면 `label`을 준다 */
const props = withDefaults(defineProps<{ name: string; size?: number; label?: string }>(), { size: 18 })
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    :aria-hidden="props.label ? undefined : true"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label"
  >
    <path :d="ICONS[props.name]" />
  </svg>
</template>
