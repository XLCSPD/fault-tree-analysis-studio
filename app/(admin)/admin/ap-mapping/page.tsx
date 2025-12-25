'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import {
  useAPMappings,
  useCreateAPMapping,
  useUpdateAPMapping,
  useDeactivateAPMapping,
  calculateAPCategory,
  DEFAULT_AP_RULES,
  type MappingRule,
  type APMappingWithRules,
} from '@/lib/hooks/use-ap-mappings'
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
  AlertTriangle,
  Calculator,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function APMappingPage() {
  const { organization } = useUser()
  const orgId = organization?.id ?? null

  const { data: mappings, isLoading } = useAPMappings(orgId)
  const createMapping = useCreateAPMapping(orgId ?? '')
  const updateMapping = useUpdateAPMapping(orgId ?? '')
  const deactivateMapping = useDeactivateAPMapping(orgId ?? '')

  const [editingRules, setEditingRules] = useState<MappingRule[] | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [previewValues, setPreviewValues] = useState({ s: 5, o: 5, d: 5 })

  // Get the active mapping (first one)
  const activeMapping = mappings?.[0]

  // Initialize editing rules when mapping changes
  useEffect(() => {
    if (activeMapping?.rules) {
      setEditingRules([...activeMapping.rules])
      setHasChanges(false)
    } else {
      setEditingRules(null)
    }
  }, [activeMapping])

  const handleCreateMapping = async () => {
    try {
      await createMapping.mutateAsync({
        name: 'Default AP Mapping',
        rules: DEFAULT_AP_RULES,
      })
    } catch (error) {
      console.error('Failed to create mapping:', error)
    }
  }

  const handleSaveRules = async () => {
    if (!activeMapping || !editingRules) return

    try {
      await updateMapping.mutateAsync({
        mappingId: activeMapping.id,
        updates: { rules: editingRules },
      })
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save rules:', error)
    }
  }

  const handleRuleChange = (
    index: number,
    field: 'category' | 'priority' | 'color' | 'rpn_min' | 'rpn_max' | 's_min' | 's_max' | 'o_min' | 'o_max' | 'd_min' | 'd_max',
    value: string | number
  ) => {
    if (!editingRules) return

    const updated = [...editingRules]
    const rule = { ...updated[index] }

    switch (field) {
      case 'category':
        rule.result = { ...rule.result, ap_category: value as string }
        break
      case 'priority':
        rule.result = { ...rule.result, priority: value as number }
        break
      case 'color':
        rule.result = { ...rule.result, color: value as string }
        break
      case 'rpn_min':
        rule.conditions = {
          ...rule.conditions,
          rpn: { ...rule.conditions.rpn, min: value === '' ? undefined : (value as number) },
        }
        break
      case 'rpn_max':
        rule.conditions = {
          ...rule.conditions,
          rpn: { ...rule.conditions.rpn, max: value === '' ? undefined : (value as number) },
        }
        break
      case 's_min':
        rule.conditions = {
          ...rule.conditions,
          severity: { ...rule.conditions.severity, min: value === '' ? undefined : (value as number) },
        }
        break
      case 's_max':
        rule.conditions = {
          ...rule.conditions,
          severity: { ...rule.conditions.severity, max: value === '' ? undefined : (value as number) },
        }
        break
      case 'o_min':
        rule.conditions = {
          ...rule.conditions,
          occurrence: { ...rule.conditions.occurrence, min: value === '' ? undefined : (value as number) },
        }
        break
      case 'o_max':
        rule.conditions = {
          ...rule.conditions,
          occurrence: { ...rule.conditions.occurrence, max: value === '' ? undefined : (value as number) },
        }
        break
      case 'd_min':
        rule.conditions = {
          ...rule.conditions,
          detection: { ...rule.conditions.detection, min: value === '' ? undefined : (value as number) },
        }
        break
      case 'd_max':
        rule.conditions = {
          ...rule.conditions,
          detection: { ...rule.conditions.detection, max: value === '' ? undefined : (value as number) },
        }
        break
    }

    updated[index] = rule
    setEditingRules(updated)
    setHasChanges(true)
  }

  const handleAddRule = () => {
    if (!editingRules) return

    const newRule: MappingRule = {
      id: `rule-${Date.now()}`,
      conditions: {},
      result: { ap_category: 'New Category', priority: 0, color: '#6b7280' },
    }

    setEditingRules([...editingRules, newRule])
    setHasChanges(true)
  }

  const handleRemoveRule = (index: number) => {
    if (!editingRules) return

    setEditingRules(editingRules.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const handleDeleteMapping = async () => {
    if (!activeMapping) return

    if (!confirm('Are you sure you want to delete this AP mapping?')) return

    try {
      await deactivateMapping.mutateAsync(activeMapping.id)
    } catch (error) {
      console.error('Failed to delete mapping:', error)
    }
  }

  // Calculate preview
  const previewResult = editingRules
    ? calculateAPCategory(editingRules, previewValues.s, previewValues.o, previewValues.d)
    : null
  const previewRPN = previewValues.s * previewValues.o * previewValues.d

  return (
    <div>
      <PageHeader
        title="AP Mapping Configuration"
        description="Configure Action Priority rules based on Severity, Occurrence, Detection, and RPN"
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : activeMapping && editingRules ? (
        <div className="space-y-6">
          {/* Preview Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                AP Calculator Preview
              </CardTitle>
              <CardDescription>
                Test your rules by entering S/O/D values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Severity</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={previewValues.s}
                    onChange={(e) =>
                      setPreviewValues({ ...previewValues, s: parseInt(e.target.value) || 1 })
                    }
                    className="w-20"
                  />
                </div>
                <div className="text-2xl text-muted-foreground">×</div>
                <div className="space-y-1">
                  <Label className="text-xs">Occurrence</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={previewValues.o}
                    onChange={(e) =>
                      setPreviewValues({ ...previewValues, o: parseInt(e.target.value) || 1 })
                    }
                    className="w-20"
                  />
                </div>
                <div className="text-2xl text-muted-foreground">×</div>
                <div className="space-y-1">
                  <Label className="text-xs">Detection</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={previewValues.d}
                    onChange={(e) =>
                      setPreviewValues({ ...previewValues, d: parseInt(e.target.value) || 1 })
                    }
                    className="w-20"
                  />
                </div>
                <div className="text-2xl text-muted-foreground">=</div>
                <div className="space-y-1">
                  <Label className="text-xs">RPN</Label>
                  <div className="font-mono text-xl font-bold">{previewRPN}</div>
                </div>
                <div className="text-2xl text-muted-foreground">→</div>
                <div className="space-y-1">
                  <Label className="text-xs">AP Category</Label>
                  {previewResult ? (
                    <div
                      className="px-3 py-1 rounded-md text-white font-medium"
                      style={{ backgroundColor: previewResult.color }}
                    >
                      {previewResult.category}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No match</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rules Editor */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{activeMapping.name}</CardTitle>
                  <CardDescription>
                    Rules are evaluated in priority order (highest first)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {hasChanges && (
                    <Button onClick={handleSaveRules} disabled={updateMapping.isPending}>
                      {updateMapping.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleDeleteMapping}
                    disabled={deactivateMapping.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hasChanges && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-md">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">You have unsaved changes.</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                  <div className="col-span-2">Category</div>
                  <div className="col-span-1">Priority</div>
                  <div className="col-span-1">Color</div>
                  <div className="col-span-2">RPN Range</div>
                  <div className="col-span-2">S Range</div>
                  <div className="col-span-2">O Range</div>
                  <div className="col-span-1">D Range</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Rules */}
                {editingRules
                  .sort((a, b) => b.result.priority - a.result.priority)
                  .map((rule, index) => (
                    <div key={rule.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2">
                        <Input
                          value={rule.result.ap_category}
                          onChange={(e) => handleRuleChange(index, 'category', e.target.value)}
                          placeholder="Category"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          value={rule.result.priority}
                          onChange={(e) =>
                            handleRuleChange(index, 'priority', parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="color"
                          value={rule.result.color}
                          onChange={(e) => handleRuleChange(index, 'color', e.target.value)}
                          className="h-9 p-1 cursor-pointer"
                        />
                      </div>
                      <div className="col-span-2 flex gap-1">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={rule.conditions.rpn?.min ?? ''}
                          onChange={(e) =>
                            handleRuleChange(
                              index,
                              'rpn_min',
                              e.target.value === '' ? '' : parseInt(e.target.value)
                            )
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={rule.conditions.rpn?.max ?? ''}
                          onChange={(e) =>
                            handleRuleChange(
                              index,
                              'rpn_max',
                              e.target.value === '' ? '' : parseInt(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2 flex gap-1">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={rule.conditions.severity?.min ?? ''}
                          onChange={(e) =>
                            handleRuleChange(
                              index,
                              's_min',
                              e.target.value === '' ? '' : parseInt(e.target.value)
                            )
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={rule.conditions.severity?.max ?? ''}
                          onChange={(e) =>
                            handleRuleChange(
                              index,
                              's_max',
                              e.target.value === '' ? '' : parseInt(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2 flex gap-1">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={rule.conditions.occurrence?.min ?? ''}
                          onChange={(e) =>
                            handleRuleChange(
                              index,
                              'o_min',
                              e.target.value === '' ? '' : parseInt(e.target.value)
                            )
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={rule.conditions.occurrence?.max ?? ''}
                          onChange={(e) =>
                            handleRuleChange(
                              index,
                              'o_max',
                              e.target.value === '' ? '' : parseInt(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div className="col-span-1 flex gap-1">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={rule.conditions.detection?.min ?? ''}
                          onChange={(e) =>
                            handleRuleChange(
                              index,
                              'd_min',
                              e.target.value === '' ? '' : parseInt(e.target.value)
                            )
                          }
                          className="px-1"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRule(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                <Button variant="outline" onClick={handleAddRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No AP mapping configured yet</p>
            <Button onClick={handleCreateMapping} disabled={createMapping.isPending}>
              {createMapping.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Plus className="h-4 w-4 mr-2" />
              Create Default AP Mapping
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
