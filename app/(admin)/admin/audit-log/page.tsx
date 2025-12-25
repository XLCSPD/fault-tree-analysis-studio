'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  History,
  Loader2,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
} from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import {
  useAuditLog,
  useAuditLogEntityTypes,
  useAuditLogUsers,
} from '@/lib/hooks/use-audit-log'
import { PageHeader } from '@/components/admin/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const actionColors: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
}

export default function AuditLogPage() {
  const { organization } = useUser()
  const orgId = organization?.id ?? null

  const [page, setPage] = useState(0)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({
    entityType: '',
    userId: '',
    action: '',
    dateFrom: '',
    dateTo: '',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)

  const { data, isLoading } = useAuditLog(
    orgId,
    {
      entityType: appliedFilters.entityType || undefined,
      userId: appliedFilters.userId || undefined,
      action: appliedFilters.action as 'INSERT' | 'UPDATE' | 'DELETE' | undefined,
      dateFrom: appliedFilters.dateFrom || undefined,
      dateTo: appliedFilters.dateTo || undefined,
    },
    page,
    20
  )

  const { data: entityTypes } = useAuditLogEntityTypes(orgId)
  const { data: users } = useAuditLogUsers(orgId)

  const toggleEntry = (entryId: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId)
    } else {
      newExpanded.add(entryId)
    }
    setExpandedEntries(newExpanded)
  }

  const applyFilters = () => {
    setPage(0)
    setAppliedFilters(filters)
  }

  const clearFilters = () => {
    const emptyFilters = {
      entityType: '',
      userId: '',
      action: '',
      dateFrom: '',
      dateTo: '',
    }
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setPage(0)
  }

  const exportToCsv = () => {
    if (!data?.entries.length) return

    const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Changes']
    const rows = data.entries.map(entry => [
      entry.created_at,
      entry.user_email || entry.user_id,
      entry.action,
      entry.entity_type,
      entry.entity_id,
      JSON.stringify(entry.changes),
    ])

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== '')

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="View all changes made to your organization's data"
        action={{
          label: 'Export CSV',
          onClick: exportToCsv,
          icon: <Download className="h-4 w-4 mr-2" />,
          disabled: !data?.entries.length,
        }}
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs h-6"
              >
                Clear all
              </Button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label className="text-xs">Entity Type</Label>
              <Select
                value={filters.entityType}
                onValueChange={v => setFilters(f => ({ ...f, entityType: v === 'all' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {entityTypes?.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">User</Label>
              <Select
                value={filters.userId}
                onValueChange={v => setFilters(f => ({ ...f, userId: v === 'all' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Action</Label>
              <Select
                value={filters.action}
                onValueChange={v => setFilters(f => ({ ...f, action: v === 'all' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="INSERT">Insert</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={applyFilters}>Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Entries List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.entries.length > 0 ? (
        <div className="space-y-2">
          {data.entries.map(entry => {
            const isExpanded = expandedEntries.has(entry.id)
            return (
              <Card key={entry.id}>
                <button
                  onClick={() => toggleEntry(entry.id)}
                  className="w-full px-4 py-3 flex items-start justify-between hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground mt-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                        <span className="text-sm">
                          {entry.user_name || entry.user_email || 'Unknown user'}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded font-medium',
                            actionColors[entry.action] || 'bg-gray-100'
                          )}
                        >
                          {entry.action}
                        </span>
                      </div>
                      <p className="text-sm mt-1">
                        <span className="font-medium">{entry.entity_type}</span>
                        <span className="text-muted-foreground ml-1">
                          ({entry.entity_id.substring(0, 8)}...)
                        </span>
                      </p>
                    </div>
                  </div>
                </button>
                {isExpanded && entry.changes && (
                  <CardContent className="pt-0 border-t">
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Changes:
                      </p>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                        {JSON.stringify(entry.changes, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {page * 20 + 1} - {Math.min((page + 1) * 20, data.totalCount)} of{' '}
              {data.totalCount} entries
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!data.hasMore}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No audit entries found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Changes to your data will appear here'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
