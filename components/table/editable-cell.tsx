'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface EditableCellProps {
  value: string | number | null
  onChange: (value: string) => void
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void
  type?: 'text' | 'number' | 'select'
  options?: { value: string | number; label: string }[]
  placeholder?: string
  className?: string
  disabled?: boolean
  tabIndex?: number
}

export function EditableCell({
  value,
  onChange,
  onNavigate,
  type = 'text',
  options,
  placeholder = '—',
  className,
  disabled = false,
  tabIndex = 0
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value?.toString() ?? '')
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  // Sync editValue when value prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value?.toString() ?? '')
    }
  }, [value, isEditing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [isEditing])

  const handleClick = useCallback(() => {
    if (!disabled) {
      setIsEditing(true)
    }
  }, [disabled])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    if (editValue !== (value?.toString() ?? '')) {
      onChange(editValue)
    }
  }, [editValue, value, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBlur()
      // Move down to next row on Enter
      onNavigate?.('down')
    } else if (e.key === 'Escape') {
      setEditValue(value?.toString() ?? '')
      setIsEditing(false)
    } else if (e.key === 'Tab') {
      // Save and move right (or left with shift)
      e.preventDefault()
      handleBlur()
      onNavigate?.(e.shiftKey ? 'left' : 'right')
    } else if (e.key === 'ArrowUp' && e.altKey) {
      e.preventDefault()
      handleBlur()
      onNavigate?.('up')
    } else if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault()
      handleBlur()
      onNavigate?.('down')
    } else if (e.key === 'ArrowLeft' && e.altKey) {
      e.preventDefault()
      handleBlur()
      onNavigate?.('left')
    } else if (e.key === 'ArrowRight' && e.altKey) {
      e.preventDefault()
      handleBlur()
      onNavigate?.('right')
    }
  }, [handleBlur, value, onNavigate])

  // Handle key events when in non-editing mode (must be before early returns!)
  const handleCellKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Enter or Space to start editing
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
    // Arrow key navigation when not editing (with Alt modifier in edit mode)
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      onNavigate?.('up')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onNavigate?.('down')
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onNavigate?.('left')
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      onNavigate?.('right')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      onNavigate?.(e.shiftKey ? 'left' : 'right')
    }
  }, [handleClick, onNavigate])

  const displayValue = value !== null && value !== undefined && value !== '' ? value : placeholder

  if (disabled) {
    return (
      <div className={cn('p-2 text-muted-foreground', className)}>
        {displayValue}
      </div>
    )
  }

  if (isEditing) {
    if (type === 'select' && options) {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value)
            onChange(e.target.value)
            setIsEditing(false)
          }}
          onBlur={() => setIsEditing(false)}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full p-1 border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary',
            className
          )}
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full p-1 border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary',
          type === 'number' && 'w-16 text-center',
          className
        )}
        min={type === 'number' ? 1 : undefined}
        max={type === 'number' ? 10 : undefined}
      />
    )
  }

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleCellKeyDown}
      tabIndex={tabIndex}
      role="gridcell"
      className={cn(
        'p-2 cursor-pointer hover:bg-muted/80 rounded transition-colors min-h-[36px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
        value === null || value === undefined || value === '' ? 'text-muted-foreground' : '',
        className
      )}
      title="Click to edit"
    >
      {displayValue}
    </div>
  )
}
