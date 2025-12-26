'use client'

import { memo } from 'react'
import type { PresenceState } from '@/lib/hooks/use-presence'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PresenceAvatarsProps {
  collaborators: PresenceState[]
  maxVisible?: number
  className?: string
}

function Avatar({ collaborator }: { collaborator: PresenceState }) {
  const initials = collaborator.userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-background -ml-2 first:ml-0 cursor-default transition-transform hover:scale-110 hover:z-10"
            style={{ backgroundColor: collaborator.color }}
          >
            {collaborator.avatarUrl ? (
              <img
                src={collaborator.avatarUrl}
                alt={collaborator.userName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{collaborator.userName}</p>
          {collaborator.selectedNodeId && (
            <p className="text-xs text-muted-foreground">Editing a node</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export const PresenceAvatars = memo(function PresenceAvatars({
  collaborators,
  maxVisible = 5,
  className,
}: PresenceAvatarsProps) {
  if (collaborators.length === 0) return null

  const visibleCollaborators = collaborators.slice(0, maxVisible)
  const hiddenCount = collaborators.length - maxVisible

  return (
    <div className={cn('flex items-center', className)}>
      {visibleCollaborators.map((collaborator) => (
        <Avatar key={collaborator.oderId} collaborator={collaborator} />
      ))}
      {hiddenCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-muted text-muted-foreground border-2 border-background -ml-2 cursor-default">
                +{hiddenCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {collaborators
                  .slice(maxVisible)
                  .map((c) => c.userName)
                  .join(', ')}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
})
