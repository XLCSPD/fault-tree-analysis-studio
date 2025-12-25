'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database, Json } from '@/types/database'

type Scale = Database['public']['Tables']['scales']['Row']
type ScaleInsert = Database['public']['Tables']['scales']['Insert']
type ScaleUpdate = Database['public']['Tables']['scales']['Update']
type ScaleVersion = Database['public']['Tables']['scale_versions']['Row']
type ScaleVersionInsert = Database['public']['Tables']['scale_versions']['Insert']

export interface ScaleItem {
  value: number
  label: string
  definition: string
}

export interface ScaleWithVersions extends Scale {
  scale_versions?: ScaleVersion[]
  currentVersion?: ScaleVersion
  items?: ScaleItem[]
}

// Fetch all scales for an organization with their versions
export function useScales(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['scales', organizationId],
    queryFn: async () => {
      if (!organizationId) return []

      const { data, error } = await (supabase as any)
        .from('scales')
        .select(`
          *,
          scale_versions (*)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('type')

      if (error) throw error

      // Process to add currentVersion and items
      return (data ?? []).map((scale: any) => {
        const versions = (scale.scale_versions as ScaleVersion[]) ?? []
        const currentVersion = versions.sort(
          (a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
        )[0]

        return {
          ...scale,
          scale_versions: versions,
          currentVersion,
          items: currentVersion ? (currentVersion.items as unknown as ScaleItem[]) : [],
        } as ScaleWithVersions
      })
    },
    enabled: !!organizationId,
  })
}

// Create a new scale
export function useCreateScale(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      type,
      items,
    }: {
      name: string
      type: 'severity' | 'occurrence' | 'detection'
      items: ScaleItem[]
    }) => {
      // Create the scale
      const { data: scale, error: scaleError } = await (supabase as any)
        .from('scales')
        .insert({
          organization_id: organizationId,
          name,
          type,
        })
        .select()
        .single()

      if (scaleError) throw scaleError

      // Create initial version
      const { error: versionError } = await (supabase as any).from('scale_versions').insert({
        scale_id: scale.id,
        version: 1,
        effective_date: new Date().toISOString().split('T')[0],
        items: items,
      })

      if (versionError) throw versionError

      return scale
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scales', organizationId] })
    },
  })
}

// Update a scale's metadata
export function useUpdateScale(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ scaleId, updates }: { scaleId: string; updates: ScaleUpdate }) => {
      const { data, error } = await (supabase as any)
        .from('scales')
        .update(updates)
        .eq('id', scaleId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scales', organizationId] })
    },
  })
}

// Create a new version of a scale (updates the items)
export function useCreateScaleVersion(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      scaleId,
      items,
      effectiveDate,
    }: {
      scaleId: string
      items: ScaleItem[]
      effectiveDate?: string
    }) => {
      // Get the latest version number
      const { data: versions, error: versionsError } = await (supabase as any)
        .from('scale_versions')
        .select('version')
        .eq('scale_id', scaleId)
        .order('version', { ascending: false })
        .limit(1)

      if (versionsError) throw versionsError

      const nextVersion = versions && versions.length > 0 ? versions[0].version + 1 : 1

      const { data, error } = await (supabase as any)
        .from('scale_versions')
        .insert({
          scale_id: scaleId,
          version: nextVersion,
          effective_date: effectiveDate ?? new Date().toISOString().split('T')[0],
          items: items,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scales', organizationId] })
    },
  })
}

// Deactivate a scale
export function useDeactivateScale(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (scaleId: string) => {
      const { error } = await (supabase as any)
        .from('scales')
        .update({ is_active: false })
        .eq('id', scaleId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scales', organizationId] })
    },
  })
}
