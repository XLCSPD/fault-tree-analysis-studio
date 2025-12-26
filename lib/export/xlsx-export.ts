'use client'

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { TableRow } from '@/lib/hooks/use-table-projection'
import type { Database } from '@/types/database'

type Analysis = Database['public']['Tables']['analyses']['Row']

interface ExportOptions {
  analysis: Analysis
  tableData: TableRow[]
  filename?: string
}

// Status label mapping for action lifecycle
const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
  VERIFIED: 'Verified',
}

// Judgment labels
const JUDGMENT_LABELS: Record<number, string> = {
  1: 'Root Cause Confirmed',
  2: 'Contributing Factor',
  3: 'Not a Cause',
  4: 'Needs More Investigation',
}

export async function exportToXlsx({ analysis, tableData, filename }: ExportOptions) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Fault Tree Studio'
  workbook.created = new Date()

  // Sheet 1: Main FTA Table
  const mainSheet = workbook.addWorksheet('FTA Analysis', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  })

  // Define columns (updated for new lifecycle model)
  mainSheet.columns = [
    { header: 'Failure Mode (Top)', key: 'failure_mode_top', width: 25 },
    { header: 'Why 1', key: 'why_1', width: 20 },
    { header: 'Why 2', key: 'why_2', width: 20 },
    { header: 'Why 3', key: 'why_3', width: 20 },
    { header: 'Why 4', key: 'why_4', width: 20 },
    { header: 'Why 5', key: 'why_5', width: 20 },
    { header: 'Why 6', key: 'why_6', width: 20 },
    { header: 'Why 7', key: 'why_7', width: 20 },
    { header: 'Why 8', key: 'why_8', width: 20 },
    { header: 'Why 9', key: 'why_9', width: 20 },
    { header: 'Units', key: 'units', width: 12 },
    { header: 'Specification', key: 'specification', width: 15 },
    { header: 'S', key: 'severity', width: 5 },
    { header: 'O', key: 'occurrence', width: 5 },
    { header: 'D', key: 'detection', width: 5 },
    { header: 'RPN', key: 'rpn', width: 8 },
    { header: 'Investigation Item', key: 'investigation_item', width: 25 },
    { header: 'Person Responsible', key: 'person_responsible_name', width: 18 },
    { header: 'Due Date', key: 'due_date', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Investigation Result', key: 'investigation_result', width: 30 },
    { header: 'Judgment', key: 'judgment', width: 20 },
    { header: 'Remarks', key: 'remarks', width: 25 },
  ]

  // Style header row
  const headerRow = mainSheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 25

  // Add data rows
  tableData.forEach((row, index) => {
    const dataRow = mainSheet.addRow({
      failure_mode_top: row.failure_mode_top,
      why_1: row.why_1 || '',
      why_2: row.why_2 || '',
      why_3: row.why_3 || '',
      why_4: row.why_4 || '',
      why_5: row.why_5 || '',
      why_6: row.why_6 || '',
      why_7: row.why_7 || '',
      why_8: row.why_8 || '',
      why_9: row.why_9 || '',
      units: row.units || '',
      specification: row.specification || '',
      severity: row.severity || '',
      occurrence: row.occurrence || '',
      detection: row.detection || '',
      rpn: row.rpn || '',
      investigation_item: row.investigation_item || '',
      person_responsible_name: row.person_responsible_name || '',
      due_date: row.due_date || '',
      status: row.status ? STATUS_LABELS[row.status] || row.status : '',
      investigation_result: row.investigation_result || '',
      judgment: row.judgment ? JUDGMENT_LABELS[row.judgment] || '' : '',
      remarks: row.remarks || '',
    })

    // Alternate row colors
    if (index % 2 === 1) {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      }
    }

    // Color code RPN cell
    const rpnCell = dataRow.getCell('rpn')
    if (row.rpn) {
      if (row.rpn >= 200) {
        rpnCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        rpnCell.font = { color: { argb: 'FFB91C1C' }, bold: true }
      } else if (row.rpn >= 100) {
        rpnCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } }
        rpnCell.font = { color: { argb: 'FFC2410C' } }
      } else if (row.rpn >= 50) {
        rpnCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }
        rpnCell.font = { color: { argb: 'FFA16207' } }
      } else {
        rpnCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }
        rpnCell.font = { color: { argb: 'FF15803D' } }
      }
    }

    // Color code status cell
    const statusCell = dataRow.getCell('status')
    if (row.status) {
      if (row.status === 'DONE' || row.status === 'VERIFIED') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }
        statusCell.font = { color: { argb: 'FF15803D' } }
      } else if (row.status === 'IN_PROGRESS') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
        statusCell.font = { color: { argb: 'FF1D4ED8' } }
      } else if (row.status === 'BLOCKED') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        statusCell.font = { color: { argb: 'FFB91C1C' } }
      }
    }
  })

  // Add borders to all cells
  mainSheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      }
    })
  })

  // Sheet 2: Analysis Metadata
  const metaSheet = workbook.addWorksheet('Metadata')
  metaSheet.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Value', key: 'value', width: 50 },
  ]

  const headerRowMeta = metaSheet.getRow(1)
  headerRowMeta.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRowMeta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }

  const metadataFields = [
    { field: 'Title', value: analysis.title },
    { field: 'Status', value: analysis.status || '' },
    { field: 'Analysis Date', value: analysis.analysis_date || '' },
    // Context fields
    { field: 'Site / Location', value: analysis.site_name || '' },
    { field: 'Area / Function', value: analysis.area_function || '' },
    // Scope fields (new industry-neutral names with fallback to legacy)
    { field: 'Process / Workflow', value: analysis.process_workflow || analysis.application || '' },
    { field: 'Asset / System', value: analysis.asset_system || analysis.model || '' },
    { field: 'Item / Product / Output', value: analysis.item_output || analysis.part_name || '' },
    // Description
    { field: 'Problem Statement', value: analysis.problem_statement || '' },
    { field: 'Abstract', value: analysis.abstract || '' },
    { field: 'Related Document', value: analysis.related_document || '' },
    // Timestamps
    { field: 'Created At', value: analysis.created_at ? new Date(analysis.created_at).toLocaleString() : '' },
    { field: 'Updated At', value: analysis.updated_at ? new Date(analysis.updated_at).toLocaleString() : '' },
  ]

  metadataFields.forEach((item) => metaSheet.addRow(item))

  // Sheet 3: Risk Summary (sorted by RPN)
  const riskSheet = workbook.addWorksheet('Risk Summary')
  riskSheet.columns = [
    { header: 'Failure Mode', key: 'failure_mode', width: 25 },
    { header: 'Root Cause', key: 'root_cause', width: 30 },
    { header: 'S', key: 'severity', width: 5 },
    { header: 'O', key: 'occurrence', width: 5 },
    { header: 'D', key: 'detection', width: 5 },
    { header: 'RPN', key: 'rpn', width: 8 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Person Responsible', key: 'person', width: 18 },
    { header: 'Status', key: 'status', width: 15 },
  ]

  const headerRowRisk = riskSheet.getRow(1)
  headerRowRisk.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRowRisk.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }

  // Sort by RPN descending
  const sortedData = [...tableData]
    .filter(row => row.rpn != null)
    .sort((a, b) => (b.rpn || 0) - (a.rpn || 0))

  sortedData.forEach((row) => {
    // Find deepest why (root cause)
    const whys = [row.why_9, row.why_8, row.why_7, row.why_6, row.why_5, row.why_4, row.why_3, row.why_2, row.why_1]
    const rootCause = whys.find(w => w) || row.failure_mode_top

    const statusLabel = row.status ? STATUS_LABELS[row.status] || row.status : 'Not Started'
    const priority = row.rpn! >= 200 ? 'Critical' : row.rpn! >= 100 ? 'High' : row.rpn! >= 50 ? 'Medium' : 'Low'

    const dataRow = riskSheet.addRow({
      failure_mode: row.failure_mode_top,
      root_cause: rootCause,
      severity: row.severity,
      occurrence: row.occurrence,
      detection: row.detection,
      rpn: row.rpn,
      priority,
      person: row.person_responsible_name || '',
      status: statusLabel,
    })

    // Color code priority
    const priorityCell = dataRow.getCell('priority')
    if (priority === 'Critical') {
      priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
      priorityCell.font = { color: { argb: 'FFB91C1C' }, bold: true }
    } else if (priority === 'High') {
      priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } }
      priorityCell.font = { color: { argb: 'FFC2410C' } }
    } else if (priority === 'Medium') {
      priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }
      priorityCell.font = { color: { argb: 'FFA16207' } }
    } else {
      priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }
      priorityCell.font = { color: { argb: 'FF15803D' } }
    }
  })

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const name = filename || `${analysis.title.replace(/[^a-zA-Z0-9]/g, '_')}_FTA_${new Date().toISOString().split('T')[0]}.xlsx`
  saveAs(blob, name)
}
