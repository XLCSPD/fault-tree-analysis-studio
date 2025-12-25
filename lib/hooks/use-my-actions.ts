'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'

interface ActionItemWithContext {
  id: string
  investigation_item: string
  schedule: string | null
  investigation_result: string | null
  judgment: number | null
  remarks: string | null
  created_at: string
  analysis_id: string
  analysis_title: string
  node_id: string | null
  node_label: string | null
  person_responsible_name: string | null
  week_statuses: Array<{
    week_number: number
    status: string
    notes: string | null
  }>
}

interface MyActionsResult {
  actions: ActionItemWithContext[]
  overdue: ActionItemWithContext[]
  thisWeek: ActionItemWithContext[]
  upcoming: ActionItemWithContext[]
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
          groupedByAnalysis: {},
        }
      }

      // Fetch action items assigned to this person
      const { data: actionItems } = await (supabase as any)
        .from('action_items')
        .select(`
          id,
          investigation_item,
          schedule,
          investigation_result,
          judgment,
          remarks,
          created_at,
          analysis_id,
          node_id,
          analysis:analyses(id, title),
          node:nodes(id, label),
          person_responsible:people_directory(name)
        `)
        .eq('person_responsible_id', person.id)
        .order('schedule', { ascending: true, nullsFirst: false }) as { data: any[] | null }

      if (!actionItems) {
        return {
          actions: [],
          overdue: [],
          thisWeek: [],
          upcoming: [],
          groupedByAnalysis: {},
        }
      }

      // Fetch week statuses for these action items
      const actionIds = actionItems.map(a => a.id)
      const { data: weekStatuses } = await (supabase as any)
        .from('action_week_status')
        .select('action_item_id, week_number, status, notes')
        .in('action_item_id', actionIds)
        .order('week_number', { ascending: true }) as { data: Array<{ action_item_id: string; week_number: number; status: string; notes: string | null }> | null }

      // Group week statuses by action item
      const statusesByAction: Record<string, Array<{ week_number: number; status: string; notes: string | null }>> = {}
      weekStatuses?.forEach(ws => {
        if (!statusesByAction[ws.action_item_id]) {
          statusesByAction[ws.action_item_id] = []
        }
        statusesByAction[ws.action_item_id].push({
          week_number: ws.week_number,
          status: ws.status,
          notes: ws.notes,
        })
      })

      // Transform to ActionItemWithContext
      const actions: ActionItemWithContext[] = actionItems.map((item: any) => ({
        id: item.id,
        investigation_item: item.investigation_item,
        schedule: item.schedule,
        investigation_result: item.investigation_result,
        judgment: item.judgment,
        remarks: item.remarks,
        created_at: item.created_at,
        analysis_id: item.analysis_id,
        analysis_title: item.analysis?.title ?? 'Unknown Analysis',
        node_id: item.node_id,
        node_label: item.node?.label ?? null,
        person_responsible_name: item.person_responsible?.name ?? null,
        week_statuses: statusesByAction[item.id] ?? [],
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

      // Filter into categories
      const overdue = actions.filter(a => a.schedule && a.schedule < todayStr)
      const thisWeek = actions.filter(
        a => a.schedule && a.schedule >= todayStr && a.schedule <= weekFromNowStr
      )
      const upcoming = actions.filter(
        a => a.schedule && a.schedule > weekFromNowStr && a.schedule <= twoWeeksFromNowStr
      )

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
        groupedByAnalysis,
      }
    },
    enabled: !!user?.email,
  })
}
