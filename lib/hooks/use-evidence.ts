'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type EvidenceAttachment = Database['public']['Tables']['evidence_attachments']['Row']
type EvidenceInsert = Database['public']['Tables']['evidence_attachments']['Insert']
type EvidenceUpdate = Database['public']['Tables']['evidence_attachments']['Update']
type EvidenceType = Database['public']['Enums']['evidence_type']

// Fetch evidence attachments for a node
export function useNodeEvidence(nodeId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['evidence', 'node', nodeId],
    queryFn: async () => {
      if (!nodeId) return []

      const { data, error } = await supabase
        .from('evidence_attachments')
        .select('*')
        .eq('node_id', nodeId)
        .order('created_at', { ascending: false })
        .returns<EvidenceAttachment[]>()

      if (error) throw error
      return data ?? []
    },
    enabled: !!nodeId,
  })
}

// Fetch evidence attachments for an action item
export function useActionItemEvidence(actionItemId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['evidence', 'actionItem', actionItemId],
    queryFn: async () => {
      if (!actionItemId) return []

      const { data, error } = await supabase
        .from('evidence_attachments')
        .select('*')
        .eq('action_item_id', actionItemId)
        .order('created_at', { ascending: false })
        .returns<EvidenceAttachment[]>()

      if (error) throw error
      return data ?? []
    },
    enabled: !!actionItemId,
  })
}

// Create evidence attachment
export function useCreateEvidence() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (evidence: EvidenceInsert) => {
      const { data, error } = await (supabase
        .from('evidence_attachments')
        .insert(evidence as any)
        .select()
        .single() as unknown as Promise<{ data: EvidenceAttachment | null; error: any }>)

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      if (variables.node_id) {
        queryClient.invalidateQueries({ queryKey: ['evidence', 'node', variables.node_id] })
      }
      if (variables.action_item_id) {
        queryClient.invalidateQueries({ queryKey: ['evidence', 'actionItem', variables.action_item_id] })
      }
    },
  })
}

// Update evidence attachment
export function useUpdateEvidence() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EvidenceUpdate }) => {
      const { data, error } = await ((supabase
        .from('evidence_attachments') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single() as Promise<{ data: EvidenceAttachment | null; error: any }>)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] })
    },
  })
}

// Delete evidence attachment
export function useDeleteEvidence() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath?: string | null }) => {
      // Delete file from storage if it exists
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('evidence')
          .remove([filePath])

        if (storageError) {
          console.error('Failed to delete file from storage:', storageError)
        }
      }

      // Delete database record
      const { error } = await supabase
        .from('evidence_attachments')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] })
    },
  })
}

// Upload file to Supabase Storage
export function useUploadEvidenceFile() {
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ file, nodeId, userId }: { file: File; nodeId: string; userId: string }) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${nodeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('evidence')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('evidence')
        .getPublicUrl(data.path)

      return {
        filePath: data.path,
        publicUrl: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }
    },
  })
}

// Get signed URL for private file access
export function useGetSignedUrl() {
  const supabase = createClient()

  return useMutation({
    mutationFn: async (filePath: string) => {
      const { data, error } = await supabase.storage
        .from('evidence')
        .createSignedUrl(filePath, 3600) // 1 hour expiry

      if (error) throw error
      return data.signedUrl
    },
  })
}

// Evidence type helpers
export const evidenceTypeLabels: Record<EvidenceType, string> = {
  photo: 'Photo',
  file: 'File',
  link: 'Link',
  note: 'Note',
  measurement: 'Measurement',
}

export const evidenceTypeIcons: Record<EvidenceType, string> = {
  photo: 'Image',
  file: 'File',
  link: 'Link',
  note: 'FileText',
  measurement: 'Ruler',
}
