'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'
import { KeyboardShortcutsModal } from '@/components/help/keyboard-shortcuts-modal'

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/analyses" className="flex items-center gap-2">
              <Image
                src="/Target_node_logo_design-removebg-preview.png"
                alt="FTA Studio"
                width={63}
                height={63}
              />
              <span className="font-semibold">FTA Studio</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">Help Center</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/analyses">
                <Home className="h-4 w-4 mr-2" />
                Back to App
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="min-h-[calc(100vh-3.5rem)]">
        {children}
      </main>

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal />
    </div>
  )
}
