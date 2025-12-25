'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database, Json } from '@/types/database'

type APMapping = Database['public']['Tables']['ap_mappings']['Row']
type APMappingInsert = Database['public']['Tables']['ap_mappings']['Insert']
type APMappingUpdate = Database['public']['Tables']['ap_mappings']['Update']

export interface RangeCondition {
  min?: number
  max?: number
}

export interface MappingRule {
  id: string
  conditions: {
    severity?: RangeCondition
    occurrence?: RangeCondition
    detection?: RangeCondition
    rpn?: RangeCondition
  }
  result: {
    ap_category: string
    priority: number
    color: string
  }
}

export interface APMappingWithRules extends APMapping {
  rules: MappingRule[]
}

// Fetch all AP mappings for an organization
export function useAPMappings(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['apMappings', organizationId],
    queryFn: async () => {
      if (!organizationId) return []

      const { data, error } = await supabase
        .from('ap_mappings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map((mapping: APMapping) => ({
        ...mapping,
        rules: (mapping.mapping_rules as unknown as MappingRule[]) ?? [],
      })) as APMappingWithRules[]
    },
    enabled: !!organizationId,
  })
}

// Create a new AP mapping
export function useCreateAPMapping(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, rules }: { name: string; rules: MappingRule[] }) => {
      const { data, error } = await (supabase as any)
        .from('ap_mappings')
        .insert({
          organization_id: organizationId,
          name,
          mapping_rules: rules,
        })
        .select()
        .single()

      if (error) throw error
      return data as APMapping
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apMappings', organizationId] })
    },
  })
}

// Update an AP mapping
export function useUpdateAPMapping(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      mappingId,
      updates,
    }: {
      mappingId: string
      updates: { name?: string; rules?: MappingRule[] }
    }) => {
      const updateData: Record<string, unknown> = {}
      if (updates.name) updateData.name = updates.name
      if (updates.rules) updateData.mapping_rules = updates.rules

      const { data, error } = await (supabase as any)
        .from('ap_mappings')
        .update(updateData)
        .eq('id', mappingId)
        .select()
        .single()

      if (error) throw error
      return data as APMapping
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apMappings', organizationId] })
    },
  })
}

// Deactivate an AP mapping
export function useDeactivateAPMapping(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mappingId: string) => {
      const { error } = await (supabase as any)
        .from('ap_mappings')
        .update({ is_active: false })
        .eq('id', mappingId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apMappings', organizationId] })
    },
  })
}

// Helper function to calculate AP category from S/O/D values
export function calculateAPCategory(
  rules: MappingRule[],
  severity: number,
  occurrence: number,
  detection: number
): { category: string; color: string } | null {
  const rpn = severity * occurrence * detection

  // Sort by priority (higher priority first)
  const sortedRules = [...rules].sort((a, b) => b.result.priority - a.result.priority)

  for (const rule of sortedRules) {
    const { conditions } = rule

    const matchesSeverity =
      (conditions.severity?.min === undefined || severity >= conditions.severity.min) &&
      (conditions.severity?.max === undefined || severity <= conditions.severity.max)

    const matchesOccurrence =
      (conditions.occurrence?.min === undefined || occurrence >= conditions.occurrence.min) &&
      (conditions.occurrence?.max === undefined || occurrence <= conditions.occurrence.max)

    const matchesDetection =
      (conditions.detection?.min === undefined || detection >= conditions.detection.min) &&
      (conditions.detection?.max === undefined || detection <= conditions.detection.max)

    const matchesRPN =
      (conditions.rpn?.min === undefined || rpn >= conditions.rpn.min) &&
      (conditions.rpn?.max === undefined || rpn <= conditions.rpn.max)

    if (matchesSeverity && matchesOccurrence && matchesDetection && matchesRPN) {
      return {
        category: rule.result.ap_category,
        color: rule.result.color,
      }
    }
  }

  return null
}

// Default AP mapping rules
export const DEFAULT_AP_RULES: MappingRule[] = [
  {
    id: 'critical',
    conditions: { rpn: { min: 200 } },
    result: { ap_category: 'Critical', priority: 4, color: '#ef4444' },
  },
  {
    id: 'high',
    conditions: { rpn: { min: 120, max: 199 } },
    result: { ap_category: 'High', priority: 3, color: '#f97316' },
  },
  {
    id: 'medium',
    conditions: { rpn: { min: 40, max: 119 } },
    result: { ap_category: 'Medium', priority: 2, color: '#eab308' },
  },
  {
    id: 'low',
    conditions: { rpn: { max: 39 } },
    result: { ap_category: 'Low', priority: 1, color: '#22c55e' },
  },
]
