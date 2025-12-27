import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { InvestigationQualityResponse, InvestigationQualityIssue, InvestigationIssueType } from '@/lib/ai/types'
import { VAGUE_INVESTIGATION_VERBS } from '@/lib/ai/types'

interface ActionData {
  id: string
  investigation_item: string | null
  hypothesis_text: string | null
  pass_fail_criteria: string | null
  test_method: string | null
  node_id: string | null
  nodes?: { label: string } | null
}

// Check if investigation uses vague verbs without method
function checkVagueVerbs(text: string): boolean {
  const lowerText = text.toLowerCase()

  // Check if starts with vague verb
  const startsWithVague = VAGUE_INVESTIGATION_VERBS.some(verb =>
    lowerText.startsWith(verb) || lowerText.startsWith(`to ${verb}`)
  )

  if (!startsWithVague) return false

  // Check if it specifies HOW (method indicators)
  const methodPatterns = [
    /\b(by|using|via|through|with)\b/i,
    /\b(measure|count|compare|test|sample|analyze)\b/i,
    /\b(interview|observe|document|photograph|record)\b/i,
  ]

  return !methodPatterns.some(pattern => pattern.test(text))
}

// Check if investigation has hypothesis structure
function hasHypothesisStructure(action: ActionData): boolean {
  // If explicit hypothesis_text is set, it's fine
  if (action.hypothesis_text) return true

  // Check if the investigation_item implies a hypothesis
  const text = (action.investigation_item || '').toLowerCase()

  const hypothesisIndicators = [
    /\b(if .+ then)\b/i,
    /\b(hypothesis|hypothesize|assume|suspect)\b/i,
    /\b(to (confirm|verify|prove|disprove|rule out))\b/i,
    /\b(whether|if .+ is)\b/i,
  ]

  return hypothesisIndicators.some(pattern => pattern.test(text))
}

// Check if investigation has pass/fail criteria
function hasCriteria(action: ActionData): boolean {
  if (action.pass_fail_criteria) return true

  const text = (action.investigation_item || '').toLowerCase()

  const criteriaIndicators = [
    /\d+/,                           // Has numbers (thresholds)
    /\b(pass|fail|accept|reject)\b/i,
    /\b(if .+ is .+ then)\b/i,
    /\b(criteria|threshold|limit|specification|standard)\b/i,
    /\b(greater|less|above|below|within|outside|exceeds)\b/i,
  ]

  return criteriaIndicators.some(pattern => pattern.test(text))
}

// Check if investigation specifies evidence type
function hasEvidenceType(action: ActionData): boolean {
  // Check if test_method is specified (acts as evidence type)
  if (action.test_method) return true

  const text = (action.investigation_item || '').toLowerCase()

  const evidenceIndicators = [
    /\b(photo|picture|image|video|screenshot)\b/i,
    /\b(document|report|record|log|data)\b/i,
    /\b(measurement|reading|sample|test result)\b/i,
    /\b(interview|statement|testimony)\b/i,
    /\b(observation|inspection|audit)\b/i,
  ]

  return evidenceIndicators.some(pattern => pattern.test(text))
}

// Check if investigation is too broad
function isTooBoard(text: string): boolean {
  const broadPatterns = [
    /^verify (the )?process/i,
    /^check compliance/i,
    /^review (all|the) /i,
    /^assess (overall|general)/i,
    /^evaluate (the )?system/i,
    /^investigate (the )?issue/i,
    /^look into/i,
    /^examine (the )?situation/i,
  ]

  return broadPatterns.some(pattern => pattern.test(text))
}

// Generate hypothesis from investigation text
function generateHypothesis(action: ActionData): string {
  const causeLabel = action.nodes?.label || 'the suspected cause'
  const investigationText = action.investigation_item || 'the investigation'

  // Try to extract the subject of investigation
  const subjectMatch = investigationText.match(/(?:verify|check|review|confirm|assess|evaluate)\s+(?:that\s+)?(.+)/i)
  const subject = subjectMatch ? subjectMatch[1] : investigationText

  return `If ${causeLabel.toLowerCase()} is the root cause, then investigation will show that ${subject.toLowerCase()}`
}

