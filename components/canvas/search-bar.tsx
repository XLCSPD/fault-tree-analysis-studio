'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Node, ReactFlowInstance } from '@xyflow/react'

interface SearchBarProps {
  nodes: Node[]
  onHighlight: (nodeIds: string[]) => void
  onNavigate: (nodeId: string) => void
  reactFlowInstance: ReactFlowInstance | null
}

export function SearchBar({ nodes, onHighlight, onNavigate, reactFlowInstance }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Node[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Search nodes when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      onHighlight([])
      return
    }

    const searchTerm = query.toLowerCase()
    const matches = nodes.filter((node) => {
      const label = (node.data?.label as string)?.toLowerCase() || ''
      return label.includes(searchTerm)
    })

    setResults(matches)
    setCurrentIndex(0)
    onHighlight(matches.map((n) => n.id))

    // Navigate to first result
    if (matches.length > 0) {
      navigateToNode(matches[0])
    }
  }, [query, nodes, onHighlight])

  // Navigate to a specific node
  const navigateToNode = useCallback(
    (node: Node) => {
      if (!reactFlowInstance) return

      const x = node.position.x + 100 // Center offset
      const y = node.position.y + 40

      reactFlowInstance.setCenter(x, y, { zoom: 1.5, duration: 500 })
      onNavigate(node.id)
    },
    [reactFlowInstance, onNavigate]
  )

  // Navigate to next result
  const goToNext = useCallback(() => {
    if (results.length === 0) return
    const nextIndex = (currentIndex + 1) % results.length
    setCurrentIndex(nextIndex)
    navigateToNode(results[nextIndex])
  }, [currentIndex, results, navigateToNode])

  // Navigate to previous result
  const goToPrevious = useCallback(() => {
    if (results.length === 0) return
    const prevIndex = (currentIndex - 1 + results.length) % results.length
    setCurrentIndex(prevIndex)
    navigateToNode(results[prevIndex])
  }, [currentIndex, results, navigateToNode])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          goToPrevious()
        } else {
          goToNext()
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
        onHighlight([])
      }
    },
    [goToNext, goToPrevious, onHighlight]
  )

  // Toggle search open/close
  const toggleSearch = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        // Focus input when opening
        setTimeout(() => inputRef.current?.focus(), 0)
      } else {
        // Clear search when closing
        setQuery('')
        onHighlight([])
      }
      return !prev
    })
  }, [onHighlight])

  // Global keyboard shortcut (Ctrl+F)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggleSearch}
        className="gap-2"
      >
        <Search className="w-4 h-4" />
        Search
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-background border rounded-lg px-2 py-1 shadow-sm">
      <Search className="w-4 h-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search nodes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-48 h-8 border-0 focus-visible:ring-0 px-0"
      />
      {results.length > 0 && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {currentIndex + 1} / {results.length}
        </span>
      )}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={goToPrevious}
          disabled={results.length === 0}
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={goToNext}
          disabled={results.length === 0}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={toggleSearch}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}
