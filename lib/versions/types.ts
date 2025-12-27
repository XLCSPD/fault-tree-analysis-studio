/**
 * Version Control Types
 * Core type definitions for the analysis versioning system
 */

import type { Database, Json } from '@/types/database'

// ============================================================================
// Database Table Types (aliases for convenience)
// ============================================================================

export type AnalysisVersion = Database['public']['Tables']['analysis_versions']['Row']
export type AnalysisVersionInsert = Database['public']['Tables']['analysis_versions']['Insert']
export type AnalysisVersionUpdate = Database['public']['Tables']['analysis_versions']['Update']

export type AnalysisBranch = Database['public']['Tables']['analysis_branches']['Row']
export type AnalysisBranchInsert = Database['public']['Tables']['analysis_branches']['Insert']
export type AnalysisBranchUpdate = Database['public']['Tables']['analysis_branches']['Update']

export type BranchStatus = Database['public']['Enums']['branch_status']

// ============================================================================
// Snapshot Types
// ============================================================================

/** Snapshot of analysis metadata */
export interface AnalysisSnapshotMetadata {
  id: string
  title: string
  model: string | null
  application: string | null
  part_name: string | null
  analysis_date: string | null
  abstract: string | null
  abstract_summary: string | null
  related_document: string | null
  problem_statement: string | null
  status: string | null
  industry_id: string | null
  site_name: string | null
  area_function: string | null
  process_workflow: string | null
  asset_system: string | null
  item_output: string | null
  issue_category_id: string | null
  issue_subcategory: string | null
}

/** Snapshot of a single node */
export interface NodeSnapshot {
  id: string
  type: string
  label: string
  units: string | null
  specification: string | null
  metric: string | null
  notes: string | null
  tags: string[] | null
  evidence_status: string | null
  position: { x: number; y: number } | null
  collapsed: boolean
  quality_flags: Json | null
  text_aliases: Json | null
}

/** Snapshot of an edge */
export interface EdgeSnapshot {
  id: string
  source_id: string
  target_id: string
  gate_type: 'AND' | 'OR' | null
  order_index: number
}

/** Snapshot of a risk score */
export interface RiskScoreSnapshot {
  node_id: string
  severity: number | null
  occurrence: number | null
  detection: number | null
  rpn: number | null
  ap_category: string | null
}

/** Snapshot of an action item */
export interface ActionItemSnapshot {
  id: string
  node_id: string | null
  investigation_item: string
  person_responsible_id: string | null
  schedule: string | null
  investigation_result: string | null
  judgment: number | null
  remarks: string | null
  hypothesis_text: string | null
  test_method: string | null
  pass_fail_criteria: string | null
}

/** Snapshot of week status */
export interface WeekStatusSnapshot {
  action_item_id: string
  week_number: number
  status: string
  notes: string | null
}

/** Snapshot of evidence reference (metadata only, not files) */
export interface EvidenceRefSnapshot {
  id: string
  node_id: string | null
  action_item_id: string | null
  type: string
  title: string
  description: string | null
  url: string | null
  file_path: string | null
}

/** Complete version snapshot structure */
export interface VersionSnapshot {
  schemaVersion: number
  capturedAt: string
  analysis: AnalysisSnapshotMetadata
  nodes: NodeSnapshot[]
  edges: EdgeSnapshot[]
  riskScores: RiskScoreSnapshot[]
  actionItems: ActionItemSnapshot[]
  weekStatuses: WeekStatusSnapshot[]
  evidenceRefs: EvidenceRefSnapshot[]
}

// ============================================================================
// Diff Types
// ============================================================================

/** Status of an entity in a diff */
export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged'

/** A single field change */
export interface FieldChange {
  field: string
  oldValue: unknown
  newValue: unknown
}

/** Diff for a single node */
export interface NodeDiff {
  nodeId: string
  status: DiffStatus
  label?: string
  oldLabel?: string
  newLabel?: string
  changes?: FieldChange[]
  position?: { x: number; y: number } | null
}

/** Diff for a single edge */
export interface EdgeDiff {
  edgeId: string
  status: DiffStatus
  sourceId: string
  targetId: string
  oldGateType?: string | null
  newGateType?: string | null
}

/** Diff for a risk score */
export interface RiskScoreDiff {
  nodeId: string
  status: DiffStatus
  changes?: FieldChange[]
}

/** Diff for an action item */
export interface ActionItemDiff {
  actionId: string
  status: DiffStatus
  nodeId: string | null
  changes?: FieldChange[]
}

/** Summary statistics for a diff */
export interface DiffSummary {
  addedNodes: number
  removedNodes: number
  modifiedNodes: number
  unchangedNodes: number
  addedEdges: number
  removedEdges: number
  totalNodesA: number
  totalNodesB: number
}

/** Complete version diff result */
export interface VersionDiff {
  fromVersion: {
    id: string
    versionNumber: number
    name: string
    createdAt: string
  }
  toVersion: {
    id: string
    versionNumber: number
    name: string
    createdAt: string
  }
  nodes: NodeDiff[]
  edges: EdgeDiff[]
  riskScores: RiskScoreDiff[]
  actionItems: ActionItemDiff[]
  summary: DiffSummary
  computedAt: string
}

// ============================================================================
// UI Types
// ============================================================================

/** Version with creator profile for display */
export interface VersionWithCreator extends AnalysisVersion {
  creator?: {
    full_name: string | null
    email: string
    avatar_url: string | null
  }
}

/** Branch with creator profile for display */
export interface BranchWithCreator extends AnalysisBranch {
  creator?: {
    full_name: string | null
    email: string
    avatar_url: string | null
  }
  merger?: {
    full_name: string | null
    email: string
  } | null
}

/** Analysis with version count for admin list */
export interface AnalysisWithVersionInfo {
  id: string
  title: string
  status: string | null
  created_at: string | null
  updated_at: string | null
  version_count: number
  branch_count: number
  latest_version?: {
    id: string
    version_number: number
    name: string
    created_at: string
    is_auto: boolean
  }
}

// ============================================================================
// Create/Update Params
// ============================================================================

/** Parameters for creating a new version */
export interface CreateVersionParams {
  name: string
  description?: string
  isAuto?: boolean
  parentVersionId?: string
}

/** Parameters for creating a new branch */
export interface CreateBranchParams {
  name: string
  description?: string
  sourceVersionId?: string
}

/** Parameters for restoring a version */
export interface RestoreVersionParams {
  versionId: string
  createBackup?: boolean
}

// ============================================================================
// API Response Types
// ============================================================================

/** Response from version diff summary API */
export interface DiffSummaryResponse {
  added: number
  removed: number
  modified: number
  totalA: number
  totalB: number
}
