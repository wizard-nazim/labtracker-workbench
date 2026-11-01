import { useId } from 'react'
import { toast } from 'sonner'
import { Star } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useUsers } from '@/features/admin/users'
import { useAssignScienceOfficer, useRemoveScienceOfficer, useUpdateEquipmentStatus } from './use-equipment'
import type { Equipment, EquipmentStatus } from './types'

// Status and science officers save as soon as they're changed (they have
// their own API calls), unlike the rest of the equipment form.

const STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: 'Available', label: 'Available' },
  { value: 'Faulty', label: 'Faulty' },
  { value: 'UnderMaintenance', label: 'Under maintenance' },
  { value: 'Retired', label: 'Retired (archived)' },
]

export function StatusField({ equipment }: { equipment: Equipment }) {
  const id = useId()
  const updateStatus = useUpdateEquipmentStatus()

  async function handleChange(value: string) {
    try {
      await updateStatus.mutateAsync({ id: equipment.id, status: value as EquipmentStatus })
      toast.success(`Status updated to ${STATUS_OPTIONS.find((o) => o.value === value)?.label}.`)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={`${id}-status`}>Status</Label>
      <Select value={equipment.status} onValueChange={handleChange} disabled={updateStatus.isPending}>
        <SelectTrigger id={`${id}-status`} aria-describedby={`${id}-status-hint`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p id={`${id}-status-hint`} className="text-xs text-muted-foreground">
        Saves as soon as you change it.
      </p>
    </div>
  )
}

export function ScienceOfficersField({ equipment }: { equipment: Equipment }) {
  const { data: users } = useUsers()
  const scienceOfficers = users?.filter((u) => u.role === 'ScienceOfficer') ?? []
  const assign = useAssignScienceOfficer()
  const remove = useRemoveScienceOfficer()
  const isPending = assign.isPending || remove.isPending

  async function toggle(userId: number, checked: boolean) {
    try {
      if (checked) {
        await assign.mutateAsync({ equipmentId: equipment.id, userId, isPrimary: equipment.scienceOfficers.length === 0 })
      } else {
        await remove.mutateAsync({ equipmentId: equipment.id, userId })
      }
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function makePrimary(userId: number) {
    try {
      await assign.mutateAsync({ equipmentId: equipment.id, userId, isPrimary: true })
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-foreground">Science officers</legend>
      <p className="text-xs text-muted-foreground">
        Who looks after this equipment. The primary one is contacted first. Saves as soon as you tick a box.
      </p>
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2">
        {scienceOfficers.length === 0 && (
          <p className="px-1 py-1 text-sm text-muted-foreground">No Science Officer accounts yet. Add one under People.</p>
        )}
        {scienceOfficers.map((officer) => {
          const assignment = equipment.scienceOfficers.find((so) => so.userId === officer.id)
          return (
            <div key={officer.id} className="flex min-h-8 items-center justify-between gap-2 text-sm text-foreground">
              <label className="flex min-w-0 items-center gap-2 wrap-anywhere">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border accent-primary"
                  checked={Boolean(assignment)}
                  disabled={isPending}
                  onChange={(e) => toggle(officer.id, e.target.checked)}
                />
                {officer.email}
              </label>
              {assignment &&
                (assignment.isPrimary ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-primary">
                    <Star className="size-3.5 fill-current" aria-hidden="true" />
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs text-muted-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                    disabled={isPending}
                    aria-label={`Make ${officer.email} the primary science officer`}
                    onClick={() => makePrimary(officer.id)}
                  >
                    <Star className="size-3.5" aria-hidden="true" />
                    Make primary
                  </button>
                ))}
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
