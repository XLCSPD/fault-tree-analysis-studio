'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
type UserRole = Database['public']['Enums']['user_role']

// Fetch all profiles for an organization
export function useOrgProfiles(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['orgProfiles', organizationId],
    queryFn: async () => {
      if (!organizationId) return []

      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('full_name', { ascending: true })

      if (error) throw error
      return (data ?? []) as Profile[]
    },
    enabled: !!organizationId,
  })
}

// Update a profile (change role, name, etc.)
export function useUpdateProfile(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ profileId, updates }: { profileId: string; updates: ProfileUpdate }) => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single()

      if (error) throw error
      return data as Profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgProfiles', organizationId] })
    },
  })
}

// Invite a new user (calls server API)
export function useInviteUser(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: UserRole }) => {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, organizationId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to invite user')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgProfiles', organizationId] })
    },
  })
}

// Remove user from organization (calls server API)
export function useRemoveUser(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (profileId: string) => {
      const response = await fetch('/api/admin/remove-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, organizationId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to remove user')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgProfiles', organizationId] })
    },
  })
}
