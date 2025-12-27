import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WhyQualityResponse, WhyQualityIssue, WhyIssueType } from '@/lib/ai/types'
import { BLAMEY_TERMS, VAGUE_TERMS } from '@/lib/ai/types'

interface NodeData {
  id: string
  label: string
  type: string
  analysis_id: string
}

interface EdgeData {
  source_id: string
  target_id: string
}

// Check for blamey/human-centric terms
function checkBlameyTerms(text: string): boolean {
  const lowerText = text.toLowerCase()
  return BLAMEY_TERMS.some(term => lowerText.includes(term.toLowerCase()))
}

// Check for vague/non-mechanistic terms
function checkVagueTerms(text: string): boolean {
  const lowerText = text.toLowerCase()
  return VAGUE_TERMS.some(term => lowerText.includes(term.toLowerCase()))
}

// Check if text is too short/abstract to be testable
function checkTestability(text: string): boolean {
  // Very short statements are often not testable
  if (text.length < 15) return false

  // Check for measurable/specific language patterns
  const testablePatterns = [
    /\d+/,                           // Contains numbers
    /\b(when|during|after|before)\b/i,  // Time references
    /\b(cm|mm|m|kg|g|lb|°|%|psi|bar|mpa)\b/i,  // Units
    /\b(spec|specification|requirement|standard)\b/i,  // Standards
    /\b(exceeded|below|above|less than|greater than|outside)\b/i,  // Comparisons
  ]

  return testablePatterns.some(pattern => pattern.test(text))
}

// Check if child repeats parent (symptom restatement)
function checkSymptomRestatement(childLabel: string, parentLabel: string | null): boolean {
  if (!parentLabel) return false

  const childWords = childLabel.toLowerCase().split(/\s+/)
  const parentWords = parentLabel.toLowerCase().split(/\s+/)

  // Remove common stopwords
  const stopwords = ['the', 'a', 'an', 'is', 'was', 'were', 'be', 'been', 'to', 'of', 'and', 'or', 'not', 'no']
  const childFiltered = childWords.filter(w => !stopwords.includes(w) && w.length > 2)
  const parentFiltered = parentWords.filter(w => !stopwords.includes(w) && w.length > 2)

  // If more than 50% of child words are in parent, likely a restatement
  const overlap = childFiltered.filter(w => parentFiltered.includes(w))
  return overlap.length >= childFiltered.length * 0.5 && childFiltered.length > 0
}

// Generate improved text for blamey terms
function improveBlameyText(originalText: string): string {
  let improved = originalText

  const replacements: Record<string, string> = {
    'operator error': 'process step lacked error-proofing mechanism',
    'human error': 'task design did not prevent incorrect execution',
    'complacency': 'procedure did not include verification checkpoint',
    'careless': 'work instructions lacked specificity for this condition',
    'not paying attention': 'visual cues did not alert operator to abnormal condition',
    'negligence': 'supervision system did not detect deviation',
    'inattention': 'task design required sustained attention without break',
    'forgot': 'checklist did not include this item',
    'laziness': 'workload distribution created incentive to skip step',
  }

  Object.entries(replacements).forEach(([term, replacement]) => {
    const regex = new RegExp(term, 'gi')
    if (regex.test(improved)) {
      improved = improved.replace(regex, replacement)
    }
  })

  // If no direct replacement, add mechanism prefix
  if (improved === originalText) {
    improved = `System/process condition that allowed: ${originalText}`
  }

  return improved
}

// Generate improved text for vague terms
function improveVagueText(originalText: string): string {
  let improved = originalText

  const replacements: Record<string, string> = {
    'training issue': 'specific skill gap in [specify task/competency]',
    'communication issue': 'information about [specify what] did not reach [specify who]',
    'process issue': 'process step for [specify step] did not account for [specify condition]',
    "didn't follow": 'step [specify step] was bypassed because [specify barrier removed]',
    'failed to': 'mechanism for [specify task] did not function because [specify reason]',
    'inadequate': '[specify what] was [specify measurable shortfall]',
    'improper': '[specify what] deviated from [specify standard] by [specify amount]',
    'insufficient': '[specify resource/quantity] was below required [specify threshold]',
  }

  Object.entries(replacements).forEach(([term, replacement]) => {
    const regex = new RegExp(term, 'gi')
    if (regex.test(improved)) {
      improved = improved.replace(regex, replacement)
    }
  })

  return improved
}

