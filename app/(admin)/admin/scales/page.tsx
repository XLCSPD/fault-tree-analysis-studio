'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import {
  useScales,
  useCreateScale,
  useCreateScaleVersion,
  useDeactivateScale,
  type ScaleItem,
  type ScaleWithVersions,
} from '@/lib/hooks/use-scales'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Plus,
  Loader2,
  Save,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react'

const SCALE_TYPES = ['severity', 'occurrence', 'detection'] as const
type ScaleType = typeof SCALE_TYPES[number]

const SCALE_TYPE_LABELS: Record<ScaleType, string> = {
  severity: 'Severity',
  occurrence: 'Occurrence',
  detection: 'Detection',
}

const SCALE_TYPE_DESCRIPTIONS: Record<ScaleType, string> = {
  severity: 'How severe is the impact if this failure occurs?',
  occurrence: 'How likely is this failure to occur?',
  detection: 'How likely is this failure to be detected before reaching the customer?',
}

// Default scale items for new scales
const DEFAULT_SCALE_ITEMS: ScaleItem[] = Array.from({ length: 10 }, (_, i) => ({
  value: i + 1,
  label: `Level ${i + 1}`,
  definition: '',
}))

export default function ScalesPage() {
  const { organization } = useUser()
  const orgId = organization?.id ?? null

  const { data: scales, isLoading } = useScales(orgId)
  const createScale = useCreateScale(orgId ?? '')
  const createScaleVersion = useCreateScaleVersion(orgId ?? '')
  const deactivateScale = useDeactivateScale(orgId ?? '')

  const [activeTab, setActiveTab] = useState<ScaleType>('severity')
  const [editingItems, setEditingItems] = useState<ScaleItem[] | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Group scales by type
  const scalesByType: Record<ScaleType, ScaleWithVersions | undefined> = {
    severity: scales?.find((s: ScaleWithVersions) => s.type === 'severity'),
    occurrence: scales?.find((s: ScaleWithVersions) => s.type === 'occurrence'),
    detection: scales?.find((s: ScaleWithVersions) => s.type === 'detection'),
  }

  const currentScale = scalesByType[activeTab]

  // Initialize editing items when scale changes
  useEffect(() => {
    if (currentScale?.items) {
      setEditingItems([...currentScale.items])
      setHasChanges(false)
    } else {
      setEditingItems(null)
    }
  }, [currentScale])

  const handleCreateScale = async () => {
    try {
      await createScale.mutateAsync({
        name: `${SCALE_TYPE_LABELS[activeTab]} Scale`,
        type: activeTab,
        items: DEFAULT_SCALE_ITEMS,
      })
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create scale:', error)
    }
  }

  const handleSaveItems = async () => {
    if (!currentScale || !editingItems) return

    try {
      await createScaleVersion.mutateAsync({
        scaleId: currentScale.id,
        items: editingItems,
      })
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save scale items:', error)
    }
  }

  const handleItemChange = (index: number, field: keyof ScaleItem, value: string | number) => {
    if (!editingItems) return

    const updated = [...editingItems]
    updated[index] = { ...updated[index], [field]: value }
    setEditingItems(updated)
    setHasChanges(true)
  }

  const handleAddItem = () => {
    if (!editingItems) return

    const maxValue = Math.max(...editingItems.map((i) => i.value), 0)
    setEditingItems([
      ...editingItems,
      { value: maxValue + 1, label: '', definition: '' },
    ])
    setHasChanges(true)
  }

  const handleRemoveItem = (index: number) => {
    if (!editingItems || editingItems.length <= 1) return

    setEditingItems(editingItems.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const handleDeleteScale = async () => {
    if (!currentScale) return

    if (!confirm('Are you sure you want to delete this scale? This action cannot be undone.')) {
      return
    }

    try {
      await deactivateScale.mutateAsync(currentScale.id)
    } catch (error) {
      console.error('Failed to delete scale:', error)
    }
  }

  return (
    <div>
      <PageHeader
        title="Scales & Criteria"
        description="Configure Severity, Occurrence, and Detection rating scales"
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ScaleType)}>
          <TabsList className="mb-6">
            {SCALE_TYPES.map((type) => (
              <TabsTrigger key={type} value={type} className="gap-2">
                {SCALE_TYPE_LABELS[type]}
                {scalesByType[type] && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {scalesByType[type]?.items?.length ?? 0}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {SCALE_TYPES.map((type) => (
            <TabsContent key={type} value={type}>
              {scalesByType[type] ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{scalesByType[type]?.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {SCALE_TYPE_DESCRIPTIONS[type]}
                        </CardDescription>
                        {scalesByType[type]?.currentVersion && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Version {scalesByType[type]?.currentVersion?.version} •
                            Effective {scalesByType[type]?.currentVersion?.effective_date}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {hasChanges && (
                          <Button
                            onClick={handleSaveItems}
                            disabled={createScaleVersion.isPending}
                          >
                            {createScaleVersion.isPending ? (
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
                          onClick={handleDeleteScale}
                          disabled={deactivateScale.isPending}
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
                        <span className="text-sm">
                          You have unsaved changes. Saving will create a new version.
                        </span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-3 text-sm font-medium text-muted-foreground pb-2 border-b">
                        <div className="col-span-1">Value</div>
                        <div className="col-span-2">Label</div>
                        <div className="col-span-8">Definition</div>
                        <div className="col-span-1"></div>
                      </div>

                      {editingItems?.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-1">
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={item.value}
                              onChange={(e) =>
                                handleItemChange(index, 'value', parseInt(e.target.value) || 1)
                              }
                              className="text-center"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              value={item.label}
                              onChange={(e) => handleItemChange(index, 'label', e.target.value)}
                              placeholder="Label"
                            />
                          </div>
                          <div className="col-span-8">
                            <Input
                              value={item.definition}
                              onChange={(e) =>
                                handleItemChange(index, 'definition', e.target.value)
                              }
                              placeholder="Definition"
                            />
                          </div>
                          <div className="col-span-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(index)}
                              disabled={editingItems.length <= 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <Button variant="outline" onClick={handleAddItem} className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground mb-4">
                      No {SCALE_TYPE_LABELS[type].toLowerCase()} scale configured yet
                    </p>
                    <Button onClick={handleCreateScale} disabled={createScale.isPending}>
                      {createScale.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      <Plus className="h-4 w-4 mr-2" />
                      Create {SCALE_TYPE_LABELS[type]} Scale
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
