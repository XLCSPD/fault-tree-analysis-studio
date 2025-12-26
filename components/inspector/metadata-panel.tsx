'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Save, Loader2, Check, HelpCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import { useAnalysis, useUpdateAnalysis } from '@/lib/hooks/use-analysis'
import { useUser } from '@/lib/hooks/use-user'
import {
  useIndustries,
  useIssueCategories,
  useAnalysisCustomFields,
  useUpsertMetadataValue,
  getCustomFieldValue,
  formatCustomFieldValueForSave,
  type CustomFieldWithValue,
} from '@/lib/hooks/use-metadata'
import type { Database } from '@/types/database'

type Analysis = Database['public']['Tables']['analyses']['Row']
type AnalysisUpdate = Database['public']['Tables']['analyses']['Update']
type IssueCategory = Database['public']['Tables']['issue_categories']['Row']

interface MetadataPanelProps {
  analysisId: string
  onClose: () => void
}

// Custom field renderer component
function CustomFieldInput({
  fieldWithValue,
  onChange,
}: {
  fieldWithValue: CustomFieldWithValue
  onChange: (value: string | number | boolean | null) => void
}) {
  const { field, value } = fieldWithValue
  const currentValue = getCustomFieldValue(value, field.field_type)
  const options = field.options as Array<{ label: string; value: string; color?: string }> | null

  switch (field.field_type) {
    case 'text':
    case 'url':
    case 'email':
      return (
        <Input
          type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
          value={currentValue as string || ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={field.placeholder || undefined}
          className="mt-1"
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          value={currentValue as number || ''}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
          placeholder={field.placeholder || undefined}
          className="mt-1"
        />
      )

    case 'date':
      return (
        <Input
          type="date"
          value={currentValue as string || ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="mt-1"
        />
      )

    case 'boolean':
      return (
        <div className="mt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(currentValue)}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">{field.placeholder || 'Yes'}</span>
          </label>
        </div>
      )

    case 'select':
      return (
        <select
          className="w-full mt-1 px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
          value={currentValue as string || ''}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">{field.placeholder || 'Select...'}</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )

    case 'multi_select':
      return (
        <Input
          value={
            Array.isArray(currentValue)
              ? (currentValue as string[]).join(', ')
              : currentValue as string || ''
          }
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={field.placeholder || 'Enter values separated by commas'}
          className="mt-1"
        />
      )

    default:
      return (
        <Input
          value={currentValue as string || ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="mt-1"
        />
      )
  }
}

// Legacy value warning component
function LegacyValueBanner({
  fieldLabel,
  legacyValue,
  onMapClick,
}: {
  fieldLabel: string
  legacyValue: string
  onMapClick: () => void
}) {
  return (
    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Legacy value: <span className="font-medium">{legacyValue}</span>
          </p>
          <button
            onClick={onMapClick}
            className="mt-1 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline flex items-center gap-1"
          >
            Map to dropdown <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function MetadataPanel({ analysisId, onClose }: MetadataPanelProps) {
  const { data: analysis, isLoading } = useAnalysis(analysisId)
  const updateAnalysis = useUpdateAnalysis(analysisId)
  const { organization } = useUser()

  // Reference data
  const { data: industries } = useIndustries()
  const { data: issueCategories } = useIssueCategories()

  // Custom fields
  const { customFields, isLoading: customFieldsLoading } = useAnalysisCustomFields(
    analysisId,
    organization?.id || null
  )
  const upsertMetadataValue = useUpsertMetadataValue(analysisId)

  // Local form state
  const [formData, setFormData] = useState<Partial<AnalysisUpdate>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Find "Other (Specify)" category ID
  const otherCategoryId = useMemo(() => {
    return issueCategories?.find(c => c.name === 'Other (Specify)')?.id || null
  }, [issueCategories])

  // Check if current selection is "Other (Specify)"
  const isOtherSelected = formData.issue_category_id === otherCategoryId

  // Initialize form when analysis loads
  useEffect(() => {
    if (analysis) {
      setFormData({
        title: analysis.title,
        status: analysis.status,
        analysis_date: analysis.analysis_date,
        problem_statement: analysis.problem_statement,
        abstract: analysis.abstract,
        related_document: analysis.related_document,
        // New industry-neutral fields (with backward compatibility)
        industry_id: analysis.industry_id,
        site_name: analysis.site_name,
        area_function: analysis.area_function,
        process_workflow: analysis.process_workflow || analysis.application,
        asset_system: analysis.asset_system || analysis.model,
        item_output: analysis.item_output || analysis.part_name,
        issue_category_id: analysis.issue_category_id,
        issue_subcategory: analysis.issue_subcategory,
      })
      setHasChanges(false)
    }
  }, [analysis])

  // Handle field change
  const handleChange = useCallback((field: keyof AnalysisUpdate, value: string | null) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      // Clear subcategory if issue category changes away from "Other"
      if (field === 'issue_category_id' && value !== otherCategoryId) {
        newData.issue_subcategory = null
      }
      return newData
    })
    setHasChanges(true)
    setSaveStatus('idle')
  }, [otherCategoryId])

  // Handle custom field change
  const handleCustomFieldChange = useCallback(
    async (fieldId: string, fieldType: string, value: string | number | boolean | null) => {
      const formattedValue = formatCustomFieldValueForSave(fieldType, value)
      await upsertMetadataValue.mutateAsync({ fieldId, value: formattedValue })
    },
    [upsertMetadataValue]
  )

  // Debounced autosave
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!hasChanges) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await updateAnalysis.mutateAsync(formData)
        setHasChanges(false)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (error) {
        console.error('Failed to save:', error)
        setSaveStatus('idle')
      }
    }, 1500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [formData, hasChanges, updateAnalysis])

  // Manual save
  const handleSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    setSaveStatus('saving')
    try {
      await updateAnalysis.mutateAsync(formData)
      setHasChanges(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save:', error)
      setSaveStatus('idle')
    }
  }, [formData, updateAnalysis])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Analysis Metadata</h2>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
          {hasChanges && saveStatus === 'idle' && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Basic Information
          </h3>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              className="mt-1 focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              placeholder="Analysis title"
            />
          </div>
        </div>

        {/* Context Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Context
          </h3>

          {/* Industry */}
          <div>
            <Label htmlFor="industry">Industry</Label>
            <select
              id="industry"
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              value={formData.industry_id || ''}
              onChange={(e) => handleChange('industry_id', e.target.value || null)}
            >
              <option value="">Select industry...</option>
              {industries?.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </div>

          {/* Site / Location */}
          <div>
            <Label htmlFor="siteName">Site / Location</Label>
            <Input
              id="siteName"
              value={formData.site_name || ''}
              onChange={(e) => handleChange('site_name', e.target.value || null)}
              className="mt-1 focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              placeholder="e.g., Main Plant, Building A, Chicago DC"
            />
          </div>

          {/* Area / Function */}
          <div>
            <Label htmlFor="areaFunction">Area / Function</Label>
            <Input
              id="areaFunction"
              value={formData.area_function || ''}
              onChange={(e) => handleChange('area_function', e.target.value || null)}
              className="mt-1 focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              placeholder="e.g., Receiving, Quality Control, Patient Care"
            />
          </div>

          {/* Process / Workflow */}
          <div>
            <Label htmlFor="processWorkflow">Process / Workflow</Label>
            <Input
              id="processWorkflow"
              value={formData.process_workflow || ''}
              onChange={(e) => handleChange('process_workflow', e.target.value || null)}
              className="mt-1 focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              placeholder="e.g., Inbound Receiving, Order Fulfillment, Patient Discharge"
            />
          </div>
        </div>

        {/* Scope Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Scope
          </h3>

          {/* Asset / System */}
          <div>
            <Label htmlFor="assetSystem">Asset / System</Label>
            <Input
              id="assetSystem"
              value={formData.asset_system || ''}
              onChange={(e) => handleChange('asset_system', e.target.value || null)}
              className="mt-1 focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              placeholder="e.g., Conveyor Line 3, Forklift Fleet, HVAC System"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The equipment, system, or process being analyzed
            </p>
          </div>

          {/* Item / Product / Output */}
          <div>
            <Label htmlFor="itemOutput">Item / Product / Output</Label>
            <Input
              id="itemOutput"
              value={formData.item_output || ''}
              onChange={(e) => handleChange('item_output', e.target.value || null)}
              className="mt-1 focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              placeholder="e.g., Outbound Shipment, Invoice, Patient Record"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The product, deliverable, or output affected
            </p>
          </div>
        </div>

        {/* Classification Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Classification
          </h3>

          {/* Issue Category */}
          <div>
            <Label htmlFor="issueCategory">Issue Category</Label>
            <select
              id="issueCategory"
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              value={formData.issue_category_id || ''}
              onChange={(e) => handleChange('issue_category_id', e.target.value || null)}
            >
              <option value="">Select category...</option>
              {issueCategories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Issue Subcategory (shown when "Other (Specify)" is selected) */}
          {isOtherSelected && (
            <div>
              <Label htmlFor="issueSubcategory">
                Issue Subcategory *
                <span className="text-red-500 ml-1">Required</span>
              </Label>
              <Input
                id="issueSubcategory"
                value={formData.issue_subcategory || ''}
                onChange={(e) => handleChange('issue_subcategory', e.target.value || null)}
                className="mt-1 focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
                placeholder="Describe the issue category..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Please specify the issue category since &quot;Other&quot; was selected
              </p>
            </div>
          )}

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              value={formData.status || 'draft'}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Analysis Date */}
          <div>
            <Label htmlFor="analysisDate">Analysis Date</Label>
            <Input
              id="analysisDate"
              type="date"
              value={formData.analysis_date || ''}
              onChange={(e) => handleChange('analysis_date', e.target.value || null)}
              className="mt-1 focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
            />
          </div>
        </div>

        {/* Description Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Description
          </h3>

          {/* Problem Statement */}
          <div>
            <Label htmlFor="problemStatement">Problem Statement</Label>
            <textarea
              id="problemStatement"
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background resize-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              rows={3}
              value={formData.problem_statement || ''}
              onChange={(e) => handleChange('problem_statement', e.target.value || null)}
              placeholder="Describe the problem being analyzed..."
            />
          </div>

          {/* Abstract */}
          <div>
            <Label htmlFor="abstract">Abstract / Summary</Label>
            <textarea
              id="abstract"
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background resize-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              rows={3}
              value={formData.abstract || ''}
              onChange={(e) => handleChange('abstract', e.target.value || null)}
              placeholder="Summary of the analysis and key findings..."
            />
          </div>

          {/* Related Document */}
          <div>
            <Label htmlFor="relatedDocument">Related Document</Label>
            <Input
              id="relatedDocument"
              value={formData.related_document || ''}
              onChange={(e) => handleChange('related_document', e.target.value || null)}
              className="mt-1 focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500"
              placeholder="e.g., DOC-2024-001, CAPA-123"
            />
          </div>
        </div>

        {/* Custom Fields Section */}
        {customFields.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Additional Fields
              </h3>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
            </div>

            {customFieldsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : (
              customFields.map((fieldWithValue) => (
                <div key={fieldWithValue.field.id}>
                  <Label htmlFor={fieldWithValue.field.key}>
                    {fieldWithValue.field.label}
                    {fieldWithValue.field.is_required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  <CustomFieldInput
                    fieldWithValue={fieldWithValue}
                    onChange={(value) =>
                      handleCustomFieldChange(
                        fieldWithValue.field.id,
                        fieldWithValue.field.field_type,
                        value
                      )
                    }
                  />
                  {fieldWithValue.field.help_text && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {fieldWithValue.field.help_text}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saveStatus === 'saving'}
          className="bg-lime-600 hover:bg-lime-700 text-white"
        >
          {saveStatus === 'saving' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
