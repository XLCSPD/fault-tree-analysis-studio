'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { searchArticles, type HelpArticle } from '@/lib/help/content'
import { Search, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HelpSearchProps {
  className?: string
  placeholder?: string
  autoFocus?: boolean
}

export function HelpSearch({ className, placeholder = 'Search help...', autoFocus = false }: HelpSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<(HelpArticle & { categoryId: string; categoryTitle: string })[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Search when query changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      const searchResults = searchArticles(query)
      setResults(searchResults.slice(0, 8)) // Limit to 8 results
      setIsOpen(true)
      setSelectedIndex(0)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [query])

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % results.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length)
        break
      case 'Enter':
        e.preventDefault()
        const selected = results[selectedIndex]
        if (selected) {
          router.push(`/help/${selected.categoryId}/${selected.slug}`)
          setIsOpen(false)
          setQuery('')
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }, [isOpen, results, selectedIndex, router])

  const handleSelectResult = (article: HelpArticle & { categoryId: string }) => {
    router.push(`/help/${article.categoryId}/${article.slug}`)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          autoFocus={autoFocus}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setIsOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            {results.map((article, index) => (
              <button
                key={`${article.categoryId}-${article.slug}`}
                onClick={() => handleSelectResult(article)}
                className={cn(
                  'w-full px-4 py-3 text-left flex items-start gap-3 transition-colors',
                  index === selectedIndex
                    ? 'bg-muted'
                    : 'hover:bg-muted/50'
                )}
              >
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{article.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {article.categoryTitle} • {article.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded border bg-muted">↑↓</kbd> to navigate,{' '}
            <kbd className="px-1.5 py-0.5 rounded border bg-muted">Enter</kbd> to select,{' '}
            <kbd className="px-1.5 py-0.5 rounded border bg-muted">Esc</kbd> to close
          </div>
        </div>
      )}

      {/* No results message */}
      {isOpen && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          No results found for "{query}"
        </div>
      )}
    </div>
  )
}
