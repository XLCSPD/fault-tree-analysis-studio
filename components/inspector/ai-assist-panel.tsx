'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles,
  ListPlus,
  ClipboardList,
  Lightbulb,
  Shield,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Check,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAIAssist } from '@/lib/hooks/use-ai-assist'
import { useCreateNode, useCreateEdge, useEdges } from '@/lib/hooks/use-nodes'
import { useCreateActionItem } from '@/lib/hooks/use-action-items'
import type { AISuggestion, AIModuleType } from '@/lib/ai/types'

interface AIAssistPanelProps {
  analysisId: string
  nodeId: string | null
  organizationId: string | null
}

const CONFIDENCE_CONFIG = {
  low: { label: 'Low', color: 'text-orange-600 bg-orange-50' },
  medium: { label: 'Medium', color: 'text-blue-600 bg-blue-50' },
  high: { label: 'High', color: 'text-green-600 bg-green-50' },
}

const MODULE_CONFIG = {
  next_whys: {
    icon: ListPlus,
    title: 'Propose Next Whys',
    description: 'Generate plausible child causes for this node',
  },
  investigations: {
    icon: ClipboardList,
    title: 'Propose Investigation Actions',
    description: 'Generate investigation tasks to prove/disprove this cause',
  },
  quality: {
    icon: Lightbulb,
    title: 'Improve Cause Quality',
    description: 'Suggest rewrites to make this cause more testable',
  },
  controls: {
    icon: Shield,
    title: 'Suggest Controls',
    description: 'Recommend preventive controls for this cause',
  },
}

function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  isProcessing,
}: {
  suggestion: AISuggestion
  onAccept: (mode: 'child' | 'sibling') => void
  onDismiss: () => void
  isProcessing: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const confidenceConfig = CONFIDENCE_CONFIG[suggestion.confidence]

  return (
    <div className="border rounded-lg p-3 bg-background">
      <div className="flex items-start gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{suggestion.content}</p>
          <div className="flex items-center gap-2 mt-1">
            {suggestion.category && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                {suggestion.category}
              </span>
            )}
            <span className={cn('text-xs px-1.5 py-0.5 rounded', confidenceConfig.color)}>
              {confidenceConfig.label} confidence
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 ml-6 space-y-2 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Why plausible: </span>
            <span>{suggestion.rationale}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Evidence to confirm: </span>
            <span>{suggestion.evidenceRequired}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 ml-6">
        {suggestion.type === 'node' && (
          <>
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs"
              onClick={() => onAccept('child')}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              Add Child
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onAccept('sibling')}
              disabled={isProcessing}
            >
              Add Sibling
            </Button>
          </>
        )}
        {suggestion.type === 'action' && (
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={() => onAccept('child')}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            Create Action
          </Button>
        )}
        {suggestion.type === 'rewrite' && (
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={() => onAccept('child')}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Apply Rewrite
          </Button>
        )}
        {suggestion.type === 'control' && (
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={() => onAccept('child')}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            Create Preventive Action
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={onDismiss}
          disabled={isProcessing}
        >
          <X className="h-3 w-3 mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  )
}

function AIModuleCard({
  module,
  isLoading,
  isCurrentModule,
  hasSuggestions,
  onGenerate,
}: {
  module: AIModuleType
  isLoading: boolean
  isCurrentModule: boolean
  hasSuggestions: boolean
  onGenerate: () => void
}) {
  const config = MODULE_CONFIG[module]
  const Icon = config.icon

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">{config.title}</h4>
            {hasSuggestions && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                Has suggestions
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full mt-3"
        onClick={onGenerate}
        disabled={isLoading}
      >
        {isLoading && isCurrentModule ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5 mr-2" />
            {hasSuggestions ? 'Regenerate' : 'Generate'} Suggestions
          </>
        )}
      </Button>
    </div>
  )
}

