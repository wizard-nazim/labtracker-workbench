import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/page-header'
import { PageBanner } from '@/components/page-banner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { TableEmptyState } from '@/components/table-empty-state'
import { useEquipment } from '@/features/equipment/use-equipment'
import { useAuth } from '@/context/auth-context'
import { useUsageStats } from './use-usage-stats'

type Metric = 'sessions' | 'hours'

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Half-open [from, to) bounds in UTC for the "YYYY-MM" value an <input type="month"> gives back.
function monthBounds(monthValue: string): { from: string; to: string } {
  const [year, month] = monthValue.split('-').map(Number)
  const from = new Date(Date.UTC(year, month - 1, 1))
  const to = new Date(Date.UTC(year, month, 1))
  return { from: from.toISOString(), to: to.toISOString() }
}

export function ReportsPage() {
  const { user } = useAuth()

  const [month, setMonth] = useState(currentMonthValue())
  const [equipmentId, setEquipmentId] = useState<string>('All')
  const [metric, setMetric] = useState<Metric>('sessions')

  // Archived (Retired) equipment can still have usage in the reported month.
  const { data: equipment } = useEquipment('All', { includeArchived: true })
  const { from, to } = useMemo(() => monthBounds(month), [month])
  const { data: rows, isLoading, isError } = useUsageStats({
    from,
    to,
    equipmentId: equipmentId === 'All' ? undefined : Number(equipmentId),
  })

  const sorted = useMemo(
    () =>
      [...(rows ?? [])].sort((a, b) =>
        metric === 'sessions' ? b.sessionCount - a.sessionCount : b.totalHours - a.totalHours,
      ),
    [rows, metric],
  )

  // All hooks above must run unconditionally before this role gate.
  if (user?.role !== 'SuperAdmin') return <Navigate to="/" replace />

  return (
    <div className="flex flex-col gap-4">
      <PageBanner src="/banners/reports-banner.jpg" alt="Reports" />

      <PageHeader
        icon={BarChart3}
        title="Reports"
        description="Equipment usage by research group over a selected period."
        action={
          <div className="flex w-full flex-col gap-2 min-[420px]:flex-row sm:w-auto sm:items-center">
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger className="w-full min-[420px]:flex-1 sm:w-48 sm:flex-none" aria-label="Equipment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All equipment</SelectItem>
                {equipment?.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="month"
              aria-label="Month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            />
          </div>
        }
      />

      <div className="rounded-md border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">
            {metric === 'sessions' ? 'Sessions' : 'Hours'} by research group
          </h2>
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            {(['sessions', 'hours'] as Metric[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMetric(option)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  metric === option
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option === 'sessions' ? 'Sessions' : 'Hours'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Couldn't load usage stats.</p>
        ) : sorted.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No usage recorded for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sorted} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="researchGroupName"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={metric === 'hours'}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--foreground)', fontWeight: 500 }}
                formatter={(value) => [
                  metric === 'sessions' ? `${value} session${value === 1 ? '' : 's'}` : `${value} h`,
                  metric === 'sessions' ? 'Sessions' : 'Hours',
                ]}
              />
              <Bar
                dataKey={metric === 'sessions' ? 'sessionCount' : 'totalHours'}
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Research group</TableHead>
              <TableHead>Principal investigator</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {isError && (
              <TableEmptyState
                colSpan={4}
                tone="error"
                title="Couldn't load usage stats."
                description="Check that the API is running and try again."
              />
            )}

            {!isLoading && !isError && sorted.length === 0 && (
              <TableEmptyState colSpan={4} title="No usage recorded for this period." />
            )}

            {sorted.map((row) => (
              <TableRow key={row.researchGroupId ?? 'external'}>
                <TableCell className="font-medium text-foreground">{row.researchGroupName}</TableCell>
                <TableCell className="text-muted-foreground">{row.principalInvestigatorName ?? '—'}</TableCell>
                <TableCell className="text-right text-muted-foreground">{row.sessionCount}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{row.totalHours}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
