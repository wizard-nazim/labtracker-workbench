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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError } from '@/lib/api-client'
import { useEquipment } from '@/features/equipment/use-equipment'
import { useCreateUsageRecord } from './use-usage-records'
import { useResearchers } from './use-researchers'

export function RecordWalkInUsageDialog() {
  const [open, setOpen] = useState(false)
  const [equipmentId, setEquipmentId] = useState('')
  const [researcherId, setResearcherId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: equipment } = useEquipment('All')
  const { data: researchers } = useResearchers()
  const createUsageRecord = useCreateUsageRecord()

  function reset() {
    setEquipmentId('')
    setResearcherId('')
    setStart('')
    setEnd('')
    setNotes('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createUsageRecord.mutateAsync({
        equipmentId: Number(equipmentId),
        researcherId: Number(researcherId),
        actualStart: new Date(start).toISOString(),
        actualEnd: new Date(end).toISOString(),
        notes: notes || undefined,
      })
      toast.success('Walk-in usage recorded.')
      setOpen(false)
      reset()
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
        <Button variant="outline">Record walk-in usage</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record walk-in usage</DialogTitle>
          <DialogDescription>For usage that happened without a prior booking.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
            <Input
              id="walkin-end"
              type="datetime-local"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="walkin-notes">Notes (optional)</Label>
            <Textarea id="walkin-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={createUsageRecord.isPending || !equipmentId || !researcherId}>
              {createUsageRecord.isPending ? 'Recording…' : 'Record usage'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
