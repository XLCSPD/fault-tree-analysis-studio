'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import {
  useAllMetadataFields,
  useCreateMetadataField,
  useUpdateMetadataField,
  useDeleteMetadataField,
} from '@/lib/hooks/use-metadata'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Plus,
  Loader2,
  Save,
  Trash2,
  X,
  GripVertical,
  Pencil,
  Eye,
  EyeOff,
  HelpCircle,
} from 'lucide-react'
import type { Database } from '@/types/database'

type MetadataField = Database['public']['Tables']['metadata_fields']['Row']
type MetadataFieldType = Database['public']['Enums']['metadata_field_type']

const FIELD_TYPES: { value: MetadataFieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'select', label: 'Dropdown', description: 'Single selection from options' },
  { value: 'multi_select', label: 'Multi-Select', description: 'Multiple selections' },
  { value: 'boolean', label: 'Checkbox', description: 'Yes/No toggle' },
  { value: 'url', label: 'URL', description: 'Website link' },
  { value: 'email', label: 'Email', description: 'Email address' },
]

interface OptionItem {
  label: string
  value: string
  color?: string
}

interface EditingField {
  id?: string
  key: string
  label: string
  field_type: MetadataFieldType
  placeholder: string
  help_text: string
  is_required: boolean
  is_active: boolean
  sort_order: number
  options: OptionItem[]
}

const DEFAULT_FIELD: EditingField = {
  key: '',
  label: '',
  field_type: 'text',
  placeholder: '',
  help_text: '',
  is_required: false,
  is_active: true,
  sort_order: 0,
  options: [],
}

