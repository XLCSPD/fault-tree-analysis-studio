import React, { memo } from 'react'
import { Handle, Position, NodeProps, Node } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { Square, Triangle, Circle, Diamond, AlertTriangle, ChevronDown, ChevronRight, Star } from 'lucide-react'
import type { FaultTreeNodeData } from '@/lib/store/canvas-store'
import { useCanvasStore } from '@/lib/store/canvas-store'
import { useCanvasContext } from '@/lib/context/canvas-context'

type FaultTreeNodeType = Node<FaultTreeNodeData>

const nodeIcons = {
  top_event: Square,
  intermediate_event: Diamond,
  basic_event: Circle,
  gate: Triangle,
}

// RPN color using semantic tokens
const getRpnColor = (rpn: number | null | undefined) => {
  if (!rpn) return null
  if (rpn >= 200) return 'status-danger' // High risk - uses destructive
  if (rpn >= 100) return 'status-warning' // Medium risk - uses warning
  if (rpn >= 50) return 'bg-accent-soft text-accent-foreground border border-accent/30' // Low-medium
  return 'status-success' // Low risk - uses success
}

// Judgment border styles
const getJudgmentClass = (judgment: number | null | undefined) => {
  if (!judgment) return ''
  switch (judgment) {
    case 1: return 'judgment-1' // Confirmed - success
    case 2: return 'judgment-2' // Uncertain - warning
    case 3: return 'judgment-3' // Ruled out - muted
    case 4: return 'judgment-4' // Critical - danger
    default: return ''
  }
}

const FaultTreeNode = memo(({ data, selected, id }: NodeProps<FaultTreeNodeType>) => {
  const Icon = nodeIcons[data.nodeType] || Circle
  const rpnColorClass = getRpnColor(data.rpn)
  const judgmentClass = getJudgmentClass(data.judgment)
  const { toggleNodeCollapsed } = useCanvasContext()
  const childrenCount = useCanvasStore((state) => state.getChildrenCount(id))
  const hasChildren = childrenCount > 0

  const handleCollapseClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleNodeCollapsed(id)
  }

  return (
    <div
      className={cn(
        'fta-node px-4 py-3 min-w-[160px] max-w-[220px] text-center relative',
        judgmentClass,
        selected && 'selected',
        data.evidenceStatus === 'verified' && 'border-l-4 border-l-success',
        data.evidenceStatus === 'hypothesis' && 'border-l-4 border-l-warning border-dashed'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-border !border-2 !border-card"
      />

      <div className="flex items-center justify-center gap-2 mb-1">
        <Icon className={cn(
          'w-4 h-4',
          data.nodeType === 'top_event' && 'text-destructive',
          data.nodeType === 'intermediate_event' && 'text-primary',
          data.nodeType === 'basic_event' && 'text-success',
          data.nodeType === 'gate' && 'text-accent'
        )} />
        {data.gateType && (
          <span className="text-xs font-bold bg-accent-soft text-accent-foreground px-1.5 py-0.5 rounded border border-accent/30">
            {data.gateType}
          </span>
        )}
        {data.evidenceStatus === 'hypothesis' && (
          <AlertTriangle className="w-3 h-3 text-warning" />
        )}
        {data.isMainCause && (
          <span className="main-cause-badge text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
            <Star className="w-3 h-3" />
            Main
          </span>
        )}
      </div>

      <div className="text-sm font-medium leading-tight line-clamp-2 text-card-foreground">
        {data.label}
      </div>

      {(data.units || data.specification) && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {[data.units, data.specification].filter(Boolean).join(' | ')}
        </div>
      )}

      {data.rpn !== null && data.rpn !== undefined && (
        <div className={cn(
          'text-xs font-medium mt-2 py-1 px-2 rounded inline-block',
          rpnColorClass
        )}>
          RPN: {data.rpn}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-border !border-2 !border-card"
      />

      {/* Collapse/Expand button */}
      {hasChildren && (
        <button
          onClick={handleCollapseClick}
          className={cn(
            'absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 bg-card flex items-center justify-center hover:bg-muted transition-colors z-10',
            data.collapsed ? 'border-accent bg-accent-soft' : 'border-border'
          )}
          title={data.collapsed ? `Expand (${childrenCount} hidden)` : 'Collapse'}
        >
          {data.collapsed ? (
            <ChevronRight className="w-3 h-3 text-accent-foreground" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      )}

      {/* Collapsed indicator badge */}
      {data.collapsed && hasChildren && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs bg-accent-soft text-accent-foreground border border-accent px-1.5 py-0.5 rounded-full font-medium">
          +{childrenCount}
        </div>
      )}
    </div>
  )
})

FaultTreeNode.displayName = 'FaultTreeNode'

export default FaultTreeNode
