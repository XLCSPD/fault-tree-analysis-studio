'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight, Calendar, User, AlertCircle, CheckCircle2, Clock, Ban, Shield } from 'lucide-react'
import { useNodeActionItems, useCreateActionItem, useUpdateActionItem, useDeleteActionItem, type ActionItemWithPerson } from '@/lib/hooks/use-action-items'
import { PersonSelector } from '@/components/inspector/person-selector'
import { cn } from '@/lib/utils'

interface ActionItemsPanelProps {
  analysisId: string
  nodeId: string | null
  organizationId: string | null
}

// Action type labels and colors
const ACTION_TYPES = {
  INVESTIGATION: { label: 'Investigation', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  CONTAINMENT: { label: 'Containment', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  CORRECTIVE: { label: 'Corrective', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  PREVENTIVE: { label: 'Preventive', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
}

// Status labels, colors, and icons
const STATUS_CONFIG = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: Loader2 },
  BLOCKED: { label: 'Blocked', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: Ban },
  DONE: { label: 'Done', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: CheckCircle2 },
  VERIFIED: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', icon: Shield },
}

// Priority labels and colors
const PRIORITY_CONFIG = {
  LOW: { label: 'Low', color: 'text-gray-600' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-600' },
  HIGH: { label: 'High', color: 'text-red-600' },
}

export function ActionItemsPanel({ analysisId, nodeId, organizationId }: ActionItemsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newAction, setNewAction] = useState({
    title: '',
    action_type: 'INVESTIGATION' as const,
    priority: 'MEDIUM' as const,
  })

  // Fetch action items for this node
  const { data: actionItems, isLoading } = useNodeActionItems(nodeId)
  const createActionItem = useCreateActionItem(analysisId)
  const updateActionItem = useUpdateActionItem(analysisId)
  const deleteActionItem = useDeleteActionItem(analysisId)

  // Handle create new action item
  const handleCreate = useCallback(async () => {
    if (!newAction.title.trim() || !nodeId || !organizationId) return

    await createActionItem.mutateAsync({
      node_id: nodeId,
      organization_id: organizationId,
      title: newAction.title.trim(),
      investigation_item: newAction.title.trim(),
      action_type: newAction.action_type,
      priority: newAction.priority,
      status: 'NOT_STARTED',
    })

    setNewAction({ title: '', action_type: 'INVESTIGATION', priority: 'MEDIUM' })
    setIsCreating(false)
  }, [newAction, nodeId, organizationId, createActionItem])

  // Handle update field
  const handleUpdate = useCallback(async (
    actionItemId: string,
    field: string,
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
        <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
          <div>
            <Label htmlFor="newTitle">Action Title</Label>
            <Input
              id="newTitle"
              value={newAction.title}
              onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
              placeholder="Describe the action..."
              className="mt-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleCreate()
                }
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setNewAction({ title: '', action_type: 'INVESTIGATION', priority: 'MEDIUM' })
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="actionType">Action Type</Label>
              <select
                id="actionType"
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                value={newAction.action_type}
                onChange={(e) => setNewAction({ ...newAction, action_type: e.target.value as any })}
              >
                {Object.entries(ACTION_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                value={newAction.priority}
                onChange={(e) => setNewAction({ ...newAction, priority: e.target.value as any })}
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!newAction.title.trim() || createActionItem.isPending}
            >
              {createActionItem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Action
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsCreating(false)
                setNewAction({ title: '', action_type: 'INVESTIGATION', priority: 'MEDIUM' })
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
          Add Action
        </Button>
      )}
    </div>
  )
}

interface ActionItemCardProps {
  item: ActionItemWithPerson
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (id: string, field: string, value: string | number | null) => Promise<void>
  onDelete: () => void
  organizationId: string | null
  isDeleting: boolean
}

function ActionItemCard({
  item,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  organizationId,
  isDeleting,
}: ActionItemCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleFieldUpdate = async (field: string, value: string | number | null) => {
    setIsUpdating(true)
    try {
      await onUpdate(item.id, field, value)
    } finally {
      setIsUpdating(false)
    }
  }

  const actionType = (item as any).action_type || 'INVESTIGATION'
  const status = (item as any).status || 'NOT_STARTED'
  const priority = (item as any).priority || 'MEDIUM'
  const dueDate = (item as any).due_date || item.schedule
  const title = (item as any).title || item.investigation_item

  const typeConfig = ACTION_TYPES[actionType as keyof typeof ACTION_TYPES] || ACTION_TYPES.INVESTIGATION
  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.NOT_STARTED
  const StatusIcon = statusConfig.icon

  // Check if overdue
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'DONE' && status !== 'VERIFIED'

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden",
      isOverdue && "border-red-300 dark:border-red-800"
    )}>
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn('text-xs', typeConfig.color)}>
              {typeConfig.label}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>
          <span className="text-sm font-medium truncate block">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dueDate && (
            <span className={cn(
              "text-xs flex items-center gap-1",
              isOverdue ? "text-red-600" : "text-muted-foreground"
            )}>
              <Calendar className="w-3 h-3" />
              {new Date(dueDate).toLocaleDateString()}
            </span>
          )}
          {item.person_responsible && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded flex items-center gap-1">
              <User className="w-3 h-3" />
              {item.person_responsible.initials}
            </span>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t p-4 space-y-4 bg-muted/20">
          {/* Title */}
          <div>
            <Label htmlFor={`title-${item.id}`}>Action Title</Label>
            <Input
              id={`title-${item.id}`}
              value={title}
              onChange={(e) => {
                handleFieldUpdate('title', e.target.value)
                handleFieldUpdate('investigation_item', e.target.value)
              }}
              className="mt-1"
              disabled={isUpdating}
            />
          </div>

          {/* Type & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`type-${item.id}`}>Action Type</Label>
              <select
                id={`type-${item.id}`}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                value={actionType}
                onChange={(e) => handleFieldUpdate('action_type', e.target.value)}
                disabled={isUpdating}
              >
                {Object.entries(ACTION_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor={`status-${item.id}`}>Status</Label>
              <select
                id={`status-${item.id}`}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                value={status}
                onChange={(e) => handleFieldUpdate('status', e.target.value)}
                disabled={isUpdating}
              >
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`priority-${item.id}`}>Priority</Label>
              <select
                id={`priority-${item.id}`}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                value={priority}
                onChange={(e) => handleFieldUpdate('priority', e.target.value)}
                disabled={isUpdating}
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor={`due-${item.id}`}>Due Date</Label>
              <Input
                id={`due-${item.id}`}
                type="date"
                value={dueDate || ''}
                onChange={(e) => {
                  handleFieldUpdate('due_date', e.target.value || null)
                  handleFieldUpdate('schedule', e.target.value || null)
                }}
                className="mt-1"
                disabled={isUpdating}
              />
            </div>
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

          {/* Close Criteria */}
          <div>
            <Label htmlFor={`criteria-${item.id}`}>Close Criteria (Definition of Done)</Label>
            <textarea
              id={`criteria-${item.id}`}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background resize-none text-sm"
              rows={2}
              value={(item as any).close_criteria || ''}
              onChange={(e) => handleFieldUpdate('close_criteria', e.target.value || null)}
              placeholder="What must be true for this action to be complete?"
              disabled={isUpdating}
            />
          </div>

          {/* Result */}
          <div>
            <Label htmlFor={`result-${item.id}`}>Result / Findings</Label>
            <textarea
              id={`result-${item.id}`}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background resize-none text-sm"
              rows={2}
              value={(item as any).result || item.investigation_result || ''}
              onChange={(e) => {
                handleFieldUpdate('result', e.target.value || null)
                handleFieldUpdate('investigation_result', e.target.value || null)
              }}
              placeholder="What was found or what changed?"
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
              placeholder="Additional notes..."
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
              Delete Action
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
