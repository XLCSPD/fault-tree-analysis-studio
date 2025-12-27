'use client'

import { AlertTriangle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Json } from '@/types/database'

interface QualityFlagBadgeProps {
  qualityFlags: Json | null
  className?: string
  size?: 'sm' | 'md'
  onClick?: () => void
}

interface QualityFlagsData {
  has_issues?: boolean
  issue_types?: string[]
  last_check?: string
}

export function QualityFlagBadge({
  qualityFlags,
  className,
  size = 'sm',
  onClick,
}: QualityFlagBadgeProps) {
  if (!qualityFlags) return null

  const flags = qualityFlags as QualityFlagsData

  if (!flags.has_issues) return null

  const sizeClasses = size === 'sm'
    ? 'w-3 h-3'
    : 'w-4 h-4'

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={cn(
        'absolute flex items-center justify-center rounded-full',
        'bg-amber-500 text-white',
        'hover:bg-amber-600 transition-colors',
        'shadow-sm',
        size === 'sm' ? 'p-0.5' : 'p-1',
        className
      )}
      title="Quality issue flagged - click to view"
    >
      <AlertTriangle className={sizeClasses} />
    </button>
  )
}

// Badge for action items without hypothesis
interface InvestigationBadgeProps {
  hasHypothesis: boolean
  className?: string
  onClick?: () => void
}

export function InvestigationHypothesisBadge({
  hasHypothesis,
  className,
  onClick,
}: InvestigationBadgeProps) {
  if (hasHypothesis) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded',
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          className
        )}
        title="Has structured hypothesis test"
      >
        <Sparkles className="w-2.5 h-2.5" />
        Hypothesis
      </span>
    )
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded',
        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        'hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer',
        className
      )}
      title="Click to convert to hypothesis test"
    >
      <Sparkles className="w-2.5 h-2.5" />
      Make Testable
    </button>
  )
}
