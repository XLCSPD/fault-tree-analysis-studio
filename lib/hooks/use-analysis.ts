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

export function useUpdateAnalysis(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: AnalysisUpdate) => {
      const { data, error } = await ((supabase
        .from('analyses') as any)
        .update(updates)
        .eq('id', analysisId)
        .select()
        .single() as Promise<{ data: Analysis | null, error: any }>)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis', analysisId] })
    },
  })
}
