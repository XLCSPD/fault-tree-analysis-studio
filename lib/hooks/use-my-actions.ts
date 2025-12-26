'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { Database } from '@/types/database'

type ActionType = Database["public"]["Enums"]["action_type"]
type ActionStatus = Database["public"]["Enums"]["action_lifecycle_status"]
type ActionPriority = Database["public"]["Enums"]["action_priority"]

interface ActionItemWithContext {
  id: string
  title: string
  description: string | null
  action_type: ActionType
  status: ActionStatus
  priority: ActionPriority | null
  due_date: string | null
  close_criteria: string | null
  result: string | null
  evidence_status: Database["public"]["Enums"]["evidence_status"]
  created_at: string
  analysis_id: string
  analysis_title: string
  node_id: string | null
  node_label: string | null
  person_responsible_name: string | null
}

interface MyActionsResult {
  actions: ActionItemWithContext[]
  overdue: ActionItemWithContext[]
  thisWeek: ActionItemWithContext[]
  upcoming: ActionItemWithContext[]
  byStatus: Record<ActionStatus, ActionItemWithContext[]>
  groupedByAnalysis: Record<string, ActionItemWithContext[]>
}

export function useMyActions() {
  const supabase = createClient()
  const { user } = useUser()

  return useQuery({
    queryKey: ['myActions', user?.id],
    queryFn: async (): Promise<MyActionsResult> => {
      if (!user?.email) {
        return {
          actions: [],
          overdue: [],
          thisWeek: [],
          upcoming: [],
          byStatus: {
            NOT_STARTED: [],
            IN_PROGRESS: [],
            BLOCKED: [],
            DONE: [],
            VERIFIED: [],
          },
          groupedByAnalysis: {},
        }
      }

      // First, find the person in people_directory matching the user's email
      const { data: person } = await (supabase as any)
        .from('people_directory')
        .select('id')
        .eq('email', user.email)
        .eq('is_active', true)
        .single() as { data: { id: string } | null }

      if (!person) {
        return {
          actions: [],
          overdue: [],
          thisWeek: [],
          upcoming: [],
          byStatus: {
            NOT_STARTED: [],
            IN_PROGRESS: [],
            BLOCKED: [],
            DONE: [],
            VERIFIED: [],
          },
          groupedByAnalysis: {},
        }
      }

      // Fetch action items assigned to this person
      const { data: actionItems } = await (supabase as any)
        .from('action_items')
        .select(`
          id,
          title,
          description,
          action_type,
          status,
          priority,
          due_date,
          close_criteria,
          result,
          evidence_status,
          created_at,
          analysis_id,
          node_id,
          analysis:analyses(id, title),
          node:nodes(id, label),
          person_responsible:people_directory(name)
        `)
        .eq('person_responsible_id', person.id)
        .order('due_date', { ascending: true, nullsFirst: false }) as { data: any[] | null }

      if (!actionItems) {
        return {
          actions: [],
          overdue: [],
          thisWeek: [],
          upcoming: [],
          byStatus: {
            NOT_STARTED: [],
            IN_PROGRESS: [],
            BLOCKED: [],
            DONE: [],
            VERIFIED: [],
          },
          groupedByAnalysis: {},
        }
      }

      // Transform to ActionItemWithContext
      const actions: ActionItemWithContext[] = actionItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        action_type: item.action_type,
        status: item.status,
        priority: item.priority,
        due_date: item.due_date,
        close_criteria: item.close_criteria,
        result: item.result,
        evidence_status: item.evidence_status,
        created_at: item.created_at,
        analysis_id: item.analysis_id,
        analysis_title: item.analysis?.title ?? 'Unknown Analysis',
        node_id: item.node_id,
        node_label: item.node?.label ?? null,
        person_responsible_name: item.person_responsible?.name ?? null,
      }))

      // Calculate date ranges
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      const weekFromNow = new Date(today)
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      const weekFromNowStr = weekFromNow.toISOString().split('T')[0]

      const twoWeeksFromNow = new Date(today)
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)
      const twoWeeksFromNowStr = twoWeeksFromNow.toISOString().split('T')[0]

      // Filter by completion status - only non-completed actions can be overdue/upcoming
      const activeActions = actions.filter(a =>
        a.status !== 'DONE' && a.status !== 'VERIFIED'
      )

      // Filter into date-based categories
      const overdue = activeActions.filter(a => a.due_date && a.due_date < todayStr)
      const thisWeek = activeActions.filter(
        a => a.due_date && a.due_date >= todayStr && a.due_date <= weekFromNowStr
      )
      const upcoming = activeActions.filter(
        a => a.due_date && a.due_date > weekFromNowStr && a.due_date <= twoWeeksFromNowStr
      )

      // Group by status
      const byStatus: Record<ActionStatus, ActionItemWithContext[]> = {
        NOT_STARTED: [],
        IN_PROGRESS: [],
        BLOCKED: [],
        DONE: [],
        VERIFIED: [],
      }
      actions.forEach(action => {
        byStatus[action.status].push(action)
      })

      // Group by analysis
      const groupedByAnalysis: Record<string, ActionItemWithContext[]> = {}
      actions.forEach(action => {
        const key = action.analysis_id
        if (!groupedByAnalysis[key]) {
          groupedByAnalysis[key] = []
        }
        groupedByAnalysis[key].push(action)
      })

      return {
        actions,
        overdue,
        thisWeek,
        upcoming,
        byStatus,
        groupedByAnalysis,
      }
    },
    enabled: !!user?.email,
  })
}
