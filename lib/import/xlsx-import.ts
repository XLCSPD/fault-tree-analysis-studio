import ExcelJS from 'exceljs'

export interface ImportedRow {
  failure_mode_top: string
  why_1?: string
  why_2?: string
  why_3?: string
  why_4?: string
  why_5?: string
  why_6?: string
  why_7?: string
  why_8?: string
  why_9?: string
  units?: string
  specification?: string
  severity?: number
  occurrence?: number
  detection?: number
  // New action lifecycle fields
  investigation_item?: string
  action_type?: 'INVESTIGATION' | 'CONTAINMENT' | 'CORRECTIVE' | 'PREVENTIVE'
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'VERIFIED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  person_responsible_name?: string
  due_date?: string
  close_criteria?: string
  investigation_result?: string
  judgment?: number
  remarks?: string
  // Legacy fields (for backwards compatibility with old spreadsheets)
  schedule?: string
}

export interface ImportResult {
  rows: ImportedRow[]
  errors: ImportError[]
  warnings: string[]
}

export interface ImportError {
  row: number
  column: string
  message: string
}

// Column header mappings (case-insensitive)
const columnMappings: Record<string, keyof ImportedRow> = {
  'failure mode (top)': 'failure_mode_top',
  'failure mode': 'failure_mode_top',
  'top event': 'failure_mode_top',
  'why 1': 'why_1',
  'why1': 'why_1',
  'why 2': 'why_2',
  'why2': 'why_2',
  'why 3': 'why_3',
  'why3': 'why_3',
  'why 4': 'why_4',
  'why4': 'why_4',
  'why 5': 'why_5',
  'why5': 'why_5',
  'why 6': 'why_6',
  'why6': 'why_6',
  'why 7': 'why_7',
  'why7': 'why_7',
  'why 8': 'why_8',
  'why8': 'why_8',
  'why 9': 'why_9',
  'why9': 'why_9',
  'units': 'units',
  'unit': 'units',
  'specification': 'specification',
  'spec': 'specification',
  's': 'severity',
  'severity': 'severity',
  'o': 'occurrence',
  'occurrence': 'occurrence',
  'd': 'detection',
  'detection': 'detection',
  // Action fields
  'investigation item': 'investigation_item',
  'action item': 'investigation_item',
  'action': 'investigation_item',
  'action title': 'investigation_item',
  'title': 'investigation_item',
  // Action type
  'action type': 'action_type',
  'type': 'action_type',
  // Status
  'status': 'status',
  'action status': 'status',
  // Priority
  'priority': 'priority',
  // Person responsible
  'person responsible': 'person_responsible_name',
  'responsible': 'person_responsible_name',
  'owner': 'person_responsible_name',
  'assigned to': 'person_responsible_name',
  // Due date (legacy 'schedule' also maps here)
  'due date': 'due_date',
  'due': 'due_date',
  'deadline': 'due_date',
  'schedule': 'schedule',
  // Close criteria
  'close criteria': 'close_criteria',
  'completion criteria': 'close_criteria',
  'definition of done': 'close_criteria',
  // Result
  'investigation result': 'investigation_result',
  'result': 'investigation_result',
  // Judgment and remarks
  'judgment': 'judgment',
  'judgement': 'judgment',
  'remarks': 'remarks',
  'notes': 'remarks',
  'comments': 'remarks',
}

// Action type value mappings
const actionTypeMappings: Record<string, ImportedRow['action_type']> = {
  'investigation': 'INVESTIGATION',
  'investigate': 'INVESTIGATION',
  'containment': 'CONTAINMENT',
  'contain': 'CONTAINMENT',
  'corrective': 'CORRECTIVE',
  'correct': 'CORRECTIVE',
  'fix': 'CORRECTIVE',
  'preventive': 'PREVENTIVE',
  'prevent': 'PREVENTIVE',
  'prevention': 'PREVENTIVE',
}

// Status value mappings
const statusMappings: Record<string, ImportedRow['status']> = {
  'not started': 'NOT_STARTED',
  'notstarted': 'NOT_STARTED',
  'pending': 'NOT_STARTED',
  'todo': 'NOT_STARTED',
  'new': 'NOT_STARTED',
  'in progress': 'IN_PROGRESS',
  'in-progress': 'IN_PROGRESS',
  'inprogress': 'IN_PROGRESS',
  'ongoing': 'IN_PROGRESS',
  'working': 'IN_PROGRESS',
  'active': 'IN_PROGRESS',
  'blocked': 'BLOCKED',
  'on hold': 'BLOCKED',
  'onhold': 'BLOCKED',
  'stuck': 'BLOCKED',
  'done': 'DONE',
  'complete': 'DONE',
  'completed': 'DONE',
  'finished': 'DONE',
  'verified': 'VERIFIED',
  'closed': 'VERIFIED',
  'approved': 'VERIFIED',
}

// Priority value mappings
const priorityMappings: Record<string, ImportedRow['priority']> = {
  'low': 'LOW',
  'l': 'LOW',
  '1': 'LOW',
  'medium': 'MEDIUM',
  'med': 'MEDIUM',
  'm': 'MEDIUM',
  '2': 'MEDIUM',
  'high': 'HIGH',
  'h': 'HIGH',
  '3': 'HIGH',
  'critical': 'HIGH',
  'urgent': 'HIGH',
}

