'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { Loader2, Search, X, Clock, CheckCircle2, Ban, Shield, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EditableCell } from '@/components/table/editable-cell'
import type { TableRow } from '@/lib/hooks/use-table-projection'
import { cn } from '@/lib/utils'

interface VirtualizedTableProps {
  tableData: TableRow[] | undefined
  isLoading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onLabelUpdate: (pathPosition: number, oldLabel: string, newLabel: string) => void
  onRiskUpdate: (leafNodeId: string, field: 'severity' | 'occurrence' | 'detection', value: string) => void
  onClose: () => void
}

// Status configuration for display
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-gray-100 text-gray-700', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  BLOCKED: { label: 'Blocked', color: 'bg-red-100 text-red-700', icon: Ban },
  DONE: { label: 'Done', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  VERIFIED: { label: 'Verified', color: 'bg-purple-100 text-purple-700', icon: Shield },
}

// Get column label by index
function getColumnValue(row: TableRow, colIndex: number): string | null {
  switch (colIndex) {
    case 0: return row.failure_mode_top
    case 1: return row.why_1
    case 2: return row.why_2
    case 3: return row.why_3
    case 4: return row.why_4
    case 5: return row.why_5
    default: return null
  }
}

// Calculate rowspan for merged cells
function getRowSpanMap(data: TableRow[]) {
  const map: Map<number, Map<number, { rowSpan: number; isFirst: boolean }>> = new Map()

  if (!data || data.length === 0) return map

  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    map.set(rowIdx, new Map())
  }

  // Only merge first 6 columns (Failure Mode + Why 1-5)
  for (let colIdx = 0; colIdx <= 5; colIdx++) {
    let groupStart = 0

    for (let rowIdx = 0; rowIdx <= data.length; rowIdx++) {
      const currentValue = rowIdx < data.length ? getColumnValue(data[rowIdx], colIdx) : null
      const prevValue = rowIdx > 0 ? getColumnValue(data[rowIdx - 1], colIdx) : null

      let sameParent = true
      if (rowIdx > 0 && rowIdx < data.length) {
        for (let parentCol = 0; parentCol < colIdx; parentCol++) {
          if (getColumnValue(data[rowIdx], parentCol) !== getColumnValue(data[rowIdx - 1], parentCol)) {
            sameParent = false
            break
          }
        }
      }

      if (rowIdx === data.length || currentValue !== prevValue || !sameParent) {
        const groupSize = rowIdx - groupStart
        if (groupSize > 0) {
          map.get(groupStart)?.set(colIdx, { rowSpan: groupSize, isFirst: true })
          for (let i = groupStart + 1; i < rowIdx; i++) {
            map.get(i)?.set(colIdx, { rowSpan: 0, isFirst: false })
          }
        }
        groupStart = rowIdx
      }
    }
  }

  return map
}

