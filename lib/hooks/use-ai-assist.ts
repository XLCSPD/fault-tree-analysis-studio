'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AIModuleType, AIResponse, AISuggestion } from '@/lib/ai/types'

interface UseAIAssistOptions {
  analysisId: string
  nodeId: string
}

interface AIRunHistoryResponse {
  runs: Array<{
    id: string
    feature: AIModuleType
    created_at: string
    tokens_used: number | null
    model_name: string | null
  }>
  suggestions: Array<{
    id: string
    ai_run_id: string
    suggestion_type: string
    payload: { content: string; id: string }
    rationale: string | null
    evidence_required: string | null
    confidence: string | null
    category: string | null
    status: string
  }>
}

// Generate suggestions for a module
async function generateSuggestions(
  analysisId: string,
  nodeId: string,
  moduleType: AIModuleType
): Promise<AIResponse> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysisId, nodeId, moduleType }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate suggestions')
  }

  return response.json()
}

// Update suggestion status
async function updateSuggestionStatus(
  suggestionId: string,
  status: 'accepted' | 'dismissed',
  resultNodeId?: string,
  resultActionId?: string
): Promise<void> {
  const response = await fetch('/api/ai/suggestions', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestionId, status, resultNodeId, resultActionId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update suggestion')
  }
}

// Fetch previous suggestions for a node
async function fetchSuggestionHistory(
  analysisId: string,
  nodeId: string,
  moduleType?: AIModuleType
): Promise<AIRunHistoryResponse> {
  const params = new URLSearchParams({
    analysisId,
    nodeId,
    ...(moduleType && { moduleType }),
  })

  const response = await fetch(`/api/ai?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch suggestion history')
  }

  return response.json()
}

export function useAIAssist({ analysisId, nodeId }: UseAIAssistOptions) {
  const queryClient = useQueryClient()
  const [currentModule, setCurrentModule] = useState<AIModuleType | null>(null)

  // Query for suggestion history
  const historyQuery = useQuery({
    queryKey: ['ai-suggestions', analysisId, nodeId],
    queryFn: () => fetchSuggestionHistory(analysisId, nodeId),
    enabled: !!analysisId && !!nodeId,
    staleTime: 30000, // 30 seconds
  })

  // Mutation for generating suggestions
  const generateMutation = useMutation({
    mutationFn: (moduleType: AIModuleType) =>
      generateSuggestions(analysisId, nodeId, moduleType),
    onMutate: (moduleType) => {
      setCurrentModule(moduleType)
    },
    onSuccess: () => {
      // Invalidate history query to fetch new suggestions
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions', analysisId, nodeId] })
    },
    onSettled: () => {
      setCurrentModule(null)
    },
  })

  // Mutation for accepting/dismissing suggestions
  const actionMutation = useMutation({
    mutationFn: ({
      suggestionId,
      status,
      resultNodeId,
      resultActionId,
    }: {
      suggestionId: string
      status: 'accepted' | 'dismissed'
      resultNodeId?: string
      resultActionId?: string
    }) => updateSuggestionStatus(suggestionId, status, resultNodeId, resultActionId),
    onSuccess: () => {
      // Invalidate history to reflect updated status
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions', analysisId, nodeId] })
    },
  })

  // Transform history data into AISuggestion format for UI
  const getSuggestionsForModule = useCallback(
    (moduleType: AIModuleType): AISuggestion[] => {
      if (!historyQuery.data) return []

      const { runs, suggestions } = historyQuery.data

      // Find the most recent run for this module
      const latestRun = runs.find(r => r.feature === moduleType)
      if (!latestRun) return []

      // Get suggestions for this run that are still proposed (not accepted/dismissed)
      return suggestions
        .filter(s => s.ai_run_id === latestRun.id && s.status === 'proposed')
        .map(s => ({
          id: s.id,
          type: s.suggestion_type as AISuggestion['type'],
          content: s.payload?.content || '',
          rationale: s.rationale || '',
          evidenceRequired: s.evidence_required || '',
          confidence: (s.confidence || 'medium') as AISuggestion['confidence'],
          category: s.category || undefined,
        }))
    },
    [historyQuery.data]
  )

  // Check if a module has pending suggestions
  const hasPendingSuggestions = useCallback(
    (moduleType: AIModuleType): boolean => {
      return getSuggestionsForModule(moduleType).length > 0
    },
    [getSuggestionsForModule]
  )

  return {
    // State
    isLoading: historyQuery.isLoading,
    isGenerating: generateMutation.isPending,
    generatingModule: currentModule,
    error: generateMutation.error || historyQuery.error,

    // Data
    getSuggestionsForModule,
    hasPendingSuggestions,
    history: historyQuery.data,

    // Actions
    generateSuggestions: generateMutation.mutate,
    acceptSuggestion: (
      suggestionId: string,
      resultNodeId?: string,
      resultActionId?: string
    ) =>
      actionMutation.mutate({
        suggestionId,
        status: 'accepted',
        resultNodeId,
        resultActionId,
      }),
    dismissSuggestion: (suggestionId: string) =>
      actionMutation.mutate({ suggestionId, status: 'dismissed' }),

    // Refetch
    refetch: historyQuery.refetch,
  }
}
