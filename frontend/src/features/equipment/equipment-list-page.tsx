import { useState } from 'react'
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
import { useEquipment } from './use-equipment'
import { StatusIndicator } from './status-indicator'
import type { EquipmentStatus } from './types'

const STATUS_FILTERS: Array<EquipmentStatus | 'All'> = ['All', 'Available', 'Faulty', 'UnderMaintenance', 'Retired']

export function EquipmentListPage() {
  const [status, setStatus] = useState<EquipmentStatus | 'All'>('All')
  const { data: equipment, isLoading, isError } = useEquipment(status)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Equipment</h1>
          <p className="text-sm text-muted-foreground">Browse instruments, their location, and current availability.</p>
        </div>
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
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Serial no.</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Shared</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Couldn't load equipment. Check that the API is running and try again.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && equipment?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No equipment matches this filter.
                </TableCell>
              </TableRow>
            )}

            {equipment?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <StatusIndicator status={item.status} />
                </TableCell>
                <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.equipmentTypeName}</TableCell>
                <TableCell className="text-muted-foreground">{item.roomLabel}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{item.serialNumber ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{item.owningDepartmentName}</TableCell>
                <TableCell className="text-right text-muted-foreground">{item.isShared ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
