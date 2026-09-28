import { STATUS_TONE, CHANNELS, STATUSES, ASSIGNEES, type Status } from '@fixtures/inquiries'
import { badgeHtml } from '@/ws/badge'

/**
 * 문의 답변 관리 그리드의 컬럼 원장.
 *
 * PoC의 `COLUMN_SETS` 패턴을 따른다 — 컬럼은 여기서만 정의하고, 화면은 어떤 세트를
 * 보여줄지만 고른다. 사용자별 컬럼 저장이나 메타 스키마가 필요 없는 구조다.
 *
 * `paste` 규칙이 없는 컬럼은 pasteGuard가 붙여넣기를 **거부**한다. 식별자(`id`)와
 * 산출값(`slaLeft`, `replyCount`)에 규칙을 두지 않은 것은 그래서다.
 */

const badge = (cell: any) => {
  const v = cell.getValue() as Status
  return badgeHtml(v, STATUS_TONE[v])
}

/** SLA 잔여. 음수는 초과라 위험으로 읽혀야 한다 — 색만 쓰지 않고 부호와 단위를 남긴다 */
const sla = (cell: any) => {
  const v = Number(cell.getValue())
  if (Number.isNaN(v)) return ''
  const tone = v < 0 ? 'danger' : v < 4 ? 'warning' : 'neutral'
  const text = v < 0 ? `${Math.abs(v)}h 초과` : `${v}h 남음`
  return badgeHtml(text, tone)
}

export const INQUIRY_COLUMNS = [
  { title: '문의번호', field: 'id', width: 116, sorter: 'string', headerFilter: 'input' },
  {
    title: '채널', field: 'channel', width: 88, sorter: 'string',
    headerFilter: 'list', headerFilterParams: { values: ['', ...CHANNELS] },
    paste: { type: 'enum', values: CHANNELS },
  },
  {
    title: '분류', field: 'category', width: 100, sorter: 'string',
    headerFilter: 'input', editor: 'input',
    paste: { type: 'text', maxLength: 20 },
  },
  {
    title: '제목', field: 'title', minWidth: 240, sorter: 'string',
    headerFilter: 'input', editor: 'input',
    paste: { type: 'text', required: true, maxLength: 120 },
  },
  { title: '고객', field: 'customer', width: 92, sorter: 'string', headerFilter: 'input' },
  {
    title: '담당자', field: 'assignee', width: 96, sorter: 'string',
    headerFilter: 'list', headerFilterParams: { values: ['', ...ASSIGNEES] },
    editor: 'input',
    paste: { type: 'enum', values: ASSIGNEES },
  },
  {
    title: '상태', field: 'status', width: 96, hozAlign: 'center', headerHozAlign: 'center',
    sorter: 'string', formatter: badge,
    headerFilter: 'list', headerFilterParams: { values: ['', ...STATUSES] },
    paste: { type: 'enum', values: STATUSES },
  },
  { title: 'SLA', field: 'slaLeft', width: 104, hozAlign: 'center', headerHozAlign: 'center', sorter: 'number', formatter: sla },
  { title: '답변', field: 'replyCount', width: 72, hozAlign: 'right', headerHozAlign: 'right', sorter: 'number' },
  { title: '접수일시', field: 'createdAt', width: 140, sorter: 'string' },
]

/** pasteGuard에 넘길 규칙 맵. 컬럼 정의 옆에 적어 두고 여기서 뽑는다 */
export const INQUIRY_PASTE_RULES = Object.fromEntries(
  INQUIRY_COLUMNS.filter((c: any) => c.paste).map((c: any) => [c.field, c.paste]),
)