// Generate test method
function generateTestMethod(action: ActionData): string {
  const investigationText = action.investigation_item || 'the investigation'
  const lowerText = investigationText.toLowerCase()

  // Try to determine appropriate method based on context
  if (lowerText.includes('document') || lowerText.includes('record') || lowerText.includes('log')) {
    return 'Pull relevant records/logs for the time period of interest. Compare against expected values/patterns. Document findings with timestamps.'
  }

  if (lowerText.includes('interview') || lowerText.includes('operator') || lowerText.includes('personnel')) {
    return 'Prepare structured interview questions. Interview relevant personnel (minimum 2-3). Document responses with verbatim quotes where possible.'
  }

  if (lowerText.includes('measure') || lowerText.includes('test') || lowerText.includes('sample')) {
    return 'Define sample size and selection criteria. Take measurements using calibrated equipment. Record results with measurement uncertainty.'
  }

  if (lowerText.includes('observe') || lowerText.includes('watch') || lowerText.includes('monitor')) {
    return 'Observe the process during normal operation for [specify duration]. Document all deviations from expected behavior. Photograph or video key observations.'
  }

  // Default method
  return `1. Define specific data/evidence to collect\n2. Identify sources and access requirements\n3. Collect evidence with chain of custody\n4. Analyze against hypothesis\n5. Document findings and conclusion`
}

// Generate pass/fail criteria
function generatePassFailCriteria(action: ActionData): string {
  const causeLabel = action.nodes?.label || 'the suspected cause'

  return `CONFIRMS hypothesis if: Evidence shows ${causeLabel.toLowerCase()} occurred as described\nRULES OUT hypothesis if: Evidence shows ${causeLabel.toLowerCase()} did not occur or could not have caused the observed effect`
}

// Determine appropriate owner role
function suggestOwnerRole(action: ActionData): string {
  const text = (action.investigation_item || '').toLowerCase()

  if (text.includes('interview') || text.includes('personnel')) {
    return 'HR or Supervisor'
  }
  if (text.includes('document') || text.includes('record') || text.includes('audit')) {
    return 'Quality/Compliance'
  }
  if (text.includes('measure') || text.includes('test') || text.includes('sample')) {
    return 'Technical/Engineering'
  }
  if (text.includes('observe') || text.includes('process') || text.includes('operation')) {
    return 'Operations/Process Owner'
  }

  return 'Subject Matter Expert'
}

