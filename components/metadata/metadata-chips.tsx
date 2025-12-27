'use client'

import { Factory, MapPin, Layers, Workflow, Box, Tag, FileText, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Analysis = Database['public']['Tables']['analyses']['Row']

interface MetadataChipsProps {
  analysis: Analysis | null
  industryName?: string | null
  issueCategoryName?: string | null
  onClick?: () => void
  className?: string
}

interface ChipProps {
  icon: React.ReactNode
  label: string
  value: string | null
  className?: string
}

function Chip({ icon, label, value, className }: ChipProps) {
  if (!value) return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full text-xs',
        className
      )}
      title={`${label}: ${value}`}
    >
      {icon}
      <span className="truncate max-w-[120px]">{value}</span>
    </div>
  )
}

export function MetadataChips({
  analysis,
  industryName,
  issueCategoryName,
  onClick,
  className,
}: MetadataChipsProps) {
  if (!analysis) return null

  // Count filled metadata fields
  const metadataFields = [
    analysis.problem_statement,
    analysis.abstract,
    analysis.industry_id || industryName,
    analysis.site_name,
    analysis.area_function,
    analysis.process_workflow || analysis.application,
    analysis.asset_system || analysis.model,
    analysis.item_output || analysis.part_name,
    analysis.issue_category_id || issueCategoryName,
  ]

  const filledCount = metadataFields.filter(Boolean).length
  const totalCount = metadataFields.length
  const completionPercent = Math.round((filledCount / totalCount) * 100)

  // Get display values (prefer new fields, fallback to legacy)
  const displayIndustry = industryName
  const displaySite = analysis.site_name
  const displayProcess = analysis.process_workflow || analysis.application
  const displayAsset = analysis.asset_system || analysis.model
  const displayItem = analysis.item_output || analysis.part_name
  const displayCategory = issueCategoryName

  const hasAnyMetadata = filledCount > 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 flex-wrap text-left hover:bg-muted/50 rounded-md px-2 py-1 -ml-2 transition-colors',
        className
      )}
    >
      {/* Completion badge */}
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          completionPercent === 100
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : completionPercent >= 50
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        )}
      >
        <CheckCircle2 className="w-3 h-3" />
        {completionPercent}%
      </div>

      {hasAnyMetadata ? (
        <>
          <Chip
            icon={<Factory className="w-3 h-3 text-muted-foreground" />}
            label="Industry"
            value={displayIndustry || null}
          />
          <Chip
            icon={<MapPin className="w-3 h-3 text-muted-foreground" />}
            label="Site"
            value={displaySite || null}
          />
          <Chip
            icon={<Workflow className="w-3 h-3 text-muted-foreground" />}
            label="Process"
            value={displayProcess || null}
          />
          <Chip
            icon={<Box className="w-3 h-3 text-muted-foreground" />}
            label="Asset"
            value={displayAsset || null}
          />
          <Chip
            icon={<Tag className="w-3 h-3 text-muted-foreground" />}
            label="Category"
            value={displayCategory || null}
          />
          {analysis.problem_statement && (
            <Chip
              icon={<FileText className="w-3 h-3 text-muted-foreground" />}
              label="Problem"
              value="Defined"
            />
          )}
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Click to add metadata</span>
      )}
    </button>
  )
}

// Simple version for tight spaces
export function MetadataCompletionBadge({
  analysis,
  onClick,
  className,
}: {
  analysis: Analysis | null
  onClick?: () => void
  className?: string
}) {
  if (!analysis) return null

  const metadataFields = [
    analysis.problem_statement,
    analysis.abstract,
    analysis.industry_id,
    analysis.site_name,
    analysis.area_function,
    analysis.process_workflow || analysis.application,
    analysis.asset_system || analysis.model,
    analysis.item_output || analysis.part_name,
    analysis.issue_category_id,
  ]

  const filledCount = metadataFields.filter(Boolean).length
  const totalCount = metadataFields.length
  const completionPercent = Math.round((filledCount / totalCount) * 100)

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
        completionPercent === 100
          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
          : completionPercent >= 50
          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
          : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300',
        className
      )}
      title={`Metadata ${completionPercent}% complete (${filledCount}/${totalCount} fields)`}
    >
      <CheckCircle2 className="w-3 h-3" />
      {completionPercent}% metadata
    </button>
  )
}
