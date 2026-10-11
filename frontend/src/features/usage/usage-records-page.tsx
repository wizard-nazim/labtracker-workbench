import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, ClipboardList, Footprints, Timer } from 'lucide-react'
import { cn } from 'cn'
import { PageHeader } from '@/components/page-header'
import { ResponsiveList } from '@/components/responsive-list'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/auth-context'
import { formatDuration, formatWhen } from '@/features/bookings/format-when'
import { useUsageRecords } from './use-usage-records'
import { RecordWalkInUsageDialog } from './record-walk-in-usage-dialog'
import type { UsageRecord } from './types'

type Source = 'all' | 'booked' | 'walk-in'

// Booked vs walk-in is the one thing about a usage record that changes how
// staff read it, so it gets the chip.
function SourceChip({ record, className }: { record: UsageRecord; className?: string }) {
  const walkIn = record.bookingId === null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        walkIn ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary',
        className,
      )}
    >
      {walkIn ? <Footprints className="size-3" aria-hidden="true" /> : <CalendarClock className="size-3" aria-hidden="true" />}
      {walkIn ? 'Walk-in' : 'Booked'}
    </span>
  )
}

export function UsageRecordsPage() {
  const { user } = useAuth()
  const isManager = user?.role === 'SuperAdmin' || user?.role === 'ScienceOfficer'
  const { data: records, isLoading, isError } = useUsageRecords()
  const [source, setSource] = useState<Source>('all')

  const visible = records?.filter(
    (r) => source === 'all' || (source === 'walk-in' ? r.bookingId === null : r.bookingId !== null),
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={ClipboardList}
        title="Usage"
        description={
          isManager
            ? 'What was actually used, by whom and for how long. Record walk-ins here.'
            : 'Every time you used equipment, booked or walk-in.'
        }
        action={isManager ? <RecordWalkInUsageDialog /> : undefined}
      />

      <ResponsiveList
        items={visible}
        isLoading={isLoading}
        isError={isError}
        getKey={(r) => r.id}
        noun="usage records"
        search={{
          label: 'Search usage',
          placeholder: isManager ? 'Search by equipment or person' : 'Search by equipment',
          text: (r) => [r.equipmentName, r.actorDisplayName, r.notes].filter(Boolean).join(' '),
        }}
        toolbar={
          <Select value={source} onValueChange={(v) => setSource(v as Source)}>
            <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Filter by how it was used">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Booked and walk-in</SelectItem>
              <SelectItem value="booked">Booked only</SelectItem>
              <SelectItem value="walk-in">Walk-ins only</SelectItem>
            </SelectContent>
          </Select>
        }
        empty={
          source !== 'all'
            ? { title: source === 'walk-in' ? 'No walk-ins recorded.' : 'No booked usage recorded.' }
            : {
                title: isManager ? 'No usage recorded yet.' : 'No usage recorded for you yet.',
                description: isManager
                  ? 'Use "Record usage" on an approved booking, or record a walk-in.'
                  : 'A Science Officer records it after each session.',
              }
        }
        columns={[
          {
            key: 'equipment',
            header: 'Equipment',
            cell: (r) => (
              <Link to={`/equipment/${r.equipmentId}`} className="font-medium text-foreground hover:text-primary hover:underline">
                {r.equipmentName}
              </Link>
            ),
          },
          ...(isManager
            ? [
                {
                  key: 'who',
                  header: 'Used by',
                  cell: (r: UsageRecord) => <span className="text-foreground">{r.actorDisplayName}</span>,
                },
              ]
            : []),
          {
            key: 'when',
            header: 'When',
            cell: (r) => <span className="text-foreground tabular-nums">{formatWhen(r.actualStart, r.actualEnd)}</span>,
          },
          {
            key: 'duration',
            header: 'Time used',
            className: 'hidden lg:table-cell',
            cell: (r) => <span className="text-muted-foreground tabular-nums">{formatDuration(r.actualStart, r.actualEnd)}</span>,
          },
          { key: 'source', header: 'How', className: 'w-28', cell: (r) => <SourceChip record={r} /> },
          {
            key: 'notes',
            header: 'Notes',
            className: 'hidden xl:table-cell',
            cell: (r) =>
              r.notes ? (
                <span className="line-clamp-2 max-w-72 text-muted-foreground" title={r.notes}>
                  {r.notes}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
        ]}
        renderCard={(r) => (
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/equipment/${r.equipmentId}`} className="font-medium leading-snug text-foreground wrap-anywhere">
                {r.equipmentName}
              </Link>
              <SourceChip record={r} className="shrink-0" />
            </div>
            <p className="flex items-center gap-1.5 text-sm text-foreground tabular-nums">
              <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              {formatWhen(r.actualStart, r.actualEnd)}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
              <Timer className="size-3.5 shrink-0" aria-hidden="true" />
              {formatDuration(r.actualStart, r.actualEnd)}
              {isManager && <span className="text-foreground">· {r.actorDisplayName}</span>}
            </p>
            {r.notes && <p className="text-xs text-muted-foreground wrap-anywhere">{r.notes}</p>}
          </div>
        )}
      />
    </div>
  )
}
