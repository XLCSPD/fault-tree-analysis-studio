'use client'

import { useCallback, useEffect, useRef } from 'react'
import { Plus, Trash2, Copy, Scissors, ClipboardPaste, ChevronRight } from 'lucide-react'

interface ContextMenuProps {
  x: number
  y: number
  nodeId: string | null
  onClose: () => void
  onAddChild: (parentId: string) => void
  onAddSibling: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  onDuplicate: (nodeId: string) => void
}

export function ContextMenu({
  x,
  y,
  nodeId,
  onClose,
  onAddChild,
  onAddSibling,
  onDelete,
  onDuplicate,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Adjust position if menu would go off screen
  const adjustedX = Math.min(x, window.innerWidth - 200)
  const adjustedY = Math.min(y, window.innerHeight - 250)

  if (!nodeId) return null

  const menuItems = [
    {
      label: 'Add Child',
      icon: Plus,
      onClick: () => {
        onAddChild(nodeId)
        onClose()
      },
      shortcut: 'Tab',
    },
    {
      label: 'Add Sibling',
      icon: ChevronRight,
      onClick: () => {
        onAddSibling(nodeId)
        onClose()
      },
      shortcut: 'Enter',
    },
    { type: 'divider' as const },
    {
      label: 'Duplicate',
      icon: Copy,
      onClick: () => {
        onDuplicate(nodeId)
        onClose()
      },
      shortcut: 'Ctrl+D',
    },
    { type: 'divider' as const },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => {
        onDelete(nodeId)
        onClose()
      },
      shortcut: 'Del',
      danger: true,
    },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-popover border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {menuItems.map((item, index) => {
        if (item.type === 'divider') {
          return <div key={index} className="border-t my-1" />
        }

        const Icon = item.icon
        return (
          <button
            key={index}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left ${
              item.danger ? 'text-destructive hover:text-destructive' : ''
            }`}
            onClick={item.onClick}
          >
            <Icon className="w-4 h-4" />
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-muted-foreground">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
