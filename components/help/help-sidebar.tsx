'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { helpCategories } from '@/lib/help/content'
import { cn } from '@/lib/utils'
import {
  Rocket,
  GitBranch,
  Table,
  AlertTriangle,
  CheckSquare,
  Sparkles,
  FileInput,
  Lightbulb,
  HelpCircle,
  Video,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const iconMap: Record<string, React.ElementType> = {
  Rocket,
  GitBranch,
  Table,
  AlertTriangle,
  CheckSquare,
  Sparkles,
  FileInput,
  Lightbulb,
  HelpCircle,
  Video,
}

interface HelpSidebarProps {
  className?: string
}

export function HelpSidebar({ className }: HelpSidebarProps) {
  const pathname = usePathname()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(helpCategories.map(c => c.id))
  )

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  return (
    <nav className={cn('space-y-2', className)}>
      {helpCategories.map((category) => {
        const Icon = iconMap[category.icon] || HelpCircle
        const isExpanded = expandedCategories.has(category.id)
        const isCategoryActive = pathname?.includes(`/help/${category.id}`)

        return (
          <div key={category.id} className="space-y-1">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isCategoryActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {category.title}
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {/* Articles */}
            {isExpanded && (
              <div className="ml-6 space-y-1">
                {category.articles.map((article) => {
                  const isActive = pathname === `/help/${category.id}/${article.slug}`
                  return (
                    <Link
                      key={article.slug}
                      href={`/help/${category.id}/${article.slug}`}
                      className={cn(
                        'block px-3 py-1.5 text-sm rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {article.title}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
