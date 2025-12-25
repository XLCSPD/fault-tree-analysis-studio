import { toast } from '@/lib/hooks/use-toast'

export function handleQueryError(error: unknown) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Query error:', error)
  }

  // Show toast notification
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
  })
}

export function handleMutationError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Failed to save changes'

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Mutation error:', error)
  }

  // Show toast notification
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
  })
}
