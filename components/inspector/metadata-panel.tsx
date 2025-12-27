'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  X,
  Save,
  Loader2,
  Check,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Pencil,
  Eye,
  Factory,
  MapPin,
  Layers,
  Workflow,
  Box,
  Tag,
  FileText,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { useAnalysis, useUpdateAnalysis } from '@/lib/hooks/use-analysis'
import { MetadataAIAssist } from './metadata-ai-assist'
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
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Analysis = Database['public']['Tables']['analyses']['Row']
type AnalysisUpdate = Database['public']['Tables']['analyses']['Update']
type IssueCategory = Database['public']['Tables']['issue_categories']['Row']

interface MetadataPanelProps {
  analysisId: string
  onClose: () => void
}

// View mode field component
function ViewField({
  icon,
  label,
  value,
  emptyText = 'Not set',
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
  emptyText?: string
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        {value ? (
          <div className="text-sm mt-0.5 whitespace-pre-wrap">{value}</div>
        ) : (
          <div className="text-sm text-muted-foreground/50 italic mt-0.5">{emptyText}</div>
        )}
      </div>
    </div>
  )
}

// Completion indicator component
function CompletionIndicator({
  filled,
  total,
}: {
  filled: number
  total: number
}) {
  const percent = Math.round((filled / total) * 100)

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500',
            percent === 100
              ? 'bg-green-500'
              : percent >= 50
              ? 'bg-amber-500'
              : 'bg-red-500'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {filled}/{total} fields
      </span>
    </div>
  )
}

