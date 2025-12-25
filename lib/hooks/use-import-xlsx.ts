'use client'

import { useState, useCallback } from 'react'
import { parseXlsxFile, validateImportRows, ImportResult, ImportedRow } from '@/lib/import/xlsx-import'

interface UseImportXlsxReturn {
  file: File | null
  result: ImportResult | null
  isLoading: boolean
  error: string | null
  setFile: (file: File | null) => void
  parseFile: (file: File) => Promise<void>
  reset: () => void
}

export function useImportXlsx(): UseImportXlsxReturn {
  const [file, setFileState] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setFile = useCallback((newFile: File | null) => {
    setFileState(newFile)
    setResult(null)
    setError(null)
  }, [])

  const parseFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
      ]
      const validExtensions = ['.xlsx', '.xlsm']
      const hasValidExtension = validExtensions.some(ext =>
        file.name.toLowerCase().endsWith(ext)
      )

      if (!validTypes.includes(file.type) && !hasValidExtension) {
        throw new Error('Please upload an Excel file (.xlsx or .xlsm)')
      }

      const parseResult = await parseXlsxFile(file)

      // Additional validation
      const validationErrors = validateImportRows(parseResult.rows)
      parseResult.errors.push(...validationErrors)

      setResult(parseResult)
      setFileState(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setFileState(null)
    setResult(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    file,
    result,
    isLoading,
    error,
    setFile,
    parseFile,
    reset,
  }
}
