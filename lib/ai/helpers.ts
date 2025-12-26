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

  // Get the analysis
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .select('title, problem_statement, abstract')
    .eq('id', analysisId)
    .single()

  if (analysisError || !analysis) {
    console.error('Failed to fetch analysis:', analysisError)
    return null
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

  return {
    nodeId,
    nodeLabel: node.label,
    nodeType: node.type,
    nodePath,
    analysisTitle: analysis.title,
    analysisContext: analysis.problem_statement || analysis.abstract || undefined,
    siblingLabels,
    parentLabel,
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

  switch (moduleType) {
    case 'next_whys':
      return [
        {
          id: generateId(),
          type: 'node',
          content: `Inadequate ${context.nodeLabel.toLowerCase()} procedures`,
          rationale: `Common root cause pattern when ${context.nodeLabel} is identified as a failure mode.`,
          evidenceRequired: 'Review procedure documentation and training records',
          confidence: 'medium',
          category: 'Process',
        },
        {
          id: generateId(),
          type: 'node',
          content: `Insufficient verification of ${context.nodeLabel.toLowerCase()}`,
          rationale: 'Lack of verification steps often contributes to quality escapes.',
          evidenceRequired: 'Check inspection records and verification checklists',
          confidence: 'medium',
          category: 'Verification',
        },
        {
          id: generateId(),
          type: 'node',
          content: 'Training gaps in relevant area',
          rationale: 'Personnel competency is frequently an underlying factor.',
          evidenceRequired: 'Review training matrix and competency assessments',
          confidence: 'low',
          category: 'People',
        },
      ]

    case 'investigations':
      return [
        {
          id: generateId(),
          type: 'action',
          content: `Verify ${context.nodeLabel} against specification requirements`,
          rationale: 'Confirm whether the condition exists and matches the hypothesis.',
          evidenceRequired: 'Measurement data, inspection records',
          confidence: 'high',
          category: 'Verification',
        },
        {
          id: generateId(),
          type: 'action',
          content: `Interview operators involved with ${context.nodeLabel.toLowerCase()}`,
          rationale: 'Gather firsthand information about process execution.',
          evidenceRequired: 'Interview notes, signed statements',
          confidence: 'medium',
          category: 'Investigation',
        },
        {
          id: generateId(),
          type: 'action',
          content: 'Review historical data for similar occurrences',
          rationale: 'Pattern analysis can reveal systemic issues.',
          evidenceRequired: 'Quality records, nonconformance database',
          confidence: 'medium',
          category: 'Data Analysis',
        },
      ]

    case 'quality':
      return [
        {
          id: generateId(),
          type: 'rewrite',
          content: `${context.nodeLabel} - specify measurable condition`,
          rationale: 'Cause statements should be specific and measurable for effective investigation.',
          evidenceRequired: 'Updated cause statement with quantifiable criteria',
          confidence: 'high',
        },
        {
          id: generateId(),
          type: 'rewrite',
          content: `Consider rephrasing to indicate controllable factor`,
          rationale: 'Causes should point to factors that can be addressed with corrective actions.',
          evidenceRequired: 'Revised statement identifying actionable condition',
          confidence: 'medium',
        },
      ]

    case 'controls':
      return [
        {
          id: generateId(),
          type: 'control',
          content: `Implement verification checkpoint for ${context.nodeLabel.toLowerCase()}`,
          rationale: 'Adding verification steps prevents recurrence.',
          evidenceRequired: 'Updated process documentation, checkpoint records',
          confidence: 'high',
          category: 'Preventive',
        },
        {
          id: generateId(),
          type: 'control',
          content: 'Establish monitoring dashboard for early detection',
          rationale: 'Continuous monitoring enables faster response.',
          evidenceRequired: 'Dashboard configuration, alert thresholds',
          confidence: 'medium',
          category: 'Detective',
        },
        {
          id: generateId(),
          type: 'control',
          content: 'Update training curriculum with lessons learned',
          rationale: 'Prevent recurrence through improved personnel awareness.',
          evidenceRequired: 'Training material updates, completion records',
          confidence: 'medium',
          category: 'Preventive',
        },
      ]

    default:
      return []
  }
}
