import type { Database } from '@/types/database'

// AI suggestion types - extended with new quality modules
export type AIModuleType = 'next_whys' | 'investigations' | 'quality' | 'controls' | 'metadata_assist' | 'why_quality' | 'investigation_quality'

export interface AISuggestion {
  id: string
  type: 'node' | 'action' | 'rewrite' | 'control' | 'metadata' | 'hypothesis'
  content: string
  rationale: string
  evidenceRequired: string
  confidence: 'low' | 'medium' | 'high'
  category?: string
}

export interface AIRunContext {
  nodeId: string
  nodeLabel: string
  nodeType: string
  nodePath: string[]
  analysisTitle: string
  analysisContext?: string
  siblingLabels?: string[]
  parentLabel?: string
  // Extended metadata context (when available)
  metadata?: {
    industry?: string
    siteName?: string
    areaFunction?: string
    processWorkflow?: string
    assetSystem?: string
    itemOutput?: string
    issueCategory?: string
    problemStatement?: string
    abstract?: string
  }
}

export interface AIRequest {
  analysisId: string
  nodeId?: string
  moduleType: AIModuleType
  context?: Record<string, unknown>
}

export interface AIResponse {
  runId: string
  suggestions: AISuggestion[]
  tokensUsed?: number
  model?: string
}

// ============================================================
// METADATA AI ASSIST TYPES
// ============================================================

export interface MetadataAssistRequest {
  analysisId: string
}

export interface MissingMetadataField {
  field: 'industry' | 'site' | 'area' | 'process' | 'asset_system' | 'item_output' | 'issue_category'
  reason: string
  question: string
}

export interface MetadataAssistResponse {
  problem_statement: string
  abstract_summary: string
  missing_metadata: MissingMetadataField[]
}

// Structured Problem Statement template
export interface StructuredProblemStatement {
  what_is_happening: string      // symptom/defect
  where: string                   // site/area/process
  when_frequency: string          // time window/rate
  impact: string                  // cost/service/safety/quality
  expected_standard: string       // what should happen
  evidence_source: string         // system report/audit/observation
}

// Structured Abstract/Summary template
export interface StructuredAbstractSummary {
  observed_issue: string
  suspected_drivers: string
  what_to_prove: string
  planned_investigations: string
  success_definition: string
}

// ============================================================
// WHY STATEMENT QUALITY TYPES
// ============================================================

export type WhyIssueType =
  | 'WHY_CLARITY'
  | 'WHY_TESTABILITY'
  | 'WHY_SYMPTOM_RESTATEMENT'
  | 'WHY_BLAMEY'
  | 'WHY_VAGUE'

export interface WhyQualityIssue {
  node_id: string
  issue_type: WhyIssueType
  original_text: string
  improved_text: string
  evidence_required: string
  verification_method: 'observation' | 'audit' | 'data_pull' | 'interview' | 'test'
  confidence: 'low' | 'medium' | 'high'
}

export interface WhyQualityRequest {
  analysisId: string
  nodeId?: string           // If specified, check only this node's branch
  checkEntireAnalysis?: boolean
}

export interface WhyQualityResponse {
  issues: WhyQualityIssue[]
}

// Blamey/vague terms to flag
export const BLAMEY_TERMS = [
  'complacency',
  'careless',
  'operator error',
  'not paying attention',
  'human error',
  'negligence',
  'inattention',
  'lack of care',
  'poor attitude',
  'didn\'t care',
  'forgot',
  'laziness',
]

export const VAGUE_TERMS = [
  'training issue',
  'communication issue',
  'process issue',
  'didn\'t follow',
  'failed to',
  'inadequate',
  'improper',
  'insufficient',
]

// ============================================================
// INVESTIGATION QUALITY TYPES
// ============================================================

export type InvestigationIssueType =
  | 'INVESTIGATION_NO_HYPOTHESIS'
  | 'INVESTIGATION_NO_CRITERIA'
  | 'INVESTIGATION_TOO_BROAD'
  | 'INVESTIGATION_NO_EVIDENCE'

export interface InvestigationQualityIssue {
  action_id: string
  issue_type: InvestigationIssueType
  original_text: string
  hypothesis_text: string
  test_method: string
  evidence_required: string
  pass_fail_criteria: string
  recommended_owner_role: string
  due_date_offset_days: number
  confidence: 'low' | 'medium' | 'high'
}

export interface InvestigationQualityRequest {
  analysisId: string
  actionId?: string         // If specified, check only this action
  nodeId?: string           // If specified, check actions for this node
}

export interface InvestigationQualityResponse {
  issues: InvestigationQualityIssue[]
}

// Vague investigation verbs to flag
export const VAGUE_INVESTIGATION_VERBS = [
  'check',
  'review',
  'verify',
  'confirm',
  'validate',
  'assess',
  'evaluate',
  'investigate',
]

// ============================================================
// QUALITY SCORE TYPES
// ============================================================

export interface AnalysisQualityScore {
  total_score: number
  max_score: number
  metadata_complete: boolean
  flagged_whys_count: number
  flagged_investigations_count: number
  missing_evidence_count: number
}

// Database types
export type AIRun = Database['public']['Tables']['ai_runs']['Row']
export type AIRunInsert = Database['public']['Tables']['ai_runs']['Insert']
export type AISuggestionRow = Database['public']['Tables']['ai_suggestions']['Row']
export type AISuggestionInsert = Database['public']['Tables']['ai_suggestions']['Insert']
export type QualityIssue = Database['public']['Tables']['quality_issues']['Row']
export type QualityIssueInsert = Database['public']['Tables']['quality_issues']['Insert']
