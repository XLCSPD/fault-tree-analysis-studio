'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { HelpMenu } from '@/components/help/help-menu'

export function Header() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-end px-4 gap-2">
        {/* Help Menu */}
        <HelpMenu />

        {/* Theme Toggle Switch */}
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className={cn(
              "relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              resolvedTheme === 'dark'
                ? 'bg-slate-700'
                : 'bg-amber-100'
            )}
            role="switch"
            aria-checked={resolvedTheme === 'dark'}
            aria-label="Toggle theme"
          >
            {/* Sun Icon (left side) */}
            <span className={cn(
              "absolute left-1 flex h-5 w-5 items-center justify-center transition-opacity duration-300",
              resolvedTheme === 'dark' ? 'opacity-40' : 'opacity-100'
            )}>
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            </span>

            {/* Moon Icon (right side) */}
            <span className={cn(
              "absolute right-1 flex h-5 w-5 items-center justify-center transition-opacity duration-300",
              resolvedTheme === 'dark' ? 'opacity-100' : 'opacity-40'
            )}>
              <Moon className="h-3.5 w-3.5 text-slate-300" />
            </span>

            {/* Toggle Knob */}
            <span
              className={cn(
                "pointer-events-none absolute h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out",
                resolvedTheme === 'dark' ? 'translate-x-8' : 'translate-x-1'
              )}
            />
          </button>
        )}

        {/* Placeholder for unmounted state */}
        {!mounted && (
          <div className="h-7 w-14 rounded-full bg-muted animate-pulse" />
        )}
      </div>
    </header>
  )
}

// Compact version for analysis studio header integration
export function ThemeSwitch({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className={cn("h-6 w-12 rounded-full bg-muted animate-pulse", className)} />
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        "relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        resolvedTheme === 'dark'
          ? 'bg-slate-700'
          : 'bg-amber-100',
        className
      )}
      role="switch"
      aria-checked={resolvedTheme === 'dark'}
      aria-label="Toggle theme"
    >
      {/* Sun Icon (left side) */}
      <span className={cn(
        "absolute left-1 flex h-4 w-4 items-center justify-center transition-opacity duration-300",
        resolvedTheme === 'dark' ? 'opacity-40' : 'opacity-100'
      )}>
        <Sun className="h-3 w-3 text-amber-500" />
      </span>

      {/* Moon Icon (right side) */}
      <span className={cn(
        "absolute right-1 flex h-4 w-4 items-center justify-center transition-opacity duration-300",
        resolvedTheme === 'dark' ? 'opacity-100' : 'opacity-40'
      )}>
        <Moon className="h-3 w-3 text-slate-300" />
      </span>

      {/* Toggle Knob */}
      <span
        className={cn(
          "pointer-events-none absolute h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out",
          resolvedTheme === 'dark' ? 'translate-x-7' : 'translate-x-1'
        )}
      />
    </button>
  )
}
