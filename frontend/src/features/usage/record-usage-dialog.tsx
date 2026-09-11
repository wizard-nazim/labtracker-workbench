import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
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
  const [error, setError] = useState<string | null>(null)
  const createUsageRecord = useCreateUsageRecord()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createUsageRecord.mutateAsync({
        equipmentId,
        bookingId,
        actualStart: new Date(start).toISOString(),
        actualEnd: new Date(end).toISOString(),
        notes: notes || undefined,
      })
      toast.success(`Recorded usage for ${equipmentName}.`)
      setOpen(false)
      setStart('')
      setEnd('')
      setNotes('')
    } catch (err) {
      if (err instanceof ApiError) {
        const firstFieldError = err.body?.errors ? Object.values(err.body.errors)[0]?.[0] : undefined
        setError(firstFieldError ?? err.message)
      } else {
        setError('Something went wrong. Try again.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Record usage
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record usage for {equipmentName}</DialogTitle>
          <DialogDescription>
            Enter what actually happened — this can differ from the booked time. Recording usage marks this booking
            Completed.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
            <Input
              id="usage-end"
              type="datetime-local"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="usage-notes">Notes (optional)</Label>
            <Textarea id="usage-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={createUsageRecord.isPending}>
              {createUsageRecord.isPending ? 'Recording…' : 'Record usage'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
