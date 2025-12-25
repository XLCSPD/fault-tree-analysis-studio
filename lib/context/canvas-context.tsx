'use client'

import { createContext, useContext, useCallback, ReactNode } from 'react'
import { useToggleCollapsed } from '@/lib/hooks/use-nodes'
import { useCanvasStore } from '@/lib/store/canvas-store'

interface CanvasContextValue {
  toggleNodeCollapsed: (nodeId: string) => void
}

const CanvasContext = createContext<CanvasContextValue | null>(null)

interface CanvasProviderProps {
  analysisId: string
  children: ReactNode
}

export function CanvasProvider({ analysisId, children }: CanvasProviderProps) {
  const toggleCollapsedMutation = useToggleCollapsed(analysisId)
  const storeToggleCollapsed = useCanvasStore((state) => state.toggleCollapsed)
  const nodes = useCanvasStore((state) => state.nodes)

  const toggleNodeCollapsed = useCallback((nodeId: string) => {
    // Find current collapsed state
    const node = nodes.find(n => n.id === nodeId)
    const newCollapsed = !node?.data?.collapsed

    // Update local state
    storeToggleCollapsed(nodeId)

    // Persist to database
    toggleCollapsedMutation.mutate({
      nodeId,
      collapsed: newCollapsed,
    })
  }, [nodes, storeToggleCollapsed, toggleCollapsedMutation])

  return (
    <CanvasContext.Provider value={{ toggleNodeCollapsed }}>
      {children}
    </CanvasContext.Provider>
  )
}

export function useCanvasContext() {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider')
  }
  return context
}
