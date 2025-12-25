'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useImportXlsx } from '@/lib/hooks/use-import-xlsx'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/hooks/use-toast'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: (analysisId: string) => void
  organizationId: string
}

export function ImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  organizationId,
}: ImportDialogProps) {
  const { file, result, isLoading, error, parseFile, reset } = useImportXlsx()
  const [isImporting, setIsImporting] = useState(false)
  const [analysisName, setAnalysisName] = useState('')

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) {
        parseFile(file)
        // Suggest analysis name from filename
        const name = file.name.replace(/\.(xlsx|xlsm)$/i, '').replace(/_/g, ' ')
        setAnalysisName(name)
      }
    },
    [parseFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
    },
    maxFiles: 1,
    disabled: isLoading || isImporting,
  })

  const handleImport = async () => {
    if (!result || result.rows.length === 0) return

    setIsImporting(true)
    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          analysisName: analysisName || 'Imported Analysis',
          rows: result.rows,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Import failed')
      }

      const { analysisId } = await response.json()

      toast({
        title: 'Import successful',
        description: `Imported ${result.rows.length} rows`,
        variant: 'success',
      })

      onImportComplete(analysisId)
      handleClose()
    } catch (err) {
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    reset()
    setAnalysisName('')
    onOpenChange(false)
  }

  const hasErrors = result && result.errors.length > 0
  const hasWarnings = result && result.warnings.length > 0
  const canImport = result && result.rows.length > 0 && !isImporting

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx or .xlsm) to import data into a new analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          {!file && (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-sm text-primary">Drop the file here...</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop an Excel file here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports .xlsx and .xlsm files
                  </p>
                </>
              )}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Parsing file...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* File info and results */}
          {file && result && !isLoading && (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.rows.length} rows parsed
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={reset}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Analysis name input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Analysis Name</label>
                <input
                  type="text"
                  value={analysisName}
                  onChange={(e) => setAnalysisName(e.target.value)}
                  placeholder="Enter analysis name"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              {/* Success indicator */}
              {result.rows.length > 0 && !hasErrors && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-md">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">
                    Ready to import {result.rows.length} rows
                  </p>
                </div>
              )}

              {/* Warnings */}
              {hasWarnings && (
                <div className="space-y-1">
                  {result.warnings.map((warning, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 bg-yellow-50 text-yellow-800 rounded-md text-sm"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {warning}
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {hasErrors && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-destructive">
                    {result.errors.length} error(s) found:
                  </p>
                  {result.errors.slice(0, 10).map((err, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 bg-destructive/10 text-destructive rounded-md text-sm"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Row {err.row}: {err.message}
                      </span>
                    </div>
                  ))}
                  {result.errors.length > 10 && (
                    <p className="text-xs text-muted-foreground pl-6">
                      ...and {result.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              )}

              {/* Preview table */}
              {result.rows.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-muted px-3 py-2 text-xs font-medium">
                    Preview (first 5 rows)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left">Failure Mode</th>
                          <th className="px-3 py-2 text-left">Why Chain</th>
                          <th className="px-3 py-2 text-center">S</th>
                          <th className="px-3 py-2 text-center">O</th>
                          <th className="px-3 py-2 text-center">D</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.slice(0, 5).map((row, i) => {
                          const whyChain = [
                            row.why_1,
                            row.why_2,
                            row.why_3,
                            row.why_4,
                            row.why_5,
                          ]
                            .filter(Boolean)
                            .join(' > ')
                          return (
                            <tr key={i} className="border-t">
                              <td className="px-3 py-2 max-w-[150px] truncate">
                                {row.failure_mode_top}
                              </td>
                              <td className="px-3 py-2 max-w-[200px] truncate text-muted-foreground">
                                {whyChain || '-'}
                              </td>
                              <td className="px-3 py-2 text-center">{row.severity ?? '-'}</td>
                              <td className="px-3 py-2 text-center">{row.occurrence ?? '-'}</td>
                              <td className="px-3 py-2 text-center">{row.detection ?? '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Import {result?.rows.length ?? 0} Rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
