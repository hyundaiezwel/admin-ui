/**
 * 범위 붙여넣기 검증 계층 (pasteGuard)
 * ============================================================================
 * Tabulator 의 기본 range 붙여넣기는 값을 전혀 검증하지 않는다.
 * 내장 파서/액션 소스에서 확인된 문제:
 *
 *   pasteParsers.range :  row[col.field] = item[i % itemLength]   → 가로 반복 채움
 *   pasteActions.range :  row.updateData(data[i % dataLength])    → 세로 반복 채움
 *
 * 둘 다 타입 변환도 검증도 하지 않아 문자열이 숫자 컬럼에 그대로 기록된다.
 * 또한 History 모듈은 cellEdit / rowAdd / rowDelete / rowMove 만 추적하므로
 * row.updateData() 로 동작하는 범위 붙여넣기는 table.undo() 로 되돌릴 수 없다.
 *
 * 이 모듈은 clipboardPasteParser 를 대체해 다음을 보장한다.
 *
 *   1. 컬럼별 타입/허용값/필수/범위 검증  — 규칙은 data.js 의 PASTE_RULES (field → rule)
 *   2. 규칙이 없는 컬럼은 붙여넣기 거부   — 읽기 전용 컬럼 보호
 *   3. 타입 변환 수행                     — 숫자는 Number 로 저장 (문자열 유입 차단)
 *   4. 치수 불일치 거부                   — 반복 채움 차단
 *   5. 전량 거부(all-or-nothing)          — 확정 정책. 한 셀이라도 실패하면 아무것도 반영하지 않는다.
 *                                          부분 반영은 어느 행이 들어갔는지 추적이 어려워지고,
 *                                          정산금액이 걸린 화면에서는 그 자체가 사고가 된다.
 *   6. 붙여넣기 직전 스냅샷               — 되돌리기 제공
 *
 * Tabulator 비의존: 공개 API(getRanges / getRows / getColumns / getRow)만 사용한다.
 */

/** 규칙 타입별 검증기 — { value } 성공, { err } 실패 */
const VALIDATORS = {
  number(raw, rule) {
    const s = String(raw ?? '').trim().replace(/,/g, '')
    if (s === '') return rule.required ? { err: '필수값 누락' } : { value: null }
    if (!/^-?\d+(\.\d+)?$/.test(s)) return { err: '숫자 형식 아님' }
    const n = Number(s)
    if (!Number.isFinite(n)) return { err: '숫자 변환 불가' }
    if (rule.integer && !Number.isInteger(n)) return { err: '정수만 허용' }
    if (rule.min != null && n < rule.min) return { err: `최솟값 ${rule.min.toLocaleString('ko-KR')} 미달` }
    if (rule.max != null && n > rule.max) return { err: `최댓값 ${rule.max.toLocaleString('ko-KR')} 초과` }
    return { value: n }
  },

  enum(raw, rule) {
    const s = String(raw ?? '').trim()
    if (s === '') return rule.required ? { err: '필수값 누락' } : { value: '' }
    if (!rule.values.includes(s)) return { err: `허용값 아님 — ${rule.values.join(' / ')}` }
    return { value: s }
  },

  text(raw, rule) {
    const s = String(raw ?? '').trim()
    if (s === '') return rule.required ? { err: '필수값 누락' } : { value: '' }
    if (rule.maxLength && s.length > rule.maxLength) return { err: `${rule.maxLength}자 초과 (${s.length}자)` }
    if (rule.pattern && !rule.pattern.test(s)) return { err: rule.patternMessage || '형식 불일치' }
    return { value: s }
  },

  date(raw, rule) {
    const s = String(raw ?? '').trim()
    if (s === '') return rule.required ? { err: '필수값 누락' } : { value: '' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { err: 'YYYY-MM-DD 형식 아님' }
    const [y, m, d] = s.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
      return { err: '존재하지 않는 날짜' }
    }
    return { value: s }
  },
}

/** 클립보드 텍스트를 2차원 배열로 */
function parseGrid(clipboard) {
  const text = String(clipboard ?? '').replace(/\r\n/g, '\n').replace(/\n+$/, '')
  if (text === '') return []
  return text.split('\n').map((line) => line.split('\t'))
}

/**
 * @param getTable  () => Tabulator  현재 테이블 인스턴스 반환
 * @param onReport  (report) => void 검증 결과 통보
 *                  report = { ok, summary, errors[], undoable }
 */
/**
 * @param {{
 *   getTable: () => any,
 *   rules?: Record<string, any>,
 *   onReport?: (report: { ok: boolean, summary: string, errors: any[], undoable: boolean }) => void,
 * }} options
 */
