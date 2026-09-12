import { useState } from 'react'
import { toast } from 'sonner'
import { EntityDialog } from '@/components/entity-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateBooking } from './use-bookings'

export function BookEquipmentDialog({ equipmentId, equipmentName }: { equipmentId: number; equipmentName: string }) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const createBooking = useCreateBooking()

  async function handleSubmit() {
    await createBooking.mutateAsync({
      equipmentId,
      scheduledStart: new Date(start).toISOString(),
      scheduledEnd: new Date(end).toISOString(),
    })
    toast.success(`Booking requested for ${equipmentName}.`)
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
      title={`Book ${equipmentName}`}
      description="Choose a start and end time. The equipment must be free for the whole window."
      submitLabel="Request booking"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
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
