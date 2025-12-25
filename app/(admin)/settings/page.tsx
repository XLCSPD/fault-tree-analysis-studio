'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import { useOrganization, useUpdateOrganization } from '@/lib/hooks/use-organization'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Save, Check, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type SaveStatus = 'idle' | 'saving' | 'saved'

export default function SettingsPage() {
  const { organization: userOrg } = useUser()
  const orgId = userOrg?.id ?? null

  const { data: organization, isLoading } = useOrganization(orgId)
  const updateOrg = useUpdateOrganization(orgId ?? '')

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form values when organization loads
  useEffect(() => {
    if (organization) {
      setName(organization.name)
      setSlug(organization.slug)
      setHasChanges(false)
    }
  }, [organization])

  // Track changes
  useEffect(() => {
    if (organization) {
      const nameChanged = name !== organization.name
      const slugChanged = slug !== organization.slug
      setHasChanges(nameChanged || slugChanged)
    }
  }, [name, slug, organization])

  // Auto-save after 1.5s of inactivity
  useEffect(() => {
    if (!hasChanges || !organization) return

    const timeoutId = setTimeout(() => {
      handleSave()
    }, 1500)

    return () => clearTimeout(timeoutId)
  }, [name, slug, hasChanges])

  const handleSave = useCallback(async () => {
    if (!organization || !hasChanges) return

    setSaveStatus('saving')

    try {
      await updateOrg.mutateAsync({
        name,
        slug,
      })
      setSaveStatus('saved')
      setHasChanges(false)

      // Reset saved indicator after 2s
      setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Failed to save organization:', error)
      setSaveStatus('idle')
    }
  }, [organization, name, slug, hasChanges, updateOrg])

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  return (
    <div>
      <PageHeader
        title="Organization Settings"
        description="Manage your organization's configuration"
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : organization ? (
        <div className="space-y-6">
          {/* Organization Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Organization Details</CardTitle>
                    <CardDescription>Basic information about your organization</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {saveStatus === 'saving' && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Saved
                    </span>
                  )}
                  {hasChanges && saveStatus === 'idle' && (
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      // Auto-generate slug if slug matches old name
                      if (slug === generateSlug(organization.name)) {
                        setSlug(generateSlug(e.target.value))
                      }
                    }}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-slug">URL Slug</Label>
                  <Input
                    id="org-slug"
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    placeholder="acme-corporation"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in URLs. Only lowercase letters, numbers, and hyphens.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Info</CardTitle>
              <CardDescription>Read-only information about your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Organization ID</Label>
                  <p className="font-mono text-sm">{organization.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p className="text-sm">
                    {organization.created_at
                      ? new Date(organization.created_at).toLocaleDateString()
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Last Updated</Label>
                  <p className="text-sm">
                    {organization.updated_at
                      ? new Date(organization.updated_at).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your entire organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div>
                  <p className="font-medium">Delete Organization</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this organization and all its data
                  </p>
                </div>
                <Button variant="destructive" disabled>
                  Delete Organization
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Contact support to delete your organization.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Organization not found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
