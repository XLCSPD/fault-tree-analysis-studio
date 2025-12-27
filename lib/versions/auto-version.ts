'use client'

import { createClient } from '@/lib/supabase/client'

export type AutoVersionTrigger =
  | 'bulk_delete'
  | 'restore'
  | 'merge'
  | 'import'
  | 'clear_all'
  | 'before_destructive'

/**
 * Creates an auto-save version before a destructive operation.
 * This is called automatically by the system, not by users.
 *
 * @param analysisId - The analysis to create a version for
 * @param trigger - The operation that triggered the auto-save
 * @param description - Optional additional context
 * @returns The created version ID, or null if creation failed
 */
export async function createAutoVersion(
  analysisId: string,
  trigger: AutoVersionTrigger,
  description?: string
): Promise<string | null> {
  const supabase = createClient()

  // Check if versioning is enabled for this analysis's organization
  // For now, always create auto-versions (can add org settings later)

  const triggerNames: Record<AutoVersionTrigger, string> = {
    bulk_delete: 'bulk delete',
    restore: 'version restore',
    merge: 'branch merge',
    import: 'data import',
    clear_all: 'clear all nodes',
    before_destructive: 'destructive operation',
  }

  const versionName = `Auto-save before ${triggerNames[trigger]}`
  const fullDescription = description
    ? `Automatic backup created before ${triggerNames[trigger]}: ${description}`
    : `Automatic backup created before ${triggerNames[trigger]}`

  try {
    const { data, error } = await (supabase as any)
      .rpc('create_analysis_version', {
        p_analysis_id: analysisId,
        p_name: versionName,
        p_description: fullDescription,
        p_is_auto: true,
        p_parent_version_id: null,
      })

    if (error) {
      console.warn('Failed to create auto-version:', error.message)
      return null
    }

    return data as string
  } catch (err) {
    console.warn('Auto-version creation error:', err)
    return null
  }
}

/**
 * Hook-friendly version of createAutoVersion that can be used in mutations
 * Returns a function that creates an auto-version and returns true if successful
 */
export function useAutoVersioning(analysisId: string) {
  const createVersion = async (
    trigger: AutoVersionTrigger,
    description?: string
  ): Promise<boolean> => {
    const versionId = await createAutoVersion(analysisId, trigger, description)
    return versionId !== null
  }

  return { createAutoVersion: createVersion }
}

/**
 * Configuration for auto-versioning behavior
 */
export interface AutoVersionConfig {
  enabled: boolean
  triggers: {
    bulkDelete: boolean
    restore: boolean
    merge: boolean
    import: boolean
    clearAll: boolean
  }
  minNodeThreshold: number // Only auto-version if deleting this many nodes or more
}

export const defaultAutoVersionConfig: AutoVersionConfig = {
  enabled: true,
  triggers: {
    bulkDelete: true,
    restore: true, // Already handled in DB function
    merge: true,   // Already handled in DB function
    import: false, // New imports don't need backup
    clearAll: true,
  },
  minNodeThreshold: 3, // Auto-save if deleting 3+ nodes
}
