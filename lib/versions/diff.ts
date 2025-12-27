/**
 * Version Diff Utilities
 * Functions for computing differences between version snapshots
 */

import type {
  VersionSnapshot,
  NodeSnapshot,
  EdgeSnapshot,
  NodeDiff,
  EdgeDiff,
  RiskScoreDiff,
  ActionItemDiff,
  VersionDiff,
  DiffSummary,
  FieldChange,
  DiffStatus,
} from './types'

/**
 * Compare two values and determine if they're different
 */
function isDifferent(a: unknown, b: unknown): boolean {
  if (a === b) return false
  if (a === null && b === null) return false
  if (a === undefined && b === undefined) return false

  // Handle JSON objects
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) !== JSON.stringify(b)
  }

  return true
}

/**
 * Get the changes between two objects for specified fields
 */
function getFieldChanges(
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown> | null,
  fields: string[]
): FieldChange[] {
  const changes: FieldChange[] = []

  for (const field of fields) {
    const oldValue = oldObj?.[field]
    const newValue = newObj?.[field]

    if (isDifferent(oldValue, newValue)) {
      changes.push({ field, oldValue, newValue })
    }
  }

  return changes
}

/**
 * Compute node diffs between two snapshots
 */
export function computeNodeDiffs(
  nodesA: NodeSnapshot[],
  nodesB: NodeSnapshot[]
): NodeDiff[] {
  const diffs: NodeDiff[] = []
  const nodeMapA = new Map(nodesA.map(n => [n.id, n]))
  const nodeMapB = new Map(nodesB.map(n => [n.id, n]))
  const allNodeIds = new Set([...nodeMapA.keys(), ...nodeMapB.keys()])

  for (const nodeId of allNodeIds) {
    const nodeA = nodeMapA.get(nodeId)
    const nodeB = nodeMapB.get(nodeId)

    if (!nodeA && nodeB) {
      // Added in B
      diffs.push({
        nodeId,
        status: 'added',
        label: nodeB.label,
        newLabel: nodeB.label,
        position: nodeB.position,
      })
    } else if (nodeA && !nodeB) {
      // Removed in B
      diffs.push({
        nodeId,
        status: 'removed',
        label: nodeA.label,
        oldLabel: nodeA.label,
        position: nodeA.position,
      })
    } else if (nodeA && nodeB) {
      // Exists in both - check for modifications
      const changes = getFieldChanges(
        nodeA as unknown as Record<string, unknown>,
        nodeB as unknown as Record<string, unknown>,
        ['label', 'type', 'units', 'specification', 'metric', 'notes', 'evidence_status', 'collapsed']
      )

      if (changes.length > 0) {
        diffs.push({
          nodeId,
          status: 'modified',
          label: nodeB.label,
          oldLabel: nodeA.label,
          newLabel: nodeB.label,
          changes,
          position: nodeB.position,
        })
      } else {
        diffs.push({
          nodeId,
          status: 'unchanged',
          label: nodeB.label,
          position: nodeB.position,
        })
      }
    }
  }

  return diffs
}

/**
 * Compute edge diffs between two snapshots
 */
export function computeEdgeDiffs(
  edgesA: EdgeSnapshot[],
  edgesB: EdgeSnapshot[]
): EdgeDiff[] {
  const diffs: EdgeDiff[] = []
  const edgeMapA = new Map(edgesA.map(e => [e.id, e]))
  const edgeMapB = new Map(edgesB.map(e => [e.id, e]))
  const allEdgeIds = new Set([...edgeMapA.keys(), ...edgeMapB.keys()])

  for (const edgeId of allEdgeIds) {
    const edgeA = edgeMapA.get(edgeId)
    const edgeB = edgeMapB.get(edgeId)

    if (!edgeA && edgeB) {
      diffs.push({
        edgeId,
        status: 'added',
        sourceId: edgeB.source_id,
        targetId: edgeB.target_id,
        newGateType: edgeB.gate_type,
      })
    } else if (edgeA && !edgeB) {
      diffs.push({
        edgeId,
        status: 'removed',
        sourceId: edgeA.source_id,
        targetId: edgeA.target_id,
        oldGateType: edgeA.gate_type,
      })
    } else if (edgeA && edgeB) {
      const isModified = edgeA.gate_type !== edgeB.gate_type
      diffs.push({
        edgeId,
        status: isModified ? 'modified' : 'unchanged',
        sourceId: edgeB.source_id,
        targetId: edgeB.target_id,
        oldGateType: edgeA.gate_type,
        newGateType: edgeB.gate_type,
      })
    }
  }

  return diffs
}

/**
 * Compute risk score diffs between two snapshots
 */
export function computeRiskScoreDiffs(
  scoresA: { node_id: string; severity: number | null; occurrence: number | null; detection: number | null }[],
  scoresB: { node_id: string; severity: number | null; occurrence: number | null; detection: number | null }[]
): RiskScoreDiff[] {
  const diffs: RiskScoreDiff[] = []
  const scoreMapA = new Map(scoresA.map(s => [s.node_id, s]))
  const scoreMapB = new Map(scoresB.map(s => [s.node_id, s]))
  const allNodeIds = new Set([...scoreMapA.keys(), ...scoreMapB.keys()])

  for (const nodeId of allNodeIds) {
    const scoreA = scoreMapA.get(nodeId)
    const scoreB = scoreMapB.get(nodeId)

    if (!scoreA && scoreB) {
      diffs.push({ nodeId, status: 'added' })
    } else if (scoreA && !scoreB) {
      diffs.push({ nodeId, status: 'removed' })
    } else if (scoreA && scoreB) {
      const changes = getFieldChanges(
        scoreA as unknown as Record<string, unknown>,
        scoreB as unknown as Record<string, unknown>,
        ['severity', 'occurrence', 'detection']
      )
      diffs.push({
        nodeId,
        status: changes.length > 0 ? 'modified' : 'unchanged',
        changes: changes.length > 0 ? changes : undefined,
      })
    }
  }

  return diffs
}

