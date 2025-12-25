'use client'

import { useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { useWeekStatuses, useUpsertWeekStatus } from '@/lib/hooks/use-week-status'
import type { Database } from '@/types/database'

type ActionStatus = Database['public']['Enums']['action_status']

interface WeekStatusTrackerProps {
  actionItemId: string
  analysisId: string
}

const STATUS_OPTIONS: { value: ActionStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-700' },
]

export function WeekStatusTracker({ actionItemId, analysisId }: WeekStatusTrackerProps) {
  const { data: weekStatuses, isLoading } = useWeekStatuses(actionItemId)
  const upsertWeekStatus = useUpsertWeekStatus(analysisId)

  // Get status for a specific week
  const getWeekStatus = useCallback((weekNumber: 1 | 2 | 3 | 4): ActionStatus => {
    const status = weekStatuses?.find(ws => ws.week_number === weekNumber)
    return status?.status || 'not_started'
  }, [weekStatuses])

  // Handle status change
  const handleStatusChange = useCallback(async (weekNumber: 1 | 2 | 3 | 4, status: ActionStatus) => {
    await upsertWeekStatus.mutateAsync({
      actionItemId,
      weekNumber,
      status,
    })
  }, [actionItemId, upsertWeekStatus])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <Label>Weekly Status</Label>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {([1, 2, 3, 4] as const).map((weekNum) => {
          const currentStatus = getWeekStatus(weekNum)
          const statusOption = STATUS_OPTIONS.find(s => s.value === currentStatus) || STATUS_OPTIONS[0]

          return (
            <div key={weekNum} className="space-y-1">
              <div className="text-xs font-medium text-center text-muted-foreground">
                Week {weekNum}
              </div>
              <div className="relative">
                <select
                  className={`w-full px-2 py-1.5 text-xs rounded border appearance-none cursor-pointer text-center font-medium ${statusOption.color}`}
                  value={currentStatus}
                  onChange={(e) => handleStatusChange(weekNum, e.target.value as ActionStatus)}
                  disabled={upsertWeekStatus.isPending}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {upsertWeekStatus.isPending && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded">
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {/* Visual Progress Bar */}
      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden flex">
        {([1, 2, 3, 4] as const).map((weekNum) => {
          const status = getWeekStatus(weekNum)
          let bgColor = 'bg-gray-300'
          if (status === 'done') bgColor = 'bg-green-500'
          else if (status === 'in_progress') bgColor = 'bg-blue-500'
          else if (status === 'blocked') bgColor = 'bg-red-500'

          return (
            <div key={weekNum} className={`flex-1 ${bgColor} ${weekNum < 4 ? 'border-r border-background' : ''}`} />
          )
        })}
      </div>
    </div>
  )
}
