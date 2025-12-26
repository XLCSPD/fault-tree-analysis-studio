import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UpdateSuggestionRequest {
  suggestionId: string
  status: 'accepted' | 'dismissed'
  resultNodeId?: string // If accepted and created a node
  resultActionId?: string // If accepted and created an action
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateSuggestionRequest = await request.json()
    const { suggestionId, status, resultNodeId, resultActionId } = body

    if (!suggestionId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: suggestionId, status' },
        { status: 400 }
      )
    }

    if (!['accepted', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "accepted" or "dismissed"' },
        { status: 400 }
      )
    }

    // Get the suggestion and verify access
    const { data: suggestion, error: suggestionError } = await (supabase as any)
      .from('ai_suggestions')
      .select('id, ai_run_id')
      .eq('id', suggestionId)
      .single() as { data: { id: string; ai_run_id: string } | null; error: unknown }

    if (suggestionError || !suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    // Get the run to verify org access
    const { data: run, error: runError } = await (supabase as any)
      .from('ai_runs')
      .select('analysis_id')
      .eq('id', suggestion.ai_run_id)
      .single() as { data: { analysis_id: string } | null; error: unknown }

    if (runError || !run) {
      return NextResponse.json({ error: 'AI run not found' }, { status: 404 })
    }

    // Verify user has access to the analysis
    const { data: analysis } = await supabase
      .from('analyses')
      .select('organization_id')
      .eq('id', run.analysis_id)
      .single<{ organization_id: string }>()

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single<{ organization_id: string }>()

    if (!profile || profile.organization_id !== analysis.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update the suggestion
    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = { status }

    if (status === 'accepted') {
      updateData.accepted_by = user.id
      updateData.accepted_at = now
      if (resultNodeId) {
        updateData.applied_entity_id = resultNodeId
        updateData.applied_entity_type = 'node'
      } else if (resultActionId) {
        updateData.applied_entity_id = resultActionId
        updateData.applied_entity_type = 'action'
      }
    } else if (status === 'dismissed') {
      updateData.dismissed_by = user.id
      updateData.dismissed_at = now
    }

    const { error: updateError } = await (supabase as any)
      .from('ai_suggestions')
      .update(updateData)
      .eq('id', suggestionId)

    if (updateError) {
      console.error('Failed to update suggestion:', updateError)
      return NextResponse.json(
        { error: 'Failed to update suggestion' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Suggestion update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
