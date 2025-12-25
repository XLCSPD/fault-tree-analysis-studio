'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type WeekStatus = Database['public']['Tables']['action_week_status']['Row']
type WeekStatusInsert = Database['public']['Tables']['action_week_status']['Insert']
type WeekStatusUpdate = Database['public']['Tables']['action_week_status']['Update']
type ActionStatus = Database['public']['Enums']['action_status']

// Fetch week statuses for an action item
export function useWeekStatuses(actionItemId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['weekStatuses', actionItemId],
    queryFn: async () => {
      if (!actionItemId) return []

      const { data, error } = await supabase
        .from('action_week_status')
        .select('*')
        .eq('action_item_id', actionItemId)
        .order('week_number', { ascending: true })
        .returns<WeekStatus[]>()

      if (error) throw error
      return data ?? []
    },
    enabled: !!actionItemId,
  })
}

// Upsert week status (create or update)
export function useUpsertWeekStatus(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      actionItemId,
      weekNumber,
      status,
      notes,
    }: {
      actionItemId: string
      weekNumber: 1 | 2 | 3 | 4
      status: ActionStatus
      notes?: string | null
    }) => {
      // Check if week status exists
      const { data: existing } = await supabase
        .from('action_week_status')
        .select('id')
        .eq('action_item_id', actionItemId)
        .eq('week_number', weekNumber)
        .maybeSingle<{ id: string }>()

      if (existing) {
        // Update existing
        const updateData: WeekStatusUpdate = { status, notes }
        const { data, error } = await ((supabase
          .from('action_week_status') as ReturnType<typeof supabase.from>)
          .update(updateData as never)
          .eq('id', existing.id)
          .select()
          .single() as unknown as Promise<{ data: WeekStatus | null, error: Error | null }>)

        if (error) throw error
        return data
      } else {
        // Create new
        const insertData: WeekStatusInsert = {
          action_item_id: actionItemId,
          week_number: weekNumber,
          status,
          notes,
        }
        const { data, error } = await (supabase
          .from('action_week_status')
          .insert(insertData as never)
          .select()
          .single() as unknown as Promise<{ data: WeekStatus | null, error: Error | null }>)

        if (error) throw error
        return data
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['weekStatuses', variables.actionItemId] })
      queryClient.invalidateQueries({ queryKey: ['actionItems', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}

// Batch update week statuses for an action item
export function useBatchUpdateWeekStatuses(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      actionItemId,
      statuses,
    }: {
      actionItemId: string
      statuses: Array<{ weekNumber: 1 | 2 | 3 | 4; status: ActionStatus; notes?: string | null }>
    }) => {
      const promises = statuses.map(async ({ weekNumber, status, notes }) => {
        // Check if exists
        const { data: existing } = await supabase
          .from('action_week_status')
          .select('id')
          .eq('action_item_id', actionItemId)
          .eq('week_number', weekNumber)
          .maybeSingle<{ id: string }>()

        if (existing) {
          return (supabase
            .from('action_week_status') as ReturnType<typeof supabase.from>)
            .update({ status, notes } as never)
            .eq('id', existing.id)
        } else {
          return supabase
            .from('action_week_status')
            .insert({
              action_item_id: actionItemId,
              week_number: weekNumber,
              status,
              notes,
            } as never)
        }
      })

      await Promise.all(promises)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['weekStatuses', variables.actionItemId] })
      queryClient.invalidateQueries({ queryKey: ['actionItems', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}
