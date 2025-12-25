'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { useNodeActionItems, useCreateActionItem, useUpdateActionItem, useDeleteActionItem, type ActionItemWithPerson } from '@/lib/hooks/use-action-items'
import { PersonSelector } from '@/components/inspector/person-selector'
import { WeekStatusTracker } from '@/components/inspector/week-status-tracker'

interface ActionItemsPanelProps {
  analysisId: string
  nodeId: string | null
  organizationId: string | null
}

export function ActionItemsPanel({ analysisId, nodeId, organizationId }: ActionItemsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newItemText, setNewItemText] = useState('')

  // Fetch action items for this node
  const { data: actionItems, isLoading } = useNodeActionItems(nodeId)
  const createActionItem = useCreateActionItem(analysisId)
  const updateActionItem = useUpdateActionItem(analysisId)
  const deleteActionItem = useDeleteActionItem(analysisId)

  // Handle create new action item
  const handleCreate = useCallback(async () => {
    if (!newItemText.trim() || !nodeId) return

    await createActionItem.mutateAsync({
      node_id: nodeId,
      investigation_item: newItemText.trim(),
    })

    setNewItemText('')
    setIsCreating(false)
  }, [newItemText, nodeId, createActionItem])

  // Handle update field
  const handleUpdate = useCallback(async (
    actionItemId: string,
    field: keyof ActionItemWithPerson,
    value: string | number | null
  ) => {
    await updateActionItem.mutateAsync({
      actionItemId,
      updates: { [field]: value },
    })
  }, [updateActionItem])

  // Handle delete
  const handleDelete = useCallback(async (actionItemId: string) => {
    if (confirm('Are you sure you want to delete this action item?')) {
      await deleteActionItem.mutateAsync(actionItemId)
      if (expandedId === actionItemId) {
        setExpandedId(null)
      }
    }
  }, [deleteActionItem, expandedId])

  if (!nodeId) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Select a node to view its action items
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action Items List */}
      {actionItems && actionItems.length > 0 ? (
        <div className="space-y-2">
          {actionItems.map((item) => (
            <ActionItemCard
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onUpdate={handleUpdate}
              onDelete={() => handleDelete(item.id)}
              analysisId={analysisId}
              organizationId={organizationId}
              isDeleting={deleteActionItem.isPending}
            />
          ))}
        </div>
      ) : !isCreating ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No action items yet
        </div>
      ) : null}

      {/* Create New Form */}
      {isCreating ? (
        <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
          <div>
            <Label htmlFor="newItem">Investigation Item</Label>
            <Input
              id="newItem"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Describe the investigation item..."
              className="mt-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleCreate()
                }
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setNewItemText('')
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!newItemText.trim() || createActionItem.isPending}
            >
              {createActionItem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsCreating(false)
                setNewItemText('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="w-full"
          onClick={() => setIsCreating(true)}
          disabled={!nodeId}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Action Item
        </Button>
      )}
    </div>
  )
}

interface ActionItemCardProps {
  item: ActionItemWithPerson
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (id: string, field: keyof ActionItemWithPerson, value: string | number | null) => Promise<void>
  onDelete: () => void
  analysisId: string
  organizationId: string | null
  isDeleting: boolean
}

function ActionItemCard({
  item,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  analysisId,
  organizationId,
  isDeleting,
}: ActionItemCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleFieldUpdate = async (field: keyof ActionItemWithPerson, value: string | number | null) => {
    setIsUpdating(true)
    try {
      await onUpdate(item.id, field, value)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 text-left"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span className="flex-1 text-sm font-medium truncate">
          {item.investigation_item}
        </span>
        {item.person_responsible && (
          <span className="text-xs bg-muted px-2 py-0.5 rounded">
            {item.person_responsible.initials}
          </span>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t p-3 space-y-4 bg-muted/20">
          {/* Investigation Item */}
          <div>
            <Label htmlFor={`item-${item.id}`}>Investigation Item</Label>
            <Input
              id={`item-${item.id}`}
              value={item.investigation_item}
              onChange={(e) => handleFieldUpdate('investigation_item', e.target.value)}
              className="mt-1"
              disabled={isUpdating}
            />
          </div>

          {/* Person Responsible */}
          <div>
            <Label>Person Responsible</Label>
            <PersonSelector
              organizationId={organizationId}
              value={item.person_responsible_id}
              onChange={(personId) => handleFieldUpdate('person_responsible_id', personId)}
              disabled={isUpdating}
            />
          </div>

          {/* Schedule */}
          <div>
            <Label htmlFor={`schedule-${item.id}`}>Schedule</Label>
            <Input
              id={`schedule-${item.id}`}
              type="date"
              value={item.schedule || ''}
              onChange={(e) => handleFieldUpdate('schedule', e.target.value || null)}
              className="mt-1"
              disabled={isUpdating}
            />
          </div>

          {/* Week 1-4 Status */}
          <WeekStatusTracker
            actionItemId={item.id}
            analysisId={analysisId}
          />

          {/* Investigation Result */}
          <div>
            <Label htmlFor={`result-${item.id}`}>Investigation Result</Label>
            <textarea
              id={`result-${item.id}`}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background resize-none text-sm"
              rows={2}
              value={item.investigation_result || ''}
              onChange={(e) => handleFieldUpdate('investigation_result', e.target.value || null)}
              placeholder="Describe the investigation result..."
              disabled={isUpdating}
            />
          </div>

          {/* Judgment */}
          <div>
            <Label htmlFor={`judgment-${item.id}`}>Judgment</Label>
            <select
              id={`judgment-${item.id}`}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
              value={item.judgment ?? ''}
              onChange={(e) => handleFieldUpdate('judgment', e.target.value ? parseInt(e.target.value) : null)}
              disabled={isUpdating}
            >
              <option value="">Not set</option>
              <option value="1">1 - Root cause confirmed</option>
              <option value="2">2 - Contributing factor</option>
              <option value="3">3 - Not a cause</option>
              <option value="4">4 - Needs more investigation</option>
            </select>
          </div>

          {/* Remarks */}
          <div>
            <Label htmlFor={`remarks-${item.id}`}>Remarks</Label>
            <textarea
              id={`remarks-${item.id}`}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background resize-none text-sm"
              rows={2}
              value={item.remarks || ''}
              onChange={(e) => handleFieldUpdate('remarks', e.target.value || null)}
              placeholder="Additional remarks..."
              disabled={isUpdating}
            />
          </div>

          {/* Delete Button */}
          <div className="pt-2 border-t">
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={isDeleting}
              className="w-full"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Action Item
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
