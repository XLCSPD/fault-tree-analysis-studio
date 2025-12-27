'use client'

import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticle, getCategory, helpCategories } from '@/lib/help/content'
import { HelpArticleRenderer } from '@/components/help/help-article'
import { HelpSidebar } from '@/components/help/help-sidebar'
import { HelpSearch } from '@/components/help/help-search'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'

export default function HelpArticlePage() {
  const params = useParams()
  const categoryId = params.category as string
  const slug = params.slug as string

  const category = getCategory(categoryId)
  const article = getArticle(categoryId, slug)

  if (!category || !article) {
    notFound()
  }

  // Find previous and next articles for navigation
  const allArticlesFlat: { categoryId: string; slug: string; title: string }[] = []
  helpCategories.forEach((cat) => {
    cat.articles.forEach((art) => {
      allArticlesFlat.push({ categoryId: cat.id, slug: art.slug, title: art.title })
    })
  })

  const currentIndex = allArticlesFlat.findIndex(
    (a) => a.categoryId === categoryId && a.slug === slug
  )
  const prevArticle = currentIndex > 0 ? allArticlesFlat[currentIndex - 1] : null
  const nextArticle = currentIndex < allArticlesFlat.length - 1 ? allArticlesFlat[currentIndex + 1] : null

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-background flex-shrink-0 hidden lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <div className="p-4 border-b">
            <Link href="/help" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
              <Home className="h-4 w-4" />
              Help Center
            </Link>
            <HelpSearch placeholder="Search..." className="w-full" />
          </div>
          <div className="p-4">
            <HelpSidebar />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/help" className="hover:text-foreground">
              Help
            </Link>
            <span>/</span>
            <Link href={`/help/${categoryId}/${category.articles[0]?.slug}`} className="hover:text-foreground">
              {category.title}
            </Link>
            <span>/</span>
            <span className="text-foreground">{article.title}</span>
          </nav>

          {/* Article content */}
          <HelpArticleRenderer article={article} categoryId={categoryId} />

          {/* Previous/Next navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t">
            {prevArticle ? (
              <Link href={`/help/${prevArticle.categoryId}/${prevArticle.slug}`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">Previous</div>
                    <div className="text-sm font-medium">{prevArticle.title}</div>
                  </div>
                </Button>
              </Link>
            ) : (
              <div />
            )}

            {nextArticle ? (
              <Link href={`/help/${nextArticle.categoryId}/${nextArticle.slug}`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Next</div>
                    <div className="text-sm font-medium">{nextArticle.title}</div>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
