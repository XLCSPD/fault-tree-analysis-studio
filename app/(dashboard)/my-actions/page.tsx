'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useMyActions } from '@/lib/hooks/use-my-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
}

export default function MyActionsPage() {
  const { data, isLoading } = useMyActions()
  const [expandedAnalyses, setExpandedAnalyses] = useState<Set<string>>(new Set())
  const [groupBy, setGroupBy] = useState<'analysis' | 'dueDate'>('analysis')

  const toggleAnalysis = (analysisId: string) => {
    const newExpanded = new Set(expandedAnalyses)
    if (newExpanded.has(analysisId)) {
      newExpanded.delete(analysisId)
    } else {
      newExpanded.add(analysisId)
    }
    setExpandedAnalyses(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const renderActionItem = (action: NonNullable<typeof data>['actions'][0]) => {
    const isOverdue = action.schedule && action.schedule < new Date().toISOString().split('T')[0]

    return (
      <div
        key={action.id}
        className="p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{action.investigation_item}</p>
            {action.node_label && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                Node: {action.node_label}
              </p>
            )}
          </div>
          <Link
            href={`/analyses/${action.analysis_id}`}
            className="text-primary hover:text-primary/80"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex items-center gap-4 mt-3">
          {action.schedule && (
            <div
              className={cn(
                'flex items-center gap-1.5 text-sm',
                isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
              )}
            >
              {isOverdue ? (
                <AlertCircle className="h-3.5 w-3.5" />
              ) : (
                <Calendar className="h-3.5 w-3.5" />
              )}
              {format(new Date(action.schedule), 'MMM d, yyyy')}
            </div>
          )}
        </div>

        {/* Week statuses */}
        <div className="flex gap-2 mt-3">
          {[1, 2, 3, 4].map(weekNum => {
            const weekStatus = action.week_statuses.find(ws => ws.week_number === weekNum)
            const status = weekStatus?.status ?? 'not_started'
            return (
              <div
                key={weekNum}
                className={cn(
                  'text-xs px-2 py-1 rounded',
                  statusColors[status] ?? statusColors.not_started
                )}
                title={`Week ${weekNum}: ${statusLabels[status] ?? 'Not Started'}`}
              >
                W{weekNum}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderGroupedByAnalysis = (actions: NonNullable<typeof data>['actions']) => {
    if (!data) return null

    const grouped = data.groupedByAnalysis
    const analysisIds = Object.keys(grouped)

    if (analysisIds.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No actions assigned to you</p>
          <p className="text-sm mt-1">
            Actions assigned to you will appear here
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {analysisIds.map(analysisId => {
          const analysisActions = grouped[analysisId]
          const firstAction = analysisActions[0]
          const isExpanded = expandedAnalyses.has(analysisId)

          return (
            <Card key={analysisId}>
              <button
                onClick={() => toggleAnalysis(analysisId)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{firstAction.analysis_title}</span>
                  <span className="text-sm text-muted-foreground">
                    ({analysisActions.length} action{analysisActions.length !== 1 ? 's' : ''})
                  </span>
                </div>
              </button>
              {isExpanded && (
                <CardContent className="pt-0 space-y-3">
                  {analysisActions.map(renderActionItem)}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    )
  }

  const renderActionsList = (actions: NonNullable<typeof data>['actions']) => {
    if (actions.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No actions in this category</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {actions.map(action => (
          <Card key={action.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <Link
                  href={`/analyses/${action.analysis_id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {action.analysis_title}
                </Link>
              </div>
              {renderActionItem(action)}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Actions</h1>
          <p className="text-muted-foreground mt-1">
            Action items assigned to you across all analyses
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">
            All ({data?.actions.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="text-red-600">
            Overdue ({data?.overdue.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="thisWeek">
            This Week ({data?.thisWeek.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({data?.upcoming.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderGroupedByAnalysis(data?.actions ?? [])}
        </TabsContent>

        <TabsContent value="overdue">
          {renderActionsList(data?.overdue ?? [])}
        </TabsContent>

        <TabsContent value="thisWeek">
          {renderActionsList(data?.thisWeek ?? [])}
        </TabsContent>

        <TabsContent value="upcoming">
          {renderActionsList(data?.upcoming ?? [])}
        </TabsContent>
      </Tabs>
    </div>
  )
}
