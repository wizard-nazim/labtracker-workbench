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
import { ApiError } from '@/lib/api-client'
import { useCreateBooking } from './use-bookings'

export function BookEquipmentDialog({ equipmentId, equipmentName }: { equipmentId: number; equipmentName: string }) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createBooking = useCreateBooking()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createBooking.mutateAsync({
        equipmentId,
        scheduledStart: new Date(start).toISOString(),
        scheduledEnd: new Date(end).toISOString(),
      })
      toast.success(`Booking requested for ${equipmentName}.`)
      setOpen(false)
      setStart('')
      setEnd('')
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
          Book
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book {equipmentName}</DialogTitle>
          <DialogDescription>
            Choose a start and end time. The equipment must be free for the whole window.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={createBooking.isPending}>
              {createBooking.isPending ? 'Requesting…' : 'Request booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
