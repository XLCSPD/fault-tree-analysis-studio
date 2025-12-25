'use client'

import { useState } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import {
  useOrgProfiles,
  useUpdateProfile,
  useInviteUser,
  useRemoveUser,
} from '@/lib/hooks/use-profiles'
import { PageHeader } from '@/components/admin/page-header'
import { RoleBadge } from '@/components/admin/role-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Loader2, UserPlus, Trash2, Mail, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'viewer', label: 'Viewer', description: 'Can view analyses but not edit' },
  { value: 'contributor', label: 'Contributor', description: 'Can edit and contribute to analyses' },
  { value: 'facilitator', label: 'Facilitator', description: 'Can manage analyses and lead sessions' },
  { value: 'admin', label: 'Admin', description: 'Full access including user management' },
]

export default function UsersPage() {
  const { user: currentUser, organization } = useUser()
  const orgId = organization?.id ?? null

  const { data: profiles, isLoading } = useOrgProfiles(orgId)
  const updateProfile = useUpdateProfile(orgId ?? '')
  const inviteUser = useInviteUser(orgId ?? '')
  const removeUser = useRemoveUser(orgId ?? '')

  const [isInviting, setIsInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('contributor')
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const handleInvite = async () => {
    if (!inviteEmail) return

    setInviteError(null)

    try {
      await inviteUser.mutateAsync({ email: inviteEmail, role: inviteRole })
      setInviteEmail('')
      setInviteRole('contributor')
      setIsInviting(false)
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Failed to invite user')
    }
  }

  const handleRoleChange = async (profileId: string, newRole: UserRole) => {
    try {
      await updateProfile.mutateAsync({
        profileId,
        updates: { role: newRole },
      })
    } catch (error) {
      console.error('Failed to update role:', error)
    }
  }

  const handleRemove = async () => {
    if (!removingUserId) return

    try {
      await removeUser.mutateAsync(removingUserId)
      setRemovingUserId(null)
    } catch (error) {
      console.error('Failed to remove user:', error)
    }
  }

  const userToRemove = profiles?.find((p) => p.id === removingUserId)

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage users in your organization"
        action={{
          label: 'Invite User',
          onClick: () => setIsInviting(true),
          icon: <UserPlus className="h-4 w-4 mr-2" />,
          disabled: isInviting,
        }}
      />

      {/* Invite form */}
      {isInviting && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-48 space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail || inviteUser.isPending}
              >
                {inviteUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invite
              </Button>
              <Button variant="outline" onClick={() => {
                setIsInviting(false)
                setInviteEmail('')
                setInviteError(null)
              }}>
                Cancel
              </Button>
            </div>
            {inviteError && (
              <p className="text-sm text-destructive mt-2">{inviteError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Users list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : profiles && profiles.length > 0 ? (
        <div className="space-y-2">
          {profiles.map((profile) => {
            const isCurrentUser = profile.id === currentUser?.id

            return (
              <Card key={profile.id} className={cn(isCurrentUser && 'border-primary')}>
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-medium">
                    {profile.initials || profile.email?.charAt(0).toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {profile.full_name || profile.email}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{profile.email}</div>
                  </div>

                  {/* Role selector */}
                  <div className="w-40">
                    <Select
                      value={profile.role ?? 'viewer'}
                      onValueChange={(v) => handleRoleChange(profile.id, v as UserRole)}
                      disabled={isCurrentUser || updateProfile.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            {ROLE_OPTIONS.find((r) => r.value === profile.role)?.label || 'Viewer'}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {option.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemovingUserId(profile.id)}
                    disabled={isCurrentUser}
                    className={cn(isCurrentUser && 'invisible')}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No users in this organization yet</p>
            <Button onClick={() => setIsInviting(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Invite First User
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!removingUserId} onOpenChange={() => setRemovingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{userToRemove?.full_name || userToRemove?.email}</strong> from this
              organization? They will lose access to all analyses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
