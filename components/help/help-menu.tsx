'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  HelpCircle,
  BookOpen,
  Keyboard,
  Rocket,
  MessageCircle,
  ExternalLink,
  Video,
} from 'lucide-react'
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal'

export function HelpMenu() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Help</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href="/help" className="flex items-center cursor-pointer">
              <BookOpen className="mr-2 h-4 w-4" />
              Help Center
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/help/getting-started/quick-start" className="flex items-center cursor-pointer">
              <Rocket className="mr-2 h-4 w-4" />
              Quick Start Guide
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
            <Keyboard className="mr-2 h-4 w-4" />
            Keyboard Shortcuts
            <span className="ml-auto text-xs text-muted-foreground">?</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/help/video-tutorials" className="flex items-center cursor-pointer">
              <Video className="mr-2 h-4 w-4" />
              Video Tutorials
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a
              href="mailto:support@ftastudio.com?subject=FTA Studio Feedback"
              className="flex items-center cursor-pointer"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Send Feedback
              <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  )
}
