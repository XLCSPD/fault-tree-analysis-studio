import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MetadataAssistResponse, MissingMetadataField } from '@/lib/ai/types'

interface AnalysisContext {
  id: string
  organization_id: string
  title: string
  problem_statement: string | null
  abstract: string | null
  abstract_summary: string | null
  industry_id: string | null
  site_name: string | null
  area_function: string | null
  process_workflow: string | null
  asset_system: string | null
  item_output: string | null
  issue_category_id: string | null
  industry?: { name: string } | null
  issue_category?: { name: string } | null
}

interface NodeData {
  id: string
  label: string
  type: string
}

interface ActionItemData {
  id: string
  title: string
  status: string
  result: string | null
}

interface EvidenceCount {
  count: number
}

// Helper to gather full context for AI
async function gatherAnalysisContext(supabase: any, analysisId: string) {
  // First try with extended metadata (if migration 06 was run)
  let analysis: AnalysisContext | null = null
  let analysisError: unknown = null

  // Try extended query first
  const extendedResult = await supabase
    .from('analyses')
    .select(`
      id,
      organization_id,
      title,
      problem_statement,
      abstract,
      abstract_summary,
      industry_id,
      site_name,
      area_function,
      process_workflow,
      asset_system,
      item_output,
      issue_category_id,
      industry:industries(name),
      issue_category:issue_categories(name)
    `)
    .eq('id', analysisId)
    .single()

  if (extendedResult.error) {
    // Fall back to basic query (if extended metadata tables don't exist)
    console.log('Extended metadata query failed, trying basic query:', extendedResult.error.message)
    const basicResult = await supabase
      .from('analyses')
      .select(`
        id,
        organization_id,
        title,
        problem_statement,
        abstract
      `)
      .eq('id', analysisId)
      .single()

    if (basicResult.error || !basicResult.data) {
      console.error('Basic analysis query also failed:', basicResult.error)
      return null
    }

    // Map basic result to expected shape with nulls for missing fields
    analysis = {
      ...basicResult.data,
      abstract_summary: null,
      industry_id: null,
      site_name: null,
      area_function: null,
      process_workflow: null,
      asset_system: null,
      item_output: null,
      issue_category_id: null,
      industry: null,
      issue_category: null,
    } as AnalysisContext
  } else {
    analysis = extendedResult.data as AnalysisContext
  }

  if (!analysis) {
    return null
  }

  // Get root node and first-level causes
  const { data: nodes } = await supabase
    .from('nodes')
    .select('id, label, type')
    .eq('analysis_id', analysisId)
    .order('type', { ascending: true }) as { data: NodeData[] | null }

  // Get edges to determine hierarchy
  const { data: edges } = await supabase
    .from('node_edges')
    .select('source_id, target_id')
    .eq('analysis_id', analysisId) as { data: Array<{ source_id: string; target_id: string }> | null }

  // Build tree structure
  const topEvents = nodes?.filter((n: NodeData) => n.type === 'top_event') || []
  const childrenMap = new Map<string, string[]>()
  edges?.forEach((e: { source_id: string; target_id: string }) => {
    const children = childrenMap.get(e.source_id) || []
    children.push(e.target_id)
    childrenMap.set(e.source_id, children)
  })

  // Get first-level causes for each top event
  const firstLevelCauses: string[] = []
  topEvents.forEach((te: NodeData) => {
    const children = childrenMap.get(te.id) || []
    children.forEach((childId: string) => {
      const child = nodes?.find((n: NodeData) => n.id === childId)
      if (child) {
        firstLevelCauses.push(child.label)
      }
    })
  })

  // Get action items summary
  const { data: actions } = await supabase
    .from('action_items')
    .select('id, title, status, result')
    .eq('analysis_id', analysisId)
    .limit(20) as { data: ActionItemData[] | null }

  // Get evidence count
  const { count: evidenceCount } = await supabase
    .from('evidence_attachments')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_id', analysisId) as { count: number | null }

  return {
    analysis,
    topEvents: topEvents.map((n: NodeData) => n.label),
    firstLevelCauses,
    actions: actions || [],
    evidenceCount: evidenceCount || 0,
    nodes: nodes || [],
  }
}

