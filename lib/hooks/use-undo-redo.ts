'use client'

import { useCallback } from 'react'
import { useHistoryStore, type Command } from '@/lib/store/history-store'
import { useCanvasStore, type FaultTreeNodeData } from '@/lib/store/canvas-store'
import type { Node, Edge } from '@xyflow/react'

interface UndoRedoCallbacks {
  // Database operations to sync with undo/redo
  onAddNode?: (node: Node<FaultTreeNodeData>) => Promise<void>
  onDeleteNode?: (nodeId: string) => Promise<void>
  onUpdateNode?: (nodeId: string, data: Partial<FaultTreeNodeData>) => Promise<void>
  onMoveNode?: (nodeId: string, position: { x: number; y: number }) => Promise<void>
  onAddEdge?: (edge: Edge) => Promise<void>
  onDeleteEdge?: (edgeId: string) => Promise<void>
  onBatchMove?: (moves: Array<{ nodeId: string; position: { x: number; y: number } }>) => Promise<void>
}

export function useUndoRedo(callbacks?: UndoRedoCallbacks) {
  const { undo, redo, canUndo, canRedo, setIsUndoing, setIsRedoing } = useHistoryStore()
  const { nodes, edges, addNode, deleteNode, updateNode, updateNodePosition, addEdge, deleteEdge } = useCanvasStore()

  const handleUndo = useCallback(async () => {
    const command = undo()
    if (!command) return

    setIsUndoing(true)

    try {
      await executeReverseCommand(command, callbacks)
    } finally {
      setIsUndoing(false)
    }
  }, [undo, callbacks, setIsUndoing])

  const handleRedo = useCallback(async () => {
    const command = redo()
    if (!command) return

    setIsRedoing(true)

    try {
      await executeForwardCommand(command, callbacks)
    } finally {
      setIsRedoing(false)
    }
  }, [redo, callbacks, setIsRedoing])

  // Execute a command in reverse (for undo)
  async function executeReverseCommand(command: Command, cbs?: UndoRedoCallbacks) {
    const store = useCanvasStore.getState()

    switch (command.type) {
      case 'ADD_NODE':
        // Undo add = delete
        if (command.nodeId) {
          store.deleteNode(command.nodeId)
          await cbs?.onDeleteNode?.(command.nodeId)
        }
        break

      case 'DELETE_NODE':
        // Undo delete = add back
        if (command.nodeBefore) {
          store.addNode(command.nodeBefore)
          await cbs?.onAddNode?.(command.nodeBefore)
        }
        break

      case 'UPDATE_NODE':
        // Undo update = restore previous data
        if (command.nodeId && command.nodeBefore) {
          const data = command.nodeBefore.data
          store.updateNode(command.nodeId, data)
          await cbs?.onUpdateNode?.(command.nodeId, data)
        }
        break

      case 'MOVE_NODE':
        // Undo move = restore previous position
        if (command.nodeId && command.nodeBefore) {
          store.updateNodePosition(command.nodeId, command.nodeBefore.position)
          await cbs?.onMoveNode?.(command.nodeId, command.nodeBefore.position)
        }
        break

      case 'ADD_EDGE':
        // Undo add edge = delete
        if (command.edgeId) {
          store.deleteEdge(command.edgeId)
          await cbs?.onDeleteEdge?.(command.edgeId)
        }
        break

      case 'DELETE_EDGE':
        // Undo delete edge = add back
        if (command.edgeBefore) {
          store.addEdge(command.edgeBefore)
          await cbs?.onAddEdge?.(command.edgeBefore)
        }
        break

      case 'BATCH_MOVE':
        // Undo batch move = restore all previous positions
        if (command.batchNodes) {
          const moves = command.batchNodes.map(({ nodeId, positionBefore }) => {
            store.updateNodePosition(nodeId, positionBefore)
            return { nodeId, position: positionBefore }
          })
          await cbs?.onBatchMove?.(moves)
        }
        break
    }
  }

  // Execute a command forward (for redo)
  async function executeForwardCommand(command: Command, cbs?: UndoRedoCallbacks) {
    const store = useCanvasStore.getState()

    switch (command.type) {
      case 'ADD_NODE':
        // Redo add = add again
        if (command.nodeAfter) {
          store.addNode(command.nodeAfter)
          await cbs?.onAddNode?.(command.nodeAfter)
        }
        break

      case 'DELETE_NODE':
        // Redo delete = delete again
        if (command.nodeId) {
          store.deleteNode(command.nodeId)
          await cbs?.onDeleteNode?.(command.nodeId)
        }
        break

      case 'UPDATE_NODE':
        // Redo update = apply new data
        if (command.nodeId && command.nodeAfter) {
          const data = command.nodeAfter.data
          store.updateNode(command.nodeId, data)
          await cbs?.onUpdateNode?.(command.nodeId, data)
        }
        break

      case 'MOVE_NODE':
        // Redo move = apply new position
        if (command.nodeId && command.nodeAfter) {
          store.updateNodePosition(command.nodeId, command.nodeAfter.position)
          await cbs?.onMoveNode?.(command.nodeId, command.nodeAfter.position)
        }
        break

      case 'ADD_EDGE':
        // Redo add edge = add again
        if (command.edgeAfter) {
          store.addEdge(command.edgeAfter)
          await cbs?.onAddEdge?.(command.edgeAfter)
        }
        break

      case 'DELETE_EDGE':
        // Redo delete edge = delete again
        if (command.edgeId) {
          store.deleteEdge(command.edgeId)
          await cbs?.onDeleteEdge?.(command.edgeId)
        }
        break

      case 'BATCH_MOVE':
        // Redo batch move = apply all new positions
        if (command.batchNodes) {
          const moves = command.batchNodes.map(({ nodeId, positionAfter }) => {
            store.updateNodePosition(nodeId, positionAfter)
            return { nodeId, position: positionAfter }
          })
          await cbs?.onBatchMove?.(moves)
        }
        break
    }
  }

  return {
    handleUndo,
    handleRedo,
    canUndo: canUndo(),
    canRedo: canRedo(),
  }
}
