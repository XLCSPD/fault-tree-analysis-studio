'use client'

import { useState } from 'react'
import {
  FlaskConical,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useInvestigationQuality, useApplyInvestigationSuggestion } from '@/lib/hooks/use-quality-ai'
import type { InvestigationQualityIssue, InvestigationIssueType } from '@/lib/ai/types'

interface InvestigationQualityModuleProps {
  analysisId: string
  nodeId: string | null
  organizationId: string | null
}

const ISSUE_TYPE_CONFIG: Record<InvestigationIssueType, { label: string; color: string; description: string }> = {
  INVESTIGATION_NO_HYPOTHESIS: {
    label: 'No Hypothesis',
    color: 'text-red-600 bg-red-50 dark:bg-red-950/30',
    description: 'Investigation lacks a clear hypothesis to confirm or rule out',
  },
  INVESTIGATION_NO_CRITERIA: {
    label: 'No Pass/Fail Criteria',
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
    description: 'No measurable criteria to determine success or failure',
  },
  INVESTIGATION_TOO_BROAD: {
    label: 'Too Broad',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    description: 'Scope is too wide to produce actionable results',
  },
  INVESTIGATION_NO_EVIDENCE: {
    label: 'No Evidence Type',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    description: 'Does not specify what evidence will be collected',
  },
}

interface IssueCardProps {
  issue: InvestigationQualityIssue
  onApply: () => void
  onDismiss: () => void
  isApplying: boolean
}

function IssueCard({ issue, onApply, onDismiss, isApplying }: IssueCardProps) {
  const [expanded, setExpanded] = useState(false)
  const config = ISSUE_TYPE_CONFIG[issue.issue_type]

  return (
    <div className="border rounded-lg p-3 bg-background">
      <div className="flex items-start gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <AlertCircle className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.color.split(' ')[0])} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs px-1.5 py-0.5 rounded', config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {issue.confidence === 'high' ? 'High' : issue.confidence === 'medium' ? 'Medium' : 'Low'} confidence
            </span>
          </div>
          <p className="text-sm mt-1 text-muted-foreground">
            <strong>Original:</strong> {issue.original_text}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 ml-10 space-y-3 text-sm">
          <div>
            <span className="font-medium text-muted-foreground block mb-1">Why flagged:</span>
            <span>{config.description}</span>
          </div>

          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
            <div className="font-medium text-green-800 dark:text-green-200">Suggested Hypothesis Test</div>

            <div>
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Hypothesis:</span>
              <p className="text-sm text-green-800 dark:text-green-200">{issue.hypothesis_text}</p>
            </div>

            <div>
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Test Method:</span>
              <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">{issue.test_method}</p>
            </div>

            <div>
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Evidence Required:</span>
              <p className="text-sm text-green-800 dark:text-green-200">{issue.evidence_required}</p>
            </div>

            <div>
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Pass/Fail Criteria:</span>
              <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">{issue.pass_fail_criteria}</p>
            </div>

            <div className="flex gap-4 text-xs text-green-700 dark:text-green-300">
              <span><strong>Owner:</strong> {issue.recommended_owner_role}</span>
              <span><strong>Due:</strong> +{issue.due_date_offset_days} days</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 ml-10">
        <Button
          size="sm"
          className="h-7 text-xs bg-lime-600 hover:bg-lime-700 text-white"
          onClick={onApply}
          disabled={isApplying}
        >
          {isApplying ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Check className="h-3 w-3 mr-1" />
          )}
          Apply Hypothesis Test
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={onDismiss}
          disabled={isApplying}
        >
          <X className="h-3 w-3 mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  )
}

export function InvestigationQualityModule({
  analysisId,
  nodeId,
  organizationId,
}: InvestigationQualityModuleProps) {
  const { runCheck, issues, isChecking, error, clearIssues } = useInvestigationQuality({
    analysisId,
    nodeId: nodeId || undefined,
  })
  const applySuggestion = useApplyInvestigationSuggestion(analysisId)

  const [applyingId, setApplyingId] = useState<string | null>(null)

  const handleApply = async (issue: InvestigationQualityIssue) => {
    setApplyingId(issue.action_id)
    try {
      await applySuggestion.mutateAsync({
        actionId: issue.action_id,
        hypothesis_text: issue.hypothesis_text,
        test_method: issue.test_method,
        pass_fail_criteria: issue.pass_fail_criteria,
        evidence_required: issue.evidence_required,
      })
      // Refresh issues
      clearIssues()
    } finally {
      setApplyingId(null)
    }
  }

  const handleDismiss = (issue: InvestigationQualityIssue) => {
    // Remove from local list
    clearIssues()
  }

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <FlaskConical className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">Investigation Quality</h4>
            {issues.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                {issues.length} issue{issues.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Convert investigations to structured hypothesis tests with clear pass/fail criteria
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={runCheck}
          disabled={isChecking}
        >
          {isChecking ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              Checking...
            </>
          ) : nodeId ? (
            'Check Node Actions'
          ) : (
            'Check All Investigations'
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs">
          {error.message}
        </div>
      )}

      {issues.length > 0 && (
        <div className="mt-3 space-y-2">
          {issues.map((issue) => (
            <IssueCard
              key={issue.action_id}
              issue={issue}
              onApply={() => handleApply(issue)}
              onDismiss={() => handleDismiss(issue)}
              isApplying={applyingId === issue.action_id}
            />
          ))}
        </div>
      )}

      {!isChecking && issues.length === 0 && (
        <div className="mt-3 text-xs text-muted-foreground text-center py-2">
          Click to analyze investigation items and convert them to structured hypothesis tests
        </div>
      )}
    </div>
  )
}
