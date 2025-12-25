'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import type { Node, Edge } from '@xyflow/react'

type DbNode = Database['public']['Tables']['nodes']['Row']
type DbNodeInsert = Database['public']['Tables']['nodes']['Insert']
type DbNodeUpdate = Database['public']['Tables']['nodes']['Update']
type DbEdge = Database['public']['Tables']['node_edges']['Row']
type DbEdgeInsert = Database['public']['Tables']['node_edges']['Insert']
type RiskScore = Database['public']['Tables']['risk_scores']['Row']

// Transform database node to ReactFlow node
export function dbNodeToReactFlow(node: DbNode, riskScore?: RiskScore | null): Node {
  const position = node.position as { x: number; y: number } | null
  return {
    id: node.id,
    type: 'faultTree',
    position: position || { x: 0, y: 0 },
    data: {
      label: node.label,
      nodeType: node.type,
      units: node.units,
      specification: node.specification,
      metric: node.metric,
      notes: node.notes,
      tags: node.tags,
      evidenceStatus: node.evidence_status,
      collapsed: node.collapsed,
      severity: riskScore?.severity,
      occurrence: riskScore?.occurrence,
      detection: riskScore?.detection,
      rpn: riskScore?.rpn,
    },
  }
}

// Transform database edge to ReactFlow edge
export function dbEdgeToReactFlow(edge: DbEdge): Edge {
  return {
    id: edge.id,
    source: edge.source_id,
    target: edge.target_id,
    type: 'smoothstep',
    data: {
      gateType: edge.gate_type,
      orderIndex: edge.order_index,
    },
  }
}

// Fetch all nodes for an analysis
export function useNodes(analysisId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['nodes', analysisId],
    queryFn: async () => {
      const { data: nodes, error: nodesError } = await supabase
        .from('nodes')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: true })
        .returns<DbNode[]>()

      if (nodesError) throw nodesError
      if (!nodes) return []

      // Fetch risk scores for all nodes
      const nodeIds = nodes.map(n => n.id)
      const { data: riskScores, error: riskError } = await supabase
        .from('risk_scores')
        .select('*')
        .in('node_id', nodeIds.length > 0 ? nodeIds : [''])
        .returns<RiskScore[]>()

      if (riskError) throw riskError

      // Map risk scores by node_id
      const riskScoreMap = new Map<string, RiskScore>()
      riskScores?.forEach(rs => riskScoreMap.set(rs.node_id, rs))

      // Transform to ReactFlow format
      return nodes.map(node => dbNodeToReactFlow(node, riskScoreMap.get(node.id)))
    },
    enabled: !!analysisId,
  })
}

// Fetch all edges for an analysis
export function useEdges(analysisId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['edges', analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('node_edges')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('order_index', { ascending: true })
        .returns<DbEdge[]>()

      if (error) throw error
      if (!data) return []
      return data.map(dbEdgeToReactFlow)
    },
    enabled: !!analysisId,
  })
}

// Create a new node
export function useCreateNode(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (node: Omit<DbNodeInsert, 'analysis_id'>) => {
      const insertData: DbNodeInsert = { ...node, analysis_id: analysisId }
      const { data, error } = await (supabase
        .from('nodes')
        .insert(insertData as any)
        .select()
        .single() as unknown as Promise<{ data: DbNode | null, error: any }>)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}

// Update a node
export function useUpdateNode(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ nodeId, updates }: { nodeId: string; updates: DbNodeUpdate }) => {
      const { data, error } = await ((supabase
        .from('nodes') as any)
        .update(updates)
        .eq('id', nodeId)
        .select()
        .single() as Promise<{ data: DbNode | null, error: any }>)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}

// Delete a node (cascades to edges)
export function useDeleteNode(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nodeId: string) => {
      const { error } = await supabase
        .from('nodes')
        .delete()
        .eq('id', nodeId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['edges', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}

// Delete multiple nodes (bulk delete)
export function useDeleteNodes(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nodeIds: string[]) => {
      if (nodeIds.length === 0) return

      const { error } = await supabase
        .from('nodes')
        .delete()
        .in('id', nodeIds)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['edges', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}

// Create an edge (parent-child relationship)
export function useCreateEdge(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (edge: Omit<DbEdgeInsert, 'analysis_id'>) => {
      const insertData: DbEdgeInsert = { ...edge, analysis_id: analysisId }
      const { data, error } = await (supabase
        .from('node_edges')
        .insert(insertData as any)
        .select()
        .single() as unknown as Promise<{ data: DbEdge | null, error: any }>)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edges', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}

// Delete an edge
export function useDeleteEdge(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (edgeId: string) => {
      const { error } = await supabase
        .from('node_edges')
        .delete()
        .eq('id', edgeId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edges', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })
    },
  })
}

// Update node position (for drag events)
export function useUpdateNodePosition(analysisId: string) {
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ nodeId, position }: { nodeId: string; position: { x: number; y: number } }) => {
      const { error } = await (supabase
        .from('nodes') as any)
        .update({ position })
        .eq('id', nodeId)

      if (error) throw error
    },
    // Don't invalidate on position update to avoid flicker
  })
}

// Batch update node positions
export function useBatchUpdatePositions(analysisId: string) {
  const supabase = createClient()

  return useMutation({
    mutationFn: async (updates: Array<{ nodeId: string; position: { x: number; y: number } }>) => {
      const promises = updates.map(({ nodeId, position }) => {
        return (supabase
          .from('nodes') as any)
          .update({ position })
          .eq('id', nodeId)
      })
      await Promise.all(promises)
    },
  })
}

// Toggle collapsed state for a node
export function useToggleCollapsed(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ nodeId, collapsed }: { nodeId: string; collapsed: boolean }) => {
      const { error } = await (supabase
        .from('nodes') as any)
        .update({ collapsed })
        .eq('id', nodeId)

      if (error) throw error
    },
    onSuccess: () => {
      // Don't invalidate to avoid flicker - local state handles UI
      // queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
    },
  })
}
