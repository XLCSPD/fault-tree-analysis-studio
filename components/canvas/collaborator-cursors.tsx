'use client'

import { memo } from 'react'
import type { PresenceState } from '@/lib/hooks/use-presence'

interface CollaboratorCursorsProps {
  collaborators: PresenceState[]
}

function CollaboratorCursor({ collaborator }: { collaborator: PresenceState }) {
  if (!collaborator.cursor) return null

  return (
    <div
      className="absolute pointer-events-none z-50 transition-transform duration-75"
      style={{
        left: collaborator.cursor.x,
        top: collaborator.cursor.y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ color: collaborator.color }}
      >
        <path
          d="M5.65 2.657L21.314 12.35c.672.414.606 1.433-.125 1.742l-6.16 2.6-2.6 6.16c-.309.73-1.329.797-1.742.125L2.657 5.65c-.413-.673.134-1.424.891-1.424h2.102z"
          fill="currentColor"
        />
        <path
          d="M5.65 2.657L21.314 12.35c.672.414.606 1.433-.125 1.742l-6.16 2.6-2.6 6.16c-.309.73-1.329.797-1.742.125L2.657 5.65c-.413-.673.134-1.424.891-1.424h2.102z"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      {/* Name label */}
      <div
        className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-md"
        style={{ backgroundColor: collaborator.color }}
      >
        {collaborator.userName}
      </div>
    </div>
  )
}

export const CollaboratorCursors = memo(function CollaboratorCursors({
  collaborators,
}: CollaboratorCursorsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {collaborators.map((collaborator) => (
        <CollaboratorCursor key={collaborator.oderId} collaborator={collaborator} />
      ))}
    </div>
  )
})
