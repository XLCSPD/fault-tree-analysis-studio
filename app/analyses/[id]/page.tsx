'use client'

import { useEffect, useCallback, useState, use, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { useCanvasStore, type FaultTreeNodeData } from '@/lib/store/canvas-store'
import { useAnalysis, useUpdateAnalysis } from '@/lib/hooks/use-analysis'
import { useNodes, useEdges, useCreateNode, useUpdateNode, useDeleteNode, useDeleteNodes, useCreateEdge, useDeleteEdge, useUpdateNodePosition, useBatchUpdatePositions } from '@/lib/hooks/use-nodes'
import { useTableProjection, useCreateFromTableRow, useUpdateFromTable, type TableRow } from '@/lib/hooks/use-table-projection'
import { useRiskScore, useUpsertRiskScore } from '@/lib/hooks/use-risk-scores'
import { useUser } from '@/lib/hooks/use-user'
import { exportToXlsx } from '@/lib/export/xlsx-export'
import { exportToPdf } from '@/lib/export/pdf-export'
import { exportToPng, exportToSvg, captureCanvasAsDataUrl } from '@/lib/export/image-export'
import { getLayoutedElements } from '@/lib/layout/auto-layout'
import { SearchBar } from '@/components/canvas/search-bar'
import { NodeBreadcrumb } from '@/components/canvas/node-breadcrumb'
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
  X,
  Search
} from 'lucide-react'
import { EditableCell } from '@/components/table/editable-cell'
import { VirtualizedTable } from '@/components/table/virtualized-table'
import { ActionItemsPanel } from '@/components/inspector/action-items-panel'
import { MetadataPanel } from '@/components/inspector/metadata-panel'
import { EvidencePanel } from '@/components/inspector/evidence-panel'
import { AIAssistPanel } from '@/components/inspector/ai-assist-panel'
import { useToast } from '@/lib/hooks/use-toast'
import { useRealtimeSync } from '@/lib/hooks/use-realtime-sync'
import { usePresence } from '@/lib/hooks/use-presence'
import { CollaboratorCursors } from '@/components/canvas/collaborator-cursors'
import { PresenceAvatars } from '@/components/ui/presence-avatars'
import type { Node } from '@xyflow/react'

const nodeTypes = {
  faultTree: FaultTreeNode,
}

interface PageProps {
  params: Promise<{ id: string }>
}

