'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Person = Database['public']['Tables']['people_directory']['Row']
type PersonInsert = Database['public']['Tables']['people_directory']['Insert']
type PersonUpdate = Database['public']['Tables']['people_directory']['Update']

// Fetch all people for an organization
export function usePeopleDirectory(organizationId: string | null, includeInactive = false) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['peopleDirectory', organizationId, includeInactive],
    queryFn: async () => {
      if (!organizationId) return []

      let query = supabase
        .from('people_directory')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query.returns<Person[]>()

      if (error) throw error
      return data ?? []
    },
    enabled: !!organizationId,
  })
}

// Create a new person
export function useCreatePerson(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (person: Omit<PersonInsert, 'organization_id'>) => {
      const insertData: PersonInsert = { ...person, organization_id: organizationId }
      const { data, error } = await (supabase
        .from('people_directory')
        .insert(insertData as never)
        .select()
        .single() as unknown as Promise<{ data: Person | null, error: Error | null }>)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peopleDirectory', organizationId] })
    },
  })
}

// Update a person
export function useUpdatePerson(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ personId, updates }: { personId: string; updates: PersonUpdate }) => {
      const { data, error } = await ((supabase
        .from('people_directory') as ReturnType<typeof supabase.from>)
        .update(updates as never)
        .eq('id', personId)
        .select()
        .single() as unknown as Promise<{ data: Person | null, error: Error | null }>)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peopleDirectory', organizationId] })
    },
  })
}

// Delete (deactivate) a person
export function useDeactivatePerson(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (personId: string) => {
      const { error } = await ((supabase
        .from('people_directory') as ReturnType<typeof supabase.from>)
        .update({ is_active: false } as never)
        .eq('id', personId) as unknown as Promise<{ error: Error | null }>)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peopleDirectory', organizationId] })
    },
  })
}

// Reactivate a person
export function useReactivatePerson(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (personId: string) => {
      const { error } = await ((supabase
        .from('people_directory') as ReturnType<typeof supabase.from>)
        .update({ is_active: true } as never)
        .eq('id', personId) as unknown as Promise<{ error: Error | null }>)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peopleDirectory', organizationId] })
    },
  })
}
