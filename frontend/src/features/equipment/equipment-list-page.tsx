import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
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
import { useAuth } from '@/context/auth-context'
import { BookEquipmentDialog } from '@/features/bookings/book-equipment-dialog'
import { useEquipment } from './use-equipment'
import { StatusIndicator } from './status-indicator'
import { EquipmentAvatar } from './equipment-avatar'
import { CreateEquipmentDialog, EditEquipmentDialog } from './equipment-form-dialog'
import type { EquipmentStatus } from './types'

const STATUS_FILTERS: Array<EquipmentStatus | 'All'> = ['All', 'Available', 'Faulty', 'UnderMaintenance', 'Retired']

function initialStatusFrom(searchParams: URLSearchParams): EquipmentStatus | 'All' {
  const value = searchParams.get('status')
  return STATUS_FILTERS.includes(value as EquipmentStatus | 'All') ? (value as EquipmentStatus | 'All') : 'All'
}

export function EquipmentListPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<EquipmentStatus | 'All'>(() => initialStatusFrom(searchParams))
  const { data: equipment, isLoading, isError } = useEquipment(status)
  const { user } = useAuth()
  const canBook = user?.role === 'Researcher'
  const isSuperAdmin = user?.role === 'SuperAdmin'
  const columnCount = 8 + (canBook ? 1 : 0) + (isSuperAdmin ? 1 : 0)

  return (
    <div className="flex flex-col gap-6">
      <PageBanner />

      <PageHeader
        icon={FlaskConical}
        title="Equipment"
        description="Browse instruments, their location, and current availability."
        action={
          <div className="flex items-center gap-2">
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
            {isSuperAdmin && <CreateEquipmentDialog />}
          </div>
        }
      />

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14" />
              <TableHead className="w-44">Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Room</TableHead>
              <TableHead className="hidden md:table-cell">Serial no.</TableHead>
              <TableHead className="hidden lg:table-cell">Department</TableHead>
              <TableHead className="text-right">Shared</TableHead>
              {canBook && <TableHead className="w-24" />}
              {isSuperAdmin && <TableHead className="w-16" />}
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
                  <EquipmentAvatar imageUrl={item.imageUrl} iconKey={item.iconKey} name={item.name} />
                </TableCell>
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
                {isSuperAdmin && (
                  <TableCell>
                    <EditEquipmentDialog equipment={item} />
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
