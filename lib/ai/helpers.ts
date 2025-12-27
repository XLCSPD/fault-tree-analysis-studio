import type { AIModuleType, AIRunContext, AISuggestion } from './types'

// Use generic supabase client type to avoid schema version mismatches
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = any

// Fetch node context for AI prompts
export async function getNodeContext(
  supabase: SupabaseClientAny,
  analysisId: string,
  nodeId: string
): Promise<AIRunContext | null> {
  // Get the node
  const { data: node, error: nodeError } = await supabase
    .from('nodes')
    .select('id, label, type')
    .eq('id', nodeId)
    .single()

  if (nodeError || !node) {
    console.error('Failed to fetch node:', nodeError)
    return null
  }

  // Get the analysis with extended metadata
  // Try extended query first, fall back to basic if columns don't exist
  let analysis: {
    title: string
    problem_statement: string | null
    abstract: string | null
    industry_id?: string | null
    site_name?: string | null
    area_function?: string | null
    process_workflow?: string | null
    asset_system?: string | null
    item_output?: string | null
    issue_category_id?: string | null
  } | null = null

  const { data: extendedAnalysis, error: extendedError } = await supabase
    .from('analyses')
    .select(`
      title,
      problem_statement,
      abstract,
      industry_id,
      site_name,
      area_function,
      process_workflow,
      asset_system,
      item_output,
      issue_category_id
    `)
    .eq('id', analysisId)
    .single()

  if (extendedError) {
    // Fall back to basic query
    const { data: basicAnalysis, error: basicError } = await supabase
      .from('analyses')
      .select('title, problem_statement, abstract')
      .eq('id', analysisId)
      .single()

    if (basicError || !basicAnalysis) {
      console.error('Failed to fetch analysis:', basicError)
      return null
    }
    analysis = basicAnalysis
  } else {
    analysis = extendedAnalysis
  }

  if (!analysis) {
    console.error('Failed to fetch analysis')
    return null
  }

  // Fetch industry name if industry_id exists
  let industryName: string | undefined
  if (analysis.industry_id) {
    const { data: industry } = await supabase
      .from('industries')
      .select('name')
      .eq('id', analysis.industry_id)
      .single()
    industryName = industry?.name
  }

  // Fetch issue category name if issue_category_id exists
  let issueCategoryName: string | undefined
  if (analysis.issue_category_id) {
    const { data: category } = await supabase
      .from('issue_categories')
      .select('name')
      .eq('id', analysis.issue_category_id)
      .single()
    issueCategoryName = category?.name
  }

  // Get node path using database function
  const { data: pathData } = await (supabase.rpc('get_node_path', {
    target_node_id: nodeId,
  }) as unknown as Promise<{ data: string[] | null; error: unknown }>)

  // Get path labels
  let nodePath: string[] = []
  if (pathData && pathData.length > 0) {
    const { data: pathNodes } = await supabase
      .from('nodes')
      .select('id, label')
      .in('id', pathData) as { data: Array<{ id: string; label: string }> | null }

    if (pathNodes) {
      // Order by path order
      const nodeMap = new Map(pathNodes.map((n: { id: string; label: string }) => [n.id, n.label]))
      nodePath = pathData.map((id: string) => nodeMap.get(id) || '').filter(Boolean)
    }
  }

  // Get sibling nodes
  const { data: parentEdge } = await supabase
    .from('node_edges')
    .select('source_id')
    .eq('target_id', nodeId)
    .single() as { data: { source_id: string } | null }

  let siblingLabels: string[] = []
  let parentLabel: string | undefined

  if (parentEdge) {
    // Get parent label
    const { data: parent } = await supabase
      .from('nodes')
      .select('label')
      .eq('id', parentEdge.source_id)
      .single() as { data: { label: string } | null }

    parentLabel = parent?.label

    // Get siblings
    const { data: siblingEdges } = await supabase
      .from('node_edges')
      .select('target_id')
      .eq('source_id', parentEdge.source_id)
      .neq('target_id', nodeId) as { data: Array<{ target_id: string }> | null }

    if (siblingEdges && siblingEdges.length > 0) {
      const siblingIds = siblingEdges.map((e: { target_id: string }) => e.target_id)
      const { data: siblings } = await supabase
        .from('nodes')
        .select('label')
        .in('id', siblingIds) as { data: Array<{ label: string }> | null }

      siblingLabels = siblings?.map((s: { label: string }) => s.label) || []
    }
  }

  // Build metadata object (only include fields that have values)
  const metadata: AIRunContext['metadata'] = {}
  if (industryName) metadata.industry = industryName
  if (analysis.site_name) metadata.siteName = analysis.site_name
  if (analysis.area_function) metadata.areaFunction = analysis.area_function
  if (analysis.process_workflow) metadata.processWorkflow = analysis.process_workflow
  if (analysis.asset_system) metadata.assetSystem = analysis.asset_system
  if (analysis.item_output) metadata.itemOutput = analysis.item_output
  if (issueCategoryName) metadata.issueCategory = issueCategoryName
  if (analysis.problem_statement) metadata.problemStatement = analysis.problem_statement
  if (analysis.abstract) metadata.abstract = analysis.abstract

  return {
    nodeId,
    nodeLabel: node.label,
    nodeType: node.type,
    nodePath,
    analysisTitle: analysis.title,
    analysisContext: analysis.problem_statement || analysis.abstract || undefined,
    siblingLabels,
    parentLabel,
    // Include metadata if any fields are populated
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  }
}

