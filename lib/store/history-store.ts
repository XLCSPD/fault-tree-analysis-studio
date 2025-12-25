import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'
import type { FaultTreeNodeData } from './canvas-store'

// Command types for undo/redo
export type CommandType =
  | 'ADD_NODE'
  | 'DELETE_NODE'
  | 'UPDATE_NODE'
  | 'MOVE_NODE'
  | 'ADD_EDGE'
  | 'DELETE_EDGE'
  | 'BATCH_MOVE'

export interface Command {
  type: CommandType
  timestamp: number
  // For node operations
  nodeId?: string
  nodeBefore?: Node<FaultTreeNodeData>
  nodeAfter?: Node<FaultTreeNodeData>
  // For edge operations
  edgeId?: string
  edgeBefore?: Edge
  edgeAfter?: Edge
  // For batch operations
  batchNodes?: Array<{
    nodeId: string
    positionBefore: { x: number; y: number }
    positionAfter: { x: number; y: number }
  }>
}

interface HistoryState {
  undoStack: Command[]
  redoStack: Command[]
  maxHistorySize: number
  isUndoing: boolean
  isRedoing: boolean

  // Actions
  pushCommand: (command: Omit<Command, 'timestamp'>) => void
  undo: () => Command | null
  redo: () => Command | null
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void
  setIsUndoing: (value: boolean) => void
  setIsRedoing: (value: boolean) => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50,
  isUndoing: false,
  isRedoing: false,

  pushCommand: (command) => {
    const { undoStack, maxHistorySize, isUndoing, isRedoing } = get()

    // Don't push commands during undo/redo operations
    if (isUndoing || isRedoing) return

    const newCommand: Command = {
      ...command,
      timestamp: Date.now(),
    }

    const newStack = [...undoStack, newCommand]

    // Trim stack if it exceeds max size
    if (newStack.length > maxHistorySize) {
      newStack.shift()
    }

    set({
      undoStack: newStack,
      redoStack: [], // Clear redo stack on new command
    })
  },

  undo: () => {
    const { undoStack, redoStack } = get()

    if (undoStack.length === 0) return null

    const command = undoStack[undoStack.length - 1]

    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, command],
    })

    return command
  },

  redo: () => {
    const { undoStack, redoStack } = get()

    if (redoStack.length === 0) return null

    const command = redoStack[redoStack.length - 1]

    set({
      undoStack: [...undoStack, command],
      redoStack: redoStack.slice(0, -1),
    })

    return command
  },

  canUndo: () => get().undoStack.length > 0,

  canRedo: () => get().redoStack.length > 0,

  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: [],
    })
  },

  setIsUndoing: (value) => set({ isUndoing: value }),

  setIsRedoing: (value) => set({ isRedoing: value }),
}))

// Helper hook to track node changes for history
export function createNodeCommand(
  type: 'ADD_NODE' | 'DELETE_NODE' | 'UPDATE_NODE' | 'MOVE_NODE',
  nodeId: string,
  before?: Node<FaultTreeNodeData>,
  after?: Node<FaultTreeNodeData>
): Omit<Command, 'timestamp'> {
  return {
    type,
    nodeId,
    nodeBefore: before,
    nodeAfter: after,
  }
}

export function createEdgeCommand(
  type: 'ADD_EDGE' | 'DELETE_EDGE',
  edgeId: string,
  before?: Edge,
  after?: Edge
): Omit<Command, 'timestamp'> {
  return {
    type,
    edgeId,
    edgeBefore: before,
    edgeAfter: after,
  }
}

export function createBatchMoveCommand(
  moves: Array<{
    nodeId: string
    positionBefore: { x: number; y: number }
    positionAfter: { x: number; y: number }
  }>
): Omit<Command, 'timestamp'> {
  return {
    type: 'BATCH_MOVE',
    batchNodes: moves,
  }
}
