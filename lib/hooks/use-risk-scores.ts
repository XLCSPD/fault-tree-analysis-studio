'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type RiskScore = Database['public']['Tables']['risk_scores']['Row']
type RiskScoreInsert = Database['public']['Tables']['risk_scores']['Insert']
type RiskScoreUpdate = Database['public']['Tables']['risk_scores']['Update']

// Fetch risk score for a specific node
export function useRiskScore(nodeId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['riskScore', nodeId],
    queryFn: async () => {
      if (!nodeId) return null

      const { data, error } = await supabase
        .from('risk_scores')
        .select('*')
        .eq('node_id', nodeId)
        .maybeSingle<RiskScore>()

      if (error) throw error
      return data
    },
    enabled: !!nodeId,
  })
}

// Create or update risk score for a node
export function useUpsertRiskScore(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      nodeId,
      severity,
      occurrence,
      detection,
    }: {
      nodeId: string
      severity?: number | null
      occurrence?: number | null
      detection?: number | null
    }) => {
      // Check if risk score exists
      const { data: existing } = await supabase
        .from('risk_scores')
        .select('id')
        .eq('node_id', nodeId)
        .maybeSingle<{ id: string }>()

      if (existing) {
        // Update existing
        const updateData: RiskScoreUpdate = { severity, occurrence, detection }
        const { data, error } = await ((supabase
          .from('risk_scores') as any)
          .update(updateData)
          .eq('node_id', nodeId)
          .select()
          .single() as Promise<{ data: RiskScore | null, error: any }>)

        if (error) throw error
        return data
      } else {
        // Create new
        const insertData: RiskScoreInsert = { node_id: nodeId, severity, occurrence, detection }
        const { data, error } = await (supabase
          .from('risk_scores')
          .insert(insertData as any)
          .select()
          .single() as unknown as Promise<{ data: RiskScore | null, error: any }>)

        if (error) throw error
        return data
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['riskScore', variables.nodeId] })
      queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}
