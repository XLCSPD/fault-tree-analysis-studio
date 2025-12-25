'use client'

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import { saveAs } from 'file-saver'
import type { TableRow } from '@/lib/hooks/use-table-projection'
import type { Database } from '@/types/database'

type Analysis = Database['public']['Tables']['analyses']['Row']

interface ExportOptions {
  analysis: Analysis
  tableData: TableRow[]
  filename?: string
  includeTreeImage?: string // Base64 PNG of the tree
}

// Status label mapping
const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
}

// Judgment labels
const JUDGMENT_LABELS: Record<number, string> = {
  1: 'Root Cause Confirmed',
  2: 'Contributing Factor',
  3: 'Not a Cause',
  4: 'Needs More Investigation',
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  coverPage: {
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1e40af',
  },
  coverSubtitle: {
    fontSize: 16,
    marginBottom: 40,
    color: '#6b7280',
  },
  coverMeta: {
    fontSize: 12,
    marginBottom: 8,
    color: '#374151',
  },
  coverDate: {
    fontSize: 11,
    marginTop: 40,
    color: '#9ca3af',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1e40af',
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
    paddingBottom: 5,
  },
  subheader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
    color: '#374151',
  },
  text: {
    fontSize: 10,
    marginBottom: 5,
    color: '#374151',
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    width: 120,
  },
  value: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 6,
  },
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    fontSize: 8,
  },
  tableRowAlt: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    fontSize: 8,
  },
  tableCell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  tableCellHeader: {
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#3b82f6',
    color: '#ffffff',
  },
  summaryCard: {
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  summaryRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  kpiGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    width: '23%',
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  riskBadgeCritical: {
    backgroundColor: '#fecaca',
    color: '#991b1b',
    padding: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    fontSize: 8,
  },
  riskBadgeHigh: {
    backgroundColor: '#fed7aa',
    color: '#9a3412',
    padding: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    fontSize: 8,
  },
  riskBadgeMedium: {
    backgroundColor: '#fef08a',
    color: '#a16207',
    padding: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    fontSize: 8,
  },
  riskBadgeLow: {
    backgroundColor: '#bbf7d0',
    color: '#166534',
    padding: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    fontSize: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageNumber: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

// Get risk priority
function getRiskPriority(rpn: number): { label: string; style: Style } {
  if (rpn >= 200) return { label: 'Critical', style: styles.riskBadgeCritical }
  if (rpn >= 100) return { label: 'High', style: styles.riskBadgeHigh }
  if (rpn >= 50) return { label: 'Medium', style: styles.riskBadgeMedium }
  return { label: 'Low', style: styles.riskBadgeLow }
}

// Cover Page Component
function CoverPage({ analysis }: { analysis: Analysis }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.coverSubtitle}>Fault Tree Analysis Report</Text>
      <Text style={styles.coverTitle}>{analysis.title}</Text>

      {analysis.model && (
        <Text style={styles.coverMeta}>Model: {analysis.model}</Text>
      )}
      {analysis.application && (
        <Text style={styles.coverMeta}>Application: {analysis.application}</Text>
      )}
      {analysis.part_name && (
        <Text style={styles.coverMeta}>Part Name: {analysis.part_name}</Text>
      )}

      <Text style={styles.coverDate}>
        Generated: {new Date().toLocaleDateString()}
      </Text>
      <Text style={{ ...styles.coverDate, marginTop: 5 }}>
        Analysis Date: {analysis.analysis_date || 'Not specified'}
      </Text>
    </Page>
  )
}

