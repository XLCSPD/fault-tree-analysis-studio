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
  investigation_item?: string
  person_responsible_name?: string
  schedule?: string
  week_1_status?: string
  week_2_status?: string
  week_3_status?: string
  week_4_status?: string
  investigation_result?: string
  judgment?: number
  remarks?: string
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
  'investigation item': 'investigation_item',
  'action item': 'investigation_item',
  'action': 'investigation_item',
  'person responsible': 'person_responsible_name',
  'responsible': 'person_responsible_name',
  'owner': 'person_responsible_name',
  'schedule': 'schedule',
  'due date': 'schedule',
  'due': 'schedule',
  'week 1 status': 'week_1_status',
  'week1 status': 'week_1_status',
  'w1': 'week_1_status',
  'week 2 status': 'week_2_status',
  'week2 status': 'week_2_status',
  'w2': 'week_2_status',
  'week 3 status': 'week_3_status',
  'week3 status': 'week_3_status',
  'w3': 'week_3_status',
  'week 4 status': 'week_4_status',
  'week4 status': 'week_4_status',
  'w4': 'week_4_status',
  'investigation result': 'investigation_result',
  'result': 'investigation_result',
  'judgment': 'judgment',
  'judgement': 'judgment',
  'remarks': 'remarks',
  'notes': 'remarks',
  'comments': 'remarks',
}

// Status value mappings
const statusMappings: Record<string, string> = {
  'done': 'done',
  'complete': 'done',
  'completed': 'done',
  'finished': 'done',
  'in progress': 'in_progress',
  'in-progress': 'in_progress',
  'inprogress': 'in_progress',
  'ongoing': 'in_progress',
  'working': 'in_progress',
  'pending': 'pending',
  'not started': 'pending',
  'notstarted': 'pending',
  'todo': 'pending',
  'delayed': 'delayed',
  'late': 'delayed',
  'overdue': 'delayed',
  'blocked': 'blocked',
  'on hold': 'blocked',
  'onhold': 'blocked',
  '': '',
}

function normalizeStatus(value: string | undefined): string | undefined {
  if (!value) return undefined
  const normalized = value.toString().toLowerCase().trim()
  return statusMappings[normalized] ?? value
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
        } else if (field === 'schedule') {
          rowData[field] = parseDate(value)
        } else if (field.startsWith('week_') && field.endsWith('_status')) {
          rowData[field] = normalizeStatus(String(value))
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