// Analyze a single action
function analyzeAction(action: ActionData): InvestigationQualityIssue | null {
  // Only analyze actions that have investigation_item set
  if (!action.investigation_item) {
    return null
  }

  const investigationText = action.investigation_item

  // Check for too broad
  if (isTooBoard(investigationText)) {
    return {
      action_id: action.id,
      issue_type: 'INVESTIGATION_TOO_BROAD',
      original_text: investigationText,
      hypothesis_text: generateHypothesis(action),
      test_method: generateTestMethod(action),
      evidence_required: 'Define specific evidence type (document, measurement, observation)',
      pass_fail_criteria: generatePassFailCriteria(action),
      recommended_owner_role: suggestOwnerRole(action),
      due_date_offset_days: 5,
      confidence: 'high',
    }
  }

  // Check for vague verbs without method
  if (checkVagueVerbs(investigationText)) {
    return {
      action_id: action.id,
      issue_type: 'INVESTIGATION_NO_HYPOTHESIS',
      original_text: investigationText,
      hypothesis_text: generateHypothesis(action),
      test_method: generateTestMethod(action),
      evidence_required: 'Define what evidence will confirm or rule out the hypothesis',
      pass_fail_criteria: generatePassFailCriteria(action),
      recommended_owner_role: suggestOwnerRole(action),
      due_date_offset_days: 3,
      confidence: 'medium',
    }
  }

  // Check for missing hypothesis
  if (!hasHypothesisStructure(action)) {
    return {
      action_id: action.id,
      issue_type: 'INVESTIGATION_NO_HYPOTHESIS',
      original_text: investigationText,
      hypothesis_text: generateHypothesis(action),
      test_method: generateTestMethod(action),
      evidence_required: action.test_method || 'Define specific evidence to collect',
      pass_fail_criteria: generatePassFailCriteria(action),
      recommended_owner_role: suggestOwnerRole(action),
      due_date_offset_days: 3,
      confidence: 'medium',
    }
  }

  // Check for missing criteria
  if (!hasCriteria(action)) {
    return {
      action_id: action.id,
      issue_type: 'INVESTIGATION_NO_CRITERIA',
      original_text: investigationText,
      hypothesis_text: action.hypothesis_text || generateHypothesis(action),
      test_method: generateTestMethod(action),
      evidence_required: action.test_method || 'Define specific evidence to collect',
      pass_fail_criteria: generatePassFailCriteria(action),
      recommended_owner_role: suggestOwnerRole(action),
      due_date_offset_days: 2,
      confidence: 'medium',
    }
  }

  // Check for missing evidence type
  if (!hasEvidenceType(action)) {
    return {
      action_id: action.id,
      issue_type: 'INVESTIGATION_NO_EVIDENCE',
      original_text: investigationText,
      hypothesis_text: action.hypothesis_text || generateHypothesis(action),
      test_method: generateTestMethod(action),
      evidence_required: 'Specify evidence type: document/record, measurement/data, observation, interview notes',
      pass_fail_criteria: action.pass_fail_criteria || generatePassFailCriteria(action),
      recommended_owner_role: suggestOwnerRole(action),
      due_date_offset_days: 2,
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
    const { analysisId, actionId, nodeId } = body

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

    // Fetch actions to analyze - filter for those with investigation_item set
    let actionsQuery = supabase
      .from('action_items')
      .select(`
        id,
        investigation_item,
        hypothesis_text,
        pass_fail_criteria,
        test_method,
        node_id,
        nodes(label)
      `)
      .eq('analysis_id', analysisId)
      .not('investigation_item', 'is', null)

    if (actionId) {
      actionsQuery = actionsQuery.eq('id', actionId)
    } else if (nodeId) {
      actionsQuery = actionsQuery.eq('node_id', nodeId)
    }

    const { data: actions, error: actionsError } = await actionsQuery as { data: ActionData[] | null; error: unknown }

    if (actionsError) {
      console.error('Failed to fetch actions:', actionsError)
      return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 })
    }

    // Create AI run record
    const { data: aiRun } = await (supabase
      .from('ai_runs') as any)
      .insert({
        organization_id: profile.organization_id,
        analysis_id: analysisId,
        node_id: nodeId || null,
        context_type: actionId ? 'action' : nodeId ? 'node' : 'analysis',
        feature: 'investigation_quality',
        model_provider: 'rule_based',
        model_name: 'investigation_rules_v1',
        created_by: user.id,
        input_summary: {
          action_count: actions?.length || 0,
          specific_action: actionId || null,
          specific_node: nodeId || null,
        },
      })
      .select('id')
      .single() as { data: { id: string } | null }

    // Analyze each action
    const issues: InvestigationQualityIssue[] = []

    for (const action of actions || []) {
      const issue = analyzeAction(action)
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
              no_hypothesis: issues.filter(i => i.issue_type === 'INVESTIGATION_NO_HYPOTHESIS').length,
              no_criteria: issues.filter(i => i.issue_type === 'INVESTIGATION_NO_CRITERIA').length,
              too_broad: issues.filter(i => i.issue_type === 'INVESTIGATION_TOO_BROAD').length,
              no_evidence: issues.filter(i => i.issue_type === 'INVESTIGATION_NO_EVIDENCE').length,
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

    // Create/update quality_issues records
    for (const issue of issues) {
      // Check if issue already exists for this action
      const { data: existingIssue } = await (supabase
        .from('quality_issues') as any)
        .select('id, status')
        .eq('action_id', issue.action_id)
        .eq('issue_kind', issue.issue_type)
        .eq('status', 'OPEN')
        .single()

      if (!existingIssue) {
        await (supabase
          .from('quality_issues') as any)
          .insert({
            organization_id: profile.organization_id,
            analysis_id: analysisId,
            action_id: issue.action_id,
            issue_kind: issue.issue_type,
            severity: issue.confidence === 'high' ? 'HIGH' : issue.confidence === 'medium' ? 'WARN' : 'INFO',
            message: `${issue.issue_type}: "${issue.original_text}"`,
            suggestion: issue,
            status: 'OPEN',
            created_by: user.id,
          })
      }
    }

    const response: InvestigationQualityResponse = { issues }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Investigation quality check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
