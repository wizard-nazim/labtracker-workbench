import { useState } from 'react'
import { toast } from 'sonner'
import { EntityDialog } from '@/components/entity-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateUsageRecord } from './use-usage-records'

export function RecordUsageDialog({
  equipmentId,
  equipmentName,
  bookingId,
}: {
  equipmentId: number
  equipmentName: string
  bookingId: number
}) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [notes, setNotes] = useState('')
  const createUsageRecord = useCreateUsageRecord()

  async function handleSubmit() {
    await createUsageRecord.mutateAsync({
      equipmentId,
      bookingId,
      actualStart: new Date(start).toISOString(),
      actualEnd: new Date(end).toISOString(),
      notes: notes || undefined,
    })
    toast.success(`Recorded usage for ${equipmentName}.`)
    setStart('')
    setEnd('')
    setNotes('')
  }

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="outline">
          Record usage
        </Button>
      }
      title={`Record usage for ${equipmentName}`}
      description="Enter what actually happened — this can differ from the booked time. Recording usage marks this booking Completed."
      submitLabel="Record usage"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="usage-start">Actual start</Label>
        <Input
          id="usage-start"
          type="datetime-local"
          required
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="usage-end">Actual end</Label>
        <Input id="usage-end" type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="usage-notes">Notes (optional)</Label>
        <Textarea id="usage-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
    </EntityDialog>
  )
}
