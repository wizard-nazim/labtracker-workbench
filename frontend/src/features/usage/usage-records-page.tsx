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
import { useAuth } from '@/context/auth-context'
import { useUsageRecords } from './use-usage-records'
import { RecordWalkInUsageDialog } from './record-walk-in-usage-dialog'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function UsageRecordsPage() {
  const { user } = useAuth()
  const isManager = user?.role === 'SuperAdmin' || user?.role === 'ScienceOfficer'
  const { data: records, isLoading, isError } = useUsageRecords()

  const columnCount = isManager ? 6 : 5

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Usage</h1>
          <p className="text-sm text-muted-foreground">
            {isManager ? 'Recorded equipment usage across the department.' : 'Your equipment usage history.'}
          </p>
        </div>
        {isManager && <RecordWalkInUsageDialog />}
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipment</TableHead>
              {isManager && <TableHead className="hidden md:table-cell">Researcher</TableHead>}
              <TableHead>Start</TableHead>
              <TableHead className="hidden sm:table-cell">End</TableHead>
              <TableHead className="hidden lg:table-cell">Via</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columnCount}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {isError && (
              <TableEmptyState
                colSpan={columnCount}
                tone="error"
                title="Couldn't load usage records."
                description="Check that the API is running and try again."
              />
            )}

            {!isLoading && !isError && records?.length === 0 && (
              <TableEmptyState
                colSpan={columnCount}
                title={isManager ? 'No usage recorded yet.' : "You don't have any recorded usage yet."}
              />
            )}

            {records?.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium text-foreground">{record.equipmentName}</TableCell>
                {isManager && (
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {record.actorDisplayName}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">{formatDateTime(record.actualStart)}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {formatDateTime(record.actualEnd)}
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {record.bookingId ? `Booking #${record.bookingId}` : 'Walk-in'}
                </TableCell>
                <TableCell className="text-muted-foreground">{record.notes ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
