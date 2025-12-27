'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  FileText,
  MessageSquare,
  ClipboardList,
  RefreshCw,
  Zap,
  Check,
  XCircle,
} from 'lucide-react'
import {
  useAnalysisQualityScore,
  useWhyQuality,
  useInvestigationQuality,
  useQualityIssues,
  useApplyWhySuggestion,
  useApplyInvestigationSuggestion,
  useResolveQualityIssue,
} from '@/lib/hooks/use-quality-ai'
import { useAnalysis } from '@/lib/hooks/use-analysis'
import { cn } from '@/lib/utils'
import type { WhyQualityIssue, InvestigationQualityIssue } from '@/lib/ai/types'

interface QualityPanelProps {
  analysisId: string
  onClose: () => void
  onNavigateToNode?: (nodeId: string) => void
  onNavigateToAction?: (actionId: string) => void
}

// Quality Score Badge component (for header)
export function QualityScoreBadge({
  analysisId,
  onClick,
  className,
}: {
  analysisId: string
  onClick?: () => void
  className?: string
}) {
  const { data: score, isLoading } = useAnalysisQualityScore(analysisId)

  if (isLoading || !score) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground',
          className
        )}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Quality
      </button>
    )
  }

  const percentage = score.percentage
  const hasIssues = score.flagged_whys_count > 0 || score.flagged_investigations_count > 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
        percentage >= 80
          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
          : percentage >= 50
          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
          : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300',
        className
      )}
      title={`Analysis readiness: ${score.total_score}/${score.max_score}`}
    >
      {hasIssues ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <CheckCircle2 className="w-3 h-3" />
      )}
      {percentage}% Ready
      {hasIssues && (
        <span className="ml-1 bg-white/50 dark:bg-black/30 px-1.5 rounded-full">
          {score.flagged_whys_count + score.flagged_investigations_count} issues
        </span>
      )}
    </button>
  )
}

