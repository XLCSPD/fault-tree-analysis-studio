'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

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
    withSchedule: number
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
          actionItems: { total: 0, withSchedule: 0 },
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

      // Fetch action items
      const { data: actionItems } = await (supabase as any)
        .from('action_items')
        .select(`
          id,
          schedule,
          analysis:analyses!inner(organization_id)
        `) as { data: any[] | null }

      const orgActionItems = actionItems?.filter(
        (a: any) => a.analysis?.organization_id === organizationId
      ) ?? []

      const today = new Date().toISOString().split('T')[0]
      const overdueActions = orgActionItems.filter(
        a => a.schedule && a.schedule < today
      ).length

      return {
        analyses: analysisCounts,
        highRiskCauses,
        actionItems: {
          total: orgActionItems.length,
          withSchedule: orgActionItems.filter(a => a.schedule).length,
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

      // Fetch all week statuses for org's action items
      const { data: weekStatuses } = await supabase
        .from('action_week_status')
        .select(`
          status,
          action_item:action_items!inner(
            analysis:analyses!inner(organization_id)
          )
        `)

      const orgStatuses = weekStatuses?.filter(
        (ws: any) => ws.action_item?.analysis?.organization_id === organizationId
      ) ?? []

      const statusCounts = {
        not_started: 0,
        in_progress: 0,
        done: 0,
        blocked: 0,
      }

      orgStatuses.forEach((ws: any) => {
        if (ws.status in statusCounts) {
          statusCounts[ws.status as keyof typeof statusCounts]++
        }
      })

      return [
        { status: 'Not Started', count: statusCounts.not_started, color: '#9ca3af' },
        { status: 'In Progress', count: statusCounts.in_progress, color: '#3b82f6' },
        { status: 'Completed', count: statusCounts.done, color: '#22c55e' },
        { status: 'Blocked', count: statusCounts.blocked, color: '#ef4444' },
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