export function AIAssistPanel({
  analysisId,
  nodeId,
  organizationId,
}: AIAssistPanelProps) {
  const [activeModule, setActiveModule] = useState<AIModuleType | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Use AI assist hook when nodeId is available
  const aiAssist = useAIAssist({
    analysisId,
    nodeId: nodeId || '',
  })

  // Hooks for creating nodes, edges, and action items
  const createNode = useCreateNode(analysisId)
  const createEdge = useCreateEdge(analysisId)
  const createActionItem = useCreateActionItem(analysisId)
  const { data: edges } = useEdges(analysisId)

  const handleGenerate = useCallback((module: AIModuleType) => {
    setActiveModule(module)
    aiAssist.generateSuggestions(module)
  }, [aiAssist])

  const handleAccept = useCallback(async (suggestion: AISuggestion, mode: 'child' | 'sibling') => {
    if (!nodeId) return

    setProcessingId(suggestion.id)
    try {
      let createdEntityId: string | undefined

      if (suggestion.type === 'node') {
        // Create the new node
        const newNode = await createNode.mutateAsync({
          label: suggestion.content,
          type: 'basic_event',
          position: { x: 0, y: 0 }, // Will be repositioned by auto-layout
        })

        if (newNode) {
          createdEntityId = newNode.id

          // Determine parent node ID based on mode
          let parentNodeId: string
          if (mode === 'child') {
            // Parent is the currently selected node
            parentNodeId = nodeId
          } else {
            // mode === 'sibling': Find parent of current node
            const parentEdge = edges?.find(e => e.target === nodeId)
            if (parentEdge) {
              parentNodeId = parentEdge.source
            } else {
              // Current node is root, can't add sibling
              parentNodeId = nodeId // Fallback to child
            }
          }

          // Create edge connecting parent to new node
          await createEdge.mutateAsync({
            source_id: parentNodeId,
            target_id: newNode.id,
            gate_type: 'OR',
          })
        }
      } else if (suggestion.type === 'action') {
        // Create action item for this node
        const newAction = await createActionItem.mutateAsync({
          node_id: nodeId,
          investigation_item: suggestion.content,
        })

        if (newAction) {
          createdEntityId = newAction.id
        }
      }

      // TODO: Handle other suggestion types (rewrite, control)

      // Mark as accepted with the created entity ID
      aiAssist.acceptSuggestion(suggestion.id, createdEntityId)
    } catch (error) {
      console.error('Error accepting suggestion:', error)
    } finally {
      setProcessingId(null)
    }
  }, [aiAssist, nodeId, createNode, createEdge, createActionItem, edges])

  const handleDismiss = useCallback((suggestionId: string) => {
    aiAssist.dismissSuggestion(suggestionId)
  }, [aiAssist])

  // Get all pending suggestions across modules
  const allSuggestions = [
    ...aiAssist.getSuggestionsForModule('next_whys'),
    ...aiAssist.getSuggestionsForModule('investigations'),
    ...aiAssist.getSuggestionsForModule('quality'),
    ...aiAssist.getSuggestionsForModule('controls'),
  ]

  if (!nodeId) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          Select a node to access AI assistance
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
        <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-muted-foreground">
          AI suggestions require your review and acceptance before being applied.
          Suggestions are logged for audit purposes.
        </div>
      </div>

      {/* AI Modules */}
      <div className="space-y-3">
        <AIModuleCard
          module="next_whys"
          isLoading={aiAssist.isGenerating}
          isCurrentModule={aiAssist.generatingModule === 'next_whys'}
          hasSuggestions={aiAssist.hasPendingSuggestions('next_whys')}
          onGenerate={() => handleGenerate('next_whys')}
        />
        <AIModuleCard
          module="investigations"
          isLoading={aiAssist.isGenerating}
          isCurrentModule={aiAssist.generatingModule === 'investigations'}
          hasSuggestions={aiAssist.hasPendingSuggestions('investigations')}
          onGenerate={() => handleGenerate('investigations')}
        />
        <AIModuleCard
          module="quality"
          isLoading={aiAssist.isGenerating}
          isCurrentModule={aiAssist.generatingModule === 'quality'}
          hasSuggestions={aiAssist.hasPendingSuggestions('quality')}
          onGenerate={() => handleGenerate('quality')}
        />
        <AIModuleCard
          module="controls"
          isLoading={aiAssist.isGenerating}
          isCurrentModule={aiAssist.generatingModule === 'controls'}
          hasSuggestions={aiAssist.hasPendingSuggestions('controls')}
          onGenerate={() => handleGenerate('controls')}
        />
      </div>

      {/* Error message */}
      {aiAssist.error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {aiAssist.error instanceof Error ? aiAssist.error.message : 'An error occurred'}
        </div>
      )}

      {/* Suggestions */}
      {allSuggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Suggestions ({allSuggestions.length})</h4>
          </div>
          <div className="space-y-2">
            {allSuggestions.map(suggestion => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={(mode) => handleAccept(suggestion, mode)}
                onDismiss={() => handleDismiss(suggestion.id)}
                isProcessing={processingId === suggestion.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Loading state for initial fetch */}
      {aiAssist.isLoading && allSuggestions.length === 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
