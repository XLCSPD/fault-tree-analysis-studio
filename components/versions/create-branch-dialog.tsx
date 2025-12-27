'use client'

import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, GitBranch } from 'lucide-react'
import { useCreateBranch, useAnalysisVersions } from '@/lib/hooks/use-versions'
import { useToast } from '@/lib/hooks/use-toast'

const createBranchSchema = z.object({
  name: z
    .string()
    .min(1, 'Branch name is required')
    .max(50, 'Branch name must be 50 characters or less')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Branch name can only contain letters, numbers, hyphens, and underscores'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  sourceVersionId: z.string().optional(),
})

type CreateBranchFormValues = z.infer<typeof createBranchSchema>

interface CreateBranchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysisId: string
  analysisTitle: string
  onSuccess?: (branchId: string) => void
}

export function CreateBranchDialog({
  open,
  onOpenChange,
  analysisId,
  analysisTitle,
  onSuccess,
}: CreateBranchDialogProps) {
  const { toast } = useToast()
  const createBranch = useCreateBranch(analysisId)
  const { data: versions } = useAnalysisVersions(analysisId)

  const form = useForm<CreateBranchFormValues>({
    resolver: zodResolver(createBranchSchema),
    defaultValues: {
      name: '',
      description: '',
      sourceVersionId: 'latest',
    },
  })

  const onSubmit = async (data: CreateBranchFormValues) => {
    try {
      const branchId = await createBranch.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        sourceVersionId: data.sourceVersionId === 'latest' ? undefined : data.sourceVersionId,
      })

      toast({
        title: 'Branch created',
        description: `Branch "${data.name}" has been created successfully.`,
      })

      form.reset()
      onOpenChange(false)
      onSuccess?.(branchId)
    } catch (error) {
      toast({
        title: 'Failed to create branch',
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
            <GitBranch className="h-5 w-5 text-accent" />
            Create Experimental Branch
          </DialogTitle>
          <DialogDescription>
            Create a new branch from &quot;{analysisTitle}&quot; to experiment with changes
            without affecting the main analysis.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., experiment-v2, alternative-approach"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use letters, numbers, hyphens, and underscores only.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sourceVersionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Version</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Latest version (current state)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="latest">Latest version (current state)</SelectItem>
                      {versions?.map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          v{version.version_number}: {version.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose which version to branch from. Defaults to the latest.
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
                      placeholder="What are you exploring in this branch?"
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
                disabled={createBranch.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createBranch.isPending}>
                {createBranch.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Branch
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
