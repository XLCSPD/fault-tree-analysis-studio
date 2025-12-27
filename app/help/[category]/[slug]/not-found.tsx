import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export default function HelpNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        The help article you're looking for doesn't exist or may have been moved.
      </p>
      <Button asChild>
        <Link href="/help">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Help Center
        </Link>
      </Button>
    </div>
  )
}
