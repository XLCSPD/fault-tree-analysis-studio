'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/hooks/use-toast'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface RealtimeSyncOptions {
  analysisId: string
  enabled?: boolean
  onNodeChange?: (payload: RealtimePostgresChangesPayload<any>) => void
  onEdgeChange?: (payload: RealtimePostgresChangesPayload<any>) => void
  onRiskScoreChange?: (payload: RealtimePostgresChangesPayload<any>) => void
}

export function useRealtimeSync({
  analysisId,
  enabled = true,
  onNodeChange,
  onEdgeChange,
  onRiskScoreChange,
}: RealtimeSyncOptions) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { toast } = useToast()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Handle node changes
  const handleNodeChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log('Realtime node change:', payload.eventType, payload)

    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
    queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })

    // Call custom handler if provided
    onNodeChange?.(payload)

    // Show toast for changes from other users
    if (payload.eventType === 'INSERT') {
      toast({
        title: 'Node added',
        description: 'A collaborator added a new node',
      })
    } else if (payload.eventType === 'DELETE') {
      toast({
        title: 'Node removed',
        description: 'A collaborator removed a node',
      })
    }
  }, [queryClient, analysisId, onNodeChange, toast])

  // Handle edge changes
  const handleEdgeChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log('Realtime edge change:', payload.eventType, payload)

    queryClient.invalidateQueries({ queryKey: ['edges', analysisId] })
    queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })

    onEdgeChange?.(payload)
  }, [queryClient, analysisId, onEdgeChange])

  // Handle risk score changes
  const handleRiskScoreChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log('Realtime risk score change:', payload.eventType, payload)

    queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
    queryClient.invalidateQueries({ queryKey: ['tableProjection', analysisId] })

    // Also invalidate specific risk score if we have the node_id
    if (payload.new && 'node_id' in payload.new) {
      queryClient.invalidateQueries({ queryKey: ['riskScore', payload.new.node_id] })
    }

    onRiskScoreChange?.(payload)
  }, [queryClient, analysisId, onRiskScoreChange])

  useEffect(() => {
    if (!enabled || !analysisId) return

    // Create a unique channel for this analysis
    const channel = supabase
      .channel(`analysis:${analysisId}`)
      // Subscribe to nodes table changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nodes',
          filter: `analysis_id=eq.${analysisId}`,
        },
        handleNodeChange
      )
      // Subscribe to node_edges table changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'node_edges',
          filter: `analysis_id=eq.${analysisId}`,
        },
        handleEdgeChange
      )
      // Subscribe to risk_scores table changes for nodes in this analysis
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'risk_scores',
        },
        (payload) => {
          // We need to check if this risk score belongs to a node in our analysis
          // For now, we'll invalidate and let React Query handle the filtering
          handleRiskScoreChange(payload)
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to realtime changes for analysis ${analysisId}`)
        }
      })

    channelRef.current = channel

    return () => {
      console.log(`Unsubscribing from realtime changes for analysis ${analysisId}`)
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [analysisId, enabled, supabase, handleNodeChange, handleEdgeChange, handleRiskScoreChange])

  return {
    isConnected: channelRef.current !== null,
  }
}
