'use client'

import { useState } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import { useAllAnalysesVersions, useAllBranches, useAnalysisVersions, useDeleteVersion, useRestoreVersion, useToggleVersionLock, useBranches } from '@/lib/hooks/use-versions'
import { PageHeader } from '@/components/admin/page-header'
import { Loader2, ChevronDown, ChevronRight, GitBranch, History, Lock, Unlock, RotateCcw, Trash2, Eye, GitMerge, AlertTriangle, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useToast } from '@/lib/hooks/use-toast'
import type { AnalysisWithVersionInfo, VersionWithCreator } from '@/lib/versions/types'
import { BranchManager, CreateVersionDialog } from '@/components/versions'

export default function VersionsPage() {
  const { organization } = useUser()
  const orgId = organization?.id ?? null
  const { toast } = useToast()

  const { data: analyses, isLoading } = useAllAnalysesVersions(orgId)
  const { data: allBranches } = useAllBranches(orgId)

  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Version Control"
        description="Manage analysis versions, snapshots, and branches across your organization"
      />

      <Tabs defaultValue="analyses" className="mt-6">
        <TabsList>
          <TabsTrigger value="analyses" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            All Analyses
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Active Branches
            {allBranches && allBranches.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {allBranches.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyses" className="mt-4">
          {!analyses || analyses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No analyses found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Version history will appear here once analyses have versions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {analyses.map((analysis) => (
                <AnalysisVersionCard
                  key={analysis.id}
                  analysis={analysis}
                  isExpanded={expandedAnalysisId === analysis.id}
                  onToggle={() => setExpandedAnalysisId(
                    expandedAnalysisId === analysis.id ? null : analysis.id
                  )}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="branches" className="mt-4">
          {!allBranches || allBranches.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No active branches</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Experimental branches will appear here when created
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {allBranches.map((branch: any) => (
                <Card key={branch.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GitBranch className="h-5 w-5 text-accent" />
                        <div>
                          <p className="font-medium">{branch.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {branch.analysis?.title ?? 'Unknown Analysis'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Created {formatDistanceToNow(new Date(branch.created_at), { addSuffix: true })}
                        </span>
                        <Badge variant="outline">
                          {branch.status}
                        </Badge>
                      </div>
                    </div>
                    {branch.description && (
                      <p className="text-sm text-muted-foreground mt-2">{branch.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface AnalysisVersionCardProps {
  analysis: AnalysisWithVersionInfo
  isExpanded: boolean
  onToggle: () => void
}

function AnalysisVersionCard({ analysis, isExpanded, onToggle }: AnalysisVersionCardProps) {
  const [createVersionOpen, setCreateVersionOpen] = useState(false)

  return (
    <Card>
      <CardHeader
        className="cursor-pointer py-4"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-base">{analysis.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Badge variant={analysis.status === 'completed' ? 'default' : 'secondary'}>
                  {analysis.status}
                </Badge>
                {analysis.updated_at && (
                  <span className="text-xs">
                    Updated {formatDistanceToNow(new Date(analysis.updated_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setCreateVersionOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Save Version
            </Button>
            <div className="text-right">
              <p className="text-sm font-medium">
                {analysis.version_count} version{analysis.version_count !== 1 ? 's' : ''}
              </p>
              {analysis.branch_count > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <GitBranch className="h-3 w-3" />
                  {analysis.branch_count} branch{analysis.branch_count !== 1 ? 'es' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          <Tabs defaultValue="versions" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="versions" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Versions
              </TabsTrigger>
              <TabsTrigger value="branches" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Branches
                {analysis.branch_count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {analysis.branch_count}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="versions">
              <VersionTimeline analysisId={analysis.id} />
            </TabsContent>
            <TabsContent value="branches">
              <BranchManager
                analysisId={analysis.id}
                analysisTitle={analysis.title}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      )}

      <CreateVersionDialog
        open={createVersionOpen}
        onOpenChange={setCreateVersionOpen}
        analysisId={analysis.id}
        analysisTitle={analysis.title}
      />
    </Card>
  )
}

interface VersionTimelineProps {
  analysisId: string
}

function VersionTimeline({ analysisId }: VersionTimelineProps) {
  const { data: versions, isLoading } = useAnalysisVersions(analysisId)
  const deleteVersion = useDeleteVersion()
  const restoreVersion = useRestoreVersion(analysisId)
  const toggleLock = useToggleVersionLock()
  const { toast } = useToast()

  const [restoringId, setRestoringId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No versions yet</p>
        <p className="text-sm mt-1">Create a version to start tracking changes</p>
      </div>
    )
  }

  const handleRestore = async (version: VersionWithCreator) => {
    setRestoringId(version.id)
    try {
      await restoreVersion.mutateAsync(version.id)
      toast({
        title: 'Version restored',
        description: `Restored to version ${version.version_number}: ${version.name}`,
      })
    } catch (error) {
      toast({
        title: 'Restore failed',
        description: 'Failed to restore version. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setRestoringId(null)
    }
  }

  const handleToggleLock = async (version: VersionWithCreator) => {
    try {
      await toggleLock.mutateAsync({
        versionId: version.id,
        isLocked: !version.is_locked,
        analysisId,
      })
      toast({
        title: version.is_locked ? 'Version unlocked' : 'Version locked',
        description: version.is_locked
          ? 'This version can now be deleted'
          : 'This version is protected from deletion',
      })
    } catch (error) {
      toast({
        title: 'Failed to update lock status',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (version: VersionWithCreator) => {
    try {
      await deleteVersion.mutateAsync({ versionId: version.id, analysisId })
      toast({
        title: 'Version deleted',
        description: `Deleted version ${version.version_number}`,
      })
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete version. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="relative pl-6 border-l-2 border-muted ml-2 space-y-4">
      {versions.map((version, index) => (
        <div key={version.id} className="relative">
          {/* Timeline dot */}
          <div
            className={cn(
              'absolute -left-[25px] w-4 h-4 rounded-full border-2',
              version.is_auto
                ? 'bg-muted border-muted-foreground/50'
                : 'bg-accent border-accent'
            )}
          />

          {/* Version card */}
          <div
            className={cn(
              'p-3 rounded-lg border',
              version.is_auto ? 'bg-muted/30' : 'bg-card'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-muted-foreground">
                    v{version.version_number}
                  </span>
                  <span className="font-medium truncate">{version.name}</span>
                  {version.is_auto && (
                    <Badge variant="outline" className="text-xs">
                      Auto
                    </Badge>
                  )}
                  {version.is_locked && (
                    <Lock className="h-3 w-3 text-warning" />
                  )}
                </div>
                {version.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {version.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {version.creator?.full_name ?? version.creator?.email ?? 'Unknown'} &middot;{' '}
                  {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Lock/Unlock */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggleLock(version)}
                  title={version.is_locked ? 'Unlock version' : 'Lock version'}
                >
                  {version.is_locked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                </Button>

                {/* Restore (not for latest version) */}
                {index > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={restoringId === version.id}
                        title="Restore to this version"
                      >
                        {restoringId === version.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-warning" />
                          Restore Version?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will restore the analysis to version {version.version_number}: &quot;{version.name}&quot;.
                          A backup of the current state will be created automatically before restoring.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRestore(version)}>
                          Restore
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Delete (not if locked, not latest) */}
                {!version.is_locked && index > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Delete version"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Version?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete version {version.version_number}: &quot;{version.name}&quot;.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDelete(version)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
