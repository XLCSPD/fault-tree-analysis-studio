import { create } from 'zustand'
import { Node, Edge, Connection, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react'
import type { Json } from '@/types/database'

export interface FaultTreeNodeData extends Record<string, unknown> {
  label: string
  nodeType: 'top_event' | 'intermediate_event' | 'basic_event' | 'gate'
  units?: string | null
  specification?: string | null
  metric?: string | null
  notes?: string | null
  tags?: string[] | null
  evidenceStatus?: 'hypothesis' | 'verified' | null
  collapsed?: boolean
  severity?: number | null
  occurrence?: number | null
  detection?: number | null
  rpn?: number | null
  gateType?: 'AND' | 'OR' | null
  judgment?: number | null
  isMainCause?: boolean | null
  // Quality AI fields
  qualityFlags?: Json | null
  textAliases?: string[] | null
}

interface CanvasState {
  // Data
  nodes: Node<FaultTreeNodeData>[]
  edges: Edge[]
  selectedNodeId: string | null
  selectedNodeIds: Set<string>

  // Loading state
  isInitialized: boolean

  // Actions - local state updates
  setNodes: (nodes: Node<FaultTreeNodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  setSelectedNodeId: (id: string | null) => void

  // Multi-select actions
  toggleNodeSelection: (id: string, additive?: boolean) => void
  selectNodes: (ids: string[]) => void
  clearSelection: () => void
  isNodeSelected: (id: string) => boolean
  getSelectedNodes: () => Node<FaultTreeNodeData>[]

  // Actions - for optimistic updates
  addNode: (node: Node<FaultTreeNodeData>) => void
  updateNode: (id: string, data: Partial<FaultTreeNodeData>) => void
  updateNodePosition: (id: string, position: { x: number; y: number }) => void
  deleteNode: (id: string) => void
  deleteNodes: (ids: string[]) => void
  addEdge: (edge: Edge) => void
  deleteEdge: (id: string) => void
  toggleCollapsed: (id: string) => void

  // Computed getters
  getVisibleNodes: () => Node<FaultTreeNodeData>[]
  getVisibleEdges: () => Edge[]
  getChildrenCount: (nodeId: string) => number

  // Initialize from database
  initializeFromDb: (nodes: Node<FaultTreeNodeData>[], edges: Edge[]) => void
  reset: () => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedNodeIds: new Set<string>(),
  isInitialized: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as Node<FaultTreeNodeData>[]
    })
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges)
    })
  },

  onConnect: (connection) => {
    // This is handled by the mutation hook now
    // Just update local state for immediate feedback
    if (connection.source && connection.target) {
      const newEdge: Edge = {
        id: `temp-${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        type: 'smoothstep'
      }
      set({
        edges: [...get().edges, newEdge]
      })
    }
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  // Multi-select methods
  toggleNodeSelection: (id, additive = false) => {
    const { selectedNodeIds, selectedNodeId } = get()
    const newSelection = new Set(selectedNodeIds)

    if (additive) {
      // Shift+click: add/remove from selection
      if (newSelection.has(id)) {
        newSelection.delete(id)
      } else {
        newSelection.add(id)
      }
      set({
        selectedNodeIds: newSelection,
        selectedNodeId: newSelection.size === 1 ? Array.from(newSelection)[0] : (newSelection.size > 0 ? id : null),
      })
    } else {
      // Regular click: replace selection
      set({
        selectedNodeIds: new Set([id]),
        selectedNodeId: id,
      })
    }
  },

  selectNodes: (ids) => {
    set({
      selectedNodeIds: new Set(ids),
      selectedNodeId: ids.length === 1 ? ids[0] : (ids.length > 0 ? ids[0] : null),
    })
  },

  clearSelection: () => {
    set({
      selectedNodeIds: new Set(),
      selectedNodeId: null,
    })
  },

  isNodeSelected: (id) => {
    return get().selectedNodeIds.has(id)
  },

  getSelectedNodes: () => {
    const { nodes, selectedNodeIds } = get()
    return nodes.filter(n => selectedNodeIds.has(n.id))
  },

  addNode: (node) => {
    set({
      nodes: [...get().nodes, node]
    })
  },

  updateNode: (id, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    })
  },

  updateNodePosition: (id, position) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, position } : node
      )
    })
  },

  deleteNode: (id) => {
    const { selectedNodeIds } = get()
    const newSelectedNodeIds = new Set(selectedNodeIds)
    newSelectedNodeIds.delete(id)

    set({
      nodes: get().nodes.filter((node) => node.id !== id),
      edges: get().edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      ),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
      selectedNodeIds: newSelectedNodeIds,
    })
  },

  deleteNodes: (ids) => {
    const idsSet = new Set(ids)
    const { selectedNodeIds, selectedNodeId } = get()
    const newSelectedNodeIds = new Set(
      Array.from(selectedNodeIds).filter(id => !idsSet.has(id))
    )

    set({
      nodes: get().nodes.filter((node) => !idsSet.has(node.id)),
      edges: get().edges.filter(
        (edge) => !idsSet.has(edge.source) && !idsSet.has(edge.target)
      ),
      selectedNodeId: selectedNodeId && idsSet.has(selectedNodeId) ? null : selectedNodeId,
      selectedNodeIds: newSelectedNodeIds,
    })
  },

  addEdge: (edge) => {
    set({
      edges: [...get().edges, edge]
    })
  },

  deleteEdge: (id) => {
    set({
      edges: get().edges.filter((edge) => edge.id !== id)
    })
  },

  toggleCollapsed: (id) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, collapsed: !node.data.collapsed } }
          : node
      )
    })
  },

  // Helper to get all descendant node IDs
  getVisibleNodes: () => {
    const { nodes, edges } = get()

    // Find all collapsed node IDs
    const collapsedNodeIds = new Set(
      nodes.filter(n => n.data.collapsed).map(n => n.id)
    )

    if (collapsedNodeIds.size === 0) return nodes

    // Find all descendants of collapsed nodes (to hide them)
    const hiddenNodeIds = new Set<string>()

    const getDescendants = (nodeId: string): string[] => {
      const children = edges
        .filter(e => e.source === nodeId)
        .map(e => e.target)

      const descendants: string[] = [...children]
      for (const childId of children) {
        descendants.push(...getDescendants(childId))
      }
      return descendants
    }

    for (const collapsedId of collapsedNodeIds) {
      for (const descendantId of getDescendants(collapsedId)) {
        hiddenNodeIds.add(descendantId)
      }
    }

    return nodes.filter(n => !hiddenNodeIds.has(n.id))
  },

  getVisibleEdges: () => {
    const { edges } = get()
    const visibleNodeIds = new Set(get().getVisibleNodes().map(n => n.id))

    return edges.filter(e =>
      visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    )
  },

  getChildrenCount: (nodeId: string) => {
    const { edges } = get()

    // Count all descendants recursively
    const countDescendants = (id: string): number => {
      const children = edges.filter(e => e.source === id).map(e => e.target)
      let count = children.length
      for (const childId of children) {
        count += countDescendants(childId)
      }
      return count
    }

    return countDescendants(nodeId)
  },

  initializeFromDb: (nodes, edges) => {
    const { selectedNodeId, selectedNodeIds, isInitialized } = get()

    // Create a set of new node IDs for quick lookup
    const newNodeIds = new Set(nodes.map(n => n.id))

    // Preserve selection if selected nodes still exist in new data
    const preservedSelectedNodeId = selectedNodeId && newNodeIds.has(selectedNodeId)
      ? selectedNodeId
      : null

    const preservedSelectedNodeIds = new Set(
      Array.from(selectedNodeIds).filter(id => newNodeIds.has(id))
    )

    set({
      nodes,
      edges,
      isInitialized: true,
      // Only clear selection on initial load, otherwise preserve if nodes still exist
      selectedNodeId: isInitialized ? preservedSelectedNodeId : null,
      selectedNodeIds: isInitialized ? preservedSelectedNodeIds : new Set(),
    })
  },

  reset: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedNodeIds: new Set(),
      isInitialized: false,
    })
  }
}))
