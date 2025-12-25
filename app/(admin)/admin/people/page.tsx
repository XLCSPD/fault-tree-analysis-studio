'use client'

import { useState } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import {
  usePeopleDirectory,
  useCreatePerson,
  useUpdatePerson,
  useDeactivatePerson,
  useReactivatePerson,
} from '@/lib/hooks/use-people-directory'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Trash2,
  RotateCcw,
  Save,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PeopleDirectoryPage() {
  const { organization } = useUser()
  const orgId = organization?.id ?? null

  const [showInactive, setShowInactive] = useState(false)
  const { data: people, isLoading } = usePeopleDirectory(orgId, showInactive)
  const createPerson = useCreatePerson(orgId ?? '')
  const updatePerson = useUpdatePerson(orgId ?? '')
  const deactivatePerson = useDeactivatePerson(orgId ?? '')
  const reactivatePerson = useReactivatePerson(orgId ?? '')

  const [isCreating, setIsCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingPerson, setEditingPerson] = useState<{
    name: string
    initials: string
    email: string
    role: string
    site: string
  } | null>(null)

  // New person form state
  const [newPerson, setNewPerson] = useState({
    name: '',
    initials: '',
    email: '',
    role: '',
    site: '',
  })

  const handleCreate = async () => {
    if (!newPerson.name || !newPerson.initials) return

    try {
      await createPerson.mutateAsync({
        name: newPerson.name,
        initials: newPerson.initials.toUpperCase(),
        email: newPerson.email || null,
        role: newPerson.role || null,
        site: newPerson.site || null,
      })
      setNewPerson({ name: '', initials: '', email: '', role: '', site: '' })
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create person:', error)
    }
  }

  const handleUpdate = async (personId: string) => {
    if (!editingPerson) return

    try {
      await updatePerson.mutateAsync({
        personId,
        updates: {
          name: editingPerson.name,
          initials: editingPerson.initials.toUpperCase(),
          email: editingPerson.email || null,
          role: editingPerson.role || null,
          site: editingPerson.site || null,
        },
      })
      setEditingPerson(null)
      setExpandedId(null)
    } catch (error) {
      console.error('Failed to update person:', error)
    }
  }

  const handleDeactivate = async (personId: string) => {
    try {
      await deactivatePerson.mutateAsync(personId)
      setExpandedId(null)
    } catch (error) {
      console.error('Failed to deactivate person:', error)
    }
  }

  const handleReactivate = async (personId: string) => {
    try {
      await reactivatePerson.mutateAsync(personId)
    } catch (error) {
      console.error('Failed to reactivate person:', error)
    }
  }

  const toggleExpand = (personId: string) => {
    if (expandedId === personId) {
      setExpandedId(null)
      setEditingPerson(null)
    } else {
      const person = people?.find((p) => p.id === personId)
      if (person) {
        setExpandedId(personId)
        setEditingPerson({
          name: person.name,
          initials: person.initials,
          email: person.email ?? '',
          role: person.role ?? '',
          site: person.site ?? '',
        })
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="People Directory"
        description="Manage people who can be assigned to action items"
        action={{
          label: 'Add Person',
          onClick: () => setIsCreating(true),
          icon: <UserPlus className="h-4 w-4 mr-2" />,
          disabled: isCreating,
        }}
      />

      {/* Show inactive toggle */}
      <div className="flex items-center gap-2 mb-6">
        <Switch
          id="show-inactive"
          checked={showInactive}
          onCheckedChange={setShowInactive}
        />
        <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">
          Show inactive people
        </Label>
      </div>

      {/* Create form */}
      {isCreating && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="new-name">Name *</Label>
                <Input
                  id="new-name"
                  placeholder="John Doe"
                  value={newPerson.name}
                  onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-initials">Initials *</Label>
                <Input
                  id="new-initials"
                  placeholder="JD"
                  maxLength={4}
                  value={newPerson.initials}
                  onChange={(e) => setNewPerson({ ...newPerson, initials: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="john@example.com"
                  value={newPerson.email}
                  onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Role</Label>
                <Input
                  id="new-role"
                  placeholder="Engineer"
                  value={newPerson.role}
                  onChange={(e) => setNewPerson({ ...newPerson, role: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-site">Site</Label>
                <Input
                  id="new-site"
                  placeholder="Building A"
                  value={newPerson.site}
                  onChange={(e) => setNewPerson({ ...newPerson, site: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false)
                  setNewPerson({ name: '', initials: '', email: '', role: '', site: '' })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newPerson.name || !newPerson.initials || createPerson.isPending}
              >
                {createPerson.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Person
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* People list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : people && people.length > 0 ? (
        <div className="space-y-2">
          {people.map((person) => (
            <Card
              key={person.id}
              className={cn(
                'transition-colors',
                !person.is_active && 'opacity-60 bg-muted/50'
              )}
            >
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => toggleExpand(person.id)}
              >
                {expandedId === person.id ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{person.name}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {person.initials}
                    </span>
                    {!person.is_active && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {[person.role, person.site, person.email].filter(Boolean).join(' • ')}
                  </div>
                </div>
                {!person.is_active && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReactivate(person.id)
                    }}
                    disabled={reactivatePerson.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reactivate
                  </Button>
                )}
              </div>

              {/* Expanded edit form */}
              {expandedId === person.id && editingPerson && (
                <CardContent className="border-t pt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={editingPerson.name}
                        onChange={(e) =>
                          setEditingPerson({ ...editingPerson, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Initials</Label>
                      <Input
                        maxLength={4}
                        value={editingPerson.initials}
                        onChange={(e) =>
                          setEditingPerson({
                            ...editingPerson,
                            initials: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editingPerson.email}
                        onChange={(e) =>
                          setEditingPerson({ ...editingPerson, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input
                        value={editingPerson.role}
                        onChange={(e) =>
                          setEditingPerson({ ...editingPerson, role: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Site</Label>
                      <Input
                        value={editingPerson.site}
                        onChange={(e) =>
                          setEditingPerson({ ...editingPerson, site: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-between mt-4">
                    {person.is_active && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeactivate(person.id)}
                        disabled={deactivatePerson.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Deactivate
                      </Button>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setExpandedId(null)
                          setEditingPerson(null)
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(person.id)}
                        disabled={updatePerson.isPending}
                      >
                        {updatePerson.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No people in the directory yet</p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Person
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
