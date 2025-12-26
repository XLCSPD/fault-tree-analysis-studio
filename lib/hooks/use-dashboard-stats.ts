'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ActionStatus = Database["public"]["Enums"]["action_lifecycle_status"]

interface DashboardStats {
  analyses: {
    total: number
    draft: number
    active: number
    completed: number
  }
  highRiskCauses: number
  actionItems: {
    total: number
    withDueDate: number
    byType: {
      investigation: number
      containment: number
      corrective: number
      preventive: number
    }
  }
  overdueActions: number
}

export function useDashboardStats(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['dashboardStats', organizationId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!organizationId) {
        return {
          analyses: { total: 0, draft: 0, active: 0, completed: 0 },
          highRiskCauses: 0,
          actionItems: {
            total: 0,
            withDueDate: 0,
            byType: { investigation: 0, containment: 0, corrective: 0, preventive: 0 }
          },
          overdueActions: 0,
        }
      }

      // Fetch analyses counts by status
      const { data: analyses } = await (supabase as any)
        .from('analyses')
        .select('status')
        .eq('organization_id', organizationId) as { data: Array<{ status: string }> | null }

      const analysisCounts = {
        total: analyses?.length ?? 0,
        draft: analyses?.filter(a => a.status === 'draft').length ?? 0,
        active: analyses?.filter(a => a.status === 'active').length ?? 0,
        completed: analyses?.filter(a => a.status === 'completed').length ?? 0,
      }

      // Fetch high RPN causes (RPN > 200)
      const { data: highRpnNodes } = await (supabase as any)
        .from('risk_scores')
        .select(`
          rpn,
          node:nodes!inner(
            analysis:analyses!inner(organization_id)
          )
        `)
        .gt('rpn', 200) as { data: any[] | null }

      const highRiskCauses = highRpnNodes?.filter(
        (r: any) => r.node?.analysis?.organization_id === organizationId
      ).length ?? 0

      // Fetch action items with new lifecycle fields
      const { data: actionItems } = await (supabase as any)
        .from('action_items')
        .select(`
          id,
          action_type,
          status,
          due_date,
          analysis:analyses!inner(organization_id)
        `) as { data: any[] | null }

      const orgActionItems = actionItems?.filter(
        (a: any) => a.analysis?.organization_id === organizationId
      ) ?? []

      const today = new Date().toISOString().split('T')[0]

      // Count overdue actions (past due date, not done or verified)
      const overdueActions = orgActionItems.filter(
        a => a.due_date &&
             a.due_date < today &&
             a.status !== 'DONE' &&
             a.status !== 'VERIFIED'
      ).length

      // Count by action type
      const byType = {
        investigation: orgActionItems.filter(a => a.action_type === 'INVESTIGATION').length,
        containment: orgActionItems.filter(a => a.action_type === 'CONTAINMENT').length,
        corrective: orgActionItems.filter(a => a.action_type === 'CORRECTIVE').length,
        preventive: orgActionItems.filter(a => a.action_type === 'PREVENTIVE').length,
      }

      return {
        analyses: analysisCounts,
        highRiskCauses,
        actionItems: {
          total: orgActionItems.length,
          withDueDate: orgActionItems.filter(a => a.due_date).length,
          byType,
        },
        overdueActions,
      }
    },
    enabled: !!organizationId,
  })
}

interface RPNDistribution {
  priority: string
  count: number
  color: string
}

export function useRPNDistribution(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['rpnDistribution', organizationId],
    queryFn: async (): Promise<RPNDistribution[]> => {
      if (!organizationId) {
        return []
      }

      const { data: riskScores } = await supabase
        .from('risk_scores')
        .select(`
          rpn,
          node:nodes!inner(
            analysis:analyses!inner(organization_id)
          )
        `)

      const orgScores = riskScores?.filter(
        (r: any) => r.node?.analysis?.organization_id === organizationId && r.rpn
      ) ?? []

      const distribution = [
        { priority: 'Critical', count: 0, color: '#ef4444', min: 500, max: Infinity },
        { priority: 'High', count: 0, color: '#f97316', min: 200, max: 499 },
        { priority: 'Medium', count: 0, color: '#eab308', min: 100, max: 199 },
        { priority: 'Low', count: 0, color: '#22c55e', min: 0, max: 99 },
      ]

      orgScores.forEach((score: any) => {
        const rpn = score.rpn ?? 0
        for (const level of distribution) {
          if (rpn >= level.min && rpn <= level.max) {
            level.count++
            break
          }
        }
      })

      return distribution.map(({ priority, count, color }) => ({ priority, count, color }))
    },
    enabled: !!organizationId,
  })
}

interface ActionsByStatus {
  status: string
  count: number
  color: string
}

export function useActionsByStatus(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['actionsByStatus', organizationId],
    queryFn: async (): Promise<ActionsByStatus[]> => {
      if (!organizationId) {
        return []
      }

      // Fetch action items with new lifecycle status directly
      const { data: actionItems } = await supabase
        .from('action_items')
        .select(`
          status,
          analysis:analyses!inner(organization_id)
        `)

      const orgActions = actionItems?.filter(
        (a: any) => a.analysis?.organization_id === organizationId
      ) ?? []

      const statusCounts: Record<ActionStatus, number> = {
        NOT_STARTED: 0,
        IN_PROGRESS: 0,
        BLOCKED: 0,
        DONE: 0,
        VERIFIED: 0,
      }

      orgActions.forEach((a: any) => {
        if (a.status in statusCounts) {
          statusCounts[a.status as ActionStatus]++
        }
      })

      return [
        { status: 'Not Started', count: statusCounts.NOT_STARTED, color: '#9ca3af' },
        { status: 'In Progress', count: statusCounts.IN_PROGRESS, color: '#3b82f6' },
        { status: 'Blocked', count: statusCounts.BLOCKED, color: '#ef4444' },
        { status: 'Done', count: statusCounts.DONE, color: '#22c55e' },
        { status: 'Verified', count: statusCounts.VERIFIED, color: '#8b5cf6' },
      ]
    },
    enabled: !!organizationId,
  })
}

interface RecentAnalysis {
  id: string
  title: string
  status: string
  created_at: string
}

export function useRecentAnalyses(organizationId: string | null, limit: number = 5) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['recentAnalyses', organizationId, limit],
    queryFn: async (): Promise<RecentAnalysis[]> => {
      if (!organizationId) {
        return []
      }

      const { data, error } = await supabase
        .from('analyses')
        .select('id, title, status, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return (data ?? []) as RecentAnalysis[]
    },
    enabled: !!organizationId,
  })
}