// Generate problem statement based on context
function generateProblemStatement(context: Awaited<ReturnType<typeof gatherAnalysisContext>>): string {
  if (!context) return ''

  const { analysis, topEvents, firstLevelCauses } = context
  const industryName = analysis.industry?.name || 'Unknown Industry'
  const siteName = analysis.site_name || 'Unknown Site'
  const processName = analysis.process_workflow || 'Unknown Process'
  const topEvent = topEvents[0] || 'Unknown Issue'

  // Build structured problem statement
  const parts = []

  // What is happening
  parts.push(`**What is happening:** ${topEvent}`)

  // Where
  if (siteName !== 'Unknown Site' || analysis.area_function) {
    parts.push(`**Where:** ${[siteName, analysis.area_function].filter(Boolean).join(', ')}`)
  } else {
    parts.push(`**Where:** [Unknown / Needs input - specify site or area]`)
  }

  // When/frequency
  parts.push(`**When / Frequency:** [Unknown / Needs input - specify time window or occurrence rate]`)

  // Impact
  parts.push(`**Impact:** [Unknown / Needs input - describe cost, service, safety, or quality impact]`)

  // Expected standard
  if (analysis.asset_system || analysis.item_output) {
    parts.push(`**Expected Standard:** ${analysis.asset_system || analysis.item_output} should operate without ${topEvent.toLowerCase()}`)
  } else {
    parts.push(`**Expected Standard:** [Unknown / Needs input - describe what should happen]`)
  }

  // Evidence source
  parts.push(`**Evidence Source:** [Unknown / Needs input - specify system report, audit finding, or observation]`)

  // Add suspected causes if available
  if (firstLevelCauses.length > 0) {
    parts.push(`\n**Suspected Contributing Factors:**`)
    firstLevelCauses.slice(0, 5).forEach((cause, i) => {
      parts.push(`${i + 1}. ${cause}`)
    })
  }

  return parts.join('\n')
}

// Generate abstract summary based on context
function generateAbstractSummary(context: Awaited<ReturnType<typeof gatherAnalysisContext>>): string {
  if (!context) return ''

  const { analysis, topEvents, firstLevelCauses, actions } = context
  const topEvent = topEvents[0] || 'the identified issue'

  const bullets = []

  // Observed issue
  bullets.push(`• **Observed Issue:** ${topEvent}`)

  // Suspected drivers
  if (firstLevelCauses.length > 0) {
    const drivers = firstLevelCauses.slice(0, 3).join(', ')
    bullets.push(`• **Suspected Drivers:** ${drivers}`)
  } else {
    bullets.push(`• **Suspected Drivers:** [To be determined through analysis]`)
  }

  // What we will prove
  bullets.push(`• **What We Will Prove:** Identify the root cause(s) contributing to ${topEvent.toLowerCase()} and validate through evidence-based investigation`)

  // Planned investigations
  const investigationCount = actions.filter((a: ActionItemData) => a.status === 'NOT_STARTED' || a.status === 'IN_PROGRESS').length
  if (investigationCount > 0) {
    bullets.push(`• **Planned Investigations:** ${investigationCount} active investigation${investigationCount > 1 ? 's' : ''} in progress`)
  } else {
    bullets.push(`• **Planned Investigations:** [Define investigation actions for each suspected cause]`)
  }

  // Success definition
  bullets.push(`• **Success Definition:** Root cause(s) confirmed with supporting evidence, corrective actions identified and implemented`)

  return bullets.join('\n')
}