// Executive Summary Page
function ExecutiveSummary({ analysis, tableData }: { analysis: Analysis; tableData: TableRow[] }) {
  // Calculate KPIs
  const totalNodes = tableData.length
  const nodesWithRPN = tableData.filter(r => r.rpn != null)
  const criticalRPN = nodesWithRPN.filter(r => r.rpn! >= 200).length
  const highRPN = nodesWithRPN.filter(r => r.rpn! >= 100 && r.rpn! < 200).length

  // Calculate action completion
  const withActions = tableData.filter(r => r.investigation_item)
  const completedActions = tableData.filter(r => {
    const statuses = [r.week_1_status, r.week_2_status, r.week_3_status, r.week_4_status]
    return statuses.some(s => s === 'done')
  }).length

  // Top 5 risks
  const topRisks = [...nodesWithRPN]
    .sort((a, b) => (b.rpn || 0) - (a.rpn || 0))
    .slice(0, 5)

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Executive Summary</Text>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{totalNodes}</Text>
          <Text style={styles.kpiLabel}>Total Nodes</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={{ ...styles.kpiValue, color: '#dc2626' }}>{criticalRPN}</Text>
          <Text style={styles.kpiLabel}>Critical RPN (≥200)</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={{ ...styles.kpiValue, color: '#ea580c' }}>{highRPN}</Text>
          <Text style={styles.kpiLabel}>High RPN (100-199)</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={{ ...styles.kpiValue, color: '#16a34a' }}>{completedActions}</Text>
          <Text style={styles.kpiLabel}>Actions Completed</Text>
        </View>
      </View>

      {/* Problem Statement */}
      {analysis.problem_statement && (
        <>
          <Text style={styles.subheader}>Problem Statement</Text>
          <Text style={styles.text}>{analysis.problem_statement}</Text>
        </>
      )}

      {/* Abstract */}
      {analysis.abstract && (
        <>
          <Text style={styles.subheader}>Abstract</Text>
          <Text style={styles.text}>{analysis.abstract}</Text>
        </>
      )}

      {/* Top Risks */}
      <Text style={styles.subheader}>Top 5 Risk Items</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableCellHeader, width: '35%' }}>Failure Mode</Text>
          <Text style={{ ...styles.tableCellHeader, width: '25%' }}>Root Cause</Text>
          <Text style={{ ...styles.tableCellHeader, width: '10%' }}>RPN</Text>
          <Text style={{ ...styles.tableCellHeader, width: '15%' }}>Priority</Text>
          <Text style={{ ...styles.tableCellHeader, width: '15%' }}>Owner</Text>
        </View>
        {topRisks.map((row, index) => {
          const whys = [row.why_9, row.why_8, row.why_7, row.why_6, row.why_5, row.why_4, row.why_3, row.why_2, row.why_1]
          const rootCause = whys.find(w => w) || '-'
          const priority = getRiskPriority(row.rpn!)

          return (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={{ ...styles.tableCell, width: '35%' }}>{row.failure_mode_top}</Text>
              <Text style={{ ...styles.tableCell, width: '25%' }}>{rootCause}</Text>
              <Text style={{ ...styles.tableCell, width: '10%' }}>{row.rpn}</Text>
              <View style={{ ...styles.tableCell, width: '15%' }}>
                <Text style={priority.style}>{priority.label}</Text>
              </View>
              <Text style={{ ...styles.tableCell, width: '15%' }}>{row.person_responsible_name || '-'}</Text>
            </View>
          )
        })}
      </View>

      <View style={styles.footer}>
        <Text>Fault Tree Studio</Text>
        <Text style={styles.pageNumber}>Page 2</Text>
      </View>
    </Page>
  )
}

// Full Table Pages (with pagination)
function TablePages({ tableData }: { tableData: TableRow[] }) {
  const ROWS_PER_PAGE = 20
  const pages = []

  for (let i = 0; i < tableData.length; i += ROWS_PER_PAGE) {
    const pageRows = tableData.slice(i, i + ROWS_PER_PAGE)
    const pageNum = Math.floor(i / ROWS_PER_PAGE) + 1

    pages.push(
      <Page key={i} size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.header}>FTA Analysis Table {pageNum > 1 ? `(Page ${pageNum})` : ''}</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableCellHeader, width: '12%' }}>Failure Mode</Text>
            <Text style={{ ...styles.tableCellHeader, width: '8%' }}>Why 1</Text>
            <Text style={{ ...styles.tableCellHeader, width: '8%' }}>Why 2</Text>
            <Text style={{ ...styles.tableCellHeader, width: '8%' }}>Why 3</Text>
            <Text style={{ ...styles.tableCellHeader, width: '8%' }}>Why 4</Text>
            <Text style={{ ...styles.tableCellHeader, width: '8%' }}>Why 5</Text>
            <Text style={{ ...styles.tableCellHeader, width: '4%' }}>S</Text>
            <Text style={{ ...styles.tableCellHeader, width: '4%' }}>O</Text>
            <Text style={{ ...styles.tableCellHeader, width: '4%' }}>D</Text>
            <Text style={{ ...styles.tableCellHeader, width: '5%' }}>RPN</Text>
            <Text style={{ ...styles.tableCellHeader, width: '12%' }}>Investigation</Text>
            <Text style={{ ...styles.tableCellHeader, width: '10%' }}>Owner</Text>
            <Text style={{ ...styles.tableCellHeader, width: '9%' }}>Judgment</Text>
          </View>

          {pageRows.map((row, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={{ ...styles.tableCell, width: '12%' }}>{truncate(row.failure_mode_top, 20)}</Text>
              <Text style={{ ...styles.tableCell, width: '8%' }}>{truncate(row.why_1, 12)}</Text>
              <Text style={{ ...styles.tableCell, width: '8%' }}>{truncate(row.why_2, 12)}</Text>
              <Text style={{ ...styles.tableCell, width: '8%' }}>{truncate(row.why_3, 12)}</Text>
              <Text style={{ ...styles.tableCell, width: '8%' }}>{truncate(row.why_4, 12)}</Text>
              <Text style={{ ...styles.tableCell, width: '8%' }}>{truncate(row.why_5, 12)}</Text>
              <Text style={{ ...styles.tableCell, width: '4%' }}>{row.severity || '-'}</Text>
              <Text style={{ ...styles.tableCell, width: '4%' }}>{row.occurrence || '-'}</Text>
              <Text style={{ ...styles.tableCell, width: '4%' }}>{row.detection || '-'}</Text>
              <Text style={{ ...styles.tableCell, width: '5%' }}>{row.rpn || '-'}</Text>
              <Text style={{ ...styles.tableCell, width: '12%' }}>{truncate(row.investigation_item, 18)}</Text>
              <Text style={{ ...styles.tableCell, width: '10%' }}>{truncate(row.person_responsible_name, 12)}</Text>
              <Text style={{ ...styles.tableCell, width: '9%' }}>{row.judgment ? JUDGMENT_LABELS[row.judgment]?.split(' ')[0] : '-'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>Fault Tree Studio</Text>
          <Text style={styles.pageNumber}>Page {pageNum + 2}</Text>
        </View>
      </Page>
    )
  }

  return <>{pages}</>
}

// Helper function to truncate text
function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '-'
  return text.length > maxLength ? text.slice(0, maxLength - 2) + '..' : text
}

