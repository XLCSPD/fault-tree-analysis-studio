'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type AnalysisInsert = Database['public']['Tables']['analyses']['Insert']
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PlusCircle, FileText, Calendar, Upload, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ImportDialog } from '@/components/import/import-dialog'

interface Analysis {
  id: string
  title: string
  model: string | null
  part_name: string | null
  status: string
  created_at: string
  analysis_date: string | null
}

export default function AnalysesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  // New Analysis Dialog
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  // Edit Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAnalysis, setDeletingAnalysis] = useState<Analysis | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchAnalyses()
  }, [])

  async function fetchAnalyses() {
    const supabase = createClient()

    // Get user's organization
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single<{ organization_id: string }>()
      if (profile) {
        setOrganizationId(profile.organization_id)
      }
    }

    const { data, error } = await supabase
      .from('analyses')
      .select('id, title, model, part_name, status, created_at, analysis_date')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAnalyses(data)
    }
    setLoading(false)
  }

  async function createNewAnalysis() {
    if (!newTitle.trim()) return

    setCreating(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCreating(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single<{ organization_id: string }>()

    if (!profile) {
      setCreating(false)
      return
    }

    const insertData: AnalysisInsert = {
      title: newTitle.trim(),
      organization_id: profile.organization_id,
      created_by: user.id,
      status: 'draft',
      analysis_date: new Date().toISOString().split('T')[0]
    }

    const { data, error } = await (supabase
      .from('analyses')
      .insert(insertData as any)
      .select('id')
      .single() as unknown as Promise<{ data: { id: string } | null, error: any }>)

    if (!error && data) {
      setNewDialogOpen(false)
      setNewTitle('')
      router.push(`/analyses/${data.id}`)
    }
    setCreating(false)
  }

  async function updateAnalysis() {
    if (!editingAnalysis || !editTitle.trim()) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await (supabase as any)
      .from('analyses')
      .update({ title: editTitle.trim() })
      .eq('id', editingAnalysis.id)

    if (!error) {
      setAnalyses(analyses.map(a =>
        a.id === editingAnalysis.id ? { ...a, title: editTitle.trim() } : a
      ))
      // Invalidate React Query cache so detail page gets fresh data
      queryClient.invalidateQueries({ queryKey: ['analysis', editingAnalysis.id] })
      setEditDialogOpen(false)
      setEditingAnalysis(null)
      setEditTitle('')
    }
    setSaving(false)
  }

  async function deleteAnalysis() {
    if (!deletingAnalysis) return

    setDeleting(true)
    const supabase = createClient()

    const { error } = await (supabase as any)
      .from('analyses')
      .delete()
      .eq('id', deletingAnalysis.id)

    if (!error) {
      setAnalyses(analyses.filter(a => a.id !== deletingAnalysis.id))
      setDeleteDialogOpen(false)
      setDeletingAnalysis(null)
    }
    setDeleting(false)
  }

  function openEditDialog(analysis: Analysis) {
    setEditingAnalysis(analysis)
    setEditTitle(analysis.title)
    setEditDialogOpen(true)
  }

  function openDeleteDialog(analysis: Analysis) {
    setDeletingAnalysis(analysis)
    setDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading analyses...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Fault Tree Analyses</h1>
          <p className="text-muted-foreground mt-1">
            Manage your root cause analyses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} disabled={!organizationId}>
            <Upload className="mr-2 h-4 w-4" />
            Import Excel
          </Button>
          <Button onClick={() => setNewDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Analysis
          </Button>
        </div>
      </div>

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No analyses yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first fault tree analysis to get started
            </p>
            <Button onClick={() => setNewDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {analyses.map((analysis) => (
            <Card key={analysis.id} className="hover:border-primary/50 transition-colors h-full relative group">
              <Link href={`/analyses/${analysis.id}`} className="block">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2 pr-8">
                      {analysis.title}
                    </CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                      analysis.status === 'draft'
                        ? 'bg-warning/10 text-warning'
                        : analysis.status === 'active'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-success/10 text-success'
                    }`}>
                      {analysis.status}
                    </span>
                  </div>
                  {(analysis.model || analysis.part_name) && (
                    <CardDescription className="line-clamp-1">
                      {[analysis.model, analysis.part_name].filter(Boolean).join(' - ')}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {analysis.analysis_date
                        ? format(new Date(analysis.analysis_date), 'MMM d, yyyy')
                        : format(new Date(analysis.created_at), 'MMM d, yyyy')
                      }
                    </div>
                  </div>
                </CardContent>
              </Link>

              {/* Action Menu */}
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e: React.MouseEvent) => e.preventDefault()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(analysis)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => openDeleteDialog(analysis)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Analysis Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Analysis</DialogTitle>
            <DialogDescription>
              Give your fault tree analysis a name to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="title">Analysis Name</Label>
            <Input
              id="title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Engine Failure Investigation"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTitle.trim()) {
                  createNewAnalysis()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createNewAnalysis} disabled={creating || !newTitle.trim()}>
              {creating ? 'Creating...' : 'Create Analysis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Analysis Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Analysis</DialogTitle>
            <DialogDescription>
              Enter a new name for this analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-title">Analysis Name</Label>
            <Input
              id="edit-title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Analysis name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editTitle.trim()) {
                  updateAnalysis()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateAnalysis} disabled={saving || !editTitle.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAnalysis?.title}"? This action cannot be undone and will permanently delete all associated data including nodes, risk scores, and action items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAnalysis}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      {organizationId && (
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          organizationId={organizationId}
          onImportComplete={(analysisId) => {
            router.push(`/analyses/${analysisId}`)
          }}
        />
      )}
    </div>
  )
}
