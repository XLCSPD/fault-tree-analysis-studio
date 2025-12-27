'use client'

import Link from 'next/link'
import { helpCategories, getAllArticles } from '@/lib/help/content'
import { HelpSearch } from '@/components/help/help-search'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  BookOpen,
  ArrowRight,
} from 'lucide-react'

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

// Popular articles to highlight
const popularArticles = [
  { categoryId: 'getting-started', slug: 'quick-start', title: 'Quick Start Guide' },
  { categoryId: 'risk-assessment', slug: 'rpn-calculation', title: 'Understanding RPN' },
  { categoryId: 'getting-started', slug: 'what-is-fta-studio', title: 'What is FTA Studio?' },
  { categoryId: 'import-export', slug: 'excel-import', title: 'Importing from Excel' },
]

export default function HelpCenterPage() {
  return (
    <div className="container max-w-6xl py-8 px-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4">Help Center</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Find answers, learn best practices, and master FTA Studio
        </p>

        {/* Search */}
        <div className="max-w-xl mx-auto">
          <HelpSearch
            placeholder="Search for help articles..."
            className="w-full"
          />
        </div>
      </div>

      {/* Category grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
        {helpCategories.map((category) => {
          const Icon = iconMap[category.icon] || HelpCircle
          return (
            <Link
              key={category.id}
              href={`/help/${category.id}/${category.articles[0]?.slug || ''}`}
            >
              <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {category.articles.length} articles
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {category.description}
                  </p>
                  <div className="flex items-center text-sm text-primary font-medium">
                    Browse articles
                    <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Popular articles */}
      <div className="border-t pt-8">
        <h2 className="text-xl font-semibold mb-4">Popular Articles</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {popularArticles.map((article) => (
            <Link
              key={`${article.categoryId}-${article.slug}`}
              href={`/help/${article.categoryId}/${article.slug}`}
              className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <div className="p-2 rounded bg-muted">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="font-medium">{article.title}</span>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        Press <kbd className="px-2 py-1 rounded border bg-muted font-mono">?</kbd> anywhere to view keyboard shortcuts
      </div>
    </div>
  )
}
