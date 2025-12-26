'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Industry = Database['public']['Tables']['industries']['Row']
type IssueCategory = Database['public']['Tables']['issue_categories']['Row']
type MetadataField = Database['public']['Tables']['metadata_fields']['Row']
type MetadataFieldInsert = Database['public']['Tables']['metadata_fields']['Insert']
type MetadataFieldUpdate = Database['public']['Tables']['metadata_fields']['Update']
type MetadataValue = Database['public']['Tables']['analysis_metadata_values']['Row']

// ============================================================
// INDUSTRIES
// ============================================================

export function useIndustries() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['industries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industries')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as Industry[]
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (rarely changes)
  })
}

// ============================================================
// ISSUE CATEGORIES
// ============================================================

export function useIssueCategories() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['issueCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issue_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as IssueCategory[]
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  })
}

// ============================================================
// CUSTOM METADATA FIELDS
// ============================================================

export function useMetadataFields(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['metadataFields', organizationId],
    queryFn: async () => {
      if (!organizationId) return []

      const { data, error } = await supabase
        .from('metadata_fields')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('scope', 'analysis')
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as MetadataField[]
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  })
}

// All fields including inactive (for admin)
export function useAllMetadataFields(organizationId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['allMetadataFields', organizationId],
    queryFn: async () => {
      if (!organizationId) return []

      const { data, error } = await supabase
        .from('metadata_fields')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as MetadataField[]
    },
    enabled: !!organizationId,
  })
}

export function useCreateMetadataField(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (field: Omit<MetadataFieldInsert, 'organization_id'>) => {
      const { data, error } = await supabase
        .from('metadata_fields')
        .insert({ ...field, organization_id: organizationId })
        .select()
        .single()

      if (error) throw error
      return data as MetadataField
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadataFields', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['allMetadataFields', organizationId] })
    },
  })
}

export function useUpdateMetadataField(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ fieldId, updates }: { fieldId: string; updates: MetadataFieldUpdate }) => {
      const { data, error } = await supabase
        .from('metadata_fields')
        .update(updates)
        .eq('id', fieldId)
        .select()
        .single()

      if (error) throw error
      return data as MetadataField
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadataFields', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['allMetadataFields', organizationId] })
    },
  })
}

export function useDeleteMetadataField(organizationId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase
        .from('metadata_fields')
        .delete()
        .eq('id', fieldId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadataFields', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['allMetadataFields', organizationId] })
    },
  })
}

// ============================================================
// CUSTOM METADATA VALUES
// ============================================================

export function useAnalysisMetadataValues(analysisId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['analysisMetadataValues', analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_metadata_values')
        .select(`
          *,
          field:metadata_fields(*)
        `)
        .eq('analysis_id', analysisId)

      if (error) throw error
      return data as (MetadataValue & { field: MetadataField })[]
    },
    enabled: !!analysisId,
  })
}

export function useUpsertMetadataValue(analysisId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      fieldId,
      value,
    }: {
      fieldId: string
      value: {
        value_text?: string | null
        value_number?: number | null
        value_date?: string | null
        value_boolean?: boolean | null
        value_json?: Record<string, unknown> | unknown[] | null
      }
    }) => {
      // Get organization_id from analysis
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .select('organization_id')
        .eq('id', analysisId)
        .single()

      if (analysisError) throw analysisError

      const { data, error } = await supabase
        .from('analysis_metadata_values')
        .upsert({
          analysis_id: analysisId,
          field_id: fieldId,
          organization_id: analysis.organization_id,
          ...value,
        }, {
          onConflict: 'analysis_id,field_id',
        })
        .select()
        .single()

      if (error) throw error
      return data as MetadataValue
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysisMetadataValues', analysisId] })
    },
  })
}

// ============================================================
// COMBINED HOOK FOR METADATA PANEL
// ============================================================

export interface CustomFieldWithValue {
  field: MetadataField
  value: MetadataValue | null
}

export function useAnalysisCustomFields(analysisId: string, organizationId: string | null) {
  const { data: fields, isLoading: fieldsLoading } = useMetadataFields(organizationId)
  const { data: values, isLoading: valuesLoading } = useAnalysisMetadataValues(analysisId)

  const customFieldsWithValues: CustomFieldWithValue[] = (fields || []).map(field => {
    const value = values?.find(v => v.field_id === field.id) || null
    return { field, value }
  })

  return {
    customFields: customFieldsWithValues,
    isLoading: fieldsLoading || valuesLoading,
  }
}

// ============================================================
// HELPER TO GET VALUE FROM CUSTOM FIELD
// ============================================================

export function getCustomFieldValue(
  value: MetadataValue | null,
  fieldType: string
): string | number | boolean | null {
  if (!value) return null

  switch (fieldType) {
    case 'text':
    case 'url':
    case 'email':
      return value.value_text
    case 'number':
      return value.value_number
    case 'date':
      return value.value_date
    case 'boolean':
      return value.value_boolean
    case 'select':
      return value.value_json ? (value.value_json as { value: string }).value || value.value_text : value.value_text
    case 'multi_select':
      return value.value_json ? JSON.stringify(value.value_json) : null
    default:
      return value.value_text
  }
}

export function formatCustomFieldValueForSave(
  fieldType: string,
  value: string | number | boolean | null
): {
  value_text?: string | null
  value_number?: number | null
  value_date?: string | null
  value_boolean?: boolean | null
  value_json?: Record<string, unknown> | unknown[] | null
} {
  const result: {
    value_text: string | null
    value_number: number | null
    value_date: string | null
    value_boolean: boolean | null
    value_json: Record<string, unknown> | unknown[] | null
  } = {
    value_text: null,
    value_number: null,
    value_date: null,
    value_boolean: null,
    value_json: null,
  }

  if (value === null || value === '') return result

  switch (fieldType) {
    case 'text':
    case 'url':
    case 'email':
      result.value_text = String(value)
      break
    case 'number':
      result.value_number = typeof value === 'number' ? value : parseFloat(String(value))
      break
    case 'date':
      result.value_date = String(value)
      break
    case 'boolean':
      result.value_boolean = Boolean(value)
      break
    case 'select':
      result.value_text = String(value)
      result.value_json = { value: String(value) }
      break
    case 'multi_select':
      if (typeof value === 'string') {
        try {
          result.value_json = JSON.parse(value)
        } catch {
          result.value_json = [value]
        }
      } else if (Array.isArray(value)) {
        result.value_json = value
      }
      break
  }

  return result
}
