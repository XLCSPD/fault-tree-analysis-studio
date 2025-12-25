import { Button } from '@/components/ui/button'
import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
    disabled?: boolean
    loading?: boolean
  }
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
        >
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  )
}
