'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useWhyQuality, useApplyWhySuggestion } from '@/lib/hooks/use-quality-ai'
import type { WhyQualityIssue, WhyIssueType } from '@/lib/ai/types'

interface WhyQualityModuleProps {
  analysisId: string
  nodeId: string | null
  organizationId: string | null
}

const ISSUE_TYPE_CONFIG: Record<WhyIssueType, { label: string; color: string; description: string }> = {
  WHY_BLAMEY: {
    label: 'Human-Centric',
    color: 'text-red-600 bg-red-50 dark:bg-red-950/30',
    description: 'Focuses on human fault rather than system/process conditions',
  },
  WHY_VAGUE: {
    label: 'Vague',
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
    description: 'Non-specific language that doesn\'t point to a testable condition',
  },
  WHY_SYMPTOM_RESTATEMENT: {
    label: 'Symptom Restatement',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    description: 'Repeats the parent cause without explaining mechanism',
  },
  WHY_TESTABILITY: {
    label: 'Not Testable',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    description: 'Lacks measurable criteria to confirm or rule out',
  },
  WHY_CLARITY: {
    label: 'Needs Clarity',
    color: 'text-gray-600 bg-gray-50 dark:bg-gray-950/30',
    description: 'Could be more specific or precise',
  },
}

const VERIFICATION_METHODS = {
  observation: 'Direct Observation',
  audit: 'Document Audit',
  data_pull: 'Data Analysis',
  interview: 'Interviews',
  test: 'Physical Test',
}

interface IssueCardProps {
  issue: WhyQualityIssue
  onApply: (keepAlias: boolean) => void
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

        <AlertTriangle className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.color.split(' ')[0])} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs px-1.5 py-0.5 rounded', config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {issue.confidence === 'high' ? 'High' : issue.confidence === 'medium' ? 'Medium' : 'Low'} confidence
            </span>
          </div>
          <p className="text-sm mt-1 line-through text-muted-foreground">
            {issue.original_text}
          </p>
          <p className="text-sm mt-1 font-medium text-green-700 dark:text-green-300">
            {issue.improved_text}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 ml-10 space-y-2 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Why flagged: </span>
            <span>{config.description}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Evidence to verify: </span>
            <span>{issue.evidence_required}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Verification method: </span>
            <span>{VERIFICATION_METHODS[issue.verification_method]}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 ml-10">
        <Button
          size="sm"
          className="h-7 text-xs bg-lime-600 hover:bg-lime-700 text-white"
          onClick={() => onApply(false)}
          disabled={isApplying}
        >
          {isApplying ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Check className="h-3 w-3 mr-1" />
          )}
          Replace
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onApply(true)}
          disabled={isApplying}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add as Alias
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

export function WhyQualityModule({
  analysisId,
  nodeId,
  organizationId,
}: WhyQualityModuleProps) {
  const { runCheck, issues, isChecking, error, clearIssues } = useWhyQuality({ analysisId, nodeId: nodeId || undefined })
  const applySuggestion = useApplyWhySuggestion(analysisId)

  const [applyingId, setApplyingId] = useState<string | null>(null)

  const handleApply = async (issue: WhyQualityIssue, keepAlias: boolean) => {
    setApplyingId(issue.node_id)
    try {
      await applySuggestion.mutateAsync({
        nodeId: issue.node_id,
        newLabel: issue.improved_text,
        aliasOriginal: keepAlias,
      })
      // Remove from local issues list
      clearIssues()
    } finally {
      setApplyingId(null)
    }
  }

  const handleDismiss = (issue: WhyQualityIssue) => {
    // Remove from local list - in full implementation would mark as dismissed in DB
    clearIssues()
  }

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">Why Statement Quality</h4>
            {issues.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {issues.length} issue{issues.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Check why statements for clarity, testability, and mechanism-based reasoning
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => runCheck(false)}
          disabled={isChecking || !nodeId}
        >
          {isChecking ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            'Check Selected Node'
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => runCheck(true)}
          disabled={isChecking}
        >
          Check All
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
              key={issue.node_id}
              issue={issue}
              onApply={(keepAlias) => handleApply(issue, keepAlias)}
              onDismiss={() => handleDismiss(issue)}
              isApplying={applyingId === issue.node_id}
            />
          ))}
        </div>
      )}

      {!nodeId && !isChecking && issues.length === 0 && (
        <div className="mt-3 text-xs text-muted-foreground text-center py-2">
          Select a node to check its why statement quality, or click &quot;Check All&quot; for entire analysis
        </div>
      )}
    </div>
  )
}