/**
 * Compute action item diffs between two snapshots
 */
export function computeActionItemDiffs(
  actionsA: { id: string; node_id: string | null; investigation_item: string }[],
  actionsB: { id: string; node_id: string | null; investigation_item: string }[]
): ActionItemDiff[] {
  const diffs: ActionItemDiff[] = []
  const actionMapA = new Map(actionsA.map(a => [a.id, a]))
  const actionMapB = new Map(actionsB.map(a => [a.id, a]))
  const allActionIds = new Set([...actionMapA.keys(), ...actionMapB.keys()])

  for (const actionId of allActionIds) {
    const actionA = actionMapA.get(actionId)
    const actionB = actionMapB.get(actionId)

    if (!actionA && actionB) {
      diffs.push({ actionId, status: 'added', nodeId: actionB.node_id })
    } else if (actionA && !actionB) {
      diffs.push({ actionId, status: 'removed', nodeId: actionA.node_id })
    } else if (actionA && actionB) {
      const changes = getFieldChanges(
        actionA as unknown as Record<string, unknown>,
        actionB as unknown as Record<string, unknown>,
        ['investigation_item', 'person_responsible_id', 'schedule', 'investigation_result', 'judgment']
      )
      diffs.push({
        actionId,
        status: changes.length > 0 ? 'modified' : 'unchanged',
        nodeId: actionB.node_id,
        changes: changes.length > 0 ? changes : undefined,
      })
    }
  }

  return diffs
}

/**
 * Compute summary statistics for node diffs
 */
export function computeDiffSummary(
  nodeDiffs: NodeDiff[],
  edgeDiffs: EdgeDiff[],
  totalNodesA: number,
  totalNodesB: number
): DiffSummary {
  return {
    addedNodes: nodeDiffs.filter(d => d.status === 'added').length,
    removedNodes: nodeDiffs.filter(d => d.status === 'removed').length,
    modifiedNodes: nodeDiffs.filter(d => d.status === 'modified').length,
    unchangedNodes: nodeDiffs.filter(d => d.status === 'unchanged').length,
    addedEdges: edgeDiffs.filter(d => d.status === 'added').length,
    removedEdges: edgeDiffs.filter(d => d.status === 'removed').length,
    totalNodesA,
    totalNodesB,
  }
}

/**
 * Compute full diff between two version snapshots
 */
export function computeVersionDiff(
  snapshotA: VersionSnapshot,
  snapshotB: VersionSnapshot,
  versionAInfo: { id: string; versionNumber: number; name: string; createdAt: string },
  versionBInfo: { id: string; versionNumber: number; name: string; createdAt: string }
): VersionDiff {
  const nodeDiffs = computeNodeDiffs(snapshotA.nodes, snapshotB.nodes)
  const edgeDiffs = computeEdgeDiffs(snapshotA.edges, snapshotB.edges)
  const riskScoreDiffs = computeRiskScoreDiffs(snapshotA.riskScores, snapshotB.riskScores)
  const actionItemDiffs = computeActionItemDiffs(snapshotA.actionItems, snapshotB.actionItems)

  return {
    fromVersion: versionAInfo,
    toVersion: versionBInfo,
    nodes: nodeDiffs,
    edges: edgeDiffs,
    riskScores: riskScoreDiffs,
    actionItems: actionItemDiffs,
    summary: computeDiffSummary(
      nodeDiffs,
      edgeDiffs,
      snapshotA.nodes.length,
      snapshotB.nodes.length
    ),
    computedAt: new Date().toISOString(),
  }
}

/**
 * Get CSS class for diff status (for styling nodes in diff viewer)
 */
export function getDiffStatusClass(status: DiffStatus): string {
  switch (status) {
    case 'added':
      return 'ring-2 ring-success bg-success/10'
    case 'removed':
      return 'ring-2 ring-destructive bg-destructive/10 opacity-60'
    case 'modified':
      return 'ring-2 ring-warning bg-warning/10'
    default:
      return ''
  }
}

/**
 * Get color for diff status (for timeline/badges)
 */
export function getDiffStatusColor(status: DiffStatus): string {
  switch (status) {
    case 'added':
      return 'text-success'
    case 'removed':
      return 'text-destructive'
    case 'modified':
      return 'text-warning'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get icon name for diff status
 */
export function getDiffStatusIcon(status: DiffStatus): string {
  switch (status) {
    case 'added':
      return 'plus-circle'
    case 'removed':
      return 'minus-circle'
    case 'modified':
      return 'edit'
    default:
      return 'circle'
  }
}

/**
 * Format diff summary as human-readable string
 */
export function formatDiffSummary(summary: DiffSummary): string {
  const parts: string[] = []

  if (summary.addedNodes > 0) {
    parts.push(`+${summary.addedNodes} added`)
  }
  if (summary.removedNodes > 0) {
    parts.push(`-${summary.removedNodes} removed`)
  }
  if (summary.modifiedNodes > 0) {
    parts.push(`~${summary.modifiedNodes} modified`)
  }

  if (parts.length === 0) {
    return 'No changes'
  }

  return parts.join(', ')
}