export function VirtualizedTable({
  tableData,
  isLoading,
  searchQuery,
  onSearchChange,
  onLabelUpdate,
  onRiskUpdate,
  onClose,
}: VirtualizedTableProps) {
  // Filter table data based on search
  const filteredData = useMemo(() => {
    if (!tableData || !searchQuery.trim()) return tableData || []
    const query = searchQuery.toLowerCase()
    return tableData.filter(row => {
      const searchableFields = [
        row.failure_mode_top,
        row.why_1, row.why_2, row.why_3, row.why_4, row.why_5,
        row.units, row.specification,
        row.investigation_item, row.investigation_result,
        row.person_responsible_name, row.remarks,
        row.status
      ]
      return searchableFields.some(field =>
        field?.toLowerCase().includes(query)
      )
    })
  }, [tableData, searchQuery])

  // Calculate rowspan map (only when not filtering)
  const rowSpanMap = useMemo(() => {
    if (!filteredData || searchQuery.trim()) return new Map()
    return getRowSpanMap(filteredData)
  }, [filteredData, searchQuery])

  const handleLabelUpdate = (pathPosition: number, oldLabel: string, newLabel: string) => {
    if (newLabel && newLabel !== oldLabel) {
      onLabelUpdate(pathPosition, oldLabel, newLabel)
    }
  }

  // Check if a due date is overdue
  const isOverdue = (dueDate: string | null, status: string | null): boolean => {
    if (!dueDate) return false
    if (status === 'DONE' || status === 'VERIFIED') return false
    const today = new Date().toISOString().split('T')[0]
    return dueDate < today
  }

  if (isLoading) {
    return (
      <div className="h-[40vh] border-t bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[40vh] border-t bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Table View</h3>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-7 w-48 pl-7 text-xs"
            />
          </div>
          {searchQuery && filteredData && (
            <span className="text-xs text-muted-foreground">
              {filteredData.length} of {tableData?.length || 0} rows
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs text-muted-foreground">
            Click any cell to edit. Changes sync to canvas automatically.
          </p>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table Container */}
      {filteredData.length > 0 ? (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted">
                <th className="text-left p-2 font-medium border-r border-b min-w-[140px]">Failure Mode</th>
                <th className="text-left p-2 font-medium border-r border-b min-w-[120px]">Why 1</th>
                <th className="text-left p-2 font-medium border-r border-b min-w-[120px]">Why 2</th>
                <th className="text-left p-2 font-medium border-r border-b min-w-[120px]">Why 3</th>
                <th className="text-left p-2 font-medium border-r border-b min-w-[120px]">Why 4</th>
                <th className="text-left p-2 font-medium border-r border-b min-w-[120px]">Why 5</th>
                <th className="text-center p-2 font-medium border-r border-b w-12">S</th>
                <th className="text-center p-2 font-medium border-r border-b w-12">O</th>
                <th className="text-center p-2 font-medium border-r border-b w-12">D</th>
                <th className="text-center p-2 font-medium border-r border-b w-16">RPN</th>
                <th className="text-left p-2 font-medium border-r border-b min-w-[140px]">Investigation Item</th>
                <th className="text-left p-2 font-medium border-r border-b min-w-[100px]">Person</th>
                <th className="text-left p-2 font-medium border-r border-b w-28">Due Date</th>
                <th className="text-left p-2 font-medium border-r border-b w-28">Status</th>
                <th className="text-left p-2 font-medium border-r border-b min-w-[140px]">Result</th>
                <th className="text-left p-2 font-medium border-r border-b w-24">Judgment</th>
                <th className="text-left p-2 font-medium border-b min-w-[100px]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, rowIndex) => {
                const rowSpans = rowSpanMap.get(rowIndex)
                const overdueRow = isOverdue(row.due_date, row.status)
                const statusConfig = row.status ? STATUS_CONFIG[row.status] : null
                const StatusIcon = statusConfig?.icon

                return (
                  <tr
                    key={row.row_id}
                    className={cn(
                      'border-b hover:bg-muted/50',
                      rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                    )}
                  >
                    {/* Failure Mode */}
                    {rowSpans?.get(0)?.isFirst !== false && (
                      <td
                        className="p-0 border-r bg-muted/30 align-top"
                        rowSpan={rowSpans?.get(0)?.rowSpan || 1}
                      >
                        <EditableCell
                          value={row.failure_mode_top}
                          onChange={(newValue) => handleLabelUpdate(0, row.failure_mode_top, newValue)}
                        />
                      </td>
                    )}

                    {/* Why 1-5 */}
                    {[row.why_1, row.why_2, row.why_3, row.why_4, row.why_5].map((why, idx) => {
                      const colIndex = idx + 1
                      const spanInfo = rowSpans?.get(colIndex)
                      if (spanInfo?.isFirst === false) return null

                      return (
                        <td
                          key={idx}
                          className={cn(
                            'p-0 border-r align-top',
                            spanInfo?.rowSpan && spanInfo.rowSpan > 1 && 'bg-muted/10'
                          )}
                          rowSpan={spanInfo?.rowSpan || 1}
                        >
                          <EditableCell
                            value={why}
                            onChange={(newValue) => {
                              const oldValue = getColumnValue(row, idx + 1)
                              if (oldValue) {
                                handleLabelUpdate(idx + 1, oldValue, newValue)
                              }
                            }}
                            disabled={!why && idx > 0 && !getColumnValue(row, idx)}
                          />
                        </td>
                      )
                    })}

                    {/* S/O/D */}
                    <td className="p-0 border-r align-top">
                      <EditableCell
                        value={row.severity}
                        type="select"
                        options={[1,2,3,4,5,6,7,8,9,10].map(n => ({ value: n, label: String(n) }))}
                        onChange={(value) => onRiskUpdate(row.leaf_node_id, 'severity', value)}
                      />
                    </td>
                    <td className="p-0 border-r align-top">
                      <EditableCell
                        value={row.occurrence}
                        type="select"
                        options={[1,2,3,4,5,6,7,8,9,10].map(n => ({ value: n, label: String(n) }))}
                        onChange={(value) => onRiskUpdate(row.leaf_node_id, 'occurrence', value)}
                      />
                    </td>
                    <td className="p-0 border-r align-top">
                      <EditableCell
                        value={row.detection}
                        type="select"
                        options={[1,2,3,4,5,6,7,8,9,10].map(n => ({ value: n, label: String(n) }))}
                        onChange={(value) => onRiskUpdate(row.leaf_node_id, 'detection', value)}
                      />
                    </td>

                    {/* RPN */}
                    <td className="p-2 border-r text-center align-middle">
                      {row.rpn ? (
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
                          row.rpn >= 200 ? 'bg-red-100 text-red-700' :
                          row.rpn >= 100 ? 'bg-orange-100 text-orange-700' :
                          row.rpn >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        )}>
                          {row.rpn}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Investigation Item */}
                    <td className="p-2 border-r text-xs align-top">
                      {row.investigation_item || <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Person */}
                    <td className="p-2 border-r text-xs align-top">
                      {row.person_responsible_name || <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Due Date */}
                    <td className={cn(
                      'p-2 border-r text-xs align-top',
                      overdueRow && 'bg-red-50'
                    )}>
                      {row.due_date ? (
                        <div className={cn(
                          'flex items-center gap-1',
                          overdueRow && 'text-red-600 font-medium'
                        )}>
                          {overdueRow && <AlertCircle className="h-3 w-3" />}
                          {format(new Date(row.due_date), 'MMM d, yyyy')}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Status */}
                    <td className="p-2 border-r text-xs align-top">
                      {statusConfig ? (
                        <span className={cn(
                          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap',
                          statusConfig.color
                        )}>
                          {StatusIcon && <StatusIcon className="h-3 w-3" />}
                          {statusConfig.label}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Result */}
                    <td className="p-2 border-r text-xs align-top">
                      {row.investigation_result || <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Judgment */}
                    <td className="p-2 border-r text-xs align-top">
                      {row.judgment ? (
                        <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap',
                          row.judgment === 1 ? 'bg-green-100 text-green-700' :
                          row.judgment === 2 ? 'bg-blue-100 text-blue-700' :
                          row.judgment === 3 ? 'bg-gray-100 text-gray-600' :
                          'bg-yellow-100 text-yellow-700'
                        )}>
                          {row.judgment === 1 ? 'Root' :
                           row.judgment === 2 ? 'Contrib' :
                           row.judgment === 3 ? 'Not Cause' :
                           row.judgment === 4 ? 'Needs More' : row.judgment}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>

                    {/* Remarks */}
                    <td className="p-2 text-xs align-top">
                      {row.remarks || <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">
            No data yet. Add nodes to the canvas to see them here.
          </p>
        </div>
      )}
    </div>
  )
}
