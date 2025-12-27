'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  children: React.ReactNode
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  asChild?: boolean
}

const DropdownMenuContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({ open: false, setOpen: () => {} })

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
  const { open, setOpen } = React.useContext(DropdownMenuContext)

  const handleClick = () => setOpen(!open)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    })
  }

  return <button onClick={handleClick}>{children}</button>
}

export function DropdownMenuContent({ children, align = 'start', className }: DropdownMenuContentProps) {
  const { open, setOpen } = React.useContext(DropdownMenuContext)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 min-w-[160px] mt-1 bg-popover border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95',
        align === 'end' && 'right-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        className
      )}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({ children, onClick, disabled, className, asChild }: DropdownMenuItemProps) {
  const { setOpen } = React.useContext(DropdownMenuContext)

  const handleClick = () => {
    if (disabled) return
    onClick?.()
    setOpen(false)
  }

  const itemClassName = cn(
    'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  )

  if (asChild && React.isValidElement(children)) {
    const childProps = (children as React.ReactElement<{ onClick?: (e?: React.MouseEvent) => void; className?: string }>).props
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e?: React.MouseEvent) => void; className?: string }>, {
      onClick: (e?: React.MouseEvent) => {
        handleClick()
        childProps.onClick?.(e)
      },
      className: cn(itemClassName, childProps.className),
    })
  }

  return (
    <button
      className={itemClassName}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="border-t my-1" />
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-3 py-1.5 text-xs font-semibold text-muted-foreground', className)}>
      {children}
    </div>
  )
}