// Store AI run in database
export async function createAIRun(
  supabase: SupabaseClientAny,
  analysisId: string,
  nodeId: string,
  moduleType: AIModuleType,
  userId: string,
  organizationId: string
): Promise<string | null> {
  const { data, error } = await (supabase
    .from('ai_runs')
    .insert({
      organization_id: organizationId,
      analysis_id: analysisId,
      node_id: nodeId,
      context_type: 'node',
      feature: moduleType,
      model_provider: 'mock',
      created_by: userId,
    } as any)
    .select('id')
    .single() as unknown as Promise<{ data: { id: string } | null; error: unknown }>)

  if (error) {
    console.error('Failed to create AI run:', error)
    return null
  }

  return data?.id || null
}

// Update AI run with results
export async function updateAIRunResults(
  supabase: SupabaseClientAny,
  runId: string,
  tokensUsed?: number,
  model?: string,
  latencyMs?: number,
  errorMessage?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {}

  if (tokensUsed !== undefined) updateData.tokens_used = tokensUsed
  if (model) updateData.model_name = model
  if (latencyMs !== undefined) updateData.latency_ms = latencyMs
  if (errorMessage) updateData.error_message = errorMessage

  if (Object.keys(updateData).length > 0) {
    await supabase
      .from('ai_runs')
      .update(updateData as any)
      .eq('id', runId)
  }
}

// Store AI suggestions
export async function storeAISuggestions(
  supabase: SupabaseClientAny,
  runId: string,
  suggestions: AISuggestion[]
): Promise<void> {
  const rows = suggestions.map((s) => ({
    ai_run_id: runId,
    suggestion_type: s.type,
    payload: {
      content: s.content,
      id: s.id,
    },
    rationale: s.rationale,
    evidence_required: s.evidenceRequired,
    confidence: s.confidence,
    category: s.category,
    status: 'proposed',
  }))

  await (supabase.from('ai_suggestions').insert(rows as any) as unknown as Promise<{ error: unknown }>)
}

