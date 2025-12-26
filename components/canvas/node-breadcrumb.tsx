'use client'

import { useNodePath } from '@/lib/hooks/use-node-path'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NodeBreadcrumbProps {
  nodeId: string | null
  onNodeClick?: (nodeId: string) => void
  className?: string
}

export function NodeBreadcrumb({ nodeId, onNodeClick, className }: NodeBreadcrumbProps) {
  const { data: path, isLoading } = useNodePath(nodeId)

  if (!nodeId || isLoading || !path || path.length === 0) {
    return null
  }

  return (
    <nav className={cn('flex items-center text-xs text-muted-foreground', className)}>
      <Home className="h-3 w-3 mr-1" />
      {path.map((node, index) => (
        <span key={node.id} className="flex items-center">
          {index > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
          <button
            onClick={() => onNodeClick?.(node.id)}
            className={cn(
              'hover:text-foreground hover:underline transition-colors max-w-[120px] truncate',
              index === path.length - 1 && 'text-foreground font-medium'
            )}
            title={node.label}
          >
            {node.label}
          </button>
        </span>
      ))}
    </nav>
  )
}
