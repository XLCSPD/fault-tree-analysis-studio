'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  MetadataAssistResponse,
  WhyQualityResponse,
  InvestigationQualityResponse,
  WhyQualityIssue,
  InvestigationQualityIssue,
} from '@/lib/ai/types'
import { createClient } from '@/lib/supabase/client'

// ============================================================
// METADATA AI ASSIST HOOK
// ============================================================

interface UseMetadataAssistOptions {
  analysisId: string
}

export function useMetadataAssist({ analysisId }: UseMetadataAssistOptions) {
  const [suggestion, setSuggestion] = useState<MetadataAssistResponse | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/metadata-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate metadata assist')
      }

      return response.json() as Promise<MetadataAssistResponse>
    },
    onSuccess: (data) => {
      setSuggestion(data)
      setError(null)
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    },
  })

  const generate = useCallback(() => {
    mutation.mutate()
  }, [mutation])

  const clearSuggestion = useCallback(() => {
    setSuggestion(null)
  }, [])

  return {
    generate,
    suggestion,
    isGenerating: mutation.isPending,
    error,
    clearSuggestion,
  }
}

// ============================================================
// WHY QUALITY CHECK HOOK
// ============================================================

interface UseWhyQualityOptions {
  analysisId: string
  nodeId?: string
}

export function useWhyQuality({ analysisId, nodeId }: UseWhyQualityOptions) {
  const [issues, setIssues] = useState<WhyQualityIssue[]>([])
  const [error, setError] = useState<Error | null>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (checkEntireAnalysis: boolean = false) => {
      const response = await fetch('/api/ai/why-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, nodeId, checkEntireAnalysis }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to run quality check')
      }

      return response.json() as Promise<WhyQualityResponse>
    },
    onSuccess: (data) => {
      setIssues(data.issues)
      setError(null)
      // Invalidate nodes query to refresh quality_flags
      queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    },
  })

  const runCheck = useCallback((checkEntireAnalysis = false) => {
    mutation.mutate(checkEntireAnalysis)
  }, [mutation])

  const clearIssues = useCallback(() => {
    setIssues([])
  }, [])

  return {
    runCheck,
    issues,
    isChecking: mutation.isPending,
    error,
    clearIssues,
  }
}

// ============================================================
// INVESTIGATION QUALITY CHECK HOOK
// ============================================================

interface UseInvestigationQualityOptions {
  analysisId: string
  nodeId?: string
  actionId?: string
}

export function useInvestigationQuality({ analysisId, nodeId, actionId }: UseInvestigationQualityOptions) {
  const [issues, setIssues] = useState<InvestigationQualityIssue[]>([])
  const [error, setError] = useState<Error | null>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/investigation-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, nodeId, actionId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to run investigation quality check')
      }

      return response.json() as Promise<InvestigationQualityResponse>
    },
    onSuccess: (data) => {
      setIssues(data.issues)
      setError(null)
      // Invalidate action items query
      queryClient.invalidateQueries({ queryKey: ['action-items', analysisId] })
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    },
  })

  const runCheck = useCallback(() => {
    mutation.mutate()
  }, [mutation])

  const clearIssues = useCallback(() => {
    setIssues([])
  }, [])

  return {
    runCheck,
    issues,
    isChecking: mutation.isPending,
    error,
    clearIssues,
  }
}

// ============================================================
// QUALITY ISSUES QUERY HOOK
// ============================================================

interface UseQualityIssuesOptions {
  analysisId: string
  nodeId?: string
  actionId?: string
  status?: 'OPEN' | 'RESOLVED' | 'DISMISSED'
}

interface QualityIssue {
  id: string
  organization_id: string
  analysis_id: string
  node_id?: string | null
  action_id?: string | null
  issue_kind: string
  severity: 'INFO' | 'WARN' | 'HIGH'
  message: string
  suggestion?: unknown
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED'
  created_by?: string | null
  resolved_by?: string | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
}

export function useQualityIssues({ analysisId, nodeId, actionId, status }: UseQualityIssuesOptions) {
  return useQuery({
    queryKey: ['quality-issues', analysisId, nodeId, actionId, status],
    queryFn: async () => {
      const supabase = createClient()

      let query = (supabase
        .from('quality_issues') as any)
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false })

      if (nodeId) {
        query = query.eq('node_id', nodeId)
      }

      if (actionId) {
        query = query.eq('action_id', actionId)
      }

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error
      return data as QualityIssue[]
    },
    enabled: !!analysisId,
  })
}

// ============================================================
// RESOLVE/DISMISS QUALITY ISSUE HOOK
// ============================================================

export function useResolveQualityIssue(analysisId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ issueId, status }: { issueId: string; status: 'RESOLVED' | 'DISMISSED' }) => {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await (supabase
        .from('quality_issues') as any)
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', issueId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-issues', analysisId] })
    },
  })
}

