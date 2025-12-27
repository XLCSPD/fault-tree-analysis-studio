'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  VersionWithCreator,
  BranchWithCreator,
  AnalysisWithVersionInfo,
  CreateVersionParams,
  CreateBranchParams,
  VersionSnapshot,
  VersionDiff,
} from '@/lib/versions/types'
import { computeVersionDiff } from '@/lib/versions/diff'

// ============================================================================
// Version Hooks
// ============================================================================

/**
 * Fetch all versions for a specific analysis
 */
export function useAnalysisVersions(analysisId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['analysisVersions', analysisId],
    queryFn: async (): Promise<VersionWithCreator[]> => {
      if (!analysisId) return []

      const { data, error } = await supabase
        .from('analysis_versions')
        .select(`
          *,
          creator:profiles!analysis_versions_created_by_fkey(full_name, email, avatar_url)
        `)
        .eq('analysis_id', analysisId)
        .order('version_number', { ascending: false })

      if (error) throw error

      return (data ?? []).map((v: any) => ({
        ...v,
        creator: v.creator ? {
          full_name: v.creator.full_name,
          email: v.creator.email,
          avatar_url: v.creator.avatar_url,
        } : undefined,
      }))
    },
    enabled: !!analysisId,
  })
}

/**
 * Fetch a single version by ID
 */
export function useVersion(versionId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['version', versionId],
    queryFn: async (): Promise<VersionWithCreator | null> => {
      if (!versionId) return null

      const { data, error } = await supabase
        .from('analysis_versions')
        .select(`
          *,
          creator:profiles!analysis_versions_created_by_fkey(full_name, email, avatar_url)
        `)
        .eq('id', versionId)
        .single()

      if (error) throw error
      if (!data) return null

      const versionData = data as any
      return {
        ...versionData,
        creator: versionData.creator ? {
          full_name: versionData.creator.full_name,
          email: versionData.creator.email,
          avatar_url: versionData.creator.avatar_url,
        } : undefined,
      }
    },
    enabled: !!versionId,
  })
}

/**
 * Create a new version snapshot
 */
export function useCreateVersion(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateVersionParams): Promise<string> => {
      const { data, error } = await (supabase as any)
        .rpc('create_analysis_version', {
          p_analysis_id: analysisId,
          p_name: params.name,
          p_description: params.description ?? null,
          p_is_auto: params.isAuto ?? false,
          p_parent_version_id: params.parentVersionId ?? null,
        })

      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysisVersions', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['allAnalysesVersions'] })
    },
  })
}

/**
 * Restore analysis to a previous version
 */
export function useRestoreVersion(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (versionId: string): Promise<string> => {
      const { data, error } = await (supabase as any)
        .rpc('restore_analysis_version', {
          p_version_id: versionId,
        })

      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['analysisVersions', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['analysis', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['edges', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['riskScores', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['actionItems', analysisId] })
    },
  })
}

/**
 * Delete a version (admin only)
 */
export function useDeleteVersion() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ versionId, analysisId }: { versionId: string; analysisId: string }) => {
      const { error } = await supabase
        .from('analysis_versions')
        .delete()
        .eq('id', versionId)

      if (error) throw error
      return { versionId, analysisId }
    },
    onSuccess: (_, { analysisId }) => {
      queryClient.invalidateQueries({ queryKey: ['analysisVersions', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['allAnalysesVersions'] })
    },
  })
}

/**
 * Lock/unlock a version
 */
export function useToggleVersionLock() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ versionId, isLocked, analysisId }: { versionId: string; isLocked: boolean; analysisId: string }) => {
      const { error } = await (supabase as any)
        .from('analysis_versions')
        .update({ is_locked: isLocked })
        .eq('id', versionId)

      if (error) throw error
      return { versionId, analysisId }
    },
    onSuccess: (_, { analysisId }) => {
      queryClient.invalidateQueries({ queryKey: ['analysisVersions', analysisId] })
    },
  })
}

// ============================================================================
// Branch Hooks
// ============================================================================

/**
 * Fetch all branches for an analysis
 */
export function useBranches(analysisId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['branches', analysisId],
    queryFn: async (): Promise<BranchWithCreator[]> => {
      if (!analysisId) return []

      const { data, error } = await supabase
        .from('analysis_branches')
        .select(`
          *,
          creator:profiles!analysis_branches_created_by_fkey(full_name, email, avatar_url),
          merger:profiles!analysis_branches_merged_by_fkey(full_name, email)
        `)
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map((b: any) => ({
        ...b,
        creator: b.creator ? {
          full_name: b.creator.full_name,
          email: b.creator.email,
          avatar_url: b.creator.avatar_url,
        } : undefined,
        merger: b.merger ? {
          full_name: b.merger.full_name,
          email: b.merger.email,
        } : null,
      }))
    },
    enabled: !!analysisId,
  })
}

/**
 * Create a new branch
 */
export function useCreateBranch(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateBranchParams): Promise<string> => {
      const { data, error } = await (supabase as any)
        .rpc('create_analysis_branch', {
          p_analysis_id: analysisId,
          p_name: params.name,
          p_description: params.description ?? null,
          p_source_version_id: params.sourceVersionId ?? null,
        })

      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['analysisVersions', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['allAnalysesVersions'] })
    },
  })
}

/**
 * Merge a branch back to main
 */
export function useMergeBranch(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (branchId: string): Promise<string> => {
      const { data, error } = await (supabase as any)
        .rpc('merge_analysis_branch', {
          p_branch_id: branchId,
        })

      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['analysisVersions', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['analysis', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['nodes', analysisId] })
      queryClient.invalidateQueries({ queryKey: ['edges', analysisId] })
    },
  })
}

