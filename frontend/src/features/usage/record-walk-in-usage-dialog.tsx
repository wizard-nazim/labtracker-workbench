import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { EntityDialog } from '@/components/entity-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FieldErrors } from '@/lib/api-error-message'
import { useEquipment } from '@/features/equipment/use-equipment'
import { useResearchers } from '@/features/admin/researchers'
import { formatWhen } from '@/features/bookings/format-when'
import { TimeRangeFields } from '@/features/bookings/time-range-fields'
import {
  emptyTimeRange,
  isTimeRangeComplete,
  resolveTimeRange,
  type TimeRange,
} from '@/features/bookings/time-range'
import { useCreateUsageRecord } from './use-usage-records'

export function RecordWalkInUsageDialog() {
  const [open, setOpen] = useState(false)
  const [equipmentId, setEquipmentId] = useState('')
  const [researcherId, setResearcherId] = useState('')
  const [range, setRange] = useState<TimeRange>(emptyTimeRange)
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({})
  const [notes, setNotes] = useState('')

  const { data: equipment } = useEquipment('All')
  const { data: researchers } = useResearchers()
  const createUsageRecord = useCreateUsageRecord()

  const sortedEquipment = [...(equipment ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const sortedResearchers = [...(researchers ?? [])].sort((a, b) => a.fullName.localeCompare(b.fullName))

  function reset() {
    setEquipmentId('')
    setResearcherId('')
    setRange(emptyTimeRange())
    setErrors({})
    setNotes('')
  }

  function handleFieldErrors(fieldErrors: FieldErrors) {
    const start = fieldErrors.ActualStart?.[0]
    const end = fieldErrors.ActualEnd?.[0]
    setErrors({ start, end })
    return Boolean(start || end)
  }

  async function handleSubmit() {
    setErrors({})
    const { start, end } = resolveTimeRange(range, { start: 'ActualStart', end: 'ActualEnd' })
    const record = await createUsageRecord.mutateAsync({
      equipmentId: Number(equipmentId),
      researcherId: Number(researcherId),
      actualStart: start,
      actualEnd: end,
      notes: notes.trim() || undefined,
    })
    toast.success('Usage recorded', {
      description: `${record.equipmentName} by ${record.actorDisplayName}, ${formatWhen(start, end)}.`,
    })
    reset()
  }

  return (
    <EntityDialog
      trigger={
        <Button>
          <UserPlus data-icon="inline-start" aria-hidden="true" />
          Record walk-in
        </Button>
      }
      title="Record a walk-in"
      description="Someone used equipment without booking it first. Note who, what and when."
      submitLabel="Record usage"
      submitDisabled={!equipmentId || !researcherId || !isTimeRangeComplete(range)}
      onSubmit={handleSubmit}
      onFieldErrors={handleFieldErrors}
      open={open}
      onOpenChange={(next) => {
        if (!next) setErrors({})
        setOpen(next)
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="walkin-researcher">Who used it?</Label>
        <Select value={researcherId} onValueChange={setResearcherId} required>
          <SelectTrigger id="walkin-researcher" className="w-full">
            <SelectValue placeholder="Choose a researcher" />
          </SelectTrigger>
          <SelectContent>
            {sortedResearchers.map((researcher) => (
              <SelectItem key={researcher.id} value={String(researcher.id)}>
                {researcher.fullName}
                <span className="text-muted-foreground">{researcher.studentNumber}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="walkin-equipment">Which equipment?</Label>
        <Select value={equipmentId} onValueChange={setEquipmentId} required>
          <SelectTrigger id="walkin-equipment" className="w-full">
            <SelectValue placeholder="Choose equipment" />
          </SelectTrigger>
          <SelectContent>
            {sortedEquipment.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.name}
                <span className="text-muted-foreground">{item.roomLabel}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TimeRangeFields
        idPrefix="walkin"
        value={range}
        onChange={setRange}
        startError={errors.start}
        endError={errors.end}
        fromLabel="Started"
        toLabel="Finished"
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="walkin-notes">Notes (optional)</Label>
        <Textarea
          id="walkin-notes"
          placeholder="e.g. emergency run for a thesis deadline"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>
    </EntityDialog>
  )
}
