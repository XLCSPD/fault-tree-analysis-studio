'use client'

import Link from 'next/link'
import { FileText, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import {
  useDashboardStats,
  useRPNDistribution,
  useActionsByStatus,
  useRecentAnalyses,
} from '@/lib/hooks/use-dashboard-stats'
import { StatCard } from '@/components/dashboard/stat-card'
import { RPNDistributionChart, ActionsByStatusChart } from '@/components/dashboard/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

export default function DashboardPage() {
  const { organization, loading: userLoading } = useUser()
  const orgId = organization?.id ?? null

  const { data: stats, isLoading: statsLoading } = useDashboardStats(orgId)
  const { data: rpnData, isLoading: rpnLoading } = useRPNDistribution(orgId)
  const { data: actionsData, isLoading: actionsLoading } = useActionsByStatus(orgId)
  const { data: recentAnalyses, isLoading: recentLoading } = useRecentAnalyses(orgId)

  if (userLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Portfolio Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your fault tree analyses and action items
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Analyses"
          value={statsLoading ? '...' : stats?.analyses.total ?? 0}
          subtitle={
            stats
              ? `${stats.analyses.active} active, ${stats.analyses.completed} completed`
              : undefined
          }
          icon={FileText}
          iconColor="text-blue-600"
        />
        <StatCard
          title="High-Risk Causes"
          value={statsLoading ? '...' : stats?.highRiskCauses ?? 0}
          subtitle="RPN > 200"
          icon={AlertTriangle}
          iconColor="text-orange-600"
        />
        <StatCard
          title="Action Items"
          value={statsLoading ? '...' : stats?.actionItems.total ?? 0}
          subtitle={
            stats
              ? `${stats.actionItems.withSchedule} with schedule`
              : undefined
          }
          icon={CheckCircle}
          iconColor="text-green-600"
        />
        <StatCard
          title="Overdue Actions"
          value={statsLoading ? '...' : stats?.overdueActions ?? 0}
          subtitle="Past due date"
          icon={Clock}
          iconColor="text-red-600"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <RPNDistributionChart data={rpnData ?? []} isLoading={rpnLoading} />
        <ActionsByStatusChart data={actionsData ?? []} isLoading={actionsLoading} />
      </div>

      {/* Recent Analyses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Analyses</CardTitle>
          <Link
            href="/analyses"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentAnalyses && recentAnalyses.length > 0 ? (
            <div className="space-y-3">
              {recentAnalyses.map(analysis => (
                <Link
                  key={analysis.id}
                  href={`/analyses/${analysis.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{analysis.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(analysis.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      analysis.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : analysis.status === 'active'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {analysis.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No analyses yet</p>
              <Link
                href="/analyses"
                className="text-sm text-primary hover:underline mt-1 inline-block"
              >
                Create your first analysis
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
