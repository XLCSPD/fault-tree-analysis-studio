import type { Database } from '@/types/database'

// AI suggestion types
export type AIModuleType = 'next_whys' | 'investigations' | 'quality' | 'controls'

export interface AISuggestion {
  id: string
  type: 'node' | 'action' | 'rewrite' | 'control'
  content: string
  rationale: string
  evidenceRequired: string
  confidence: 'low' | 'medium' | 'high'
  category?: string
}

export interface AIRunContext {
  nodeId: string
  nodeLabel: string
  nodeType: string
  nodePath: string[]
  analysisTitle: string
  analysisContext?: string
  siblingLabels?: string[]
  parentLabel?: string
}

export interface AIRequest {
  analysisId: string
  nodeId: string
  moduleType: AIModuleType
  context?: Record<string, unknown>
}

export interface AIResponse {
  runId: string
  suggestions: AISuggestion[]
  tokensUsed?: number
  model?: string
}

// Database types
export type AIRun = Database['public']['Tables']['ai_runs']['Row']
export type AIRunInsert = Database['public']['Tables']['ai_runs']['Insert']
export type AISuggestionRow = Database['public']['Tables']['ai_suggestions']['Row']
export type AISuggestionInsert = Database['public']['Tables']['ai_suggestions']['Insert']
