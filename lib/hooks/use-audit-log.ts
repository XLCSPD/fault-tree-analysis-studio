'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface AuditLogEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  changes: Record<string, any> | null
  created_at: string
  user_id: string
  user_email: string | null
  user_name: string | null
}

interface AuditLogFilters {
  entityType?: string
  userId?: string
  action?: 'INSERT' | 'UPDATE' | 'DELETE'
  dateFrom?: string
  dateTo?: string
}

interface AuditLogResult {
  entries: AuditLogEntry[]
  totalCount: number
  hasMore: boolean
}

export function useAuditLog(
  organizationId: string | null,
  filters: AuditLogFilters = {},
  page: number = 0,
  pageSize: number = 20
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['auditLog', organizationId, filters, page, pageSize],
    queryFn: async (): Promise<AuditLogResult> => {
      if (!organizationId) {
        return { entries: [], totalCount: 0, hasMore: false }
      }

      // Build query
      let query = supabase
        .from('audit_log')
        .select(`
          id,
          entity_type,
          entity_id,
          action,
          changes,
          created_at,
          user_id,
          user:profiles(email, full_name)
        `, { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      // Apply filters
      if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType)
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }
      if (filters.action) {
        query = query.eq('action', filters.action)
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59.999Z')
      }

      const { data, error, count } = await query

      if (error) throw error

      const entries: AuditLogEntry[] = (data ?? []).map((entry: any) => ({
        id: entry.id,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        action: entry.action,
        changes: entry.changes,
        created_at: entry.created_at,
        user_id: entry.user_id,
        user_email: entry.user?.email ?? null,
        user_name: entry.user?.full_name ?? null,
      }))

      return {
        entries,
        totalCount: count ?? 0,
        hasMore: (page + 1) * pageSize < (count ?? 0),
      }
    },
    enabled: !!organizationId,
  })
}

// Get unique entity types for filter dropdown
export function useAuditLogEntityTypes(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['auditLogEntityTypes', organizationId],
    queryFn: async (): Promise<string[]> => {
      if (!organizationId) return []

      const { data } = await supabase
        .from('audit_log')
        .select('entity_type')
        .eq('organization_id', organizationId)

      const types = new Set<string>()
      data?.forEach((entry: any) => types.add(entry.entity_type))
      return Array.from(types).sort()
    },
    enabled: !!organizationId,
  })
}

// Get unique users for filter dropdown
export function useAuditLogUsers(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['auditLogUsers', organizationId],
    queryFn: async (): Promise<Array<{ id: string; email: string; name: string | null }>> => {
      if (!organizationId) return []

      const { data } = await supabase
        .from('audit_log')
        .select('user_id, user:profiles(email, full_name)')
        .eq('organization_id', organizationId)

      const usersMap = new Map<string, { id: string; email: string; name: string | null }>()
      data?.forEach((entry: any) => {
        if (entry.user_id && !usersMap.has(entry.user_id)) {
          usersMap.set(entry.user_id, {
            id: entry.user_id,
            email: entry.user?.email ?? 'Unknown',
            name: entry.user?.full_name ?? null,
          })
        }
      })
      return Array.from(usersMap.values()).sort((a, b) => a.email.localeCompare(b.email))
    },
    enabled: !!organizationId,
  })
}