// Field editor component
function FieldEditor({
  field,
  onSave,
  onCancel,
  isSaving,
}: {
  field: EditingField
  onSave: (field: EditingField) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [editingField, setEditingField] = useState<EditingField>(field)
  const [optionInput, setOptionInput] = useState('')

  const handleChange = (key: keyof EditingField, value: unknown) => {
    setEditingField((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddOption = () => {
    if (!optionInput.trim()) return
    const newOption: OptionItem = {
      label: optionInput.trim(),
      value: optionInput.trim().toLowerCase().replace(/\s+/g, '_'),
    }
    setEditingField((prev) => ({
      ...prev,
      options: [...prev.options, newOption],
    }))
    setOptionInput('')
  }

  const handleRemoveOption = (index: number) => {
    setEditingField((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }))
  }

  const needsOptions = editingField.field_type === 'select' || editingField.field_type === 'multi_select'

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="grid grid-cols-2 gap-4">
        {/* Label */}
        <div>
          <Label htmlFor="label">Display Label *</Label>
          <Input
            id="label"
            value={editingField.label}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="e.g., SKU, Shift, Drawing Revision"
            className="mt-1"
          />
        </div>

        {/* Key */}
        <div>
          <Label htmlFor="key">
            Field Key *
            <HelpCircle className="w-3 h-3 inline ml-1 text-muted-foreground" />
          </Label>
          <Input
            id="key"
            value={editingField.key}
            onChange={(e) =>
              handleChange('key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
            }
            placeholder="e.g., sku, shift, drawing_rev"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Internal identifier (lowercase, no spaces)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Field Type */}
        <div>
          <Label htmlFor="field_type">Field Type *</Label>
          <select
            id="field_type"
            value={editingField.field_type}
            onChange={(e) => handleChange('field_type', e.target.value as MetadataFieldType)}
            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
          >
            {FIELD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label} - {type.description}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <Label htmlFor="sort_order">Display Order</Label>
          <Input
            id="sort_order"
            type="number"
            min={0}
            value={editingField.sort_order}
            onChange={(e) => handleChange('sort_order', parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Options for select/multi_select */}
      {needsOptions && (
        <div>
          <Label>Options</Label>
          <div className="mt-1 space-y-2">
            {editingField.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input value={option.label} disabled className="flex-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveOption(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                placeholder="Add option..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleAddOption}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Placeholder */}
        <div>
          <Label htmlFor="placeholder">Placeholder Text</Label>
          <Input
            id="placeholder"
            value={editingField.placeholder}
            onChange={(e) => handleChange('placeholder', e.target.value)}
            placeholder="Shown when field is empty"
            className="mt-1"
          />
        </div>

        {/* Help Text */}
        <div>
          <Label htmlFor="help_text">Help Text</Label>
          <Input
            id="help_text"
            value={editingField.help_text}
            onChange={(e) => handleChange('help_text', e.target.value)}
            placeholder="Shown below the field"
            className="mt-1"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editingField.is_required}
            onChange={(e) => handleChange('is_required', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm">Required field</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editingField.is_active}
            onChange={(e) => handleChange('is_active', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm">Active (visible to users)</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={() => onSave(editingField)}
          disabled={!editingField.key || !editingField.label || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {field.id ? 'Update Field' : 'Create Field'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Field preview component
function FieldPreview({ field }: { field: MetadataField }) {
  const fieldType = FIELD_TYPES.find((t) => t.value === field.field_type)
  const options = field.options as OptionItem[] | null

  return (
    <div className="p-3 border rounded-lg bg-background space-y-2">
      <Label>{field.label}</Label>
      {field.field_type === 'text' && (
        <Input placeholder={field.placeholder || undefined} disabled />
      )}
      {field.field_type === 'number' && (
        <Input type="number" placeholder={field.placeholder || undefined} disabled />
      )}
      {field.field_type === 'date' && <Input type="date" disabled />}
      {field.field_type === 'boolean' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" disabled className="rounded border-gray-300" />
          <span className="text-sm text-muted-foreground">{field.placeholder || 'Yes'}</span>
        </label>
      )}
      {(field.field_type === 'select' || field.field_type === 'multi_select') && (
        <select className="w-full px-3 py-2 border rounded-md bg-background" disabled>
          <option>{field.placeholder || 'Select...'}</option>
          {options?.map((opt, i) => (
            <option key={i}>{opt.label}</option>
          ))}
        </select>
      )}
      {field.field_type === 'url' && (
        <Input type="url" placeholder={field.placeholder || 'https://'} disabled />
      )}
      {field.field_type === 'email' && (
        <Input type="email" placeholder={field.placeholder || 'email@example.com'} disabled />
      )}
      {field.help_text && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
    </div>
  )
}

export default function CustomFieldsPage() {
  const { organization } = useUser()
  const orgId = organization?.id ?? null

  const { data: fields, isLoading } = useAllMetadataFields(orgId)
  const createField = useCreateMetadataField(orgId ?? '')
  const updateField = useUpdateMetadataField(orgId ?? '')
  const deleteField = useDeleteMetadataField(orgId ?? '')

  const [editingField, setEditingField] = useState<EditingField | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Sort fields by sort_order
  const sortedFields = [...(fields || [])].sort((a, b) => a.sort_order - b.sort_order)

  const handleCreate = () => {
    const maxOrder = Math.max(...(fields?.map((f) => f.sort_order) || [0]), 0)
    setEditingField({ ...DEFAULT_FIELD, sort_order: maxOrder + 1 })
  }

  const handleEdit = (field: MetadataField) => {
    setEditingField({
      id: field.id,
      key: field.key,
      label: field.label,
      field_type: field.field_type,
      placeholder: field.placeholder || '',
      help_text: field.help_text || '',
      is_required: field.is_required,
      is_active: field.is_active,
      sort_order: field.sort_order,
      options: (field.options as unknown as OptionItem[]) || [],
    })
  }

  const handleSave = async (field: EditingField) => {
    try {
      const fieldData = {
        key: field.key,
        label: field.label,
        field_type: field.field_type,
        placeholder: field.placeholder || null,
        help_text: field.help_text || null,
        is_required: field.is_required,
        is_active: field.is_active,
        sort_order: field.sort_order,
        options: field.options.length > 0 ? field.options : null,
      }

      if (field.id) {
        await updateField.mutateAsync({ fieldId: field.id, updates: fieldData as any })
      } else {
        await createField.mutateAsync(fieldData as any)
      }
      setEditingField(null)
    } catch (error) {
      console.error('Failed to save field:', error)
    }
  }

  const handleDelete = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field? Any existing values will be lost.')) {
      return
    }

    try {
      await deleteField.mutateAsync(fieldId)
    } catch (error) {
      console.error('Failed to delete field:', error)
    }
  }

  const handleToggleActive = async (field: MetadataField) => {
    try {
      await updateField.mutateAsync({
        fieldId: field.id,
        updates: { is_active: !field.is_active },
      })
    } catch (error) {
      console.error('Failed to toggle field:', error)
    }
  }

  return (
    <div>
      <PageHeader
        title="Custom Fields"
        description="Define additional metadata fields for analyses"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Preview
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Preview
                </>
              )}
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fields List */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              {sortedFields.length} Custom Field{sortedFields.length !== 1 ? 's' : ''}
            </h3>

            {/* Add/Edit Form */}
            {editingField && (
              <FieldEditor
                field={editingField}
                onSave={handleSave}
                onCancel={() => setEditingField(null)}
                isSaving={createField.isPending || updateField.isPending}
              />
            )}

            {/* Fields */}
            {sortedFields.length === 0 && !editingField ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No custom fields configured yet
                  </p>
                  <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Field
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {sortedFields.map((field) => (
                  <Card
                    key={field.id}
                    className={!field.is_active ? 'opacity-60' : undefined}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-1 text-muted-foreground cursor-grab">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{field.label}</span>
                              {field.is_required && (
                                <span className="text-xs text-red-500">Required</span>
                              )}
                              {!field.is_active && (
                                <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {field.key} •{' '}
                              {FIELD_TYPES.find((t) => t.value === field.field_type)?.label}
                            </p>
                            {field.help_text && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {field.help_text}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(field)}
                            title={field.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {field.is_active ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(field)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(field.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Preview (as seen in Metadata Panel)
              </h3>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Additional Fields</CardTitle>
                  <CardDescription>
                    These fields appear in the Analysis Metadata panel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sortedFields.filter((f) => f.is_active).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No active fields to preview
                    </p>
                  ) : (
                    sortedFields
                      .filter((f) => f.is_active)
                      .map((field) => <FieldPreview key={field.id} field={field} />)
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