function FTAStudioContent({ analysisId }: { analysisId: string }) {
  const router = useRouter()
  const [showTable, setShowTable] = useState(true)
  const [showInspector, setShowInspector] = useState(true)
  const [showMetadata, setShowMetadata] = useState(false)
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null)
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const [tableSearchQuery, setTableSearchQuery] = useState('')
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map())

  // User and organization info
  const { organization } = useUser()
  const { toast } = useToast()

  // Real-time collaboration
  useRealtimeSync({ analysisId, enabled: true })
  const { collaborators, updateCursor, updateSelectedNode, isConnected } = usePresence({
    analysisId,
    enabled: true,
  })

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

  // Filtered table data based on search query
  const filteredTableData = useMemo(() => {
    if (!tableData || !tableSearchQuery.trim()) return tableData
    const query = tableSearchQuery.toLowerCase()
    return tableData.filter(row => {
      // Search across all text fields
      const searchableFields = [
        row.failure_mode_top,
        row.why_1, row.why_2, row.why_3, row.why_4, row.why_5,
        row.why_6, row.why_7, row.why_8, row.why_9,
        row.units, row.specification,
        row.investigation_item, row.investigation_result,
        row.person_responsible_name, row.remarks
      ]
      return searchableFields.some(field =>
        field?.toLowerCase().includes(query)
      )
    })
  }, [tableData, tableSearchQuery])

  // Selected node risk score
  const { data: selectedRiskScore } = useRiskScore(selectedNodeId)

  // Mutations
  const updateAnalysis = useUpdateAnalysis(analysisId)
  const createNode = useCreateNode(analysisId)
  const updateNodeDb = useUpdateNode(analysisId)
  const deleteNodeDb = useDeleteNode(analysisId)
  const createEdge = useCreateEdge(analysisId)
  const deleteEdgeDb = useDeleteEdge(analysisId)
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
    onAddEdge: async (edge) => {
      await createEdge.mutateAsync({
        source_id: edge.source,
        target_id: edge.target,
      })
    },
    onDeleteEdge: async (edgeId) => {
      await deleteEdgeDb.mutateAsync(edgeId)
    },
  })

  // ReactFlow instance
  const reactFlowInstance = useReactFlow()

  // Track selected node in a ref for the sync effect
  const selectedNodeIdRef = useRef(selectedNodeId)
  selectedNodeIdRef.current = selectedNodeId

  // Update presence when selected node changes
  useEffect(() => {
    updateSelectedNode(selectedNodeId)
  }, [selectedNodeId, updateSelectedNode])

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

  // Add new node with smart positioning for horizontal tree layout
  const handleAddNode = useCallback(async (parentId?: string) => {
    const HORIZONTAL_SPACING = 300 // Space between parent and child (columns)
    const VERTICAL_SPACING = 120 // Space between siblings

    let position = { x: 100, y: 200 }

    if (parentId) {
      // Find the parent node
      const parentNode = nodes.find(n => n.id === parentId)
      if (parentNode) {
        // Find existing children of this parent
        const childEdges = edges.filter(e => e.source === parentId)
        const childNodes = childEdges
          .map(e => nodes.find(n => n.id === e.target))
          .filter(Boolean) as typeof nodes

        // Position to the right of parent
        position.x = parentNode.position.x + HORIZONTAL_SPACING

        if (childNodes.length > 0) {
          // Position below existing siblings
          const maxChildY = Math.max(...childNodes.map(n => n.position.y))
          position.y = maxChildY + VERTICAL_SPACING
        } else {
          // First child - align with parent's Y
          position.y = parentNode.position.y
        }
      }
    } else if (nodes.length > 0) {
      // No parent - adding a new root or sibling root
      // Find rightmost node position and add to the right
      const maxX = Math.max(...nodes.map(n => n.position.x))
      const maxY = Math.max(...nodes.map(n => n.position.y))
      position.x = 100
      position.y = maxY + VERTICAL_SPACING
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
      const newEdge = await createEdge.mutateAsync({
        source_id: parentId,
        target_id: newNode.id,
      })
      // Track edge creation for undo
      if (newEdge) {
        const edgeForHistory = {
          id: newEdge.id,
          source: newEdge.source_id,
          target: newEdge.target_id,
        }
        pushCommand(createEdgeCommand('ADD_EDGE', newEdge.id, undefined, edgeForHistory))
      }
    }

    // Select the new node
    if (newNode) {
      setSelectedNodeId(newNode.id)
    }
  }, [createNode, createEdge, nodes, edges, pushCommand, setSelectedNodeId])

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
      // Fit view and capture tree as image
      reactFlowInstance.fitView({ padding: 0.2, duration: 0 })
      await new Promise(resolve => setTimeout(resolve, 100)) // Wait for fitView
      const treeImage = await captureCanvasAsDataUrl(canvasWrapperRef.current)

      await exportToPdf({
        analysis,
        tableData,
        includeTreeImage: treeImage || undefined,
      })
    } catch (error) {
      console.error('PDF export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [analysis, tableData, reactFlowInstance])

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
      direction: 'LR',
      nodeWidth: 220,
      nodeHeight: 100,
      rankSep: 280,
      nodeSep: 60,
      align: 'UL',
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
      const newEdge = await createEdge.mutateAsync({
        source_id: parentEdge.source,
        target_id: newNode.id,
      })
      // Track edge creation for undo
      if (newEdge) {
        const edgeForHistory = {
          id: newEdge.id,
          source: newEdge.source_id,
          target: newEdge.target_id,
        }
        pushCommand(createEdgeCommand('ADD_EDGE', newEdge.id, undefined, edgeForHistory))
      }
    }
  }, [nodes, edges, createNode, createEdge, pushCommand])

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

      // Ctrl+S to save (shows confirmation since autosave is active)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        toast({
          title: 'All changes saved',
          description: 'Your work is automatically saved as you make changes.',
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, selectedNodeIds, handleDeleteNode, handleAddNode, handleAddSibling, handleDuplicateNode, clearSelection, handleUndo, handleRedo, toast])

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

  // Calculate rowspan for merged cells in the table
  // Returns a map of rowIndex -> colIndex -> { rowSpan: number, isFirst: boolean }
  const getRowSpanMap = (data: TableRow[]) => {
    const map: Map<number, Map<number, { rowSpan: number; isFirst: boolean }>> = new Map()

    if (!data || data.length === 0) return map

    // Initialize map for all rows
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      map.set(rowIdx, new Map())
    }

    // For each column (failure_mode_top and why_1 through why_5)
    for (let colIdx = 0; colIdx <= 5; colIdx++) {
      let groupStart = 0

      for (let rowIdx = 0; rowIdx <= data.length; rowIdx++) {
        const currentValue = rowIdx < data.length ? getColumnValue(data[rowIdx], colIdx) : null
        const prevValue = rowIdx > 0 ? getColumnValue(data[rowIdx - 1], colIdx) : null

        // Check if we need to also compare parent columns to ensure proper grouping
        let sameParent = true
        if (rowIdx > 0 && rowIdx < data.length) {
          for (let parentCol = 0; parentCol < colIdx; parentCol++) {
            if (getColumnValue(data[rowIdx], parentCol) !== getColumnValue(data[rowIdx - 1], parentCol)) {
              sameParent = false
              break
            }
          }
        }

        // End of group: different value, different parent, or end of data
        if (rowIdx === data.length || currentValue !== prevValue || !sameParent) {
          // Set rowSpan for the group
          const groupSize = rowIdx - groupStart
          if (groupSize > 0) {
            // First row in group gets the rowSpan
            map.get(groupStart)?.set(colIdx, { rowSpan: groupSize, isFirst: true })
            // Other rows in group are marked as not first (will be skipped)
            for (let i = groupStart + 1; i < rowIdx; i++) {
              map.get(i)?.set(colIdx, { rowSpan: 0, isFirst: false })
            }
          }
          groupStart = rowIdx
        }
      }
    }

    return map
  }

  // Compute rowspan map when tableData changes
  // Only use rowspan merging when not filtering (filter breaks the parent-child hierarchy)
  const rowSpanMap = (filteredTableData && !tableSearchQuery.trim())
    ? getRowSpanMap(filteredTableData)
    : new Map()

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
            <Link href="/analyses" className="flex items-center gap-2">
              <NextImage
                src="/fta-studio-icon.png"
                alt="FTA Studio"
                width={28}
                height={28}
              />
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
            {/* Collaborators */}
            {collaborators.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <PresenceAvatars collaborators={collaborators} maxVisible={3} />
                {isConnected && (
                  <span className="text-xs text-muted-foreground">
                    {collaborators.length} online
                  </span>
                )}
              </div>
            )}
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`flex overflow-hidden ${showTable ? 'flex-1' : 'flex-1'}`}>
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

          {/* Collaborator Cursors */}
          <CollaboratorCursors collaborators={collaborators} />
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
                <h2 className="text-lg font-semibold mb-2">Node Inspector</h2>
                <NodeBreadcrumb
                  nodeId={selectedNodeId}
                  onNodeClick={(id) => {
                    setSelectedNodeId(id)
                    // Pan to the clicked node
                    const node = nodes.find(n => n.id === id)
                    if (node) {
                      reactFlowInstance.fitView({ nodes: [node], duration: 300 })
                    }
                  }}
                  className="mb-4"
                />
                <Tabs defaultValue="details">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="risk">Risk</TabsTrigger>
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                    <TabsTrigger value="evidence">Evidence</TabsTrigger>
                    <TabsTrigger value="ai">AI Assist</TabsTrigger>
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

                  <TabsContent value="ai" className="mt-4">
                    <AIAssistPanel
                      analysisId={analysisId}
                      nodeId={selectedNodeId}
                      organizationId={organization?.id || null}
                    />
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

        {/* Table View - Virtualized Split Screen */}
        {showTable && (
          <VirtualizedTable
            tableData={tableData}
            isLoading={tableLoading}
            searchQuery={tableSearchQuery}
            onSearchChange={setTableSearchQuery}
            onLabelUpdate={handleTableLabelUpdate}
            onRiskUpdate={handleTableRiskUpdate}
            onClose={() => setShowTable(false)}
          />
        )}
      </div>
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
