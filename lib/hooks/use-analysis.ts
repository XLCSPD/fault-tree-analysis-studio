'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Analysis = Database['public']['Tables']['analyses']['Row']
type AnalysisUpdate = Database['public']['Tables']['analyses']['Update']

export function useAnalysis(analysisId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single<Analysis>()

      if (error) throw error
      return data
    },
    enabled: !!analysisId,
  })
}

// Core fields that always exist in the analyses table
const CORE_ANALYSIS_FIELDS = [
  'title',
  'status',
  'analysis_date',
  'problem_statement',
  'abstract',
  'related_document',
  'model',
  'application',
  'part_name',
] as const

// Extended fields from migration 06
const EXTENDED_ANALYSIS_FIELDS = [
  'industry_id',
  'site_name',
  'area_function',
  'process_workflow',
  'asset_system',
  'item_output',
  'issue_category_id',
  'issue_subcategory',
] as const

export function useUpdateAnalysis(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: AnalysisUpdate) => {
      // Collect all updates (core + extended fields)
      const allUpdates: Partial<AnalysisUpdate> = {}
      const allFields = [...CORE_ANALYSIS_FIELDS, ...EXTENDED_ANALYSIS_FIELDS]

      for (const key of allFields) {
        const value = (updates as any)[key]
        if (value !== undefined) {
          (allUpdates as any)[key] = value
        }
      }

      // Skip update if nothing to update
      if (Object.keys(allUpdates).length === 0) {
        console.log('No fields to update, skipping')
        return null
      }

      console.log('Updating analysis with:', Object.keys(allUpdates))

      // Try to update with all fields first
      const { data, error } = await ((supabase
        .from('analyses') as any)
        .update(allUpdates)
        .eq('id', analysisId)
        .select()
        .single() as Promise<{ data: Analysis | null, error: any }>)

      if (error) {
        // If error mentions column doesn't exist, fall back to core fields only
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          console.log('Extended fields not available, falling back to core fields')
          const coreUpdates: Partial<AnalysisUpdate> = {}
          for (const key of CORE_ANALYSIS_FIELDS) {
            const value = (updates as any)[key]
            if (value !== undefined) {
              (coreUpdates as any)[key] = value
            }
          }

          if (Object.keys(coreUpdates).length === 0) {
            return null
          }

          const fallbackResult = await ((supabase
            .from('analyses') as any)
            .update(coreUpdates)
            .eq('id', analysisId)
            .select()
            .single() as Promise<{ data: Analysis | null, error: any }>)

          if (fallbackResult.error) {
            console.error('Failed to update analysis (fallback):', fallbackResult.error)
            throw fallbackResult.error
          }

          return fallbackResult.data
        }

        console.error('Failed to update analysis:', error)
        throw error
      }

      return data
    },
    onSuccess: (data) => {
      // Update cache directly instead of invalidating to prevent refetch loops
      if (data) {
        queryClient.setQueryData(['analysis', analysisId], data)
      }
    },
  })
}
