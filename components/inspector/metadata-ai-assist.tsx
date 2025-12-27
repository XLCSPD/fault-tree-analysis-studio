'use client'

import { useState } from 'react'
import {
  Sparkles,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Pencil,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMetadataAssist } from '@/lib/hooks/use-quality-ai'
import { useUpdateAnalysis } from '@/lib/hooks/use-analysis'
import type { MetadataAssistResponse, MissingMetadataField } from '@/lib/ai/types'

interface MetadataAIAssistProps {
  analysisId: string
  currentProblemStatement: string | null
  currentAbstractSummary: string | null
  onApply: (field: 'problem_statement' | 'abstract_summary', value: string) => void
}

interface DiffViewProps {
  label: string
  current: string | null
  suggested: string
  onApply: () => void
  onEdit: () => void
  onDiscard: () => void
  isEditing: boolean
  editValue: string
  onEditChange: (value: string) => void
  onEditSave: () => void
  onEditCancel: () => void
}

function DiffView({
  label,
  current,
  suggested,
  onApply,
  onEdit,
  onDiscard,
  isEditing,
  editValue,
  onEditChange,
  onEditSave,
  onEditCancel,
}: DiffViewProps) {
  const [expanded, setExpanded] = useState(true)

  if (isEditing) {
    return (
      <div className="border rounded-lg p-3 bg-background space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onEditCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={onEditSave} className="bg-lime-600 hover:bg-lime-700 text-white">
              <Check className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
        <textarea
          className="w-full px-3 py-2 border rounded-md bg-background resize-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 text-sm"
          rows={8}
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
        />
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-3 bg-background">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{label}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Current */}
          {current && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Current:</div>
              <div className="text-sm p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-200 whitespace-pre-wrap">
                {current || '(empty)'}
              </div>
            </div>
          )}

          {/* Suggested */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Suggested:</div>
            <div className="text-sm p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-green-800 dark:text-green-200 whitespace-pre-wrap">
              {suggested}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" onClick={onApply} className="bg-lime-600 hover:bg-lime-700 text-white">
              <Check className="w-3 h-3 mr-1" />
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={onDiscard} className="text-muted-foreground">
              <X className="w-3 h-3 mr-1" />
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function MissingMetadataCard({ field }: { field: MissingMetadataField }) {
  return (
    <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-sm">
      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <div>
        <div className="font-medium text-amber-800 dark:text-amber-200 capitalize">
          {field.field.replace('_', ' ')}
        </div>
        <div className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
          {field.question}
        </div>
      </div>
    </div>
  )
}

function TemplateHelper() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full p-3 text-left hover:bg-muted/50"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">Problem Statement & Summary Templates</span>
      </button>

      {expanded && (
        <div className="p-3 pt-0 space-y-4 text-sm">
          <div>
            <div className="font-medium mb-1">Problem Statement Structure:</div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li><strong>What is happening:</strong> Symptom/defect observed</li>
              <li><strong>Where:</strong> Site/area/process location</li>
              <li><strong>When/Frequency:</strong> Time window or occurrence rate</li>
              <li><strong>Impact:</strong> Cost, service, safety, or quality effect</li>
              <li><strong>Expected Standard:</strong> What should happen</li>
              <li><strong>Evidence Source:</strong> Report, audit, or observation</li>
            </ul>
          </div>

          <div>
            <div className="font-medium mb-1">Abstract/Summary Structure:</div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li><strong>Observed Issue:</strong> Brief description</li>
              <li><strong>Suspected Drivers:</strong> Initial hypotheses</li>
              <li><strong>What We Will Prove:</strong> Investigation goal</li>
              <li><strong>Planned Investigations:</strong> Approach overview</li>
              <li><strong>Success Definition:</strong> How we know we are done</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export function MetadataAIAssist({
  analysisId,
  currentProblemStatement,
  currentAbstractSummary,
  onApply,
}: MetadataAIAssistProps) {
  const { generate, suggestion, isGenerating, error, clearSuggestion } = useMetadataAssist({ analysisId })

  const [editingField, setEditingField] = useState<'problem_statement' | 'abstract_summary' | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleApply = (field: 'problem_statement' | 'abstract_summary') => {
    const value = field === 'problem_statement'
      ? suggestion?.problem_statement
      : suggestion?.abstract_summary

    if (value) {
      onApply(field, value)
    }
  }

  const handleEdit = (field: 'problem_statement' | 'abstract_summary') => {
    const value = field === 'problem_statement'
      ? suggestion?.problem_statement
      : suggestion?.abstract_summary

    setEditingField(field)
    setEditValue(value || '')
  }

  const handleEditSave = () => {
    if (editingField && editValue) {
      onApply(editingField, editValue)
      setEditingField(null)
      setEditValue('')
    }
  }

  const handleEditCancel = () => {
    setEditingField(null)
    setEditValue('')
  }

  const handleDiscard = (field: 'problem_statement' | 'abstract_summary') => {
    // Just visually discard by clearing if both are discarded
    // In a full implementation, you'd track discarded state per field
  }

  return (
    <div className="space-y-4">
      {/* Header with generate button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-lime-600" />
          <span className="text-sm font-medium">AI Assist</span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={generate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-2" />
              {suggestion ? 'Regenerate' : 'Generate Suggestions'}
            </>
          )}
        </Button>
      </div>

      {/* Template helper accordion */}
      <TemplateHelper />

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
          {error.message}
        </div>
      )}

      {/* Suggestions */}
      {suggestion && (
        <div className="space-y-3">
          <DiffView
            label="Problem Statement"
            current={currentProblemStatement}
            suggested={suggestion.problem_statement}
            onApply={() => handleApply('problem_statement')}
            onEdit={() => handleEdit('problem_statement')}
            onDiscard={() => handleDiscard('problem_statement')}
            isEditing={editingField === 'problem_statement'}
            editValue={editValue}
            onEditChange={setEditValue}
            onEditSave={handleEditSave}
            onEditCancel={handleEditCancel}
          />

          <DiffView
            label="Abstract / Summary"
            current={currentAbstractSummary}
            suggested={suggestion.abstract_summary}
            onApply={() => handleApply('abstract_summary')}
            onEdit={() => handleEdit('abstract_summary')}
            onDiscard={() => handleDiscard('abstract_summary')}
            isEditing={editingField === 'abstract_summary'}
            editValue={editValue}
            onEditChange={setEditValue}
            onEditSave={handleEditSave}
            onEditCancel={handleEditCancel}
          />

          {/* Missing metadata */}
          {suggestion.missing_metadata.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Missing Context ({suggestion.missing_metadata.length})
              </div>
              {suggestion.missing_metadata.map((field, i) => (
                <MissingMetadataCard key={i} field={field} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info text when no suggestion */}
      {!suggestion && !isGenerating && (
        <div className="text-xs text-muted-foreground text-center py-4">
          Click &quot;Generate Suggestions&quot; to get AI-assisted problem statement and summary based on your analysis context.
        </div>
      )}
    </div>
  )
}
