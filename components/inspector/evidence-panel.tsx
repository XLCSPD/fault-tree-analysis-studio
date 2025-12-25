'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useNodeEvidence,
  useCreateEvidence,
  useDeleteEvidence,
  useUploadEvidenceFile,
  useGetSignedUrl,
  evidenceTypeLabels,
} from '@/lib/hooks/use-evidence'
import { useUser } from '@/lib/hooks/use-user'
import type { Database, Json } from '@/types/database'
import {
  Image,
  File,
  Link,
  FileText,
  Ruler,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  Download,
  X,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type EvidenceType = Database['public']['Enums']['evidence_type']
type EvidenceAttachment = Database['public']['Tables']['evidence_attachments']['Row']

interface EvidencePanelProps {
  nodeId: string | null
}

const typeIcons: Record<EvidenceType, React.ReactNode> = {
  photo: <Image className="w-4 h-4" />,
  file: <File className="w-4 h-4" />,
  link: <Link className="w-4 h-4" />,
  note: <FileText className="w-4 h-4" />,
  measurement: <Ruler className="w-4 h-4" />,
}

const typeColors: Record<EvidenceType, string> = {
  photo: 'bg-purple-100 text-purple-700 border-purple-200',
  file: 'bg-blue-100 text-blue-700 border-blue-200',
  link: 'bg-green-100 text-green-700 border-green-200',
  note: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  measurement: 'bg-orange-100 text-orange-700 border-orange-200',
}

export function EvidencePanel({ nodeId }: EvidencePanelProps) {
  const { user } = useUser()
  const [isAdding, setIsAdding] = useState(false)
  const [addType, setAddType] = useState<EvidenceType>('note')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [measurementValue, setMeasurementValue] = useState('')
  const [measurementUnit, setMeasurementUnit] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: evidence, isLoading } = useNodeEvidence(nodeId)
  const createEvidence = useCreateEvidence()
  const deleteEvidence = useDeleteEvidence()
  const uploadFile = useUploadEvidenceFile()
  const getSignedUrl = useGetSignedUrl()

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setUrl('')
    setMeasurementValue('')
    setMeasurementUnit('')
    setIsAdding(false)
  }

  const handleSubmit = async () => {
    if (!nodeId || !user?.id || !title.trim()) return

    let metadata: Record<string, unknown> = {}

    if (addType === 'measurement') {
      metadata = {
        value: measurementValue,
        unit: measurementUnit,
      }
    }

    await createEvidence.mutateAsync({
      node_id: nodeId,
      uploaded_by: user.id,
      type: addType,
      title: title.trim(),
      description: description.trim() || null,
      url: url.trim() || null,
      metadata: Object.keys(metadata).length > 0 ? (metadata as Json) : null,
    })

    resetForm()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !nodeId || !user?.id) return

    try {
      const result = await uploadFile.mutateAsync({
        file,
        nodeId,
        userId: user.id,
      })

      const evidenceType: EvidenceType = file.type.startsWith('image/') ? 'photo' : 'file'

      await createEvidence.mutateAsync({
        node_id: nodeId,
        uploaded_by: user.id,
        type: evidenceType,
        title: file.name,
        file_path: result.filePath,
        url: result.publicUrl,
        metadata: {
          originalName: result.fileName,
          size: result.fileSize,
          mimeType: result.mimeType,
        },
      })

      resetForm()
    } catch (error) {
      console.error('Failed to upload file:', error)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (item: EvidenceAttachment) => {
    if (!confirm('Delete this evidence?')) return

    await deleteEvidence.mutateAsync({
      id: item.id,
      filePath: item.file_path,
    })
  }

  const handleOpenFile = async (item: EvidenceAttachment) => {
    if (item.url) {
      window.open(item.url, '_blank')
    } else if (item.file_path) {
      const signedUrl = await getSignedUrl.mutateAsync(item.file_path)
      window.open(signedUrl, '_blank')
    }
  }

  if (!nodeId) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a node to view evidence
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Evidence List */}
      {evidence && evidence.length > 0 ? (
        <div className="space-y-2">
          {evidence.map((item) => (
            <EvidenceCard
              key={item.id}
              item={item}
              onDelete={() => handleDelete(item)}
              onOpen={() => handleOpenFile(item)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No evidence attached to this node
        </p>
      )}

      {/* Add Evidence */}
      {isAdding ? (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Add Evidence</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Type selector */}
          <div className="flex flex-wrap gap-1">
            {(Object.keys(evidenceTypeLabels) as EvidenceType[]).map((type) => (
              <button
                key={type}
                onClick={() => setAddType(type)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors',
                  addType === type ? typeColors[type] : 'bg-background hover:bg-muted'
                )}
              >
                {typeIcons[type]}
                {evidenceTypeLabels[type]}
              </button>
            ))}
          </div>

          {/* File upload for photo/file */}
          {(addType === 'photo' || addType === 'file') && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={addType === 'photo' ? 'image/*' : '*/*'}
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadFile.isPending}
              >
                {uploadFile.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {addType === 'photo' ? 'Upload Photo' : 'Upload File'}
              </Button>
            </div>
          )}

          {/* Link input */}
          {addType === 'link' && (
            <>
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Link title..."
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Description (optional)</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional notes..."
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm resize-none"
                  rows={2}
                />
              </div>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!title.trim() || createEvidence.isPending}
              >
                {createEvidence.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Link
              </Button>
            </>
          )}

          {/* Note input */}
          {addType === 'note' && (
            <>
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title..."
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Content</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Note content..."
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm resize-none"
                  rows={4}
                />
              </div>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!title.trim() || createEvidence.isPending}
              >
                {createEvidence.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Note
              </Button>
            </>
          )}

          {/* Measurement input */}
          {addType === 'measurement' && (
            <>
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Measurement name..."
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Value</Label>
                  <Input
                    value={measurementValue}
                    onChange={(e) => setMeasurementValue(e.target.value)}
                    placeholder="123.45"
                    className="h-8 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Unit</Label>
                  <Input
                    value={measurementUnit}
                    onChange={(e) => setMeasurementUnit(e.target.value)}
                    placeholder="PSI, mm, etc."
                    className="h-8 text-sm mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional notes..."
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm resize-none"
                  rows={2}
                />
              </div>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!title.trim() || createEvidence.isPending}
              >
                {createEvidence.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Measurement
              </Button>
            </>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Evidence
        </Button>
      )}
    </div>
  )
}

// Evidence Card Component
interface EvidenceCardProps {
  item: EvidenceAttachment
  onDelete: () => void
  onOpen: () => void
}

function EvidenceCard({ item, onDelete, onOpen }: EvidenceCardProps) {
  const metadata = item.metadata as Record<string, unknown> | null
  const itemType: EvidenceType = item.type
  const itemDescription: string | null = item.description
  const itemTitle: string = item.title
  const createdAt: string | null = item.created_at

  const renderDescription = () => {
    if (!itemDescription) return null
    return <p className="text-xs mt-1 opacity-80 line-clamp-2">{itemDescription}</p>
  }

  const renderMeasurement = () => {
    if (itemType !== 'measurement' || !metadata) return null
    return (
      <div className="text-lg font-bold mt-1">
        {String(metadata.value)}{' '}
        <span className="text-sm font-normal">{String(metadata.unit)}</span>
      </div>
    )
  }

  const renderFileSize = () => {
    if (!metadata?.size) return null
    return (
      <span className="text-xs opacity-60">
        {formatFileSize(metadata.size as number)}
      </span>
    )
  }

  const renderDate = () => {
    if (!createdAt) return null
    return (
      <div className="text-xs opacity-50 mt-1">
        {new Date(createdAt).toLocaleDateString()}
      </div>
    )
  }

  return (
    <div className={cn('border rounded-lg p-3', typeColors[itemType])}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{typeIcons[itemType]}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{itemTitle}</div>
          {renderMeasurement()}
          {renderDescription()}
          {renderFileSize()}
          {renderDate()}
        </div>

        <div className="flex items-center gap-1">
          {(item.url || item.file_path) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onOpen}
            >
              {itemType === 'link' ? (
                <ExternalLink className="w-3.5 h-3.5" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Helper function
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
