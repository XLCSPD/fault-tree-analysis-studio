import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AIModuleType, AIRequest, AIResponse, AISuggestion } from '@/lib/ai/types'
import {
  getNodeContext,
  createAIRun,
  updateAIRunResults,
  storeAISuggestions,
  generateMockSuggestions,
} from '@/lib/ai/helpers'

const VALID_MODULES: AIModuleType[] = ['next_whys', 'investigations', 'quality', 'controls']

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AIRequest = await request.json()
    const { analysisId, nodeId, moduleType, context: additionalContext } = body

    // Validate required fields
    if (!analysisId || !nodeId || !moduleType) {
      return NextResponse.json(
        { error: 'Missing required fields: analysisId, nodeId, moduleType' },
        { status: 400 }
      )
    }

    // Validate module type
    if (!VALID_MODULES.includes(moduleType)) {
      return NextResponse.json(
        { error: `Invalid moduleType. Must be one of: ${VALID_MODULES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify user has access to the analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('id, organization_id')
      .eq('id', analysisId)
      .single<{ id: string; organization_id: string }>()

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    // Verify user belongs to the organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single<{ organization_id: string }>()

    if (!profile || profile.organization_id !== analysis.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify node exists and belongs to the analysis
    const { data: node, error: nodeError } = await supabase
      .from('nodes')
      .select('id')
      .eq('id', nodeId)
      .eq('analysis_id', analysisId)
      .single<{ id: string }>()

    if (nodeError || !node) {
      return NextResponse.json({ error: 'Node not found in analysis' }, { status: 404 })
    }

    // Get node context for AI
    const nodeContext = await getNodeContext(supabase, analysisId, nodeId)
    if (!nodeContext) {
      return NextResponse.json(
        { error: 'Failed to fetch node context' },
        { status: 500 }
      )
    }

    // Create AI run record
    const runId = await createAIRun(supabase, analysisId, nodeId, moduleType, user.id, analysis.organization_id)
    if (!runId) {
      return NextResponse.json(
        { error: 'Failed to create AI run record' },
        { status: 500 }
      )
    }

    let suggestions: AISuggestion[] = []
    let tokensUsed = 0
    let model = 'mock-model-v1' // Placeholder

    try {
      // Generate suggestions
      // In production, this would call the actual AI model
      // For now, using mock suggestions
      suggestions = generateMockSuggestions(moduleType, nodeContext)

      // Simulate token usage
      tokensUsed = Math.floor(Math.random() * 500) + 100

      // Store suggestions in database
      await storeAISuggestions(supabase, runId, suggestions)

      // Update run with results
      const latencyMs = Date.now() - startTime
      await updateAIRunResults(supabase, runId, tokensUsed, model, latencyMs)
    } catch (aiError) {
      console.error('AI generation error:', aiError)
      const latencyMs = Date.now() - startTime
      await updateAIRunResults(supabase, runId, undefined, undefined, latencyMs, String(aiError))

      return NextResponse.json(
        { error: 'AI generation failed' },
        { status: 500 }
      )
    }

    const response: AIResponse = {
      runId,
      suggestions,
      tokensUsed,
      model,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('AI route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve previous suggestions for a node
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('analysisId')
    const nodeId = searchParams.get('nodeId')
    const moduleType = searchParams.get('moduleType') as AIModuleType | null

    if (!analysisId || !nodeId) {
      return NextResponse.json(
        { error: 'Missing required parameters: analysisId, nodeId' },
        { status: 400 }
      )
    }

    // Verify user has access to the analysis
    const { data: analysis } = await supabase
      .from('analyses')
      .select('organization_id')
      .eq('id', analysisId)
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

    // Build query for AI runs
    interface AIRunRow {
      id: string
      feature: string
      created_at: string
      tokens_used: number | null
      model_name: string | null
    }

    let runsQuery = (supabase as any)
      .from('ai_runs')
      .select('id, feature, created_at, tokens_used, model_name')
      .eq('analysis_id', analysisId)
      .eq('node_id', nodeId)
      .order('created_at', { ascending: false })

    if (moduleType && VALID_MODULES.includes(moduleType)) {
      runsQuery = runsQuery.eq('feature', moduleType)
    }

    const { data: runs, error: runsError } = await runsQuery.limit(10) as { data: AIRunRow[] | null; error: unknown }

    if (runsError) {
      console.error('Failed to fetch AI runs:', runsError)
      return NextResponse.json(
        { error: 'Failed to fetch AI runs' },
        { status: 500 }
      )
    }

    if (!runs || runs.length === 0) {
      return NextResponse.json({ runs: [], suggestions: [] })
    }

    // Fetch suggestions for these runs
    const runIds = runs.map(r => r.id)
    const { data: suggestions, error: suggestionsError } = await (supabase as any)
      .from('ai_suggestions')
      .select('*')
      .in('ai_run_id', runIds)
      .order('created_at', { ascending: true })

    if (suggestionsError) {
      console.error('Failed to fetch suggestions:', suggestionsError)
      return NextResponse.json(
        { error: 'Failed to fetch suggestions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      runs,
      suggestions: suggestions || [],
    })
  } catch (error) {
    console.error('AI GET route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
