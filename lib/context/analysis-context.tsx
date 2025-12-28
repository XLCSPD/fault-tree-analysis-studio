'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { Database } from '@/types/database'

type Analysis = Database['public']['Tables']['analyses']['Row']
type AnalysisType = Database['public']['Enums']['analysis_type']

interface AnalysisContextValue {
  analysis: Analysis | null
  analysisId: string
  analysisType: AnalysisType
  isAdvancedMode: boolean
  isLoading: boolean
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null)

interface AnalysisProviderProps {
  children: ReactNode
  analysis: Analysis | null | undefined
  analysisId: string
  isLoading?: boolean
}

export function AnalysisProvider({
  children,
  analysis,
  analysisId,
  isLoading = false,
}: AnalysisProviderProps) {
  const analysisType = analysis?.analysis_type ?? 'SIMPLE'
  const isAdvancedMode = analysisType === 'ADVANCED'

  return (
    <AnalysisContext.Provider
      value={{
        analysis: analysis ?? null,
        analysisId,
        analysisType,
        isAdvancedMode,
        isLoading,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysisContext() {
  const context = useContext(AnalysisContext)
  if (!context) {
    throw new Error('useAnalysisContext must be used within an AnalysisProvider')
  }
  return context
}

/**
 * Hook for checking if gates are enabled for the current analysis.
 * Returns false in SIMPLE mode, true in ADVANCED mode.
 */
export function useGatesEnabled() {
  const context = useContext(AnalysisContext)
  // Default to false (SIMPLE mode) if no context
  return context?.isAdvancedMode ?? false
}

/**
 * Safe hook that returns null if used outside provider.
 * Useful for components that may be used in different contexts.
 */
export function useAnalysisContextSafe() {
  return useContext(AnalysisContext)
}
