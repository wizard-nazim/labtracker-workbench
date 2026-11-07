import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BarChart3, Clock, Users, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/page-header'
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

// Bars are one series (usage per group) in the theme's primary: MCB navy in
// light, light blue in dark. Usage by external clients is a different kind
// of customer, so it gets brand magenta plus a hatch and its own legend entry
// (navy/magenta sit near the CVD floor, so colour is never the only cue).
// --chart-external is set on the chart wrapper, lighter in dark mode.
const INTERNAL_FILL = 'var(--primary)'
const EXTERNAL_PATTERN_ID = 'reports-external-hatch'
const BAR_SIZE = 22
const ROW_HEIGHT = 36
const LABEL_MAX_CHARS = 18

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground sm:text-3xl">{value}</p>
    </div>
  )
}

function truncateLabel(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

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

  const totals = useMemo(
    () => ({
      sessions: (rows ?? []).reduce((sum, row) => sum + row.sessionCount, 0),
      hours: Math.round((rows ?? []).reduce((sum, row) => sum + row.totalHours, 0) * 10) / 10,
      groups: (rows ?? []).filter((row) => row.researchGroupId !== null).length,
    }),
    [rows],
  )
  const hasExternal = sorted.some((row) => row.researchGroupId === null)
  const dataKey = metric === 'sessions' ? 'sessionCount' : 'totalHours'
  // Size the label column to the longest (truncated) group name.
  const longestLabel = Math.min(
    LABEL_MAX_CHARS,
    sorted.reduce((max, row) => Math.max(max, row.researchGroupName.length), 0),
  )
  const labelWidth = Math.max(56, longestLabel * 7 + 12)

  // All hooks above must run unconditionally before this role gate.
  if (user?.role !== 'SuperAdmin') return <Navigate to="/" replace />

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={BarChart3}
        title="Reports"
        description="Equipment usage by research group over a selected month."
      />

      {/* Filters: one row on wider screens, stacked full-width on phones. */}
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end" data-tour="reports-filters">
        <div className="flex flex-col gap-1.5 sm:w-64">
          <Label htmlFor="report-equipment">Equipment</Label>
          <Select value={equipmentId} onValueChange={setEquipmentId}>
            <SelectTrigger id="report-equipment" className="w-full">
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
        </div>
        <div className="flex flex-col gap-1.5 sm:w-48">
          <Label htmlFor="report-month">Month</Label>
          <input
            id="report-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground [color-scheme:light] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none dark:bg-input/30 dark:[color-scheme:dark]"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4" data-tour="reports-totals">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : (
          <>
            <StatTile icon={Activity} label="Sessions" value={isError ? '–' : String(totals.sessions)} />
            <StatTile icon={Clock} label="Hours" value={isError ? '–' : String(totals.hours)} />
            <StatTile icon={Users} label="Groups" value={isError ? '–' : String(totals.groups)} />
          </>
        )}
      </div>

      <section
        aria-labelledby="usage-chart-heading"
        data-tour="reports-chart"
        className="rounded-lg border border-border bg-card p-4 [--chart-external:#b0177f] sm:p-5 dark:[--chart-external:#c2479a]"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="usage-chart-heading" className="text-base font-semibold text-foreground">
            {metric === 'sessions' ? 'Sessions' : 'Hours'} by research group
          </h2>
          <div role="group" aria-label="Measure" className="flex items-center gap-1 rounded-md border border-border p-0.5">
            {(['sessions', 'hours'] as Metric[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={metric === option}
                onClick={() => setMetric(option)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring ${
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
          <p className="py-12 text-center text-sm text-muted-foreground">
            Couldn't load usage stats. Check that the API is running, then try again.
          </p>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No usage recorded for this month.</p>
            <p className="text-sm text-muted-foreground">Pick another month or equipment above.</p>
          </div>
        ) : (
          <>
            {/* Horizontal bars so long group names stay readable on phones. */}
            <ResponsiveContainer width="100%" height={sorted.length * ROW_HEIGHT + 32}>
              <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <pattern id={EXTERNAL_PATTERN_ID} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="6" height="6" fill="var(--chart-external)" />
                    <line x1="0" y1="0" x2="0" y2="6" stroke="var(--card)" strokeWidth="2" strokeOpacity="0.55" />
                  </pattern>
                </defs>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  allowDecimals={metric === 'hours'}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="researchGroupName"
                  width={labelWidth}
                  tick={{ fill: 'var(--foreground)', fontSize: 12 }}
                  tickFormatter={(value: string) => truncateLabel(value, LABEL_MAX_CHARS)}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
                  contentStyle={{
                    background: 'var(--popover)',
                    color: 'var(--popover-foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: '0 4px 16px rgb(0 0 0 / 0.12)',
                  }}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                  itemStyle={{ color: 'var(--muted-foreground)' }}
                  formatter={(value) => [
                    metric === 'sessions' ? `${value} session${value === 1 ? '' : 's'}` : `${value} h`,
                    metric === 'sessions' ? 'Sessions' : 'Hours',
                  ]}
                />
                <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} barSize={BAR_SIZE} isAnimationActive={false}>
                  {sorted.map((row) => (
                    <Cell
                      key={row.researchGroupId ?? 'external'}
                      fill={row.researchGroupId === null ? `url(#${EXTERNAL_PATTERN_ID})` : INTERNAL_FILL}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {hasExternal && (
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
                <li className="flex items-center gap-2">
                  <span className="size-3 rounded-sm" style={{ background: INTERNAL_FILL }} aria-hidden="true" />
                  Research groups
                </li>
                <li className="flex items-center gap-2">
                  <svg className="size-3 rounded-sm" aria-hidden="true">
                    <rect width="12" height="12" fill={`url(#${EXTERNAL_PATTERN_ID})`} />
                  </svg>
                  External clients
                </li>
              </ul>
            )}
          </>
        )}
      </section>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Research group</TableHead>
              <TableHead className="hidden sm:table-cell">Principal investigator</TableHead>
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
              <TableEmptyState colSpan={4} title="No usage recorded for this month." description="Pick another month or equipment above." />
            )}

            {sorted.map((row) => (
              <TableRow key={row.researchGroupId ?? 'external'}>
                <TableCell className="font-medium text-foreground">{row.researchGroupName}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{row.principalInvestigatorName ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums text-foreground">{row.sessionCount}</TableCell>
                <TableCell className="text-right tabular-nums text-foreground">{row.totalHours}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
