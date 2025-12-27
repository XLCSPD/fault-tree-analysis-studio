'use client'

import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { VersionDiff, NodeDiff, DiffStatus, VersionSnapshot } from '@/lib/versions/types'
import { getDiffStatusClass, formatDiffSummary } from '@/lib/versions/diff'
import { PlusCircle, MinusCircle, Edit, Circle } from 'lucide-react'

interface VersionDiffViewerProps {
  diff: VersionDiff
  snapshotA: VersionSnapshot
  snapshotB: VersionSnapshot
  className?: string
}

// Custom node component for diff view
function DiffNode({ data }: { data: { label: string; status: DiffStatus; nodeType: string } }) {
  const statusClass = getDiffStatusClass(data.status)
  const StatusIcon = getStatusIcon(data.status)

  return (
    <div
      className={cn(
        'px-4 py-2 rounded-lg border bg-card shadow-sm min-w-[120px] max-w-[200px]',
        statusClass,
        data.status === 'removed' && 'line-through'
      )}
    >
      <div className="flex items-center gap-2">
        {data.status !== 'unchanged' && (
          <StatusIcon className={cn('h-4 w-4 flex-shrink-0', getStatusColor(data.status))} />
        )}
        <span className="text-sm font-medium truncate">{data.label}</span>
      </div>
      <span className="text-xs text-muted-foreground capitalize">{data.nodeType.replace('_', ' ')}</span>
    </div>
  )
}

function getStatusIcon(status: DiffStatus) {
  switch (status) {
    case 'added':
      return PlusCircle
    case 'removed':
      return MinusCircle
    case 'modified':
      return Edit
    default:
      return Circle
  }
}

function getStatusColor(status: DiffStatus): string {
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

const nodeTypes = {
  diffNode: DiffNode,
}

export function VersionDiffViewer({ diff, snapshotA, snapshotB, className }: VersionDiffViewerProps) {
  // Build node diff map for quick lookup
  const nodeDiffMap = useMemo(() => {
    const map = new Map<string, NodeDiff>()
    for (const nd of diff.nodes) {
      map.set(nd.nodeId, nd)
    }
    return map
  }, [diff.nodes])

  // Transform snapshot nodes to React Flow nodes with diff status
  const { nodesA, edgesA } = useMemo(() => {
    const nodes: Node[] = snapshotA.nodes.map((n, i) => {
      const nodeDiff = nodeDiffMap.get(n.id)
      return {
        id: n.id,
        type: 'diffNode',
        position: n.position ?? { x: i * 180, y: 0 },
        data: {
          label: n.label,
          status: nodeDiff?.status ?? 'unchanged',
          nodeType: n.type,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }
    })

    const edges: Edge[] = snapshotA.edges.map(e => ({
      id: e.id,
      source: e.source_id,
      target: e.target_id,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }))

    return { nodesA: nodes, edgesA: edges }
  }, [snapshotA, nodeDiffMap])

  const { nodesB, edgesB } = useMemo(() => {
    const nodes: Node[] = snapshotB.nodes.map((n, i) => {
      const nodeDiff = nodeDiffMap.get(n.id)
      return {
        id: n.id,
        type: 'diffNode',
        position: n.position ?? { x: i * 180, y: 0 },
        data: {
          label: n.label,
          status: nodeDiff?.status ?? 'unchanged',
          nodeType: n.type,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }
    })

    const edges: Edge[] = snapshotB.edges.map(e => ({
      id: e.id,
      source: e.source_id,
      target: e.target_id,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }))

    return { nodesB: nodes, edgesB: edges }
  }, [snapshotB, nodeDiffMap])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-success" />
                <span className="text-sm">{diff.summary.addedNodes} added</span>
              </div>
              <div className="flex items-center gap-2">
                <MinusCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm">{diff.summary.removedNodes} removed</span>
              </div>
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-warning" />
                <span className="text-sm">{diff.summary.modifiedNodes} modified</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {diff.summary.totalNodesA} nodes → {diff.summary.totalNodesB} nodes
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side-by-side View */}
      <div className="grid grid-cols-2 gap-4">
        {/* Version A */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                v{diff.fromVersion.versionNumber}: {diff.fromVersion.name}
              </CardTitle>
              <Badge variant="secondary">{snapshotA.nodes.length} nodes</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[400px] border-t">
              <ReactFlow
                nodes={nodesA}
                edges={edgesA}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={true}
                zoomOnScroll={true}
              >
                <Background />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>

        {/* Version B */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                v{diff.toVersion.versionNumber}: {diff.toVersion.name}
              </CardTitle>
              <Badge variant="secondary">{snapshotB.nodes.length} nodes</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[400px] border-t">
              <ReactFlow
                nodes={nodesB}
                edges={edgesB}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={true}
                zoomOnScroll={true}
              >
                <Background />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Log */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Change Log</CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-4">
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {diff.nodes
              .filter(n => n.status !== 'unchanged')
              .map(nodeDiff => (
                <div
                  key={nodeDiff.nodeId}
                  className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50"
                >
                  {getStatusIcon(nodeDiff.status)({
                    className: cn('h-4 w-4', getStatusColor(nodeDiff.status)),
                  })}
                  <span className={cn(nodeDiff.status === 'removed' && 'line-through')}>
                    {nodeDiff.label ?? nodeDiff.oldLabel ?? nodeDiff.newLabel}
                  </span>
                  {nodeDiff.status === 'modified' && nodeDiff.oldLabel && nodeDiff.newLabel && nodeDiff.oldLabel !== nodeDiff.newLabel && (
                    <span className="text-muted-foreground">
                      (was: &quot;{nodeDiff.oldLabel}&quot;)
                    </span>
                  )}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {nodeDiff.status}
                  </Badge>
                </div>
              ))}
            {diff.nodes.filter(n => n.status !== 'unchanged').length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No changes between these versions
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Compact summary component for inline use
export function DiffSummaryBadges({ summary }: { summary: VersionDiff['summary'] }) {
  return (
    <div className="flex items-center gap-2">
      {summary.addedNodes > 0 && (
        <Badge variant="outline" className="text-success border-success/30 bg-success/10">
          +{summary.addedNodes}
        </Badge>
      )}
      {summary.removedNodes > 0 && (
        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
          -{summary.removedNodes}
        </Badge>
      )}
      {summary.modifiedNodes > 0 && (
        <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
          ~{summary.modifiedNodes}
        </Badge>
      )}
      {summary.addedNodes === 0 && summary.removedNodes === 0 && summary.modifiedNodes === 0 && (
        <Badge variant="outline" className="text-muted-foreground">
          No changes
        </Badge>
      )}
    </div>
  )
}