// ============================================================
// APPLY SUGGESTION HOOKS
// ============================================================

export function useApplyWhySuggestion(analysisId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ nodeId, newLabel, aliasOriginal }: { nodeId: string; newLabel: string; aliasOriginal?: boolean }) => {
      if (aliasOriginal) {
        // Get current label first
        const { data: node } = await supabase
          .from('nodes')
          .select('label, text_aliases')
          .eq('id', nodeId)
          .single<{ label: string; text_aliases: string[] | null }>()

        if (node) {
          const aliases = node.text_aliases || []
          aliases.push(node.label)

          await (supabase
            .from('nodes') as any)
            .update({
              label: newLabel,
              text_aliases: aliases,
              quality_flags: null, // Clear flags after applying fix
            })
            .eq('id', nodeId)
        }
      } else {
        await (supabase
          .from('nodes') as any)
          .update({
            label: newLabel,
            quality_flags: null,
          })
          .eq('id', nodeId)
      }

      // Mark related quality issues as resolved
      const { data: { user } } = await supabase.auth.getUser()
      await (supabase
        .from('quality_issues') as any)
        .update({
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('node_id', nodeId)
        .eq('status', 'OPEN')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['quality-issues', analysisId] })
    },
  })
}

export function useApplyInvestigationSuggestion(analysisId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      actionId,
      hypothesis_text,
      test_method,
      pass_fail_criteria,
      evidence_required,
    }: {
      actionId: string
      hypothesis_text: string
      test_method: string
      pass_fail_criteria: string
      evidence_required: string
    }) => {
      await (supabase
        .from('action_items') as any)
        .update({
          hypothesis_text,
          test_method,
          pass_fail_criteria,
          evidence_required,
        })
        .eq('id', actionId)

      // Mark related quality issues as resolved
      const { data: { user } } = await supabase.auth.getUser()
      await (supabase
        .from('quality_issues') as any)
        .update({
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('action_id', actionId)
        .eq('status', 'OPEN')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['quality-issues', analysisId] })
    },
  })
}

// ============================================================
// ANALYSIS QUALITY SCORE HOOK
// ============================================================

interface AnalysisMetadata {
  title?: string | null
  problem_statement?: string | null
  abstract_summary?: string | null
  industry_id?: string | null
  site_name?: string | null
  area_function?: string | null
  process_workflow?: string | null
  issue_category_id?: string | null
}

export function useAnalysisQualityScore(analysisId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['quality-score', analysisId],
    queryFn: async () => {
      // Count open quality issues
      const { count: whyIssuesCount } = await (supabase
        .from('quality_issues') as any)
        .select('*', { count: 'exact', head: true })
        .eq('analysis_id', analysisId)
        .eq('status', 'OPEN')
        .not('node_id', 'is', null)

      const { count: invIssuesCount } = await (supabase
        .from('quality_issues') as any)
        .select('*', { count: 'exact', head: true })
        .eq('analysis_id', analysisId)
        .eq('status', 'OPEN')
        .not('action_id', 'is', null)

      // Get analysis metadata completeness
      const { data: analysis } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single<AnalysisMetadata>()

      let metadataScore = 0
      const maxMetadataScore = 10

      if (analysis) {
        if (analysis.title) metadataScore += 1
        if (analysis.problem_statement) metadataScore += 2
        if (analysis.abstract_summary) metadataScore += 2
        if (analysis.industry_id) metadataScore += 1
        if (analysis.site_name) metadataScore += 1
        if (analysis.area_function) metadataScore += 1
        if (analysis.process_workflow) metadataScore += 1
        if (analysis.issue_category_id) metadataScore += 1
      }

      // Get node count
      const { count: nodeCount } = await supabase
        .from('nodes')
        .select('*', { count: 'exact', head: true })
        .eq('analysis_id', analysisId)
        .neq('type', 'top_event')

      // Get investigation count
      const { count: invCount } = await (supabase
        .from('action_items') as any)
        .select('*', { count: 'exact', head: true })
        .eq('analysis_id', analysisId)
        .eq('action_type', 'INVESTIGATION')

      const whyScore = Math.max(0, (nodeCount || 0) - (whyIssuesCount || 0))
      const invScore = Math.max(0, (invCount || 0) - (invIssuesCount || 0))

      const totalScore = metadataScore + whyScore + invScore
      const maxScore = maxMetadataScore + (nodeCount || 0) + (invCount || 0)

      return {
        total_score: totalScore,
        max_score: maxScore,
        metadata_complete: metadataScore >= 8,
        flagged_whys_count: whyIssuesCount || 0,
        flagged_investigations_count: invIssuesCount || 0,
        missing_evidence_count: 0, // TODO: Calculate this
        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      }
    },
    enabled: !!analysisId,
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}
