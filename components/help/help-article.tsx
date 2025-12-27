'use client'

import Link from 'next/link'
import type { HelpArticle, HelpSection } from '@/lib/help/content'
import { cn } from '@/lib/utils'
import { AlertCircle, Info, Lightbulb, AlertTriangle, Video, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HelpArticleRendererProps {
  article: HelpArticle
  categoryId: string
}

function renderSection(section: HelpSection, index: number) {
  switch (section.type) {
    case 'text':
      return (
        <p key={index} className="text-muted-foreground leading-relaxed">
          {section.content}
        </p>
      )

    case 'heading':
      const HeadingTag = `h${section.level || 2}` as 'h2' | 'h3' | 'h4'
      const headingClasses = {
        2: 'text-xl font-semibold mt-8 mb-4',
        3: 'text-lg font-medium mt-6 mb-3',
        4: 'text-base font-medium mt-4 mb-2',
      }
      return (
        <HeadingTag key={index} className={headingClasses[section.level || 2]}>
          {section.content}
        </HeadingTag>
      )

    case 'list':
      return (
        <ul key={index} className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
          {section.items?.map((item, idx) => (
            <li key={idx} className="leading-relaxed">{item}</li>
          ))}
        </ul>
      )

    case 'steps':
      return (
        <ol key={index} className="space-y-3 ml-4">
          {section.items?.map((item, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
                {idx + 1}
              </span>
              <span className="text-muted-foreground leading-relaxed pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      )

    case 'tip':
      return (
        <div key={index} className="flex gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
        </div>
      )

    case 'warning':
      return (
        <div key={index} className="flex gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
        </div>
      )

    case 'note':
      return (
        <div key={index} className="flex gap-3 p-4 rounded-lg bg-muted border">
          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
        </div>
      )

    case 'table':
      return (
        <div key={index} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {section.columns?.map((col, idx) => (
                  <th key={idx} className="px-4 py-2 text-left font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows?.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-t">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-2 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'image':
      return (
        <figure key={index} className="my-6">
          <img
            src={section.src}
            alt={section.alt || ''}
            className="rounded-lg border shadow-sm"
          />
          {section.caption && (
            <figcaption className="text-sm text-muted-foreground text-center mt-2">
              {section.caption}
            </figcaption>
          )}
        </figure>
      )

    default:
      return null
  }
}

export function HelpArticleRenderer({ article, categoryId }: HelpArticleRendererProps) {
  return (
    <article className="max-w-3xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
        <p className="text-lg text-muted-foreground">{article.description}</p>
      </header>

      {/* Video link if available */}
      {article.videoUrl && (
        <div className="mb-8 p-4 rounded-lg border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Video tutorial available</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={article.videoUrl} target="_blank" rel="noopener noreferrer">
              Watch Video
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      )}

      {/* Content sections */}
      <div className="space-y-4">
        {article.content.map((section, index) => renderSection(section, index))}
      </div>

      {/* Related articles */}
      {article.relatedArticles && article.relatedArticles.length > 0 && (
        <div className="mt-12 pt-8 border-t">
          <h3 className="text-lg font-semibold mb-4">Related Articles</h3>
          <div className="flex flex-wrap gap-2">
            {article.relatedArticles.map((slug) => (
              <Button key={slug} variant="outline" size="sm" asChild>
                <Link href={`/help/${categoryId}/${slug}`}>
                  {slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
