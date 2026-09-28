<script setup lang="ts">
/**
 * Tabulator 래퍼 — 화면이 그리드를 "쓰는" 단위.
 *
 * PoC 화면을 옮겨 오지 않았다. PoC는 요건을 검증하려고 토글과 계측이 붙어 있던 실험대이고,
 * 실제 화면에 필요한 것은 **컬럼과 데이터를 주면 표가 되는 것** 하나다.
 * PoC에서 가져온 건 검증으로 값이 확인된 두 조각뿐이다 — `pasteGuard`, `rowSelect`.
 *
 * 스타일은 가장 얇은 기본 테마(`tabulator_simple`) 위에 WebSquare 실측값을 덮는다
 * (`./tabulator-ws.css`). DS1과 같은 래퍼를 쓰고 스킨만 다르다 — 두 디자인 시스템을
 * 같은 동작으로 비교하기 위해서다.
 */
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import { createPasteGuard } from './pasteGuard.js'
import { createRowSelect } from './rowSelect.js'

const props = withDefaults(
  defineProps<{
    columns: any[]
    rows: any[]
    /** 붙여넣기 검증 규칙. field → rule. 규칙 없는 컬럼은 붙여넣기가 거부된다 */
    pasteRules?: Record<string, unknown>
    height?: string
    /** 편집·범위 복붙을 켠다. 조회 전용 화면은 끈다 */
    editable?: boolean
    /** 이 행을 잠글지. 잠긴 행은 편집 상자가 사라진다 */
    isLocked?: (row: any) => boolean
  }>(),
  { height: '420px', editable: false, pasteRules: () => ({}) },
)

const emit = defineEmits<{
  selectionChange: [count: number]
  pasteReport: [report: { ok: boolean; summary: string }]
  /** 행 클릭. 조회 전용 목록에서 상세 패널을 여는 데 쓴다 */
  rowClick: [row: any]
}>()

const el = ref<HTMLElement | null>(null)
const table = shallowRef<any>(null)

const guard = createPasteGuard({
  getTable: () => table.value,
  rules: props.pasteRules,
  onReport: (r: any) => emit('pasteReport', r),
})

const rowSel = createRowSelect({
  getTable: () => table.value,
  idField: 'id',
  onChange: ({ count }: { count: number }) => emit('selectionChange', count),
})

/** 체크박스 컬럼을 앞에 붙인다. 컬럼 정의가 클릭 핸들러까지 들고 있어 별도 배선이 없다.
 *  `paste`는 우리 키라 Tabulator에 넘기기 전에 뺀다 — 두면 컬럼마다 "Invalid column definition" 경고 */
const withSelect = (cols: any[]) => [rowSel.column(), ...cols.map(({ paste, ...c }) => c)]

onMounted(() => {
  if (!el.value) return
  table.value = new Tabulator(el.value, {
    data: props.rows,
    columns: withSelect(props.columns),
    // `auto`는 서버 페이징 목록용 — 한 쪽(최대 100행)만 받으니 표가 제 키만큼 늘고 가상 렌더가 필요 없다
    ...(props.height === 'auto' ? { renderVertical: 'basic' } : { height: props.height, renderVertical: 'virtual' }),
    layout: 'fitColumns',
    index: 'id',
    placeholder: '조회 결과가 없습니다.',
    // 선택 행 강조 — 배경만으로는 대비 1.1:1이라 좌측 막대를 함께 준다.
    // 잠긴 행(진행 중 프로모션 등)은 편집 상자를 거둔다 — 고칠 수 없는데 상자를 그리면 거짓말이다
    rowFormatter: (row: any) => {
      const el = row.getElement()
      el.classList.toggle('ez-row-selected', rowSel.isSelected(row.getIndex()))
      el.classList.toggle('ws-row-locked', !!props.isLocked?.(row.getData()))
    },
    ...(props.editable
      ? {
          selectableRange: 1,
          selectableRangeColumns: false, // 헤더 클릭은 정렬로 둔다 (PoC 결론)
          selectableRangeRows: true,
          selectableRangeClearCells: true,
          clipboard: true,
          clipboardCopyRowRange: 'range',
          clipboardPasteAction: 'range',
          clipboardPasteParser: guard.parser,
          clipboardCopyConfig: { rowHeaders: false, columnHeaders: false },
        }
      : {}),
  })

  // 체크박스 컬럼 클릭은 '선택'이지 '행 열기'가 아니다 — 거터를 눌렀을 때 상세가 뜨면 안 된다.
  // 칸 안 버튼 · 링크도 제 일을 한다(처리 메뉴 · 상세 이동) — 행 열기가 겹치면 패널이 같이 뜬다
  table.value.on('rowClick', (e: MouseEvent, row: any) => {
    if ((e.target as HTMLElement | null)?.closest('.sel-col, button, a')) return
    emit('rowClick', row.getData())
  })
})

watch(
  () => props.rows,
  // 데이터가 바뀌면(재조회 · 쪽 넘김) 선택을 푼다. 선택은 행 id로 들고 있어서, 두면 화면에 없는 행이
  // 선택된 채 남아 일괄 처리에 섞인다(서버 페이징 목록 실측 — 2쪽에서 "선택 4건")
  (rows) => { table.value?.replaceData(rows); rowSel.clear() },
)

watch(
  () => props.columns,
  (cols) => table.value?.setColumns(withSelect(cols)),
)

// 조회 중에는 QueryState가 그리드를 내린다. 내려가는 그리드의 선택도 사라지므로 0을 알린다 —
// 안 알리면 화면의 "선택 N건"과 일괄 버튼이 없는 선택을 붙들고 있다
onBeforeUnmount(() => { table.value?.destroy(); emit('selectionChange', 0) })

defineExpose({
  /** 조회 결과 전체를 내보낸다. 화면에 보이는 행만이 아니다 */
  exportCsv: (name: string) => table.value?.download('csv', name, { bom: true }),
  undoPaste: () => guard.undo(),
  clearSelection: () => rowSel.clear(),
  selectedData: () => rowSel.selectedData(),
})
</script>

<template>
  <div ref="el" class="ws-datagrid" />
</template>
