'use client'

import { useState, useRef, useEffect } from 'react'
import { Loader2, ChevronDown, X, User } from 'lucide-react'
import { usePeopleDirectory } from '@/lib/hooks/use-people-directory'

interface PersonSelectorProps {
  organizationId: string | null
  value: string | null
  onChange: (personId: string | null) => void
  disabled?: boolean
  placeholder?: string
}

export function PersonSelector({
  organizationId,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select person...',
}: PersonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: people, isLoading } = usePeopleDirectory(organizationId)

  // Find selected person
  const selectedPerson = people?.find(p => p.id === value)

  // Filter people by search
  const filteredPeople = people?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.initials.toLowerCase().includes(search.toLowerCase()) ||
    (p.role && p.role.toLowerCase().includes(search.toLowerCase()))
  ) || []

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!organizationId) {
    return (
      <div className="mt-1 px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm">
        Organization not found
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative mt-1">
      {/* Trigger Button */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-background text-sm hover:bg-muted/50 disabled:opacity-50"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {selectedPerson ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
              {selectedPerson.initials}
            </div>
            <span>{selectedPerson.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              className="p-1 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
              }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b">
            <input
              type="text"
              className="w-full px-2 py-1 text-sm border rounded bg-background"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="overflow-y-auto max-h-48">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : filteredPeople.length > 0 ? (
              filteredPeople.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left ${
                    person.id === value ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => {
                    onChange(person.id)
                    setIsOpen(false)
                    setSearch('')
                  }}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {person.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{person.name}</div>
                    {person.role && (
                      <div className="text-xs text-muted-foreground truncate">{person.role}</div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {search ? 'No matches found' : 'No people in directory'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
