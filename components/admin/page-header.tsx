import { Button } from '@/components/ui/button'
import { ReactNode } from 'react'

interface ActionButton {
  label: string
  onClick: () => void
  icon?: ReactNode
  disabled?: boolean
  loading?: boolean
}

interface PageHeaderProps {
  title: string
  description?: string
  action?: ActionButton | ReactNode
}

function isActionButton(action: ActionButton | ReactNode): action is ActionButton {
  return action !== null && typeof action === 'object' && 'onClick' in action && 'label' in action
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
        isActionButton(action) ? (
          <Button
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
          >
            {action.icon}
            {action.label}
          </Button>
        ) : (
          action
        )
      )}
    </div>
  )
}