function normalizeActionType(value: string | undefined): ImportedRow['action_type'] | undefined {
  if (!value) return undefined
  const normalized = value.toString().toLowerCase().trim()
  return actionTypeMappings[normalized]
}

function normalizeStatus(value: string | undefined): ImportedRow['status'] | undefined {
  if (!value) return undefined
  const normalized = value.toString().toLowerCase().trim()
  return statusMappings[normalized]
}

function normalizePriority(value: string | undefined): ImportedRow['priority'] | undefined {
  if (!value) return undefined
  const normalized = value.toString().toLowerCase().trim()
  return priorityMappings[normalized]
}

function parseDate(value: unknown): string | undefined {
  if (!value) return undefined

  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }

  const str = String(value).trim()
  if (!str) return undefined

  // Try parsing common formats
  const date = new Date(str)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  return str
}

function parseNumber(value: unknown, min: number, max: number): number | undefined {
  if (value === null || value === undefined || value === '') return undefined

  const num = Number(value)
  if (isNaN(num)) return undefined

  return Math.min(max, Math.max(min, Math.round(num)))
}

export async function parseXlsxFile(file: File): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return {
      rows: [],
      errors: [{ row: 0, column: '', message: 'No worksheet found in file' }],
      warnings: [],
    }
  }

  const rows: ImportedRow[] = []
  const errors: ImportError[] = []
  const warnings: string[] = []

  // Get header row
  const headerRow = worksheet.getRow(1)
  const columnMap: Map<number, keyof ImportedRow> = new Map()

  headerRow.eachCell((cell, colNumber) => {
    const headerValue = String(cell.value || '').toLowerCase().trim()
    const mappedField = columnMappings[headerValue]
    if (mappedField) {
      columnMap.set(colNumber, mappedField)
    }
  })

  // Check for required columns
  const hasFailureMode = Array.from(columnMap.values()).includes('failure_mode_top')
  if (!hasFailureMode) {
    warnings.push('No "Failure Mode (Top)" column found. Looking for alternative headers...')
  }

  // Parse data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // Skip header

    const rowData: Partial<ImportedRow> = {}
    let hasData = false

    columnMap.forEach((field, colNumber) => {
      const cell = row.getCell(colNumber)
      const value = cell.value

      if (value !== null && value !== undefined && value !== '') {
        hasData = true

        // Handle different field types
        if (field === 'severity' || field === 'occurrence' || field === 'detection') {
          const num = parseNumber(value, 1, 10)
          if (num !== undefined) {
            rowData[field] = num
          } else if (value) {
            errors.push({
              row: rowNumber,
              column: field,
              message: `Invalid ${field} value: ${value} (must be 1-10)`,
            })
          }
        } else if (field === 'judgment') {
          const num = parseNumber(value, 1, 4)
          if (num !== undefined) {
            rowData[field] = num
          }
        } else if (field === 'due_date' || field === 'schedule') {
          const dateValue = parseDate(value)
          // Map 'schedule' to 'due_date' for backwards compatibility
          if (field === 'schedule') {
            rowData.due_date = rowData.due_date || dateValue
          } else {
            rowData[field] = dateValue
          }
        } else if (field === 'action_type') {
          rowData[field] = normalizeActionType(String(value))
        } else if (field === 'status') {
          rowData[field] = normalizeStatus(String(value))
        } else if (field === 'priority') {
          rowData[field] = normalizePriority(String(value))
        } else {
          rowData[field] = String(value).trim()
        }
      }
    })

    if (hasData) {
      // Validate required fields
      if (!rowData.failure_mode_top) {
        errors.push({
          row: rowNumber,
          column: 'failure_mode_top',
          message: 'Missing required field: Failure Mode (Top)',
        })
      } else {
        rows.push(rowData as ImportedRow)
      }
    }
  })

  if (rows.length === 0 && errors.length === 0) {
    warnings.push('No data rows found in the file')
  }

  return { rows, errors, warnings }
}

export function validateImportRows(rows: ImportedRow[]): ImportError[] {
  const errors: ImportError[] = []

  rows.forEach((row, index) => {
    const rowNum = index + 2 // Account for header row

    // Validate S/O/D values
    if (row.severity !== undefined && (row.severity < 1 || row.severity > 10)) {
      errors.push({ row: rowNum, column: 'severity', message: 'Severity must be 1-10' })
    }
    if (row.occurrence !== undefined && (row.occurrence < 1 || row.occurrence > 10)) {
      errors.push({ row: rowNum, column: 'occurrence', message: 'Occurrence must be 1-10' })
    }
    if (row.detection !== undefined && (row.detection < 1 || row.detection > 10)) {
      errors.push({ row: rowNum, column: 'detection', message: 'Detection must be 1-10' })
    }
    if (row.judgment !== undefined && (row.judgment < 1 || row.judgment > 4)) {
      errors.push({ row: rowNum, column: 'judgment', message: 'Judgment must be 1-4' })
    }
  })

  return errors
}
