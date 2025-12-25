'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Save, Loader2, Check } from 'lucide-react'
import { useAnalysis, useUpdateAnalysis } from '@/lib/hooks/use-analysis'
import type { Database } from '@/types/database'

type Analysis = Database['public']['Tables']['analyses']['Row']
type AnalysisUpdate = Database['public']['Tables']['analyses']['Update']

interface MetadataPanelProps {
  analysisId: string
  onClose: () => void
}

export function MetadataPanel({ analysisId, onClose }: MetadataPanelProps) {
  const { data: analysis, isLoading } = useAnalysis(analysisId)
  const updateAnalysis = useUpdateAnalysis(analysisId)

  // Local form state
  const [formData, setFormData] = useState<Partial<AnalysisUpdate>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Initialize form when analysis loads
  useEffect(() => {
    if (analysis) {
      setFormData({
        title: analysis.title,
        model: analysis.model,
        application: analysis.application,
        part_name: analysis.part_name,
        analysis_date: analysis.analysis_date,
        abstract: analysis.abstract,
        related_document: analysis.related_document,
        problem_statement: analysis.problem_statement,
        status: analysis.status,
      })
      setHasChanges(false)
    }
  }, [analysis])

  // Handle field change
  const handleChange = useCallback((field: keyof AnalysisUpdate, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
    setSaveStatus('idle')
  }, [])

  // Debounced autosave
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!hasChanges) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for autosave (1.5 seconds of inactivity)
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await updateAnalysis.mutateAsync(formData)
        setHasChanges(false)
        setSaveStatus('saved')
        // Clear saved status after 2 seconds
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
          {/* Save Status */}
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            className="mt-1"
            placeholder="Analysis title"
          />
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
            value={formData.status || 'draft'}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Model */}
        <div>
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={formData.model || ''}
            onChange={(e) => handleChange('model', e.target.value || null)}
            className="mt-1"
            placeholder="e.g., XYZ-1000"
          />
        </div>

        {/* Application */}
        <div>
          <Label htmlFor="application">Application</Label>
          <Input
            id="application"
            value={formData.application || ''}
            onChange={(e) => handleChange('application', e.target.value || null)}
            className="mt-1"
            placeholder="e.g., Manufacturing Line 3"
          />
        </div>

        {/* Part Name */}
        <div>
          <Label htmlFor="partName">Part Name</Label>
          <Input
            id="partName"
            value={formData.part_name || ''}
            onChange={(e) => handleChange('part_name', e.target.value || null)}
            className="mt-1"
            placeholder="e.g., Hydraulic Pump Assembly"
          />
        </div>

        {/* Analysis Date */}
        <div>
          <Label htmlFor="analysisDate">Analysis Date</Label>
          <Input
            id="analysisDate"
            type="date"
            value={formData.analysis_date || ''}
            onChange={(e) => handleChange('analysis_date', e.target.value || null)}
            className="mt-1"
          />
        </div>

        {/* Problem Statement */}
        <div>
          <Label htmlFor="problemStatement">Problem Statement</Label>
          <textarea
            id="problemStatement"
            className="w-full mt-1 px-3 py-2 border rounded-md bg-background resize-none"
            rows={3}
            value={formData.problem_statement || ''}
            onChange={(e) => handleChange('problem_statement', e.target.value || null)}
            placeholder="Describe the problem being analyzed..."
          />
        </div>

        {/* Abstract */}
        <div>
          <Label htmlFor="abstract">Abstract</Label>
          <textarea
            id="abstract"
            className="w-full mt-1 px-3 py-2 border rounded-md bg-background resize-none"
            rows={3}
            value={formData.abstract || ''}
            onChange={(e) => handleChange('abstract', e.target.value || null)}
            placeholder="Summary of the analysis..."
          />
        </div>

        {/* Related Document */}
        <div>
          <Label htmlFor="relatedDocument">Related Document</Label>
          <Input
            id="relatedDocument"
            value={formData.related_document || ''}
            onChange={(e) => handleChange('related_document', e.target.value || null)}
            className="mt-1"
            placeholder="e.g., DOC-2024-001"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || saveStatus === 'saving'}>
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
