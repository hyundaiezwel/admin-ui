/**
 * 행 멀티 체크 선택 (rowSelect)
 * ============================================================================
 * Tabulator 내장 `selectableRows` 는 `selectableRange` 와 양립하지 않는다.
 * SelectRange 모듈 소스에서 확인:
 *
 *   // SelectRange.js  initialize()
 *   if (this.options("selectableRange")) {
 *     if (!this.options("selectableRows")) { ... 초기화 ... }
 *     else console.warn("SelectRange functionality cannot be used in conjunction with row selection");
 *   }
 *
 * → `selectableRows` 가 켜져 있으면 범위 선택 모듈이 **초기화조차 되지 않는다.**
 *   경고 한 줄만 남고 드래그 범위 복사/붙여넣기(요건 ④)가 조용히 사라진다.
 *
 * 요건상 범위 복붙과 행 멀티 체크가 모두 필요하므로, 내장 선택을 쓰지 않고
 * 체크박스 컬럼 + 자체 선택 상태로 구현한다. 내장 selectableRows 는 끈 채로 둔다.
 *
 * 30만 행 성능 설계 (실측으로 다시 잡은 부분)
 * ---------------------------------------------------------------------------
 * 처음에는 `table.getRows('active')` 로 대상 행을 훑었는데, 이 API 는
 * 행마다 RowComponent 를 생성한다(RowManager.getComponents).
 * 30만 건에서 shift 구간 선택이 **4.2초** 걸렸다.
 *
 * `table.getData('active')` 는 이미 존재하는 데이터 객체 참조만 모으므로
 * 컴포넌트 할당이 없다. 선택 대상 판정은 전부 이 경로로 바꿨다.
 *
 * 그 외:
 *   - 선택 상태는 id 의 Set — 행 객체를 붙들지 않는다.
 *   - 화면 갱신은 `getRows('visible')`(렌더된 ~14행)만 reformat 한다.
 *     전체 redraw 를 하지 않으므로 데이터 규모와 무관하게 비용이 일정하다.
 *   - 헤더 체크박스 판정은 `selected.size` 만 본다. 전체 일치 여부를 매번
 *     비교하면 그 자체가 O(n) 이 된다.
 */

/**
 * @param {{
 *   getTable: () => any,
 *   idField?: string,
 *   onChange?: (state: { count: number }) => void,
 * }} options
 */
export function createRowSelect({ getTable, idField = 'id', onChange = () => {} }) {
  const selected = new Set()
  let anchor = null // shift 구간 선택 기준점 (1-based position)

  function notify() {
    onChange({ count: selected.size })
  }

  /** 렌더된 행만 다시 그린다 — 데이터 규모와 무관하게 O(화면) */
  function repaintVisible() {
    const table = getTable()
    if (!table) return
    try {
      table.getRows('visible').forEach((row) => row.reformat())
    } catch {
      /* 그리드 재생성 중 호출될 수 있다 */
    }
  }

  function isSelected(id) { return selected.has(id) }

  function toggle(row, shiftKey) {
    const table = getTable()
    const id = row.getIndex()
    const pos = row.getPosition() // 1-based. 단일 호출이라 컴포넌트 생성이 없다

    if (shiftKey && anchor != null) {
      // 기준점 ~ 현재 행 구간을 일괄 선택.
      // getData('active') 는 필터·정렬이 적용된 순서이며 배열 인덱스 = position - 1.
      const data = table.getData('active')
      const from = Math.min(anchor, pos) - 1
      const to = Math.min(Math.max(anchor, pos) - 1, data.length - 1)
      for (let i = Math.max(0, from); i <= to; i++) selected.add(data[i][idField])
    } else {
      if (selected.has(id)) selected.delete(id)
      else selected.add(id)
      anchor = pos
    }

    repaintVisible()
    notify()
  }

  /** 현재 필터가 적용된 전체 행 대상 — 화면에 보이는 행만이 아니다 */
  function selectAllActive() {
    const table = getTable()
    if (!table) return
    const data = table.getData('active')
    for (let i = 0; i < data.length; i++) selected.add(data[i][idField])
    anchor = null
    repaintVisible()
    notify()
  }

  function clear() {
    selected.clear()
    anchor = null
    repaintVisible()
    notify()
  }

  /** 헤더 체크박스 — 하나라도 선택돼 있으면 해제, 없으면 조회결과 전체 선택 */
  function toggleAll() {
    if (selected.size) clear()
    else selectAllActive()
  }

  /**
   * 체크박스 컬럼 정의.
   * `paste` 규칙이 없으므로 pasteGuard 가 이 컬럼 붙여넣기를 거부한다.
   */
  function column() {
    return {
      title: '선택',
      field: '_sel',
      width: 52,
      minWidth: 52,
      hozAlign: 'center',
      headerHozAlign: 'center',
      headerSort: false,
      resizable: false,
      cssClass: 'sel-col',
      // 체크박스 컬럼은 export·클립보드에서 제외한다. 빼지 않으면 CSV/XLSX 에
      // 값이 전부 비어 있는 '선택' 컬럼이 그대로 들어간다.
      download: false,
      clipboard: false,
      titleFormatter: () =>
        `<input type="checkbox" tabindex="-1" aria-label="현재 조회 결과 전체 선택">`,
      formatter: (cell) => {
        const id = cell.getRow().getIndex()
        return `<input type="checkbox" tabindex="-1" aria-label="행 선택"${selected.has(id) ? ' checked' : ''}>`
      },
      cellClick: (e, cell) => {
        e.preventDefault()
        toggle(cell.getRow(), e.shiftKey)
      },
      headerClick: (e) => {
        e.preventDefault()
        toggleAll()
      },
    }
  }

  /** 선택된 행의 데이터만 반환 — 다운로드용 */
  function selectedData() {
    const table = getTable()
    if (!table) return []
    return table.getData('active').filter((d) => selected.has(d[idField]))
  }

  return {
    column, toggle, toggleAll, clear, selectAllActive,
    isSelected, selectedData,
    get count() { return selected.size },
    get ids() { return selected },
  }
}
