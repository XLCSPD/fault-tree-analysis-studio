'use client'

import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAnalysisQualityScore, useQualityIssues } from '@/lib/hooks/use-quality-ai'

interface QualityScoreIndicatorProps {
  analysisId: string
  onClick?: () => void
}

export function QualityScoreIndicator({ analysisId, onClick }: QualityScoreIndicatorProps) {
  const { data: score, isLoading } = useAnalysisQualityScore(analysisId)

  if (isLoading || !score) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
        <Activity className="w-3.5 h-3.5 animate-pulse" />
        <span>...</span>
      </div>
    )
  }

  const percentage = score.percentage
  const hasIssues = score.flagged_whys_count > 0 || score.flagged_investigations_count > 0

  // Determine color based on score
  let colorClass = 'text-green-600'
  let bgClass = 'bg-green-100 dark:bg-green-900/30'

  if (percentage < 50) {
    colorClass = 'text-red-600'
    bgClass = 'bg-red-100 dark:bg-red-900/30'
  } else if (percentage < 80) {
    colorClass = 'text-amber-600'
    bgClass = 'bg-amber-100 dark:bg-amber-900/30'
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
        bgClass,
        colorClass,
        onClick && 'hover:opacity-80 cursor-pointer'
      )}
      title="Click to view quality issues"
    >
      {hasIssues ? (
        <AlertTriangle className="w-3.5 h-3.5" />
      ) : (
        <CheckCircle className="w-3.5 h-3.5" />
      )}
      <span className="font-medium">Quality: {percentage}%</span>
      {hasIssues && (
        <span className="text-[10px] opacity-75">
          ({score.flagged_whys_count + score.flagged_investigations_count})
        </span>
      )}
    </button>
  )
}

interface QualityFixListProps {
  analysisId: string
  onClose: () => void
  onNavigateToNode?: (nodeId: string) => void
  onNavigateToAction?: (actionId: string) => void
}

export function QualityFixList({
  analysisId,
  onClose,
  onNavigateToNode,
  onNavigateToAction,
}: QualityFixListProps) {
  const { data: score } = useAnalysisQualityScore(analysisId)
  const { data: issues } = useQualityIssues({ analysisId, status: 'OPEN' })

  const whyIssues = issues?.filter(i => i.node_id) || []
  const investigationIssues = issues?.filter(i => i.action_id) || []

  return (
    <div className="fixed right-4 top-20 w-80 bg-background border rounded-lg shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Quality Issues</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Score summary */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Overall Score</span>
          <span className="text-lg font-bold">
            {score?.percentage || 0}%
          </span>
        </div>
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500',
              (score?.percentage || 0) >= 80 ? 'bg-green-500' :
              (score?.percentage || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
            )}
            style={{ width: `${score?.percentage || 0}%` }}
          />
        </div>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <div>Why Issues: {score?.flagged_whys_count || 0}</div>
          <div>Investigation Issues: {score?.flagged_investigations_count || 0}</div>
        </div>
      </div>

      {/* Issues list */}
      <div className="max-h-96 overflow-y-auto">
        {whyIssues.length === 0 && investigationIssues.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            No open quality issues!
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {whyIssues.map(issue => (
              <button
                key={issue.id}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-left"
                onClick={() => issue.node_id && onNavigateToNode?.(issue.node_id)}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {issue.issue_kind.replace('WHY_', '').replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {issue.message.substring(0, 50)}...
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}

            {investigationIssues.map(issue => (
              <button
                key={issue.id}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-left"
                onClick={() => issue.action_id && onNavigateToAction?.(issue.action_id)}
              >
                <AlertTriangle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {issue.issue_kind.replace('INVESTIGATION_', '').replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {issue.message.substring(0, 50)}...
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t text-xs text-muted-foreground text-center">
        Run quality checks from AI Assist panel
      </div>
    </div>
  )
}