// Action Items Summary Page
function ActionItemsPage({ tableData }: { tableData: TableRow[] }) {
  const actionsData = tableData
    .filter(r => r.investigation_item)
    .map(row => {
      const statuses = [row.week_1_status, row.week_2_status, row.week_3_status, row.week_4_status].filter(Boolean)
      let overallStatus = 'Not Started'
      if (statuses.includes('blocked')) overallStatus = 'Blocked'
      else if (statuses.length > 0 && statuses.every(s => s === 'done')) overallStatus = 'Done'
      else if (statuses.includes('in_progress') || statuses.includes('done')) overallStatus = 'In Progress'

      return { ...row, overallStatus }
    })

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Action Items Summary</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableCellHeader, width: '25%' }}>Investigation Item</Text>
          <Text style={{ ...styles.tableCellHeader, width: '15%' }}>Owner</Text>
          <Text style={{ ...styles.tableCellHeader, width: '10%' }}>Schedule</Text>
          <Text style={{ ...styles.tableCellHeader, width: '8%' }}>Wk 1</Text>
          <Text style={{ ...styles.tableCellHeader, width: '8%' }}>Wk 2</Text>
          <Text style={{ ...styles.tableCellHeader, width: '8%' }}>Wk 3</Text>
          <Text style={{ ...styles.tableCellHeader, width: '8%' }}>Wk 4</Text>
          <Text style={{ ...styles.tableCellHeader, width: '10%' }}>Status</Text>
          <Text style={{ ...styles.tableCellHeader, width: '8%' }}>Judgment</Text>
        </View>

        {actionsData.slice(0, 25).map((row, index) => (
          <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={{ ...styles.tableCell, width: '25%' }}>{truncate(row.investigation_item, 30)}</Text>
            <Text style={{ ...styles.tableCell, width: '15%' }}>{truncate(row.person_responsible_name, 15)}</Text>
            <Text style={{ ...styles.tableCell, width: '10%' }}>{row.schedule || '-'}</Text>
            <Text style={{ ...styles.tableCell, width: '8%' }}>{row.week_1_status ? STATUS_LABELS[row.week_1_status]?.slice(0, 4) : '-'}</Text>
            <Text style={{ ...styles.tableCell, width: '8%' }}>{row.week_2_status ? STATUS_LABELS[row.week_2_status]?.slice(0, 4) : '-'}</Text>
            <Text style={{ ...styles.tableCell, width: '8%' }}>{row.week_3_status ? STATUS_LABELS[row.week_3_status]?.slice(0, 4) : '-'}</Text>
            <Text style={{ ...styles.tableCell, width: '8%' }}>{row.week_4_status ? STATUS_LABELS[row.week_4_status]?.slice(0, 4) : '-'}</Text>
            <Text style={{ ...styles.tableCell, width: '10%' }}>{row.overallStatus}</Text>
            <Text style={{ ...styles.tableCell, width: '8%' }}>{row.judgment || '-'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text>Fault Tree Studio</Text>
        <Text style={styles.pageNumber}>Actions Summary</Text>
      </View>
    </Page>
  )
}

// Main PDF Document Component
function FTADocument({ analysis, tableData }: { analysis: Analysis; tableData: TableRow[] }) {
  return (
    <Document>
      <CoverPage analysis={analysis} />
      <ExecutiveSummary analysis={analysis} tableData={tableData} />
      <TablePages tableData={tableData} />
      <ActionItemsPage tableData={tableData} />
    </Document>
  )
}

// Export function
export async function exportToPdf({ analysis, tableData, filename }: ExportOptions) {
  const doc = <FTADocument analysis={analysis} tableData={tableData} />
  const blob = await pdf(doc).toBlob()
  const name = filename || `${analysis.title.replace(/[^a-zA-Z0-9]/g, '_')}_FTA_${new Date().toISOString().split('T')[0]}.pdf`
  saveAs(blob, name)
}
