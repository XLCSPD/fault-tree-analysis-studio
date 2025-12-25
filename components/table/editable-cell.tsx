'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface EditableCellProps {
  value: string | number | null
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'select'
  options?: { value: string | number; label: string }[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function EditableCell({
  value,
  onChange,
  type = 'text',
  options,
  placeholder = '—',
  className,
  disabled = false
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
    } else if (e.key === 'Escape') {
      setEditValue(value?.toString() ?? '')
      setIsEditing(false)
    } else if (e.key === 'Tab') {
      // Let tab navigate naturally but save first
      handleBlur()
    }
  }, [handleBlur, value])

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
      className={cn(
        'p-2 cursor-pointer hover:bg-muted/80 rounded transition-colors min-h-[36px]',
        value === null || value === undefined || value === '' ? 'text-muted-foreground' : '',
        className
      )}
      title="Click to edit"
    >
      {displayValue}
    </div>
  )
}
