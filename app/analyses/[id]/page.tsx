'use client'

import { useEffect, useCallback, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  NodeMouseHandler,
  Connection
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import FaultTreeNode from '@/components/canvas/fault-tree-node'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { useCanvasStore, type FaultTreeNodeData } from '@/lib/store/canvas-store'
import { useAnalysis, useUpdateAnalysis } from '@/lib/hooks/use-analysis'
import { useNodes, useEdges, useCreateNode, useUpdateNode, useDeleteNode, useDeleteNodes, useCreateEdge, useUpdateNodePosition, useBatchUpdatePositions } from '@/lib/hooks/use-nodes'
import { useTableProjection, useCreateFromTableRow, useUpdateFromTable, type TableRow } from '@/lib/hooks/use-table-projection'
import { useRiskScore, useUpsertRiskScore } from '@/lib/hooks/use-risk-scores'
import { useUser } from '@/lib/hooks/use-user'
import { exportToXlsx } from '@/lib/export/xlsx-export'
import { exportToPdf } from '@/lib/export/pdf-export'
import { exportToPng, exportToSvg } from '@/lib/export/image-export'
import { getLayoutedElements } from '@/lib/layout/auto-layout'
import { SearchBar } from '@/components/canvas/search-bar'
import { ContextMenu } from '@/components/canvas/context-menu'
import { CanvasProvider } from '@/lib/context/canvas-context'
import { useHistoryStore, createNodeCommand, createEdgeCommand, createBatchMoveCommand } from '@/lib/store/history-store'
import { useUndoRedo } from '@/lib/hooks/use-undo-redo'
import {
  Table,
  Eye,
  FileDown,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Save,
  ChevronLeft,
  RefreshCw,
  Settings,
  LayoutGrid,
  FileSpreadsheet,
  Image,
  FileCode,
  FileText,
  Undo2,
  Redo2,
  Pencil,
  Check,
  X
} from 'lucide-react'
import { EditableCell } from '@/components/table/editable-cell'
import { ActionItemsPanel } from '@/components/inspector/action-items-panel'
import { MetadataPanel } from '@/components/inspector/metadata-panel'
import { EvidencePanel } from '@/components/inspector/evidence-panel'
import type { Node } from '@xyflow/react'

const nodeTypes = {
  faultTree: FaultTreeNode,
}

interface PageProps {
  params: Promise<{ id: string }>
}

function FTAStudioContent({ analysisId }: { analysisId: string }) {
  const router = useRouter()
  const [showTable, setShowTable] = useState(false)
  const [showInspector, setShowInspector] = useState(true)
  const [showMetadata, setShowMetadata] = useState(false)
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null)
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map())

  // User and organization info
  const { organization } = useUser()

  // Canvas store
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    selectedNodeId,
    setSelectedNodeId,
    selectedNodeIds,
    toggleNodeSelection,
    selectNodes,
    clearSelection,
    getSelectedNodes,
    deleteNodes: deleteNodesLocal,
    initializeFromDb,
    isInitialized,
    updateNode: updateNodeLocal,
    deleteNode: deleteNodeLocal,
    getVisibleNodes,
    getVisibleEdges,
  } = useCanvasStore()

  // Get visible nodes/edges (respecting collapsed state)
  const visibleNodes = getVisibleNodes()
  const visibleEdges = getVisibleEdges()

  // History store for undo/redo
  const pushCommand = useHistoryStore((state) => state.pushCommand)

  // Data fetching
  const { data: analysis, isLoading: analysisLoading, error: analysisError } = useAnalysis(analysisId)
  const { data: dbNodes, isLoading: nodesLoading } = useNodes(analysisId)
  const { data: dbEdges, isLoading: edgesLoading } = useEdges(analysisId)
  const { data: tableData, isLoading: tableLoading } = useTableProjection(analysisId)

  // Selected node risk score
  const { data: selectedRiskScore } = useRiskScore(selectedNodeId)

  // Mutations
  const updateAnalysis = useUpdateAnalysis(analysisId)
  const createNode = useCreateNode(analysisId)
  const updateNodeDb = useUpdateNode(analysisId)
  const deleteNodeDb = useDeleteNode(analysisId)
  const createEdge = useCreateEdge(analysisId)
  const updateNodePosition = useUpdateNodePosition(analysisId)
  const upsertRiskScore = useUpsertRiskScore(analysisId)
  const createFromTableRow = useCreateFromTableRow(analysisId)
  const updateFromTable = useUpdateFromTable(analysisId)
  const batchUpdatePositions = useBatchUpdatePositions(analysisId)
  const deleteNodesDb = useDeleteNodes(analysisId)

  // Undo/Redo
  const { handleUndo, handleRedo, canUndo, canRedo } = useUndoRedo({
    onAddNode: async (node) => {
      // Re-create node in database
      await createNode.mutateAsync({
        type: node.data.nodeType,
        label: node.data.label,
        position: node.position,
        units: node.data.units,
        specification: node.data.specification,
        notes: node.data.notes,
      })
    },
    onDeleteNode: async (nodeId) => {
      await deleteNodeDb.mutateAsync(nodeId)
    },
    onUpdateNode: async (nodeId, data) => {
      await updateNodeDb.mutateAsync({
        nodeId,
        updates: {
          label: data.label,
          type: data.nodeType,
          notes: data.notes,
          units: data.units,
          specification: data.specification,
          evidence_status: data.evidenceStatus,
        },
      })
    },
    onMoveNode: async (nodeId, position) => {
      await updateNodePosition.mutateAsync({ nodeId, position })
    },
    onBatchMove: async (moves) => {
      await batchUpdatePositions.mutateAsync(moves.map(m => ({ nodeId: m.nodeId, position: m.position })))
    },
  })

  // ReactFlow instance
  const reactFlowInstance = useReactFlow()

  // Track selected node in a ref for the sync effect
  const selectedNodeIdRef = useRef(selectedNodeId)
  selectedNodeIdRef.current = selectedNodeId

  // Initialize and sync canvas from database
  // Re-sync whenever database data changes
  useEffect(() => {
    if (dbNodes && dbEdges) {
      // Preserve selected node if it still exists
      const currentSelectedId = selectedNodeIdRef.current
      const selectedStillExists = currentSelectedId && dbNodes.some(n => n.id === currentSelectedId)

      // Update the store
      initializeFromDb(dbNodes as Node<FaultTreeNodeData>[], dbEdges)

      // If selected node was deleted, clear selection
      if (currentSelectedId && !selectedStillExists) {
        setSelectedNodeId(null)
      }
    }
  }, [dbNodes, dbEdges, initializeFromDb, setSelectedNodeId])

  // Handle node selection
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    // Shift+click for multi-select
    toggleNodeSelection(node.id, event.shiftKey)
  }, [toggleNodeSelection])

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  // Handle connection (create edge)
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      createEdge.mutate({
        source_id: connection.source,
        target_id: connection.target,
      })
    }
  }, [createEdge])

  // Handle node drag start (save position for undo)
  const onNodeDragStart: NodeMouseHandler = useCallback((_, node) => {
    dragStartPositions.current.set(node.id, { ...node.position })
  }, [])

  // Handle node drag end (save position)
  const onNodeDragStop: NodeMouseHandler = useCallback((_, node) => {
    const startPosition = dragStartPositions.current.get(node.id)
    if (startPosition) {
      // Only push command if position actually changed
      if (startPosition.x !== node.position.x || startPosition.y !== node.position.y) {
        const nodeBefore = { ...node, position: startPosition } as Node<FaultTreeNodeData>
        const nodeAfter = { ...node } as Node<FaultTreeNodeData>
        pushCommand(createNodeCommand('MOVE_NODE', node.id, nodeBefore, nodeAfter))
      }
      dragStartPositions.current.delete(node.id)
    }
    updateNodePosition.mutate({
      nodeId: node.id,
      position: node.position,
    })
  }, [updateNodePosition, pushCommand])

  // Add new node
  const handleAddNode = useCallback(async (parentId?: string) => {
    const position = parentId
      ? { x: 0, y: 100 } // Will be positioned relative to parent
      : { x: 400, y: 50 }

    // Find a good position
    if (!parentId && nodes.length > 0) {
      const maxY = Math.max(...nodes.map(n => n.position.y))
      position.y = maxY + 150
    }

    const nodeType = parentId ? 'basic_event' : (nodes.length === 0 ? 'top_event' : 'intermediate_event')

    const newNode = await createNode.mutateAsync({
      type: nodeType,
      label: nodeType === 'top_event' ? 'New Top Event' : 'New Cause',
      position: position,
    })

    // Push command for undo
    if (newNode) {
      const nodeForHistory: Node<FaultTreeNodeData> = {
        id: newNode.id,
        type: 'faultTree',
        position: newNode.position as { x: number; y: number },
        data: {
          label: newNode.label,
          nodeType: newNode.type as FaultTreeNodeData['nodeType'],
          notes: newNode.notes,
          units: newNode.units,
          specification: newNode.specification,
          evidenceStatus: newNode.evidence_status as FaultTreeNodeData['evidenceStatus'],
          collapsed: false,
        },
      }
      pushCommand(createNodeCommand('ADD_NODE', newNode.id, undefined, nodeForHistory))
    }

    // Create edge if there's a parent
    if (parentId && newNode) {
      await createEdge.mutateAsync({
        source_id: parentId,
        target_id: newNode.id,
      })
    }
  }, [createNode, createEdge, nodes, pushCommand])

  // Delete selected nodes (handles both single and multi-select)
  const handleDeleteNode = useCallback(async () => {
    const selectedIds = Array.from(selectedNodeIds)

    if (selectedIds.length === 0) return

    if (selectedIds.length === 1) {
      // Single node delete
      const nodeId = selectedIds[0]
      const nodeToDelete = nodes.find(n => n.id === nodeId)
      if (nodeToDelete) {
        pushCommand(createNodeCommand('DELETE_NODE', nodeId, nodeToDelete as any, undefined))
      }
      deleteNodeLocal(nodeId)
      await deleteNodeDb.mutateAsync(nodeId)
    } else {
      // Multi-node delete - push commands for each node for undo
      for (const nodeId of selectedIds) {
        const nodeToDelete = nodes.find(n => n.id === nodeId)
        if (nodeToDelete) {
          pushCommand(createNodeCommand('DELETE_NODE', nodeId, nodeToDelete as any, undefined))
        }
      }
      deleteNodesLocal(selectedIds)
      await deleteNodesDb.mutateAsync(selectedIds)
    }
  }, [selectedNodeIds, deleteNodeLocal, deleteNodeDb, deleteNodesLocal, deleteNodesDb, nodes, pushCommand])

  // Update selected node
  const handleUpdateSelectedNode = useCallback(async (updates: Partial<FaultTreeNodeData>) => {
    if (!selectedNodeId) return

    // Get node before updating for undo
    const currentNode = nodes.find(n => n.id === selectedNodeId)
    if (currentNode) {
      const nodeBefore = { ...currentNode } as Node<FaultTreeNodeData>
      const nodeAfter = {
        ...currentNode,
        data: { ...currentNode.data, ...updates },
      } as Node<FaultTreeNodeData>
      pushCommand(createNodeCommand('UPDATE_NODE', selectedNodeId, nodeBefore, nodeAfter))
    }

    // Update local state immediately
    updateNodeLocal(selectedNodeId, updates)

    // Update database
    await updateNodeDb.mutateAsync({
      nodeId: selectedNodeId,
      updates: {
        label: updates.label,
        type: updates.nodeType,
        notes: updates.notes,
        units: updates.units,
        specification: updates.specification,
        evidence_status: updates.evidenceStatus,
      },
    })
  }, [selectedNodeId, updateNodeLocal, updateNodeDb, nodes, pushCommand])

  // Update risk score
  const handleUpdateRiskScore = useCallback(async (field: 'severity' | 'occurrence' | 'detection', value: number) => {
    if (!selectedNodeId) return

    await upsertRiskScore.mutateAsync({
      nodeId: selectedNodeId,
      [field]: value,
    })
  }, [selectedNodeId, upsertRiskScore])

  // Handle table cell label update
  const handleTableLabelUpdate = useCallback(async (
    pathPosition: number,
    oldLabel: string,
    newLabel: string
  ) => {
    if (!newLabel || newLabel === oldLabel) return
    await updateFromTable.mutateAsync({ pathPosition, oldLabel, newLabel })
  }, [updateFromTable])

  // Handle table risk score update
  const handleTableRiskUpdate = useCallback(async (
    leafNodeId: string,
    field: 'severity' | 'occurrence' | 'detection',
    value: string
  ) => {
    const numValue = parseInt(value) || null
    await upsertRiskScore.mutateAsync({
      nodeId: leafNodeId,
      [field]: numValue,
    })
  }, [upsertRiskScore])

  // Title editing
  const handleStartEditTitle = useCallback(() => {
    setEditingTitle(analysis?.title || '')
    setIsEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }, [analysis?.title])

  const handleSaveTitle = useCallback(async () => {
    if (!editingTitle.trim() || editingTitle.trim() === analysis?.title) {
      setIsEditingTitle(false)
      return
    }
    await updateAnalysis.mutateAsync({ title: editingTitle.trim() })
    setIsEditingTitle(false)
  }, [editingTitle, analysis?.title, updateAnalysis])

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
    }
  }, [handleSaveTitle])

  // Export handlers
  const handleExportXlsx = useCallback(async () => {
    if (!analysis || !tableData) return
    setIsExporting(true)
    try {
      await exportToXlsx({ analysis, tableData })
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [analysis, tableData])

  const handleExportPdf = useCallback(async () => {
    if (!analysis || !tableData) return
    setIsExporting(true)
    try {
      await exportToPdf({ analysis, tableData })
    } catch (error) {
      console.error('PDF export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [analysis, tableData])

  const handleExportPng = useCallback(async () => {
    setIsExporting(true)
    try {
      reactFlowInstance.fitView({ padding: 0.2, duration: 0 })
      await new Promise(resolve => setTimeout(resolve, 100)) // Wait for fitView
      await exportToPng(canvasWrapperRef.current, {
        filename: `${analysis?.title || 'fault-tree'}.png`,
      })
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [analysis, reactFlowInstance])

  const handleExportSvg = useCallback(async () => {
    setIsExporting(true)
    try {
      reactFlowInstance.fitView({ padding: 0.2, duration: 0 })
      await new Promise(resolve => setTimeout(resolve, 100))
      await exportToSvg(canvasWrapperRef.current, {
        filename: `${analysis?.title || 'fault-tree'}.svg`,
      })
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [analysis, reactFlowInstance])

  // Auto-layout handler
  const handleAutoLayout = useCallback(async () => {
    if (nodes.length === 0) return

    const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges, {
      direction: 'TB',
      nodeWidth: 200,
      nodeHeight: 80,
      rankSep: 100,
      nodeSep: 60,
    })

    // Track positions for undo
    const batchMoves = layoutedNodes.map(layoutedNode => {
      const originalNode = nodes.find(n => n.id === layoutedNode.id)
      return {
        nodeId: layoutedNode.id,
        positionBefore: originalNode?.position || { x: 0, y: 0 },
        positionAfter: layoutedNode.position,
      }
    }).filter(move =>
      move.positionBefore.x !== move.positionAfter.x ||
      move.positionBefore.y !== move.positionAfter.y
    )

    if (batchMoves.length > 0) {
      pushCommand(createBatchMoveCommand(batchMoves))
    }

    // Update positions in database
    const updates = layoutedNodes.map(node => ({
      nodeId: node.id,
      position: node.position,
    }))

    await batchUpdatePositions.mutateAsync(updates)

    // Fit view after layout
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 500 })
    }, 100)
  }, [nodes, edges, batchUpdatePositions, reactFlowInstance, pushCommand])

  // Context menu handlers
  const handleContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    })
  }, [])

  const handleAddSibling = useCallback(async (nodeId: string) => {
    // Find parent of the node
    const parentEdge = edges.find(e => e.target === nodeId)
    if (parentEdge) {
      await handleAddNode(parentEdge.source)
    } else {
      // No parent, add as new root-level node
      await handleAddNode()
    }
  }, [edges, handleAddNode])

  const handleDuplicateNode = useCallback(async (nodeId: string) => {
    const nodeToDuplicate = nodes.find(n => n.id === nodeId)
    if (!nodeToDuplicate) return

    const data = nodeToDuplicate.data as FaultTreeNodeData
    const newNode = await createNode.mutateAsync({
      type: data.nodeType,
      label: `${data.label} (copy)`,
      position: {
        x: nodeToDuplicate.position.x + 50,
        y: nodeToDuplicate.position.y + 50,
      },
      units: data.units,
      specification: data.specification,
      notes: data.notes,
    })

    // Create same parent edge if exists
    const parentEdge = edges.find(e => e.target === nodeId)
    if (parentEdge && newNode) {
      await createEdge.mutateAsync({
        source_id: parentEdge.source,
        target_id: newNode.id,
      })
    }
  }, [nodes, edges, createNode, createEdge])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Delete key to remove selected nodes
      if (e.key === 'Delete' && selectedNodeIds.size > 0) {
        e.preventDefault()
        handleDeleteNode()
      }

      // Tab to add child node
      if (e.key === 'Tab' && selectedNodeId && !e.shiftKey) {
        e.preventDefault()
        handleAddNode(selectedNodeId)
      }

      // Enter to add sibling node
      if (e.key === 'Enter' && selectedNodeId) {
        e.preventDefault()
        handleAddSibling(selectedNodeId)
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        clearSelection()
        setContextMenu(null)
      }

      // Ctrl+D to duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedNodeId) {
        e.preventDefault()
        handleDuplicateNode(selectedNodeId)
      }

      // Ctrl+Z to undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }

      // Ctrl+Y or Ctrl+Shift+Z to redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, selectedNodeIds, handleDeleteNode, handleAddNode, handleAddSibling, handleDuplicateNode, clearSelection, handleUndo, handleRedo])

  // Get column label by index
  const getColumnValue = (row: TableRow, colIndex: number): string | null => {
    switch (colIndex) {
      case 0: return row.failure_mode_top
      case 1: return row.why_1
      case 2: return row.why_2
      case 3: return row.why_3
      case 4: return row.why_4
      case 5: return row.why_5
      case 6: return row.why_6
      case 7: return row.why_7
      case 8: return row.why_8
      case 9: return row.why_9
      default: return null
    }
  }

  // Get selected node data
  const selectedNode = nodes.find(n => n.id === selectedNodeId)

  // Loading state
  const isLoading = analysisLoading || nodesLoading || edgesLoading

  if (analysisError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Analysis not found</h2>
          <p className="text-muted-foreground mb-4">The requested analysis could not be found.</p>
          <Link href="/analyses">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Analyses
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading analysis...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/analyses">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={titleInputRef}
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={handleSaveTitle}
                    className="text-xl font-semibold h-8 w-64"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleSaveTitle}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsEditingTitle(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={handleStartEditTitle}
                  className="flex items-center gap-2 group hover:bg-muted/50 rounded px-2 py-1 -ml-2 transition-colors"
                >
                  <h1 className="text-xl font-semibold">{analysis?.title || 'Untitled Analysis'}</h1>
                  <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              <p className="text-sm text-muted-foreground">
                {[analysis?.model, analysis?.part_name].filter(Boolean).join(' | ') || 'No metadata'}
                {analysis?.status && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    analysis.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    analysis.status === 'active' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {analysis.status}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportXlsx}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF Report (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPng}>
                  <Image className="w-4 h-4 mr-2" />
                  Image (.png)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSvg}>
                  <FileCode className="w-4 h-4 mr-2" />
                  Vector (.svg)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="h-7 w-7 p-0"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                className="h-7 w-7 p-0"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoLayout}
              disabled={nodes.length === 0 || batchUpdatePositions.isPending}
            >
              {batchUpdatePositions.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LayoutGrid className="w-4 h-4 mr-2" />
              )}
              Auto Layout
            </Button>
            <Button
              variant={showMetadata ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Metadata
            </Button>
            <Button
              variant={showTable ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowTable(!showTable)}
            >
              <Table className="w-4 h-4 mr-2" />
              Table View
            </Button>
            <Button
              variant={showInspector ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowInspector(!showInspector)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Inspector
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div ref={canvasWrapperRef} className="flex-1 relative">
          <ReactFlow
            nodes={visibleNodes.map(node => ({
              ...node,
              selected: selectedNodeIds.has(node.id),
              className: highlightedNodes.includes(node.id) ? 'ring-2 ring-yellow-400 ring-offset-2' : '',
            }))}
            edges={visibleEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => {
              onPaneClick()
              setContextMenu(null)
            }}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onNodeContextMenu={handleContextMenu}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background />
            <Controls />
            <MiniMap
              className="bg-background border rounded-lg"
              nodeColor={(n) => {
                const data = n.data as FaultTreeNodeData
                if (highlightedNodes.includes(n.id)) return '#facc15' // Yellow for highlighted
                if (data.nodeType === 'top_event') return '#ef4444'
                if (data.nodeType === 'intermediate_event') return '#3b82f6'
                return '#22c55e'
              }}
            />
          </ReactFlow>

          {/* Toolbar */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <SearchBar
              nodes={nodes}
              onHighlight={setHighlightedNodes}
              onNavigate={setSelectedNodeId}
              reactFlowInstance={reactFlowInstance}
            />
            <Button size="sm" onClick={() => handleAddNode()} disabled={createNode.isPending}>
              {createNode.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Node
            </Button>
            {selectedNodeIds.size > 1 ? (
              // Multi-select toolbar
              <div className="p-2 bg-background border rounded-lg shadow-sm space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {selectedNodeIds.size} nodes selected
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={handleDeleteNode}
                  disabled={deleteNodesDb.isPending}
                >
                  {deleteNodesDb.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={clearSelection}
                >
                  Clear Selection
                </Button>
              </div>
            ) : selectedNodeId ? (
              // Single selection toolbar
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddNode(selectedNodeId)}
                  disabled={createNode.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Child
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteNode}
                  disabled={deleteNodeDb.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            ) : null}
          </div>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No nodes yet. Add your first node to start building the fault tree.</p>
              </div>
            </div>
          )}

          {/* Context Menu */}
          {contextMenu && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              nodeId={contextMenu.nodeId}
              onClose={() => setContextMenu(null)}
              onAddChild={(id) => handleAddNode(id)}
              onAddSibling={handleAddSibling}
              onDelete={async (id) => {
                setSelectedNodeId(id)
                await handleDeleteNode()
              }}
              onDuplicate={handleDuplicateNode}
            />
          )}
        </div>

        {/* Metadata Panel */}
        {showMetadata && (
          <div className="w-96 border-l bg-background overflow-hidden">
            <MetadataPanel
              analysisId={analysisId}
              onClose={() => setShowMetadata(false)}
            />
          </div>
        )}

        {/* Inspector Panel */}
        {showInspector && (
          <div className="w-96 border-l bg-background overflow-y-auto">
            {selectedNode ? (
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Node Inspector</h2>
                <Tabs defaultValue="details">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="risk">Risk</TabsTrigger>
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                    <TabsTrigger value="evidence">Evidence</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="label">Label</Label>
                      <Input
                        id="label"
                        value={selectedNode.data.label}
                        onChange={(e) => handleUpdateSelectedNode({ label: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <select
                        id="type"
                        className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                        value={selectedNode.data.nodeType}
                        onChange={(e) => handleUpdateSelectedNode({
                          nodeType: e.target.value as FaultTreeNodeData['nodeType']
                        })}
                      >
                        <option value="top_event">Top Event</option>
                        <option value="intermediate_event">Intermediate Event</option>
                        <option value="basic_event">Basic Event</option>
                        <option value="gate">Gate</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="units">Units</Label>
                      <Input
                        id="units"
                        value={selectedNode.data.units || ''}
                        onChange={(e) => handleUpdateSelectedNode({ units: e.target.value || null })}
                        className="mt-1"
                        placeholder="e.g., PSI, RPM"
                      />
                    </div>
                    <div>
                      <Label htmlFor="specification">Specification</Label>
                      <Input
                        id="specification"
                        value={selectedNode.data.specification || ''}
                        onChange={(e) => handleUpdateSelectedNode({ specification: e.target.value || null })}
                        className="mt-1"
                        placeholder="e.g., > 100 PSI"
                      />
                    </div>
                    <div>
                      <Label htmlFor="evidenceStatus">Evidence Status</Label>
                      <select
                        id="evidenceStatus"
                        className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                        value={selectedNode.data.evidenceStatus || ''}
                        onChange={(e) => handleUpdateSelectedNode({
                          evidenceStatus: e.target.value as 'hypothesis' | 'verified' | null || null
                        })}
                      >
                        <option value="">Not set</option>
                        <option value="hypothesis">Hypothesis</option>
                        <option value="verified">Verified</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <textarea
                        id="notes"
                        className="w-full mt-1 px-3 py-2 border rounded-md bg-background resize-none"
                        rows={3}
                        placeholder="Additional notes..."
                        value={selectedNode.data.notes || ''}
                        onChange={(e) => handleUpdateSelectedNode({ notes: e.target.value || null })}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="risk" className="space-y-4 mt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="severity">Severity</Label>
                        <select
                          id="severity"
                          className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                          value={selectedRiskScore?.severity || ''}
                          onChange={(e) => handleUpdateRiskScore('severity', parseInt(e.target.value))}
                        >
                          <option value="">-</option>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="occurrence">Occurrence</Label>
                        <select
                          id="occurrence"
                          className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                          value={selectedRiskScore?.occurrence || ''}
                          onChange={(e) => handleUpdateRiskScore('occurrence', parseInt(e.target.value))}
                        >
                          <option value="">-</option>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="detection">Detection</Label>
                        <select
                          id="detection"
                          className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                          value={selectedRiskScore?.detection || ''}
                          onChange={(e) => handleUpdateRiskScore('detection', parseInt(e.target.value))}
                        >
                          <option value="">-</option>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-md">
                      <div className="text-sm font-medium">Risk Priority Number</div>
                      <div className="text-3xl font-bold">
                        {selectedRiskScore?.rpn || '—'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedRiskScore?.rpn ? (
                          selectedRiskScore.rpn >= 200 ? 'Critical Priority' :
                          selectedRiskScore.rpn >= 100 ? 'High Priority' :
                          selectedRiskScore.rpn >= 50 ? 'Medium Priority' :
                          'Low Priority'
                        ) : 'Set S, O, D to calculate'}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="actions" className="mt-4">
                    <ActionItemsPanel
                      analysisId={analysisId}
                      nodeId={selectedNodeId}
                      organizationId={organization?.id || null}
                    />
                  </TabsContent>

                  <TabsContent value="evidence" className="mt-4">
                    <EvidencePanel nodeId={selectedNodeId} />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="p-4 flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center">
                  Select a node to view and edit its properties
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table View Sheet */}
      <Sheet open={showTable} onOpenChange={setShowTable}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>Table View</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Click any cell to edit. Changes sync to canvas automatically.
            </p>
          </SheetHeader>
          <div className="mt-4 overflow-auto h-[calc(100%-60px)]">
            {tableLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : tableData && tableData.length > 0 ? (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium bg-muted min-w-[150px]">Failure Mode</th>
                    <th className="text-left p-2 font-medium bg-muted min-w-[120px]">Why 1</th>
                    <th className="text-left p-2 font-medium bg-muted min-w-[120px]">Why 2</th>
                    <th className="text-left p-2 font-medium bg-muted min-w-[120px]">Why 3</th>
                    <th className="text-left p-2 font-medium bg-muted min-w-[120px]">Why 4</th>
                    <th className="text-left p-2 font-medium bg-muted min-w-[120px]">Why 5</th>
                    <th className="text-left p-2 font-medium bg-muted w-14">S</th>
                    <th className="text-left p-2 font-medium bg-muted w-14">O</th>
                    <th className="text-left p-2 font-medium bg-muted w-14">D</th>
                    <th className="text-left p-2 font-medium bg-muted w-20">RPN</th>
                    <th className="text-left p-2 font-medium bg-muted min-w-[150px]">Investigation Item</th>
                    <th className="text-left p-2 font-medium bg-muted min-w-[100px]">Person</th>
                    <th className="text-left p-2 font-medium bg-muted min-w-[100px]">Schedule</th>
                    <th className="text-left p-2 font-medium bg-muted w-14">W1</th>
                    <th className="text-left p-2 font-medium bg-muted w-14">W2</th>
                    <th className="text-left p-2 font-medium bg-muted w-14">W3</th>
                    <th className="text-left p-2 font-medium bg-muted w-14">W4</th>
                    <th className="text-left p-2 font-medium bg-muted min-w-[150px]">Result</th>
                    <th className="text-left p-2 font-medium bg-muted w-24">Judgment</th>
                    <th className="text-left p-2 font-medium bg-muted min-w-[120px]">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr key={row.row_id} className="border-b">
                      {/* Failure Mode (position 0) */}
                      <td className="p-0 border-r">
                        <EditableCell
                          value={row.failure_mode_top}
                          onChange={(newValue) => handleTableLabelUpdate(0, row.failure_mode_top, newValue)}
                        />
                      </td>
                      {/* Why 1-5 (positions 1-5) */}
                      {[row.why_1, row.why_2, row.why_3, row.why_4, row.why_5].map((why, idx) => (
                        <td key={idx} className="p-0 border-r">
                          <EditableCell
                            value={why}
                            onChange={(newValue) => {
                              const oldValue = getColumnValue(row, idx + 1)
                              if (oldValue) {
                                handleTableLabelUpdate(idx + 1, oldValue, newValue)
                              }
                            }}
                            disabled={!why && idx > 0 && !getColumnValue(row, idx)}
                          />
                        </td>
                      ))}
                      {/* Severity */}
                      <td className="p-0 border-r">
                        <EditableCell
                          value={row.severity}
                          type="select"
                          options={[1,2,3,4,5,6,7,8,9,10].map(n => ({ value: n, label: String(n) }))}
                          onChange={(value) => handleTableRiskUpdate(row.leaf_node_id, 'severity', value)}
                        />
                      </td>
                      {/* Occurrence */}
                      <td className="p-0 border-r">
                        <EditableCell
                          value={row.occurrence}
                          type="select"
                          options={[1,2,3,4,5,6,7,8,9,10].map(n => ({ value: n, label: String(n) }))}
                          onChange={(value) => handleTableRiskUpdate(row.leaf_node_id, 'occurrence', value)}
                        />
                      </td>
                      {/* Detection */}
                      <td className="p-0 border-r">
                        <EditableCell
                          value={row.detection}
                          type="select"
                          options={[1,2,3,4,5,6,7,8,9,10].map(n => ({ value: n, label: String(n) }))}
                          onChange={(value) => handleTableRiskUpdate(row.leaf_node_id, 'detection', value)}
                        />
                      </td>
                      {/* RPN (read-only, calculated) */}
                      <td className="p-2 border-r">
                        {row.rpn ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            row.rpn >= 200 ? 'bg-red-100 text-red-700' :
                            row.rpn >= 100 ? 'bg-orange-100 text-orange-700' :
                            row.rpn >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {row.rpn}
                          </span>
                        ) : '—'}
                      </td>
                      {/* Investigation Item (read-only for now) */}
                      <td className="p-2 border-r text-xs">
                        {row.investigation_item || '—'}
                      </td>
                      {/* Person Responsible (read-only) */}
                      <td className="p-2 border-r text-xs">
                        {row.person_responsible_name || '—'}
                      </td>
                      {/* Schedule (read-only) */}
                      <td className="p-2 border-r text-xs">
                        {row.schedule || '—'}
                      </td>
                      {/* Week 1-4 Status */}
                      {[row.week_1_status, row.week_2_status, row.week_3_status, row.week_4_status].map((status, idx) => (
                        <td key={idx} className="p-1 border-r text-center">
                          {status ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              status === 'done' ? 'bg-green-100 text-green-700' :
                              status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              status === 'blocked' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {status === 'not_started' ? 'NS' :
                               status === 'in_progress' ? 'IP' :
                               status === 'done' ? 'D' :
                               status === 'blocked' ? 'B' : '—'}
                            </span>
                          ) : '—'}
                        </td>
                      ))}
                      {/* Investigation Result (read-only) */}
                      <td className="p-2 border-r text-xs max-w-[200px] truncate" title={row.investigation_result || ''}>
                        {row.investigation_result || '—'}
                      </td>
                      {/* Judgment (read-only) */}
                      <td className="p-2 border-r text-xs">
                        {row.judgment ? (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            row.judgment === 1 ? 'bg-green-100 text-green-700' :
                            row.judgment === 2 ? 'bg-blue-100 text-blue-700' :
                            row.judgment === 3 ? 'bg-gray-100 text-gray-600' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {row.judgment === 1 ? 'Root' :
                             row.judgment === 2 ? 'Contrib' :
                             row.judgment === 3 ? 'Not Cause' :
                             row.judgment === 4 ? 'Needs More' : row.judgment}
                          </span>
                        ) : '—'}
                      </td>
                      {/* Remarks (read-only) */}
                      <td className="p-2 text-xs max-w-[150px] truncate" title={row.remarks || ''}>
                        {row.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  No data yet. Add nodes to the canvas to see them here.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function FTAStudioPage({ params }: PageProps) {
  const resolvedParams = use(params)

  return (
    <ReactFlowProvider>
      <CanvasProvider analysisId={resolvedParams.id}>
        <FTAStudioContent analysisId={resolvedParams.id} />
      </CanvasProvider>
    </ReactFlowProvider>
  )
}
