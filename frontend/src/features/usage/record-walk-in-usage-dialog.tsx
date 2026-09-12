import { useState } from 'react'
import { toast } from 'sonner'
import { EntityDialog } from '@/components/entity-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEquipment } from '@/features/equipment/use-equipment'
import { useResearchers } from '@/features/admin/researchers'
import { useCreateUsageRecord } from './use-usage-records'

export function RecordWalkInUsageDialog() {
  const [open, setOpen] = useState(false)
  const [equipmentId, setEquipmentId] = useState('')
  const [researcherId, setResearcherId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [notes, setNotes] = useState('')

  const { data: equipment } = useEquipment('All')
  const { data: researchers } = useResearchers()
  const createUsageRecord = useCreateUsageRecord()

  async function handleSubmit() {
    await createUsageRecord.mutateAsync({
      equipmentId: Number(equipmentId),
      researcherId: Number(researcherId),
      actualStart: new Date(start).toISOString(),
      actualEnd: new Date(end).toISOString(),
      notes: notes || undefined,
    })
    toast.success('Walk-in usage recorded.')
    setEquipmentId('')
    setResearcherId('')
    setStart('')
    setEnd('')
    setNotes('')
  }

  return (
    <EntityDialog
      trigger={<Button variant="outline">Record walk-in usage</Button>}
      title="Record walk-in usage"
      description="For usage that happened without a prior booking."
      submitLabel="Record usage"
      submitDisabled={!equipmentId || !researcherId}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="walkin-equipment">Equipment</Label>
        <Select value={equipmentId} onValueChange={setEquipmentId} required>
          <SelectTrigger id="walkin-equipment">
            <SelectValue placeholder="Select equipment" />
          </SelectTrigger>
          <SelectContent>
            {equipment?.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="walkin-researcher">Researcher</Label>
        <Select value={researcherId} onValueChange={setResearcherId} required>
          <SelectTrigger id="walkin-researcher">
            <SelectValue placeholder="Select researcher" />
          </SelectTrigger>
          <SelectContent>
            {researchers?.map((researcher) => (
              <SelectItem key={researcher.id} value={String(researcher.id)}>
                {researcher.fullName} ({researcher.studentNumber})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="walkin-start">Actual start</Label>
        <Input
          id="walkin-start"
          type="datetime-local"
          required
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="walkin-end">Actual end</Label>
        <Input id="walkin-end" type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="walkin-notes">Notes (optional)</Label>
        <Textarea id="walkin-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
    </EntityDialog>
  )
}