export function createPasteGuard({ getTable, rules = {}, onReport = () => {} }) {
  let snapshot = null

  function report(ok, summary, errors = []) {
    onReport({ ok, summary, errors, undoable: snapshot !== null })
    return ok
  }

  function parser(clipboard) {
    const table = getTable()
    if (!table) return report(false, '그리드가 준비되지 않았습니다.') && false

    const ranges = table.getRanges()
    if (!ranges.length) { report(false, '선택된 범위가 없습니다.'); return false }
    if (ranges.length > 1) { report(false, '다중 범위 붙여넣기는 지원하지 않습니다. 하나의 범위만 선택하세요.'); return false }

    const grid = parseGrid(clipboard)
    if (!grid.length) { report(false, '붙여넣을 데이터가 없습니다.'); return false }

    const r = grid.length
    const c = grid[0].length
    if (grid.some((row) => row.length !== c)) {
      report(false, '클립보드의 행마다 열 수가 다릅니다. 직사각형 블록만 붙여넣을 수 있습니다.')
      return false
    }

    const range = ranges[0]
    const selRows = range.getRows()
    const selCols = range.getColumns()
    const singleCell = selRows.length === 1 && selCols.length === 1

    // 붙여넣기 대상 행/열 확정
    let rows, cols
    if (singleCell) {
      // 단일 셀 선택 = 그 셀을 기준점으로 블록 확장 (Excel 관행)
      const allRows = table.getRows('active')
      const allCols = table.getColumns().filter((col) => col.isVisible() && col.getField())
      const startIdx = selRows[0].getIndex()
      const startField = selCols[0].getField()
      const r0 = allRows.findIndex((row) => row.getIndex() === startIdx)
      const c0 = allCols.findIndex((col) => col.getField() === startField)

      if (r0 < 0 || c0 < 0) { report(false, '붙여넣기 시작 위치를 찾을 수 없습니다.'); return false }
      if (r0 + r > allRows.length) {
        report(false, `행 범위 초과 — ${r}행이 필요하지만 시작 위치 아래로 ${allRows.length - r0}행만 남았습니다.`)
        return false
      }
      if (c0 + c > allCols.length) {
        report(false, `열 범위 초과 — ${c}열이 필요하지만 시작 위치 오른쪽으로 ${allCols.length - c0}열만 남았습니다.`)
        return false
      }
      rows = allRows.slice(r0, r0 + r)
      cols = allCols.slice(c0, c0 + c)
    } else {
      // 범위를 드래그로 지정한 경우 = 치수가 정확히 일치해야 함 (반복 채움 차단)
      if (r !== selRows.length || c !== selCols.length) {
        report(false,
          `치수 불일치 — 선택 ${selRows.length}행 × ${selCols.length}열, 클립보드 ${r}행 × ${c}열. ` +
          '자동 반복 채움을 막기 위해 거부했습니다.')
        return false
      }
      rows = selRows
      cols = selCols
    }

    // 컬럼별 규칙 확정
    const specs = cols.map((col) => {
      const field = col.getField()
      return { field, title: col.getDefinition().title || field, rule: rules[field] }
    })

    // 검증 + 타입 변환
    const errors = []
    const out = []

    rows.forEach((row, i) => {
      const rowNo = row.getPosition()
      const payload = {}

      specs.forEach((spec, j) => {
        const raw = grid[i][j]

        if (!spec.rule) {
          errors.push({ rowNo, title: spec.title, value: raw, reason: '붙여넣기가 허용되지 않은 컬럼' })
          return
        }
        const validate = VALIDATORS[spec.rule.type]
        if (!validate) {
          errors.push({ rowNo, title: spec.title, value: raw, reason: `알 수 없는 규칙 타입 '${spec.rule.type}'` })
          return
        }
        const res = validate(raw, spec.rule)
        if (res.err) errors.push({ rowNo, title: spec.title, value: raw, reason: res.err })
        else payload[spec.field] = res.value
      })

      out.push(payload)
    })

    // 전량 거부(확정 정책) — 한 셀이라도 실패하면 아무것도 반영하지 않는다.
    // 부분 반영을 허용하지 않는 이유는 모듈 상단 5번 주석 참고.
    if (errors.length) {
      report(false, `${errors.length}개 셀이 검증을 통과하지 못해 붙여넣기를 취소했습니다. (반영된 값 없음)`, errors)
      return false
    }

    // 되돌리기용 스냅샷 — 액션 실행 전이므로 아직 원본 상태
    snapshot = rows.map((row) => ({ index: row.getIndex(), data: { ...row.getData() } }))

    report(true, `${rows.length}행 × ${cols.length}열 검증 통과 — 타입 변환 후 반영했습니다.`)
    return out
  }

  function undo() {
    const table = getTable()
    if (!table || !snapshot) return { ok: false, summary: '되돌릴 붙여넣기가 없습니다.' }

    table.blockRedraw()
    let restored = 0
    snapshot.forEach((s) => {
      const row = table.getRow(s.index)
      if (row) { row.update(s.data); restored++ }
    })
    table.restoreRedraw()

    const n = snapshot.length
    snapshot = null
    onReport({ ok: true, summary: `되돌리기 완료 — ${restored}/${n}행 복원`, errors: [], undoable: false })
    return { ok: true, restored }
  }

  function clearSnapshot() { snapshot = null }

  return { parser, undo, clearSnapshot, get undoable() { return snapshot !== null } }
}
