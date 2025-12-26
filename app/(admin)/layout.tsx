'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useUser } from '@/lib/hooks/use-user'
import { Users, Scale, Calculator, Settings, UserCog, Loader2, ArrowLeft, History, FormInput } from 'lucide-react'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { href: '/admin/people', label: 'People Directory', icon: Users },
  { href: '/admin/scales', label: 'Scales & Criteria', icon: Scale },
  { href: '/admin/ap-mapping', label: 'AP Mapping', icon: Calculator },
  { href: '/admin/custom-fields', label: 'Custom Fields', icon: FormInput },
  { href: '/admin/users', label: 'User Management', icon: UserCog },
  { href: '/admin/audit-log', label: 'Audit Log', icon: History },
  { href: '/settings', label: 'Organization Settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, organization, loading } = useUser()

  // Redirect non-admins
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/analyses')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
          <Link href="/analyses" className="flex items-center gap-3 mb-3">
            <Image
              src="/fta-studio-icon.png"
              alt="FTA Studio"
              width={32}
              height={32}
              className="flex-shrink-0"
            />
            <span className="font-semibold text-lg">FTA Studio</span>
          </Link>
          <Link
            href="/analyses"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analyses
          </Link>
          <h2 className="font-semibold">Admin Settings</h2>
          {organization && (
            <p className="text-sm text-muted-foreground mt-1">{organization.name}</p>
          )}
        </div>
        <nav className="p-2 space-y-1 flex-1">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container max-w-5xl py-8 px-6">
          {children}
        </div>
      </main>
    </div>
  )
}