// Issue card component
function WhyIssueCard({
  issue,
  onApply,
  onDismiss,
  onNavigate,
  isApplying,
}: {
  issue: WhyQualityIssue
  onApply: () => void
  onDismiss: () => void
  onNavigate?: () => void
  isApplying: boolean
}) {
  const issueTypeLabels: Record<string, string> = {
    WHY_CLARITY: 'Unclear Statement',
    WHY_TESTABILITY: 'Not Testable',
    WHY_SYMPTOM_RESTATEMENT: 'Symptom Restatement',
    WHY_BLAMEY: 'Blamey Language',
    WHY_VAGUE: 'Vague Terms',
  }

  return (
    <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {issueTypeLabels[issue.issue_type] || issue.issue_type}
          </span>
          <p className="text-sm mt-1 line-clamp-2" title={issue.original_text}>
            "{issue.original_text}"
          </p>
        </div>
        {onNavigate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigate}
            className="shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {issue.improved_text && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-sm">
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
            Suggested rewrite:
          </span>
          <p className="mt-0.5 text-green-800 dark:text-green-200">
            "{issue.improved_text}"
          </p>
          {issue.evidence_required && (
            <p className="mt-1 text-xs text-muted-foreground">
              Evidence: {issue.evidence_required}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={onApply}
          disabled={isApplying || !issue.improved_text}
          className="bg-lime-600 hover:bg-lime-700 text-white"
        >
          {isApplying ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Zap className="w-3 h-3 mr-1" />
          )}
          Apply Fix
        </Button>
        <Button variant="outline" size="sm" onClick={onDismiss}>
          <XCircle className="w-3 h-3 mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  )
}

// Investigation issue card
function InvestigationIssueCard({
  issue,
  onApply,
  onDismiss,
  onNavigate,
  isApplying,
}: {
  issue: InvestigationQualityIssue
  onApply: () => void
  onDismiss: () => void
  onNavigate?: () => void
  isApplying: boolean
}) {
  const issueTypeLabels: Record<string, string> = {
    INVESTIGATION_NO_HYPOTHESIS: 'Missing Hypothesis',
    INVESTIGATION_NO_CRITERIA: 'Missing Pass/Fail Criteria',
    INVESTIGATION_TOO_BROAD: 'Too Broad',
    INVESTIGATION_NO_EVIDENCE: 'Missing Evidence Plan',
  }

  return (
    <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {issueTypeLabels[issue.issue_type] || issue.issue_type}
          </span>
          <p className="text-sm mt-1 line-clamp-2" title={issue.original_text}>
            "{issue.original_text}"
          </p>
        </div>
        {onNavigate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigate}
            className="shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 text-sm space-y-1">
        {issue.hypothesis_text && (
          <div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Hypothesis:
            </span>
            <p className="text-blue-800 dark:text-blue-200">
              {issue.hypothesis_text}
            </p>
          </div>
        )}
        {issue.test_method && (
          <div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Test Method:
            </span>
            <p className="text-blue-800 dark:text-blue-200">{issue.test_method}</p>
          </div>
        )}
        {issue.pass_fail_criteria && (
          <div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Pass/Fail:
            </span>
            <p className="text-blue-800 dark:text-blue-200">
              {issue.pass_fail_criteria}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={onApply}
          disabled={isApplying}
          className="bg-lime-600 hover:bg-lime-700 text-white"
        >
          {isApplying ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Zap className="w-3 h-3 mr-1" />
          )}
          Convert to Hypothesis
        </Button>
        <Button variant="outline" size="sm" onClick={onDismiss}>
          <XCircle className="w-3 h-3 mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  )
}

// Main Quality Panel
export function QualityPanel({
  analysisId,
  onClose,
  onNavigateToNode,
  onNavigateToAction,
}: QualityPanelProps) {
  const { data: score, isLoading: scoreLoading, refetch: refetchScore } = useAnalysisQualityScore(analysisId)
  const { data: analysis } = useAnalysis(analysisId)

  // Why quality check
  const {
    runCheck: runWhyCheck,
    issues: whyIssues,
    isChecking: isCheckingWhys,
  } = useWhyQuality({ analysisId })

  // Investigation quality check
  const {
    runCheck: runInvCheck,
    issues: invIssues,
    isChecking: isCheckingInv,
  } = useInvestigationQuality({ analysisId })

  // Apply suggestion hooks
  const applyWhySuggestion = useApplyWhySuggestion(analysisId)
  const applyInvSuggestion = useApplyInvestigationSuggestion(analysisId)
  const resolveIssue = useResolveQualityIssue(analysisId)

  // Run full analysis check
  const runFullCheck = useCallback(() => {
    runWhyCheck(true)
    runInvCheck()
  }, [runWhyCheck, runInvCheck])

  // Handle applying why fix
  const handleApplyWhyFix = useCallback(
    async (issue: WhyQualityIssue) => {
      if (!issue.improved_text) return
      await applyWhySuggestion.mutateAsync({
        nodeId: issue.node_id,
        newLabel: issue.improved_text,
        aliasOriginal: true,
      })
      refetchScore()
    },
    [applyWhySuggestion, refetchScore]
  )

  // Handle applying investigation fix
  const handleApplyInvFix = useCallback(
    async (issue: InvestigationQualityIssue) => {
      await applyInvSuggestion.mutateAsync({
        actionId: issue.action_id,
        hypothesis_text: issue.hypothesis_text,
        test_method: issue.test_method,
        pass_fail_criteria: issue.pass_fail_criteria,
        evidence_required: issue.evidence_required,
      })
      refetchScore()
    },
    [applyInvSuggestion, refetchScore]
  )

  // Calculate metadata completeness
  const metadataFields = analysis
    ? [
        analysis.problem_statement,
        analysis.abstract,
        analysis.industry_id,
        analysis.site_name,
        analysis.area_function,
        analysis.process_workflow,
        analysis.asset_system,
        analysis.item_output,
        analysis.issue_category_id,
      ]
    : []
  const metadataFilled = metadataFields.filter(Boolean).length
  const metadataTotal = metadataFields.length

  const isChecking = isCheckingWhys || isCheckingInv
  const totalIssues = whyIssues.length + invIssues.length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Analysis Quality</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Score Summary */}
      <div className="p-4 border-b bg-muted/30">
        {scoreLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : score ? (
          <div className="space-y-3">
            {/* Main Score */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {score.percentage}%
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    Ready
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {score.total_score}/{score.max_score} points
                </p>
              </div>
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center',
                  score.percentage >= 80
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : score.percentage >= 50
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                )}
              >
                {score.percentage >= 80 ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <AlertTriangle className="w-8 h-8" />
                )}
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-background rounded p-2">
                <div className="text-lg font-semibold">
                  {metadataFilled}/{metadataTotal}
                </div>
                <div className="text-xs text-muted-foreground">Metadata</div>
              </div>
              <div className="bg-background rounded p-2">
                <div className="text-lg font-semibold text-amber-600">
                  {score.flagged_whys_count}
                </div>
                <div className="text-xs text-muted-foreground">Why Issues</div>
              </div>
              <div className="bg-background rounded p-2">
                <div className="text-lg font-semibold text-blue-600">
                  {score.flagged_investigations_count}
                </div>
                <div className="text-xs text-muted-foreground">Inv. Issues</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Run Check Button */}
      <div className="p-4 border-b">
        <Button
          onClick={runFullCheck}
          disabled={isChecking}
          className="w-full bg-lime-600 hover:bg-lime-700 text-white"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking Quality...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Quality Check
            </>
          )}
        </Button>
      </div>

      {/* Fix List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {totalIssues === 0 && !isChecking ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">No issues found!</p>
            <p className="text-sm mt-1">
              Run a quality check to scan for potential improvements.
            </p>
          </div>
        ) : (
          <>
            {/* Why Issues */}
            {whyIssues.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Why Statement Issues ({whyIssues.length})
                </h3>
                <div className="space-y-2">
                  {whyIssues.map((issue, idx) => (
                    <WhyIssueCard
                      key={`${issue.node_id}-${idx}`}
                      issue={issue}
                      onApply={() => handleApplyWhyFix(issue)}
                      onDismiss={() => {
                        // For now, just remove from local state
                        // TODO: Add dismiss to DB
                      }}
                      onNavigate={
                        onNavigateToNode
                          ? () => onNavigateToNode(issue.node_id)
                          : undefined
                      }
                      isApplying={applyWhySuggestion.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Investigation Issues */}
            {invIssues.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Investigation Issues ({invIssues.length})
                </h3>
                <div className="space-y-2">
                  {invIssues.map((issue, idx) => (
                    <InvestigationIssueCard
                      key={`${issue.action_id}-${idx}`}
                      issue={issue}
                      onApply={() => handleApplyInvFix(issue)}
                      onDismiss={() => {
                        // For now, just remove from local state
                      }}
                      onNavigate={
                        onNavigateToAction
                          ? () => onNavigateToAction(issue.action_id)
                          : undefined
                      }
                      isApplying={applyInvSuggestion.isPending}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
