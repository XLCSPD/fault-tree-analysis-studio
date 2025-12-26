'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface NodePathItem {
  id: string
  label: string
  type: string
}

export function useNodePath(nodeId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['node-path', nodeId],
    queryFn: async () => {
      if (!nodeId) return []

      // Get the path (array of node IDs from root to this node)
      const { data, error: pathError } = await supabase
        .rpc('get_node_path', { node_id: nodeId } as any)

      if (pathError) throw pathError
      const pathIds = data as string[] | null
      if (!pathIds || pathIds.length === 0) return []

      // Fetch node details for each ID in the path
      const { data: nodes, error: nodesError } = await supabase
        .from('nodes')
        .select('id, label, type')
        .in('id', pathIds)

      if (nodesError) throw nodesError

      // Sort nodes according to path order
      const nodeMap = new Map((nodes || []).map((n: { id: string; label: string; type: string }) => [n.id, n]))
      const orderedPath: NodePathItem[] = pathIds
        .map((id: string) => nodeMap.get(id))
        .filter((n): n is NodePathItem => n !== undefined)

      return orderedPath
    },
    enabled: !!nodeId,
    staleTime: 30000, // Cache for 30 seconds
  })
}