// Suggest evidence and verification method
function suggestVerification(issueType: WhyIssueType, originalText: string): { evidence: string; method: 'observation' | 'audit' | 'data_pull' | 'interview' | 'test' } {
  switch (issueType) {
    case 'WHY_BLAMEY':
      return {
        evidence: 'Process documentation, task design analysis, error-proofing assessment',
        method: 'audit',
      }
    case 'WHY_VAGUE':
      return {
        evidence: 'Specific measurements, records, or documentation showing the condition',
        method: 'data_pull',
      }
    case 'WHY_TESTABILITY':
      return {
        evidence: 'Define measurable criteria that would confirm or rule out this cause',
        method: 'observation',
      }
    case 'WHY_SYMPTOM_RESTATEMENT':
      return {
        evidence: 'Identify the underlying mechanism that explains why this symptom occurs',
        method: 'interview',
      }
    case 'WHY_CLARITY':
    default:
      return {
        evidence: 'Rewrite with specific, observable conditions that can be verified',
        method: 'observation',
      }
  }
}

// Analyze a single node
function analyzeNode(
  node: NodeData,
  parentLabel: string | null,
  depth: number
): WhyQualityIssue | null {
  const label = node.label

  // Skip top events and gates
  if (node.type === 'top_event' || node.type === 'gate') {
    return null
  }

  // Check for blamey terms (highest priority)
  if (checkBlameyTerms(label)) {
    const verification = suggestVerification('WHY_BLAMEY', label)
    return {
      node_id: node.id,
      issue_type: 'WHY_BLAMEY',
      original_text: label,
      improved_text: improveBlameyText(label),
      evidence_required: verification.evidence,
      verification_method: verification.method,
      confidence: 'high',
    }
  }

  // Check for vague terms
  if (checkVagueTerms(label)) {
    const verification = suggestVerification('WHY_VAGUE', label)
    return {
      node_id: node.id,
      issue_type: 'WHY_VAGUE',
      original_text: label,
      improved_text: improveVagueText(label),
      evidence_required: verification.evidence,
      verification_method: verification.method,
      confidence: 'medium',
    }
  }

  // Check for symptom restatement
  if (checkSymptomRestatement(label, parentLabel)) {
    const verification = suggestVerification('WHY_SYMPTOM_RESTATEMENT', label)
    return {
      node_id: node.id,
      issue_type: 'WHY_SYMPTOM_RESTATEMENT',
      original_text: label,
      improved_text: `[Specify the mechanism that causes "${parentLabel}" to occur]`,
      evidence_required: verification.evidence,
      verification_method: verification.method,
      confidence: 'medium',
    }
  }

  // Check for testability (lower priority)
  if (!checkTestability(label)) {
    const verification = suggestVerification('WHY_TESTABILITY', label)
    return {
      node_id: node.id,
      issue_type: 'WHY_TESTABILITY',
      original_text: label,
      improved_text: `${label} [add measurable condition: e.g., "X was Y% below specification"]`,
      evidence_required: verification.evidence,
      verification_method: verification.method,
      confidence: 'low',
    }
  }

  return null
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
    const { analysisId, nodeId, checkEntireAnalysis } = body

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Missing required field: analysisId' },
        { status: 400 }
      )
    }

    // Verify user has access to the analysis
    const { data: analysis } = await supabase
      .from('analyses')
      .select('id, organization_id')
      .eq('id', analysisId)
      .single() as { data: { id: string; organization_id: string } | null }

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single() as { data: { organization_id: string } | null }

    if (!profile || profile.organization_id !== analysis.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch nodes to analyze
    let nodesQuery = supabase
      .from('nodes')
      .select('id, label, type, analysis_id')
      .eq('analysis_id', analysisId)

    if (nodeId && !checkEntireAnalysis) {
      // Get the specific node and its descendants
      nodesQuery = nodesQuery.eq('id', nodeId)
    }

    const { data: nodes, error: nodesError } = await nodesQuery as { data: NodeData[] | null; error: unknown }

    if (nodesError || !nodes) {
      return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 })
    }

    // Fetch edges to build parent-child relationships
    const { data: edges } = await supabase
      .from('node_edges')
      .select('source_id, target_id')
      .eq('analysis_id', analysisId) as { data: EdgeData[] | null }

    // Build parent map
    const parentMap = new Map<string, string>()
    edges?.forEach((e: EdgeData) => {
      parentMap.set(e.target_id, e.source_id)
    })

    // Build node map for label lookup
    const nodeMap = new Map<string, NodeData>()
    nodes.forEach((n: NodeData) => nodeMap.set(n.id, n))

    // Calculate depth for each node
    const depthMap = new Map<string, number>()
    const calculateDepth = (nodeId: string): number => {
      if (depthMap.has(nodeId)) return depthMap.get(nodeId)!
      const parentId = parentMap.get(nodeId)
      const depth = parentId ? calculateDepth(parentId) + 1 : 0
      depthMap.set(nodeId, depth)
      return depth
    }
    nodes.forEach((n: NodeData) => calculateDepth(n.id))

    // Create AI run record
    const { data: aiRun } = await (supabase
      .from('ai_runs') as any)
      .insert({
        organization_id: profile.organization_id,
        analysis_id: analysisId,
        node_id: nodeId || null,
        context_type: nodeId ? 'node' : 'analysis',
        feature: 'why_quality',
        model_provider: 'rule_based',
        model_name: 'quality_rules_v1',
        created_by: user.id,
        input_summary: {
          node_count: nodes.length,
          check_entire_analysis: checkEntireAnalysis || false,
        },
      })
      .select('id')
      .single() as { data: { id: string } | null }

    // Analyze each node
    const issues: WhyQualityIssue[] = []

    for (const node of nodes) {
      const parentId = parentMap.get(node.id)
      const parentNode = parentId ? nodeMap.get(parentId) : null
      const parentLabel = parentNode?.label || null
      const depth = depthMap.get(node.id) || 0

      const issue = analyzeNode(node, parentLabel, depth)
      if (issue) {
        issues.push(issue)
      }
    }

    // Update AI run with results
    const latencyMs = Date.now() - startTime
    if (aiRun) {
      await (supabase
        .from('ai_runs') as any)
        .update({
          latency_ms: latencyMs,
          output_summary: {
            issues_found: issues.length,
            by_type: {
              blamey: issues.filter(i => i.issue_type === 'WHY_BLAMEY').length,
              vague: issues.filter(i => i.issue_type === 'WHY_VAGUE').length,
              symptom_restatement: issues.filter(i => i.issue_type === 'WHY_SYMPTOM_RESTATEMENT').length,
              testability: issues.filter(i => i.issue_type === 'WHY_TESTABILITY').length,
            },
          },
        })
        .eq('id', aiRun.id)

      // Store each issue as a suggestion
      if (issues.length > 0) {
        await (supabase
          .from('ai_suggestions') as any)
          .insert(issues.map(issue => ({
            ai_run_id: aiRun.id,
            suggestion_type: 'rewrite',
            payload: issue,
            confidence: issue.confidence,
            status: 'proposed',
          })))
      }
    }

    // Also create/update quality_issues records
    for (const issue of issues) {
      // Check if issue already exists for this node
      const { data: existingIssue } = await (supabase
        .from('quality_issues') as any)
        .select('id, status')
        .eq('node_id', issue.node_id)
        .eq('issue_kind', issue.issue_type)
        .eq('status', 'OPEN')
        .single()

      if (!existingIssue) {
        await (supabase
          .from('quality_issues') as any)
          .insert({
            organization_id: profile.organization_id,
            analysis_id: analysisId,
            node_id: issue.node_id,
            issue_kind: issue.issue_type,
            severity: issue.confidence === 'high' ? 'HIGH' : issue.confidence === 'medium' ? 'WARN' : 'INFO',
            message: `${issue.issue_type}: "${issue.original_text}"`,
            suggestion: issue,
            status: 'OPEN',
            created_by: user.id,
          })
      }
    }

    // Update node quality_flags
    for (const issue of issues) {
      await (supabase
        .from('nodes') as any)
        .update({
          quality_flags: {
            last_check: new Date().toISOString(),
            has_issues: true,
            issue_types: [issue.issue_type],
          },
        })
        .eq('id', issue.node_id)
    }

    const response: WhyQualityResponse = { issues }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Why quality check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
