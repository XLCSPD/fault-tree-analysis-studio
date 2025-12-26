'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

// Type for the table projection returned by the database function
export interface TableRow {
  row_id: string
  failure_mode_top: string
  why_1: string | null
  why_2: string | null
  why_3: string | null
  why_4: string | null
  why_5: string | null
  why_6: string | null
  why_7: string | null
  why_8: string | null
  why_9: string | null
  leaf_node_id: string
  units: string | null
  specification: string | null
  metric: string | null
  severity: number | null
  occurrence: number | null
  detection: number | null
  rpn: number | null
  investigation_item: string | null
  person_responsible_name: string | null
  due_date: string | null
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'VERIFIED' | null
  action_count: number | null
  evidence_count: number | null
  investigation_result: string | null
  judgment: number | null
  remarks: string | null
}

// Fetch table projection for an analysis
export function useTableProjection(analysisId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['tableProjection', analysisId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc('get_table_projection', {
        analysis_id_param: analysisId,
      } as any) as unknown as Promise<{ data: TableRow[] | null, error: any }>)

      if (error) throw error
      return data || []
    },
    enabled: !!analysisId,
  })
}

// Create nodes from a table row (Why chain)
export function useCreateFromTableRow(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (row: {
      failure_mode_top: string
      why_1?: string | null
      why_2?: string | null
      why_3?: string | null
      why_4?: string | null
      why_5?: string | null
      why_6?: string | null
      why_7?: string | null
      why_8?: string | null
      why_9?: string | null
      units?: string | null
      specification?: string | null
      metric?: string | null
    }) => {
      const { data, error } = await (supabase.rpc('create_nodes_from_table_row', {
        analysis_id_param: analysisId,
        failure_mode_top_param: row.failure_mode_top,
        why_1_param: row.why_1 ?? null,
        why_2_param: row.why_2 ?? null,
        why_3_param: row.why_3 ?? null,
        why_4_param: row.why_4 ?? null,
        why_5_param: row.why_5 ?? null,
        why_6_param: row.why_6 ?? null,
        why_7_param: row.why_7 ?? null,
        why_8_param: row.why_8 ?? null,
        why_9_param: row.why_9 ?? null,
        units_param: row.units ?? null,
        specification_param: row.specification ?? null,
        metric_param: row.metric ?? null,
      } as any) as unknown as Promise<{ data: string | null, error: any }>)

      if (error) throw error
      return data // Returns leaf node ID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['edges', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}

// Update a node from table edit
export function useUpdateFromTable(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      pathPosition,
      oldLabel,
      newLabel,
    }: {
      pathPosition: number // 0 for top, 1 for why_1, etc.
      oldLabel: string
      newLabel: string
    }) => {
      const { error } = await (supabase.rpc('update_node_from_table', {
        analysis_id_param: analysisId,
        path_position: pathPosition,
        old_label: oldLabel,
        new_label: newLabel,
      } as any) as unknown as Promise<{ data: void, error: any }>)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}