/**
 * Abandon a branch
 */
export function useAbandonBranch(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (branchId: string) => {
      const { error } = await (supabase as any)
        .from('analysis_branches')
        .update({ status: 'abandoned' })
        .eq('id', branchId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', analysisId] })
    },
  })
}

/**
 * Delete a branch (admin only)
 */
export function useDeleteBranch() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ branchId, analysisId }: { branchId: string; analysisId: string }) => {
      const { error } = await supabase
        .from('analysis_branches')
        .delete()
        .eq('id', branchId)

      if (error) throw error
      return { branchId, analysisId }
    },
    onSuccess: (_, { analysisId }) => {
      queryClient.invalidateQueries({ queryKey: ['branches', analysisId] })
    },
  })
}

// ============================================================================
// Diff Hooks
// ============================================================================

/**
 * Compute diff between two versions
 */
export function useVersionDiff(versionAId: string | null, versionBId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['versionDiff', versionAId, versionBId],
    queryFn: async (): Promise<VersionDiff | null> => {
      if (!versionAId || !versionBId) return null

      // Fetch both versions with snapshots
      const [resultA, resultB] = await Promise.all([
        (supabase as any)
          .from('analysis_versions')
          .select('id, version_number, name, created_at, snapshot')
          .eq('id', versionAId)
          .single(),
        (supabase as any)
          .from('analysis_versions')
          .select('id, version_number, name, created_at, snapshot')
          .eq('id', versionBId)
          .single(),
      ])

      if (resultA.error) throw resultA.error
      if (resultB.error) throw resultB.error

      const versionA = resultA.data
      const versionB = resultB.data

      if (!versionA || !versionB) return null

      return computeVersionDiff(
        versionA.snapshot as VersionSnapshot,
        versionB.snapshot as VersionSnapshot,
        {
          id: versionA.id,
          versionNumber: versionA.version_number,
          name: versionA.name,
          createdAt: versionA.created_at,
        },
        {
          id: versionB.id,
          versionNumber: versionB.version_number,
          name: versionB.name,
          createdAt: versionB.created_at,
        }
      )
    },
    enabled: !!versionAId && !!versionBId,
  })
}

/**
 * Get quick diff summary (uses database function for efficiency)
 */
export function useVersionDiffSummary(versionAId: string | null, versionBId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['versionDiffSummary', versionAId, versionBId],
    queryFn: async () => {
      if (!versionAId || !versionBId) return null

      const { data, error } = await (supabase as any)
        .rpc('get_version_diff_summary', {
          p_version_a_id: versionAId,
          p_version_b_id: versionBId,
        })

      if (error) throw error
      return data as { added: number; removed: number; modified: number; totalA: number; totalB: number }
    },
    enabled: !!versionAId && !!versionBId,
  })
}

// ============================================================================
// Admin Hooks
// ============================================================================

/**
 * Fetch all analyses with version counts (for admin page)
 */
export function useAllAnalysesVersions(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['allAnalysesVersions', organizationId],
    queryFn: async (): Promise<AnalysisWithVersionInfo[]> => {
      if (!organizationId) return []

      // Fetch analyses
      const { data: analyses, error: analysesError } = await (supabase as any)
        .from('analyses')
        .select('id, title, status, created_at, updated_at')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })

      if (analysesError) throw analysesError

      if (!analyses || analyses.length === 0) return []

      // Fetch version counts
      const { data: versions, error: versionsError } = await (supabase as any)
        .from('analysis_versions')
        .select('analysis_id, id, version_number, name, created_at, is_auto')
        .eq('organization_id', organizationId)
        .order('version_number', { ascending: false })

      if (versionsError) throw versionsError

      // Fetch branch counts
      const { data: branches, error: branchesError } = await (supabase as any)
        .from('analysis_branches')
        .select('analysis_id')
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      if (branchesError) throw branchesError

      // Build version counts map
      const versionCounts = new Map<string, number>()
      const latestVersions = new Map<string, {
        id: string
        version_number: number
        name: string
        created_at: string
        is_auto: boolean
      }>()

      for (const v of versions ?? []) {
        const count = versionCounts.get(v.analysis_id) ?? 0
        versionCounts.set(v.analysis_id, count + 1)

        if (!latestVersions.has(v.analysis_id)) {
          latestVersions.set(v.analysis_id, {
            id: v.id,
            version_number: v.version_number,
            name: v.name,
            created_at: v.created_at,
            is_auto: v.is_auto,
          })
        }
      }

      // Build branch counts map
      const branchCounts = new Map<string, number>()
      for (const b of branches ?? []) {
        const count = branchCounts.get(b.analysis_id) ?? 0
        branchCounts.set(b.analysis_id, count + 1)
      }

      return analyses.map((a: any) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        created_at: a.created_at,
        updated_at: a.updated_at,
        version_count: versionCounts.get(a.id) ?? 0,
        branch_count: branchCounts.get(a.id) ?? 0,
        latest_version: latestVersions.get(a.id),
      }))
    },
    enabled: !!organizationId,
  })
}

/**
 * Get all active branches across all analyses (for admin branch overview)
 */
export function useAllBranches(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['allBranches', organizationId],
    queryFn: async () => {
      if (!organizationId) return []

      const { data, error } = await (supabase as any)
        .from('analysis_branches')
        .select(`
          *,
          analysis:analyses(id, title),
          creator:profiles!analysis_branches_created_by_fkey(full_name, email)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      return data ?? []
    },
    enabled: !!organizationId,
  })
}
