import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
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
import { useAuth } from '@/context/auth-context'
import { BookEquipmentDialog } from '@/features/bookings/book-equipment-dialog'
import { useEquipment } from './use-equipment'
import { StatusIndicator } from './status-indicator'
import type { EquipmentStatus } from './types'

const STATUS_FILTERS: Array<EquipmentStatus | 'All'> = ['All', 'Available', 'Faulty', 'UnderMaintenance', 'Retired']

export function EquipmentListPage() {
  const [status, setStatus] = useState<EquipmentStatus | 'All'>('All')
  const { data: equipment, isLoading, isError } = useEquipment(status)
  const { user } = useAuth()
  const canBook = user?.role === 'Researcher'
  const columnCount = canBook ? 8 : 7

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={FlaskConical}
        title="Equipment"
        description="Browse instruments, their location, and current availability."
        action={
          <Select value={status} onValueChange={(value) => setStatus(value as EquipmentStatus | 'All')}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'All' ? 'All statuses' : option === 'UnderMaintenance' ? 'Under maintenance' : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Room</TableHead>
              <TableHead className="hidden md:table-cell">Serial no.</TableHead>
              <TableHead className="hidden lg:table-cell">Department</TableHead>
              <TableHead className="text-right">Shared</TableHead>
              {canBook && <TableHead className="w-24" />}
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
                title="Couldn't load equipment."
                description="Check that the API is running and try again."
              />
            )}

            {!isLoading && !isError && equipment?.length === 0 && (
              <TableEmptyState colSpan={columnCount} title="No equipment matches this filter." />
            )}

            {equipment?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <StatusIndicator status={item.status} />
                </TableCell>
                <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.equipmentTypeName}</TableCell>
                <TableCell className="text-muted-foreground">{item.roomLabel}</TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                  {item.serialNumber ?? '—'}
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {item.owningDepartmentName}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{item.isShared ? 'Yes' : 'No'}</TableCell>
                {canBook && (
                  <TableCell>
                    {item.status === 'Available' && (
                      <BookEquipmentDialog equipmentId={item.id} equipmentName={item.name} />
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
