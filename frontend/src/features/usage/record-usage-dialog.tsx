import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardCheck } from 'lucide-react'
import { EntityDialog } from '@/components/entity-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { FieldErrors } from '@/lib/api-error-message'
import { formatWhen } from '@/features/bookings/format-when'
import { TimeRangeFields } from '@/features/bookings/time-range-fields'
import {
  emptyTimeRange,
  isTimeRangeComplete,
  resolveTimeRange,
  timeRangeFrom,
  type TimeRange,
} from '@/features/bookings/time-range'
import { useCreateUsageRecord } from './use-usage-records'

export function RecordUsageDialog({
  equipmentId,
  equipmentName,
  bookingId,
  bookedStart,
  bookedEnd,
  triggerSize = 'sm',
}: {
  equipmentId: number
  equipmentName: string
  bookingId: number
  // When given, the times start out as the booked slot so the common case
  // ("they used it as booked") is one click.
  bookedStart?: string
  bookedEnd?: string
  triggerSize?: 'sm' | 'lg'
}) {
  const initialRange = () => (bookedStart && bookedEnd ? timeRangeFrom(bookedStart, bookedEnd) : emptyTimeRange())
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<TimeRange>(initialRange)
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({})
  const [notes, setNotes] = useState('')
  const createUsageRecord = useCreateUsageRecord()

  function handleFieldErrors(fieldErrors: FieldErrors) {
    const start = fieldErrors.ActualStart?.[0]
    const end = fieldErrors.ActualEnd?.[0]
    setErrors({ start, end })
    return Boolean(start || end)
  }

  async function handleSubmit() {
    setErrors({})
    const { start, end } = resolveTimeRange(range, { start: 'ActualStart', end: 'ActualEnd' })
    await createUsageRecord.mutateAsync({
      equipmentId,
      bookingId,
      actualStart: start,
      actualEnd: end,
      notes: notes.trim() || undefined,
    })
    toast.success('Usage recorded', { description: `${equipmentName}, ${formatWhen(start, end)}. The booking is now completed.` })
    setRange(initialRange())
    setNotes('')
  }

  return (
    <EntityDialog
      trigger={
        <Button size={triggerSize} variant="outline">
          <ClipboardCheck data-icon="inline-start" aria-hidden="true" />
          Record usage
        </Button>
      }
      title={`Record usage: ${equipmentName}`}
      description={
        bookedStart && bookedEnd
          ? `Booked for ${formatWhen(bookedStart, bookedEnd)}. Change the times if they used it for longer or shorter.`
          : 'Enter when it was actually used. Recording usage completes the booking.'
      }
      submitLabel="Record usage"
      submitDisabled={!isTimeRangeComplete(range)}
      onSubmit={handleSubmit}
      onFieldErrors={handleFieldErrors}
      open={open}
      onOpenChange={(next) => {
        if (!next) setErrors({})
        setOpen(next)
      }}
    >
      <TimeRangeFields
        idPrefix="usage"
        value={range}
        onChange={setRange}
        startError={errors.start}
        endError={errors.end}
        fromLabel="Started"
        toLabel="Finished"
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="usage-notes">Notes (optional)</Label>
        <Textarea
          id="usage-notes"
          placeholder="e.g. ran 12 samples, left a note about the filter"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>
    </EntityDialog>
  )
}
