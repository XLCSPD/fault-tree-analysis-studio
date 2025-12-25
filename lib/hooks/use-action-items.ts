'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ActionItem = Database['public']['Tables']['action_items']['Row']
type ActionItemInsert = Database['public']['Tables']['action_items']['Insert']
type ActionItemUpdate = Database['public']['Tables']['action_items']['Update']
type Person = Database['public']['Tables']['people_directory']['Row']

// Extended type with person info
export interface ActionItemWithPerson extends ActionItem {
  person_responsible?: Person | null
}

// Fetch all action items for an analysis
export function useActionItems(analysisId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['actionItems', analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_items')
        .select(`
          *,
          person_responsible:people_directory(*)
        `)
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: true })
        .returns<ActionItemWithPerson[]>()

      if (error) throw error
      return data ?? []
    },
    enabled: !!analysisId,
  })
}

// Fetch action items for a specific node
export function useNodeActionItems(nodeId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['nodeActionItems', nodeId],
    queryFn: async () => {
      if (!nodeId) return []

      const { data, error } = await supabase
        .from('action_items')
        .select(`
          *,
          person_responsible:people_directory(*)
        `)
        .eq('node_id', nodeId)
        .order('created_at', { ascending: true })
        .returns<ActionItemWithPerson[]>()

      if (error) throw error
      return data ?? []
    },
    enabled: !!nodeId,
  })
}

// Create a new action item
export function useCreateActionItem(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: Omit<ActionItemInsert, 'analysis_id'>) => {
      const insertData: ActionItemInsert = { ...item, analysis_id: analysisId }
      const { data, error } = await (supabase
        .from('action_items')
        .insert(insertData as never)
        .select()
        .single() as unknown as Promise<{ data: ActionItem | null, error: Error | null }>)

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['actionItems', analysisId] })
      if (variables.node_id) {
        queryClient.invalidateQueries({ queryKey: ['nodeActionItems', variables.node_id] })
      }
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}

// Update an action item
export function useUpdateActionItem(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ actionItemId, updates }: { actionItemId: string; updates: ActionItemUpdate }) => {
      const { data, error } = await ((supabase
        .from('action_items') as ReturnType<typeof supabase.from>)
        .update(updates as never)
        .eq('id', actionItemId)
        .select()
        .single() as unknown as Promise<{ data: ActionItem | null, error: Error | null }>)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actionItems', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['nodeActionItems'] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}

// Delete an action item
export function useDeleteActionItem(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (actionItemId: string) => {
      const { error } = await supabase
        .from('action_items')
        .delete()
        .eq('id', actionItemId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actionItems', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['nodeActionItems'] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}
