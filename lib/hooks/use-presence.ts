'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/use-user'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Predefined colors for collaborators
const COLLABORATOR_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

export interface PresenceState {
  oderId: string
  userName: string
  avatarUrl?: string
  cursor?: { x: number; y: number }
  selectedNodeId?: string
  color: string
  lastSeen: number
}

interface UsePresenceOptions {
  analysisId: string
  enabled?: boolean
}

export function usePresence({ analysisId, enabled = true }: UsePresenceOptions) {
  const { user } = useUser()
  const supabase = createClient()
  const [collaborators, setCollaborators] = useState<PresenceState[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const colorRef = useRef<string>('')

  // Assign a consistent color based on user ID
  useEffect(() => {
    if (user?.id) {
      const colorIndex = user.id.charCodeAt(0) % COLLABORATOR_COLORS.length
      colorRef.current = COLLABORATOR_COLORS[colorIndex]
    }
  }, [user?.id])

  // Update cursor position (throttled)
  const updateCursor = useCallback((x: number, y: number) => {
    if (!channelRef.current || !user) return

    channelRef.current.track({
      oderId: user.id,
      userName: user.full_name || user.email || 'Anonymous',
      cursor: { x, y },
      color: colorRef.current,
      lastSeen: Date.now(),
    })
  }, [user])

  // Update selected node
  const updateSelectedNode = useCallback((nodeId: string | null) => {
    if (!channelRef.current || !user) return

    channelRef.current.track({
      oderId: user.id,
      userName: user.full_name || user.email || 'Anonymous',
      selectedNodeId: nodeId || undefined,
      color: colorRef.current,
      lastSeen: Date.now(),
    })
  }, [user])

  useEffect(() => {
    if (!enabled || !analysisId || !user) return

    const channel = supabase.channel(`presence:${analysisId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const presenceList: PresenceState[] = []

        Object.entries(state).forEach(([key, presences]) => {
          if (key !== user.id && presences.length > 0) {
            // Get the most recent presence for this user
            const latest = presences[presences.length - 1] as unknown as PresenceState
            if (latest.oderId) {
              presenceList.push(latest)
            }
          }
        })

        setCollaborators(presenceList)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          // Track initial presence
          await channel.track({
            oderId: user.id,
            userName: user.full_name || user.email || 'Anonymous',
            color: colorRef.current,
            lastSeen: Date.now(),
          })
        }
      })

    channelRef.current = channel

    return () => {
      setIsConnected(false)
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [analysisId, enabled, supabase, user])

  // Filter out stale presences (older than 30 seconds)
  const activeCollaborators = collaborators.filter(
    (c) => Date.now() - c.lastSeen < 30000
  )

  return {
    collaborators: activeCollaborators,
    isConnected,
    updateCursor,
    updateSelectedNode,
    myColor: colorRef.current,
  }
}