// Custom field renderer component (for edit mode)
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

  // Mode: 'view' or 'edit'
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  // Local form state (only used in edit mode)
  const [formData, setFormData] = useState<Partial<AnalysisUpdate>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Find "Other (Specify)" category ID
  const otherCategoryId = useMemo(() => {
    return issueCategories?.find(c => c.name === 'Other (Specify)')?.id || null
  }, [issueCategories])

  // Check if current selection is "Other (Specify)"
  const isOtherSelected = formData.issue_category_id === otherCategoryId

  // Get industry and category names for display
  const industryName = useMemo(() => {
    if (!analysis?.industry_id || !industries) return null
    return industries.find(i => i.id === analysis.industry_id)?.name || null
  }, [analysis?.industry_id, industries])

  const categoryName = useMemo(() => {
    if (!analysis?.issue_category_id || !issueCategories) return null
    return issueCategories.find(c => c.id === analysis.issue_category_id)?.name || null
  }, [analysis?.issue_category_id, issueCategories])

  // Calculate completion
  const completionStats = useMemo(() => {
    if (!analysis) return { filled: 0, total: 9 }
    const fields = [
      analysis.problem_statement,
      analysis.abstract,
      analysis.industry_id,
      analysis.site_name,
      analysis.area_function,
      analysis.process_workflow || analysis.application,
      analysis.asset_system || analysis.model,
      analysis.item_output || analysis.part_name,
      analysis.issue_category_id,
    ]
    return {
      filled: fields.filter(Boolean).length,
      total: fields.length,
    }
  }, [analysis])

  // Initialize form data when switching to edit mode
  const initializeForm = useCallback(() => {
    if (analysis) {
      setFormData({
        title: analysis.title,
        status: analysis.status,
        analysis_date: analysis.analysis_date,
        problem_statement: analysis.problem_statement,
        abstract: analysis.abstract,
        related_document: analysis.related_document,
        industry_id: analysis.industry_id ?? null,
        site_name: analysis.site_name ?? null,
        area_function: analysis.area_function ?? null,
        process_workflow: analysis.process_workflow ?? analysis.application ?? null,
        asset_system: analysis.asset_system ?? analysis.model ?? null,
        item_output: analysis.item_output ?? analysis.part_name ?? null,
        issue_category_id: analysis.issue_category_id ?? null,
        issue_subcategory: analysis.issue_subcategory ?? null,
      })
      setHasChanges(false)
      setSaveStatus('idle')
    }
  }, [analysis])

  // Initialize form when entering edit mode
  useEffect(() => {
    if (mode === 'edit') {
      initializeForm()
    }
  }, [mode, initializeForm])

  // Handle field change
  const handleChange = useCallback((field: keyof AnalysisUpdate, value: string | null) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
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

  // Manual save
  const handleSave = useCallback(async () => {
    setSaveStatus('saving')
    try {
      await updateAnalysis.mutateAsync(formData)
      setHasChanges(false)
      setSaveStatus('saved')
      setTimeout(() => {
        setSaveStatus('idle')
        setMode('view') // Switch back to view mode after save
      }, 1000)
    } catch (error) {
      console.error('Failed to save:', error)
      setSaveStatus('idle')
    }
  }, [formData, updateAnalysis])

  // Cancel edit
  const handleCancel = useCallback(() => {
    setMode('view')
    setHasChanges(false)
    setSaveStatus('idle')
  }, [])

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
          {mode === 'edit' && (
            <>
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
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Completion indicator */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <CompletionIndicator filled={completionStats.filled} total={completionStats.total} />
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Button
          variant={mode === 'view' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('view')}
          className={mode === 'view' ? 'bg-lime-600 hover:bg-lime-700' : ''}
        >
          <Eye className="w-4 h-4 mr-2" />
          View
        </Button>
        <Button
          variant={mode === 'edit' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('edit')}
          className={mode === 'edit' ? 'bg-lime-600 hover:bg-lime-700' : ''}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'view' ? (
          /* VIEW MODE */
          <div className="p-4 space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Basic Information
              </h3>
              <div className="space-y-1 bg-muted/30 rounded-lg p-3">
                <ViewField
                  icon={<FileText className="w-4 h-4" />}
                  label="Title"
                  value={analysis?.title}
                />
                <ViewField
                  icon={<Tag className="w-4 h-4" />}
                  label="Status"
                  value={analysis?.status ? analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1) : null}
                />
                <ViewField
                  icon={<Calendar className="w-4 h-4" />}
                  label="Analysis Date"
                  value={analysis?.analysis_date}
                />
              </div>
            </div>

            {/* Context */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Context
              </h3>
              <div className="space-y-1 bg-muted/30 rounded-lg p-3">
                <ViewField
                  icon={<Factory className="w-4 h-4" />}
                  label="Industry"
                  value={industryName}
                />
                <ViewField
                  icon={<MapPin className="w-4 h-4" />}
                  label="Site / Location"
                  value={analysis?.site_name}
                />
                <ViewField
                  icon={<Layers className="w-4 h-4" />}
                  label="Area / Function"
                  value={analysis?.area_function}
                />
                <ViewField
                  icon={<Workflow className="w-4 h-4" />}
                  label="Process / Workflow"
                  value={analysis?.process_workflow || analysis?.application}
                />
              </div>
            </div>

            {/* Scope */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Scope
              </h3>
              <div className="space-y-1 bg-muted/30 rounded-lg p-3">
                <ViewField
                  icon={<Box className="w-4 h-4" />}
                  label="Asset / System"
                  value={analysis?.asset_system || analysis?.model}
                />
                <ViewField
                  icon={<Tag className="w-4 h-4" />}
                  label="Item / Product / Output"
                  value={analysis?.item_output || analysis?.part_name}
                />
              </div>
            </div>

            {/* Classification */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Classification
              </h3>
              <div className="space-y-1 bg-muted/30 rounded-lg p-3">
                <ViewField
                  icon={<Tag className="w-4 h-4" />}
                  label="Issue Category"
                  value={categoryName}
                />
                {analysis?.issue_subcategory && (
                  <ViewField
                    icon={<Tag className="w-4 h-4" />}
                    label="Issue Subcategory"
                    value={analysis.issue_subcategory}
                  />
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Description
              </h3>
              <div className="space-y-1 bg-muted/30 rounded-lg p-3">
                <ViewField
                  icon={<FileText className="w-4 h-4" />}
                  label="Problem Statement"
                  value={analysis?.problem_statement}
                  emptyText="No problem statement defined"
                />
                <ViewField
                  icon={<FileText className="w-4 h-4" />}
                  label="Abstract / Summary"
                  value={analysis?.abstract}
                  emptyText="No summary defined"
                />
                <ViewField
                  icon={<FileText className="w-4 h-4" />}
                  label="Related Document"
                  value={analysis?.related_document}
                />
              </div>
            </div>

            {/* Edit button at bottom of view mode */}
            <div className="pt-4">
              <Button
                onClick={() => setMode('edit')}
                className="w-full bg-lime-600 hover:bg-lime-700 text-white"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Metadata
              </Button>
            </div>
          </div>
        ) : (
          /* EDIT MODE */
          <div className="p-4 space-y-6">
            {/* AI Assist Section */}
            <div className="space-y-4 border-b pb-6">
              <MetadataAIAssist
                analysisId={analysisId}
                currentProblemStatement={formData.problem_statement || null}
                currentAbstractSummary={formData.abstract || null}
                onApply={(field, value) => {
                  if (field === 'problem_statement') {
                    handleChange('problem_statement', value)
                  } else if (field === 'abstract_summary') {
                    handleChange('abstract', value)
                  }
                }}
              />
            </div>

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
                </div>
              )}
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
                  rows={4}
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
                  rows={4}
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
        )}
      </div>

      {/* Footer (only in edit mode) */}
      {mode === 'edit' && (
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
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
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
