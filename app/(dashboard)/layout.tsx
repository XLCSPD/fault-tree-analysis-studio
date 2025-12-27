'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/use-user'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { KeyboardShortcutsModal } from '@/components/help/keyboard-shortcuts-modal'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useUser()

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <div className="min-h-screen flex bg-muted/30">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      {/* Global keyboard shortcuts modal - press ? to open */}
      <KeyboardShortcutsModal />
    </>
  )
}
