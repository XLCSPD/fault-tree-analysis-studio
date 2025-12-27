'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { useCreateVersion } from '@/lib/hooks/use-versions'
import { useToast } from '@/lib/hooks/use-toast'

const createVersionSchema = z.object({
  name: z
    .string()
    .min(1, 'Version name is required')
    .max(100, 'Version name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
})

type CreateVersionFormValues = z.infer<typeof createVersionSchema>

interface CreateVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysisId: string
  analysisTitle: string
  onSuccess?: (versionId: string) => void
}

export function CreateVersionDialog({
  open,
  onOpenChange,
  analysisId,
  analysisTitle,
  onSuccess,
}: CreateVersionDialogProps) {
  const { toast } = useToast()
  const createVersion = useCreateVersion(analysisId)

  const form = useForm<CreateVersionFormValues>({
    resolver: zodResolver(createVersionSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const onSubmit = async (data: CreateVersionFormValues) => {
    try {
      const versionId = await createVersion.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        isAuto: false,
      })

      toast({
        title: 'Version saved',
        description: `Created snapshot "${data.name}" successfully.`,
      })

      form.reset()
      onOpenChange(false)
      onSuccess?.(versionId)
    } catch (error) {
      toast({
        title: 'Failed to create version',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Version
          </DialogTitle>
          <DialogDescription>
            Create a named snapshot of &quot;{analysisTitle}&quot; that you can restore later.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Before meeting review, Initial draft"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name to help you identify this version.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What changes does this version include?"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createVersion.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createVersion.isPending}>
                {createVersion.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Version
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
