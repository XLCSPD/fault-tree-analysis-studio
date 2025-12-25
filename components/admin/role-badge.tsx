import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

const roleStyles: Record<UserRole, string> = {
  viewer: 'bg-gray-100 text-gray-800',
  contributor: 'bg-blue-100 text-blue-800',
  facilitator: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
}

const roleLabels: Record<UserRole, string> = {
  viewer: 'Viewer',
  contributor: 'Contributor',
  facilitator: 'Facilitator',
  admin: 'Admin',
}

interface RoleBadgeProps {
  role: UserRole | null
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  if (!role) return null

  return (
    <span className={cn(
      'text-xs px-2 py-0.5 rounded-full font-medium',
      roleStyles[role],
      className
    )}>
      {roleLabels[role]}
    </span>
  )
}