// Generate mock suggestions (placeholder for real AI integration)
// In production, this would call OpenAI, Claude API, or another LLM
export function generateMockSuggestions(
  moduleType: AIModuleType,
  context: AIRunContext
): AISuggestion[] {
  const generateId = () => crypto.randomUUID()

  // Extract metadata for context-aware suggestions
  const meta = context.metadata || {}
  const industry = meta.industry || 'general'
  const process = meta.processWorkflow || 'the process'
  const asset = meta.assetSystem || 'the system'
  const site = meta.siteName || 'the site'
  const area = meta.areaFunction || 'the area'

  // Build context string for rationale
  const contextStr = [
    meta.industry && `${meta.industry} industry`,
    meta.processWorkflow && `${meta.processWorkflow} process`,
    meta.assetSystem && `${meta.assetSystem}`,
  ].filter(Boolean).join(', ')

  switch (moduleType) {
    case 'next_whys':
      return [
        {
          id: generateId(),
          type: 'node',
          content: `Inadequate ${context.nodeLabel.toLowerCase()} procedures${meta.processWorkflow ? ` in ${process}` : ''}`,
          rationale: `Common root cause pattern when ${context.nodeLabel} is identified as a failure mode.${contextStr ? ` Context: ${contextStr}.` : ''}`,
          evidenceRequired: `Review ${process} procedure documentation and training records${meta.siteName ? ` at ${site}` : ''}`,
          confidence: 'medium',
          category: 'Process',
        },
        {
          id: generateId(),
          type: 'node',
          content: `Insufficient verification of ${context.nodeLabel.toLowerCase()}${meta.assetSystem ? ` for ${asset}` : ''}`,
          rationale: `Lack of verification steps often contributes to quality escapes.${meta.industry ? ` Typical issue in ${industry}.` : ''}`,
          evidenceRequired: `Check inspection records and verification checklists${meta.areaFunction ? ` in ${area}` : ''}`,
          confidence: 'medium',
          category: 'Verification',
        },
        {
          id: generateId(),
          type: 'node',
          content: `Training gaps${meta.areaFunction ? ` in ${area}` : ' in relevant area'}`,
          rationale: `Personnel competency is frequently an underlying factor.${meta.processWorkflow ? ` ${process} requires specific knowledge.` : ''}`,
          evidenceRequired: `Review training matrix and competency assessments${meta.siteName ? ` for ${site} personnel` : ''}`,
          confidence: 'low',
          category: 'People',
        },
      ]

    case 'investigations':
      return [
        {
          id: generateId(),
          type: 'action',
          content: `Verify ${context.nodeLabel}${meta.assetSystem ? ` on ${asset}` : ''} against specification requirements`,
          rationale: `Confirm whether the condition exists and matches the hypothesis.${contextStr ? ` Context: ${contextStr}.` : ''}`,
          evidenceRequired: `Measurement data, inspection records${meta.processWorkflow ? ` from ${process}` : ''}`,
          confidence: 'high',
          category: 'Verification',
        },
        {
          id: generateId(),
          type: 'action',
          content: `Interview operators involved with ${context.nodeLabel.toLowerCase()}${meta.siteName ? ` at ${site}` : ''}`,
          rationale: `Gather firsthand information about ${meta.processWorkflow ? process : 'process'} execution.`,
          evidenceRequired: 'Interview notes, signed statements',
          confidence: 'medium',
          category: 'Investigation',
        },
        {
          id: generateId(),
          type: 'action',
          content: `Review historical data for similar occurrences${meta.assetSystem ? ` involving ${asset}` : ''}`,
          rationale: `Pattern analysis can reveal systemic issues.${meta.industry ? ` Common investigation approach in ${industry}.` : ''}`,
          evidenceRequired: `Quality records, nonconformance database${meta.siteName ? ` at ${site}` : ''}`,
          confidence: 'medium',
          category: 'Data Analysis',
        },
      ]

    case 'quality':
      return [
        {
          id: generateId(),
          type: 'rewrite',
          content: `${context.nodeLabel} - specify measurable condition${meta.assetSystem ? ` for ${asset}` : ''}`,
          rationale: `Cause statements should be specific and measurable for effective investigation.${meta.industry ? ` ${industry} standards may define acceptable thresholds.` : ''}`,
          evidenceRequired: `Updated cause statement with quantifiable criteria${meta.processWorkflow ? ` relevant to ${process}` : ''}`,
          confidence: 'high',
        },
        {
          id: generateId(),
          type: 'rewrite',
          content: `Consider rephrasing to indicate controllable factor${meta.areaFunction ? ` within ${area}` : ''}`,
          rationale: `Causes should point to factors that can be addressed with corrective actions.${contextStr ? ` Context: ${contextStr}.` : ''}`,
          evidenceRequired: 'Revised statement identifying actionable condition',
          confidence: 'medium',
        },
      ]

    case 'controls':
      return [
        {
          id: generateId(),
          type: 'control',
          content: `Implement verification checkpoint for ${context.nodeLabel.toLowerCase()}${meta.processWorkflow ? ` in ${process}` : ''}`,
          rationale: `Adding verification steps prevents recurrence.${meta.industry ? ` Standard practice in ${industry}.` : ''}`,
          evidenceRequired: `Updated ${meta.processWorkflow ? process : 'process'} documentation, checkpoint records`,
          confidence: 'high',
          category: 'Preventive',
        },
        {
          id: generateId(),
          type: 'control',
          content: `Establish monitoring dashboard for ${meta.assetSystem ? asset : 'early detection'}`,
          rationale: `Continuous monitoring enables faster response.${meta.siteName ? ` Deploy at ${site}.` : ''}`,
          evidenceRequired: 'Dashboard configuration, alert thresholds',
          confidence: 'medium',
          category: 'Detective',
        },
        {
          id: generateId(),
          type: 'control',
          content: `Update training curriculum${meta.areaFunction ? ` for ${area}` : ''} with lessons learned`,
          rationale: `Prevent recurrence through improved personnel awareness.${meta.siteName ? ` Training to be conducted at ${site}.` : ''}`,
          evidenceRequired: `Training material updates, completion records${meta.processWorkflow ? ` for ${process} personnel` : ''}`,
          confidence: 'medium',
          category: 'Preventive',
        },
      ]

    default:
      return []
  }
}
