import { useState } from 'react'
import { toast } from 'sonner'
import { Info, TriangleAlert } from 'lucide-react'
import { EntityDialog } from '@/components/entity-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EquipmentAvatar } from '@/features/equipment/equipment-avatar'
import type { Equipment } from '@/features/equipment/types'
import { useCreateBooking } from './use-bookings'

export function BookEquipmentDialog({ equipment }: { equipment: Equipment }) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const createBooking = useCreateBooking()

  const needsAttention = equipment.status === 'Faulty' || equipment.status === 'UnderMaintenance'

  async function handleSubmit() {
    await createBooking.mutateAsync({
      equipmentId: equipment.id,
      scheduledStart: new Date(start).toISOString(),
      scheduledEnd: new Date(end).toISOString(),
    })
    toast.success(`Booking requested for ${equipment.name}.`)
    setStart('')
    setEnd('')
  }

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="outline">
          Book
        </Button>
      }
      title={`Book ${equipment.name}`}
      description="Choose a start and end time. The equipment must be free for the whole window."
      submitLabel="Request booking"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
        <EquipmentAvatar imageUrl={equipment.imageUrl} iconKey={equipment.iconKey} name={equipment.name} className="size-12" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{equipment.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {equipment.equipmentTypeName} · {equipment.roomLabel}
          </p>
        </div>
      </div>

      {equipment.description && (
        <div
          className={`flex gap-2.5 rounded-md border p-3 ${
            needsAttention ? 'border-status-maintenance/30 bg-status-maintenance/10' : 'border-border bg-muted/40'
          }`}
        >
          {needsAttention ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-status-maintenance" aria-hidden="true" />
          ) : (
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <p className="text-sm text-muted-foreground">{equipment.description}</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="booking-start">Start</Label>
        <Input
          id="booking-start"
          type="datetime-local"
          required
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="booking-end">End</Label>
        <Input
          id="booking-end"
          type="datetime-local"
          required
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
    </EntityDialog>
  )
}