// Identify missing metadata fields
function identifyMissingMetadata(context: Awaited<ReturnType<typeof gatherAnalysisContext>>): MissingMetadataField[] {
  if (!context) return []

  const { analysis } = context
  const missing: MissingMetadataField[] = []

  if (!analysis.industry_id) {
    missing.push({
      field: 'industry',
      reason: 'Industry context helps AI provide industry-specific terminology and best practices',
      question: 'What industry does this analysis relate to?',
    })
  }

  if (!analysis.site_name) {
    missing.push({
      field: 'site',
      reason: 'Site/location helps contextualize where the issue occurred',
      question: 'At which site or location did this issue occur?',
    })
  }

  if (!analysis.area_function) {
    missing.push({
      field: 'area',
      reason: 'Area/function helps narrow down the scope of investigation',
      question: 'Which area or function is affected?',
    })
  }

  if (!analysis.process_workflow) {
    missing.push({
      field: 'process',
      reason: 'Process/workflow context is essential for root cause analysis',
      question: 'What process or workflow is involved?',
    })
  }

  if (!analysis.asset_system) {
    missing.push({
      field: 'asset_system',
      reason: 'Asset/system identification helps focus the investigation',
      question: 'What asset, equipment, or system is being analyzed?',
    })
  }

  if (!analysis.item_output) {
    missing.push({
      field: 'item_output',
      reason: 'Item/output helps understand what is affected by the issue',
      question: 'What product, item, or output is affected?',
    })
  }

  if (!analysis.issue_category_id) {
    missing.push({
      field: 'issue_category',
      reason: 'Issue category helps classify and track the type of problem',
      question: 'What category best describes this issue?',
    })
  }

  return missing
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { analysisId } = body

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Missing required field: analysisId' },
        { status: 400 }
      )
    }

    // Verify user has access to the analysis
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single() as { data: { organization_id: string } | null }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Gather full context
    const context = await gatherAnalysisContext(supabase, analysisId)

    if (!context) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    if (context.analysis.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create AI run record (optional - may not exist if migration 05 wasn't run)
    let aiRun: { id: string } | null = null
    try {
      const { data, error: runError } = await (supabase
        .from('ai_runs') as any)
        .insert({
          organization_id: profile.organization_id,
          analysis_id: analysisId,
          context_type: 'analysis',
          feature: 'metadata_assist',
          model_provider: 'rule_based',
          model_name: 'structured_template_v1',
          created_by: user.id,
          input_summary: {
            has_title: !!context.analysis.title,
            has_problem_statement: !!context.analysis.problem_statement,
            node_count: context.nodes.length,
            action_count: context.actions.length,
          },
        })
        .select('id')
        .single()

      if (runError) {
        console.log('AI run logging skipped (table may not exist):', runError.message)
      } else {
        aiRun = data
      }
    } catch (e) {
      console.log('AI run logging not available')
    }

    // Generate responses
    const problem_statement = generateProblemStatement(context)
    const abstract_summary = generateAbstractSummary(context)
    const missing_metadata = identifyMissingMetadata(context)

    // Update AI run with results (optional logging)
    const latencyMs = Date.now() - startTime
    if (aiRun) {
      try {
        await (supabase
          .from('ai_runs') as any)
          .update({
            latency_ms: latencyMs,
            output_summary: {
              problem_statement_length: problem_statement.length,
              abstract_summary_length: abstract_summary.length,
              missing_fields_count: missing_metadata.length,
            },
          })
          .eq('id', aiRun.id)

        // Store suggestion
        await (supabase
          .from('ai_suggestions') as any)
          .insert({
            ai_run_id: aiRun.id,
            suggestion_type: 'rewrite',
            payload: {
              problem_statement,
              abstract_summary,
              missing_metadata,
            },
            confidence: missing_metadata.length > 3 ? 'low' : missing_metadata.length > 1 ? 'medium' : 'high',
            status: 'proposed',
          })
      } catch (e) {
        console.log('AI suggestion logging skipped')
      }
    }

    const response: MetadataAssistResponse = {
      problem_statement,
      abstract_summary,
      missing_metadata,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Metadata assist error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
