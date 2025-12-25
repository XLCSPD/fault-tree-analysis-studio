'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

// Fetch organization details
export function useOrganization(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      if (!organizationId) return null

      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single()

      if (error) throw error
      return data as Organization
    },
    enabled: !!organizationId,
  })
}

// Update organization
export function useUpdateOrganization(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: OrganizationUpdate) => {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .update(updates)
        .eq('id', organizationId)
        .select()
        .single()

      if (error) throw error
      return data as Organization
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] })
    },
  })
}
