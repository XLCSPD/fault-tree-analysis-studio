'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Loader2, GitBranch, GitMerge, MoreVertical, Trash2, XCircle, Plus, Eye } from 'lucide-react'
import { useBranches, useAbandonBranch, useDeleteBranch } from '@/lib/hooks/use-versions'
import { useToast } from '@/lib/hooks/use-toast'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { CreateBranchDialog } from './create-branch-dialog'
import { MergeBranchDialog } from './merge-branch-dialog'
import type { BranchWithCreator } from '@/lib/versions/types'

interface BranchManagerProps {
  analysisId: string
  analysisTitle: string
  className?: string
  compact?: boolean
}

export function BranchManager({
  analysisId,
  analysisTitle,
  className,
  compact = false,
}: BranchManagerProps) {
  const { toast } = useToast()
  const { data: branches, isLoading } = useBranches(analysisId)
  const abandonBranch = useAbandonBranch(analysisId)
  const deleteBranch = useDeleteBranch()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [mergeDialogBranch, setMergeDialogBranch] = useState<BranchWithCreator | null>(null)
  const [abandonDialogBranch, setAbandonDialogBranch] = useState<BranchWithCreator | null>(null)
  const [deleteDialogBranch, setDeleteDialogBranch] = useState<BranchWithCreator | null>(null)

  const activeBranches = branches?.filter(b => b.status === 'active') ?? []
  const inactiveBranches = branches?.filter(b => b.status !== 'active') ?? []

  const handleAbandon = async () => {
    if (!abandonDialogBranch) return

    try {
      await abandonBranch.mutateAsync(abandonDialogBranch.id)
      toast({
        title: 'Branch abandoned',
        description: `Branch "${abandonDialogBranch.name}" has been marked as abandoned.`,
      })
      setAbandonDialogBranch(null)
    } catch (error) {
      toast({
        title: 'Failed to abandon branch',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteDialogBranch) return

    try {
      await deleteBranch.mutateAsync({ branchId: deleteDialogBranch.id, analysisId })
      toast({
        title: 'Branch deleted',
        description: `Branch "${deleteDialogBranch.name}" has been permanently deleted.`,
      })
      setDeleteDialogBranch(null)
    } catch (error) {
      toast({
        title: 'Failed to delete branch',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex justify-center py-8', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const getBranchStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-accent">Active</Badge>
      case 'merged':
        return <Badge variant="secondary" className="bg-success/20 text-success border-success/30">Merged</Badge>
      case 'abandoned':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Abandoned</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Create Button */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Branches
            </h3>
            <p className="text-sm text-muted-foreground">
              Experimental branches for {analysisTitle}
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Branch
          </Button>
        </div>
      )}

      {/* Active Branches */}
      {activeBranches.length === 0 && inactiveBranches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <GitBranch className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No branches yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Branch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Branches */}
          {activeBranches.length > 0 && (
            <div className="space-y-2">
              {!compact && (
                <h4 className="text-sm font-medium text-muted-foreground">Active Branches</h4>
              )}
              {activeBranches.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  onMerge={() => setMergeDialogBranch(branch)}
                  onAbandon={() => setAbandonDialogBranch(branch)}
                  onDelete={() => setDeleteDialogBranch(branch)}
                />
              ))}
            </div>
          )}

          {/* Inactive Branches */}
          {inactiveBranches.length > 0 && !compact && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Merged & Abandoned ({inactiveBranches.length})
              </h4>
              {inactiveBranches.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  onDelete={() => setDeleteDialogBranch(branch)}
                  inactive
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Branch Dialog */}
      <CreateBranchDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        analysisId={analysisId}
        analysisTitle={analysisTitle}
      />

      {/* Merge Branch Dialog */}
      {mergeDialogBranch && (
        <MergeBranchDialog
          open={!!mergeDialogBranch}
          onOpenChange={(open) => !open && setMergeDialogBranch(null)}
          branch={mergeDialogBranch}
          analysisId={analysisId}
          analysisTitle={analysisTitle}
        />
      )}

      {/* Abandon Confirmation Dialog */}
      <AlertDialog
        open={!!abandonDialogBranch}
        onOpenChange={(open) => !open && setAbandonDialogBranch(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandon Branch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the branch &quot;{abandonDialogBranch?.name}&quot; as abandoned.
              The branch will be kept for historical reference but can no longer be merged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAbandon}>
              Abandon Branch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteDialogBranch}
        onOpenChange={(open) => !open && setDeleteDialogBranch(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the branch &quot;{deleteDialogBranch?.name}&quot;
              and all its version history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface BranchCardProps {
  branch: BranchWithCreator
  onMerge?: () => void
  onAbandon?: () => void
  onDelete?: () => void
  inactive?: boolean
}

function BranchCard({ branch, onMerge, onAbandon, onDelete, inactive }: BranchCardProps) {
  const getBranchStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-accent">Active</Badge>
      case 'merged':
        return <Badge variant="secondary" className="bg-success/20 text-success border-success/30">Merged</Badge>
      case 'abandoned':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Abandoned</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card className={cn(inactive && 'opacity-60')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-accent flex-shrink-0" />
              <span className="font-medium truncate">{branch.name}</span>
              {getBranchStatusBadge(branch.status)}
            </div>
            {branch.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {branch.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Created {formatDistanceToNow(new Date(branch.created_at), { addSuffix: true })}
              {branch.creator && ` by ${branch.creator.full_name ?? branch.creator.email}`}
              {branch.status === 'merged' && branch.merged_at && (
                <> &middot; Merged {formatDistanceToNow(new Date(branch.merged_at), { addSuffix: true })}</>
              )}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {branch.status === 'active' && (
                <>
                  <DropdownMenuItem onClick={onMerge}>
                    <GitMerge className="h-4 w-4 mr-2" />
                    Merge to Main
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onAbandon}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Abandon Branch
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}
