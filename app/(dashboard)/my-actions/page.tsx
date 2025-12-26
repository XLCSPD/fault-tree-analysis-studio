'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  CheckCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Ban,
  Shield,
  Search,
  FileSearch,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { useMyActions } from '@/lib/hooks/use-my-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type ActionStatus = Database["public"]["Enums"]["action_lifecycle_status"]
type ActionType = Database["public"]["Enums"]["action_type"]

const STATUS_CONFIG: Record<ActionStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-gray-100 text-gray-700', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  BLOCKED: { label: 'Blocked', color: 'bg-red-100 text-red-700', icon: Ban },
  DONE: { label: 'Done', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  VERIFIED: { label: 'Verified', color: 'bg-purple-100 text-purple-700', icon: Shield },
}

const ACTION_TYPE_CONFIG: Record<ActionType, { label: string; color: string; icon: React.ComponentType<any> }> = {
  INVESTIGATION: { label: 'Investigation', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Search },
  CONTAINMENT: { label: 'Containment', color: 'bg-orange-50 text-orange-600 border-orange-200', icon: ShieldCheck },
  CORRECTIVE: { label: 'Corrective', color: 'bg-purple-50 text-purple-600 border-purple-200', icon: Wrench },
  PREVENTIVE: { label: 'Preventive', color: 'bg-green-50 text-green-600 border-green-200', icon: FileSearch },
}

const PRIORITY_CONFIG = {
  HIGH: { label: 'High', color: 'bg-red-100 text-red-700' },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  LOW: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
}

export default function MyActionsPage() {
  const { data, isLoading } = useMyActions()
  const [expandedAnalyses, setExpandedAnalyses] = useState<Set<string>>(new Set())

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
    const isOverdue = action.due_date &&
      action.due_date < new Date().toISOString().split('T')[0] &&
      action.status !== 'DONE' &&
      action.status !== 'VERIFIED'

    const statusConfig = STATUS_CONFIG[action.status]
    const StatusIcon = statusConfig.icon
    const typeConfig = ACTION_TYPE_CONFIG[action.action_type]
    const TypeIcon = typeConfig.icon
    const priorityConfig = action.priority ? PRIORITY_CONFIG[action.priority] : null

    return (
      <div
        key={action.id}
        className="p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{action.title}</p>
            {action.description && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {action.description}
              </p>
            )}
            {action.node_label && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
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

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {/* Action Type */}
          <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded border', typeConfig.color)}>
            <TypeIcon className="h-3 w-3" />
            {typeConfig.label}
          </div>

          {/* Status */}
          <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded', statusConfig.color)}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </div>

          {/* Priority */}
          {priorityConfig && (
            <div className={cn('text-xs px-2 py-1 rounded', priorityConfig.color)}>
              {priorityConfig.label}
            </div>
          )}

          {/* Due Date */}
          {action.due_date && (
            <div
              className={cn(
                'flex items-center gap-1.5 text-xs px-2 py-1 rounded',
                isOverdue ? 'bg-red-100 text-red-700 font-medium' : 'bg-muted text-muted-foreground'
              )}
            >
              {isOverdue ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <Calendar className="h-3 w-3" />
              )}
              {format(new Date(action.due_date), 'MMM d, yyyy')}
            </div>
          )}
        </div>

        {/* Close criteria */}
        {action.close_criteria && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium">Close criteria:</span> {action.close_criteria}
          </div>
        )}
      </div>
    )
  }

  const renderGroupedByAnalysis = () => {
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

  const renderByStatus = () => {
    if (!data) return null

    return (
      <div className="space-y-6">
        {(['IN_PROGRESS', 'NOT_STARTED', 'BLOCKED', 'DONE', 'VERIFIED'] as ActionStatus[]).map(status => {
          const actions = data.byStatus[status]
          if (actions.length === 0) return null

          const config = STATUS_CONFIG[status]
          const Icon = config.icon

          return (
            <div key={status}>
              <h3 className="flex items-center gap-2 font-medium mb-3">
                <Icon className="h-4 w-4" />
                {config.label}
                <span className="text-sm text-muted-foreground">({actions.length})</span>
              </h3>
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
            </div>
          )
        })}
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
          <TabsTrigger value="byStatus">
            By Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderGroupedByAnalysis()}
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

        <TabsContent value="byStatus">
          {renderByStatus()}
        </TabsContent>
      </Tabs>
    </div>
  )
}
