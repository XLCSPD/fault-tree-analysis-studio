'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/hooks/use-user'
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ThemeToggleSimple } from '@/components/theme-toggle'

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analyses', label: 'Analyses', icon: FileText },
  { href: '/my-actions', label: 'My Actions', icon: CheckSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, organization } = useUser()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 border-r bg-background flex flex-col h-screen sticky top-0">
      {/* Logo/Brand */}
      <div className="p-4 border-b">
        <Link href="/analyses" className="flex items-center gap-3">
          <Image
            src="/fta-studio-icon.png"
            alt="FTA Studio"
            width={32}
            height={32}
            className="flex-shrink-0"
          />
          <span className="font-semibold text-lg">FTA Studio</span>
        </Link>
        {organization && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {organization.name}
          </p>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="p-2 space-y-1 flex-1">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/analyses' && pathname?.startsWith(item.href + '/')) ||
            (item.href === '/analyses' && pathname?.startsWith('/analyses'))
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

      {/* Bottom Section */}
      <div className="p-2 border-t space-y-1">
        {user?.role === 'admin' && (
          <Link
            href="/admin/people"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname?.startsWith('/admin') || pathname === '/settings'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Settings className="h-4 w-4" />
            Admin Settings
          </Link>
        )}
        <ThemeToggleSimple />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-t bg-muted/30">
          <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
          <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
        </div>
      )}
    </aside>
  )
}
