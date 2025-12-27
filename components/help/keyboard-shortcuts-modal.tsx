'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { keyboardShortcuts, getKeyDisplay, isMac } from '@/lib/help/keyboard-shortcuts'
import { Keyboard, Settings, GitBranch, Table, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ElementType> = {
  Settings,
  GitBranch,
  Table,
  Edit,
}

interface KeyboardShortcutsModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function KeyboardShortcutsModal({ open: controlledOpen, onOpenChange }: KeyboardShortcutsModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen

  // Listen for ? key to open modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setOpen])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {keyboardShortcuts.map((category) => {
            const Icon = iconMap[category.icon] || Settings
            return (
              <div key={category.title}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                  <Icon className="h-4 w-4" />
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {getKeyDisplay(shortcut).map((key, keyIdx) => (
                          <kbd
                            key={keyIdx}
                            className={cn(
                              "px-2 py-1 text-xs font-mono rounded border",
                              "bg-muted border-border shadow-sm",
                              "min-w-[24px] text-center"
                            )}
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border bg-muted">?</kbd> anytime to show this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook for managing keyboard shortcuts modal state
export function useKeyboardShortcutsModal() {
  const [open, setOpen] = useState(false)
  return { open, setOpen, openModal: () => setOpen(true) }
}
