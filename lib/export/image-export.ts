'use client'

import { toPng, toSvg } from 'html-to-image'
import { saveAs } from 'file-saver'
import type { ReactFlowInstance } from '@xyflow/react'

interface ExportImageOptions {
  filename?: string
  backgroundColor?: string
  quality?: number
}

/**
 * Export the ReactFlow canvas to PNG
 */
export async function exportToPng(
  reactFlowWrapper: HTMLElement | null,
  options: ExportImageOptions = {}
): Promise<void> {
  if (!reactFlowWrapper) {
    throw new Error('ReactFlow wrapper element not found')
  }

  const { filename = 'fault-tree.png', backgroundColor = '#ffffff', quality = 1 } = options

  // Find the viewport element
  const viewport = reactFlowWrapper.querySelector('.react-flow__viewport') as HTMLElement
  if (!viewport) {
    throw new Error('ReactFlow viewport not found')
  }

  try {
    const dataUrl = await toPng(viewport, {
      backgroundColor,
      quality,
      pixelRatio: 2, // Higher resolution
      filter: (node) => {
        // Exclude controls and minimap from export
        const className = node.className?.toString() || ''
        if (
          className.includes('react-flow__controls') ||
          className.includes('react-flow__minimap') ||
          className.includes('react-flow__background')
        ) {
          return false
        }
        return true
      },
    })

    // Convert data URL to blob and save
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    saveAs(blob, filename)
  } catch (error) {
    console.error('Error exporting to PNG:', error)
    throw error
  }
}

/**
 * Export the ReactFlow canvas to SVG
 */
export async function exportToSvg(
  reactFlowWrapper: HTMLElement | null,
  options: ExportImageOptions = {}
): Promise<void> {
  if (!reactFlowWrapper) {
    throw new Error('ReactFlow wrapper element not found')
  }

  const { filename = 'fault-tree.svg', backgroundColor = '#ffffff' } = options

  // Find the viewport element
  const viewport = reactFlowWrapper.querySelector('.react-flow__viewport') as HTMLElement
  if (!viewport) {
    throw new Error('ReactFlow viewport not found')
  }

  try {
    const dataUrl = await toSvg(viewport, {
      backgroundColor,
      filter: (node) => {
        // Exclude controls and minimap from export
        const className = node.className?.toString() || ''
        if (
          className.includes('react-flow__controls') ||
          className.includes('react-flow__minimap') ||
          className.includes('react-flow__background')
        ) {
          return false
        }
        return true
      },
    })

    // Convert data URL to blob and save
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    saveAs(blob, filename)
  } catch (error) {
    console.error('Error exporting to SVG:', error)
    throw error
  }
}

/**
 * Fit the view to show all nodes before export
 */
export function fitViewForExport(reactFlowInstance: ReactFlowInstance): void {
  reactFlowInstance.fitView({ padding: 0.2, duration: 0 })
}

/**
 * Capture the ReactFlow canvas as a base64 data URL for embedding in PDFs
 */
export async function captureCanvasAsDataUrl(
  reactFlowWrapper: HTMLElement | null,
  options: ExportImageOptions = {}
): Promise<string | null> {
  if (!reactFlowWrapper) {
    return null
  }

  const { backgroundColor = '#ffffff', quality = 1 } = options

  // Find the viewport element
  const viewport = reactFlowWrapper.querySelector('.react-flow__viewport') as HTMLElement
  if (!viewport) {
    return null
  }

  try {
    const dataUrl = await toPng(viewport, {
      backgroundColor,
      quality,
      pixelRatio: 2, // Higher resolution for better PDF quality
      filter: (node) => {
        // Exclude controls and minimap from export
        const className = node.className?.toString() || ''
        if (
          className.includes('react-flow__controls') ||
          className.includes('react-flow__minimap') ||
          className.includes('react-flow__background')
        ) {
          return false
        }
        return true
      },
    })

    return dataUrl
  } catch (error) {
    console.error('Error capturing canvas:', error)
    return null
  }
}
