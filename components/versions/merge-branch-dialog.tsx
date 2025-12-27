'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, GitMerge, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useMergeBranch, useVersionDiffSummary } from '@/lib/hooks/use-versions'
import { useToast } from '@/lib/hooks/use-toast'
import type { BranchWithCreator } from '@/lib/versions/types'
import { formatDistanceToNow } from 'date-fns'

interface MergeBranchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: BranchWithCreator
  analysisId: string
  analysisTitle: string
  onSuccess?: () => void
}

export function MergeBranchDialog({
  open,
  onOpenChange,
  branch,
  analysisId,
  analysisTitle,
  onSuccess,
}: MergeBranchDialogProps) {
  const { toast } = useToast()
  const mergeBranch = useMergeBranch(analysisId)

  // Get diff summary between branch source and current state
  const { data: diffSummary, isLoading: loadingDiff } = useVersionDiffSummary(
    branch.source_version_id,
    branch.current_version_id ?? null
  )

  const handleMerge = async () => {
    try {
      await mergeBranch.mutateAsync(branch.id)

      toast({
        title: 'Branch merged',
        description: `Branch "${branch.name}" has been merged into the main analysis.`,
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Failed to merge branch',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-accent" />
            Merge Branch
          </DialogTitle>
          <DialogDescription>
            Merge changes from branch &quot;{branch.name}&quot; into &quot;{analysisTitle}&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Branch Info */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{branch.name}</span>
                  <Badge variant="outline">{branch.status}</Badge>
                </div>
                {branch.description && (
                  <p className="text-sm text-muted-foreground">{branch.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Created {formatDistanceToNow(new Date(branch.created_at), { addSuffix: true })}
                  {branch.creator && ` by ${branch.creator.full_name ?? branch.creator.email}`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Diff Summary */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Changes to be Merged
              </h4>
              {loadingDiff ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : diffSummary ? (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-success">+{diffSummary.added}</div>
                    <div className="text-xs text-muted-foreground">Added</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-destructive">-{diffSummary.removed}</div>
                    <div className="text-xs text-muted-foreground">Removed</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-warning">~{diffSummary.modified}</div>
                    <div className="text-xs text-muted-foreground">Modified</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Unable to compute changes
                </p>
              )}
            </CardContent>
          </Card>

          {/* Warning */}
          <div className="flex items-start gap-3 rounded-lg bg-warning/10 border border-warning/30 p-4">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">This action will modify the main analysis</p>
              <p className="text-sm text-muted-foreground">
                The current state of the main analysis will be automatically saved as a backup
                before merging. You can restore it later if needed.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mergeBranch.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={mergeBranch.isPending}
            className="bg-accent hover:bg-accent/90"
          >
            {mergeBranch.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <GitMerge className="mr-2 h-4 w-4" />
            Merge Branch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
