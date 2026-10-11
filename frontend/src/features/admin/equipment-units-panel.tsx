import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { TableEmptyState } from '@/components/table-empty-state'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  apiErrorMessage,
  fieldErrors,
  focusFirstInvalidField,
  isConflict,
  type FieldErrors,
} from '@/lib/api-error-message'
import { EquipmentAvatar } from '@/features/equipment/equipment-avatar'
import { StatusIndicator } from '@/features/equipment/status-indicator'
import {
  useAssignScienceOfficer,
  useCreateEquipment,
  useEquipment,
  useRemoveScienceOfficer,
  useUpdateEquipment,
  useUpdateEquipmentStatus,
} from '@/features/equipment/use-equipment'
import { EquipmentFormFields } from '@/features/equipment/equipment-form-fields'
import {
  hasVisibleFieldError,
  toEquipmentRequest,
  useEquipmentFormState,
  validateEquipmentForm,
} from '@/features/equipment/equipment-form-state'
import type { Equipment, EquipmentStatus } from '@/features/equipment/types'
import { useUsers } from './users'
import type { EquipmentType } from './equipment-types'

const STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: 'Available', label: 'Available' },
  { value: 'Faulty', label: 'Faulty' },
  { value: 'UnderMaintenance', label: 'Under maintenance' },
  { value: 'Retired', label: 'Retired' },
]

export function EquipmentUnitsPanel({ equipmentType, onClose }: { equipmentType: EquipmentType; onClose: () => void }) {
  // Archived units are listed too (with a Retired status), so they can still be edited here.
  const { data: allEquipment, isLoading, isError } = useEquipment('All', { includeArchived: true })
  const units = (allEquipment ?? []).filter((e) => e.equipmentTypeId === equipmentType.id)
  const [editingUnitId, setEditingUnitId] = useState<number | 'new' | null>(null)
  const editingUnit = editingUnitId === 'new' ? undefined : units.find((u) => u.id === editingUnitId)

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-muted/20 p-4" data-tour="admin-equipment-units-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Equipment units — {equipmentType.name}</h3>
          <p className="text-sm text-muted-foreground">
            Add machines, upload photos, change status, and assign Science Officers — all without leaving Admin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setEditingUnitId('new')}>
            Add unit
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Room</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Shared</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {isError && (
              <TableEmptyState colSpan={6} tone="error" title="Couldn't load equipment units." description="Check that the API is running and try again." />
            )}

            {!isLoading && !isError && units.length === 0 && (
              <TableEmptyState colSpan={6} title="No units of this type yet." description="Click Add unit to create the first one." />
            )}

            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell>
                  <EquipmentAvatar imageUrl={unit.imageUrl} iconKey={unit.iconKey} name={unit.name} className="size-8" />
                </TableCell>
                <TableCell className="font-medium text-foreground">{unit.name}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{unit.roomLabel}</TableCell>
                <TableCell>
                  <StatusIndicator status={unit.status} />
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{unit.isShared ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditingUnitId(unit.id)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingUnitId !== null && (
        <EquipmentUnitForm
          key={editingUnitId}
          equipmentType={equipmentType}
          equipment={editingUnit}
          onDone={() => setEditingUnitId(null)}
        />
      )}
    </div>
  )
}

function EquipmentUnitForm({
  equipmentType,
  equipment,
  onDone,
}: {
  equipmentType: EquipmentType
  equipment?: Equipment
  onDone: () => void
}) {
  const [state, setState] = useEquipmentFormState(equipment)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [focusRequest, setFocusRequest] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const create = useCreateEquipment()
  const update = useUpdateEquipment(equipment?.id ?? 0)

  // A new unit is already scoped to this type by virtue of being added from
  // its panel — pre-fill the type picker instead of making the admin re-pick
  // something they've effectively already chosen.
  useEffect(() => {
    if (!equipment) setState((prev) => (prev.equipmentTypeId ? prev : { ...prev, equipmentTypeId: String(equipmentType.id) }))
  }, [equipment, equipmentType.id, setState])

  // Runs after the render that marked fields invalid.
  useEffect(() => {
    if (focusRequest > 0) focusFirstInvalidField(containerRef.current)
  }, [focusRequest])

  async function handleSubmit() {
    setError(null)
    const clientErrors = validateEquipmentForm(state)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setError('Check the highlighted fields.')
      setFocusRequest((n) => n + 1)
      return
    }
    setIsSubmitting(true)
    try {
      const request = { ...toEquipmentRequest(state), equipmentTypeId: Number(state.equipmentTypeId) || equipmentType.id }
      if (equipment) {
        await update.mutateAsync(request)
        toast.success(`Updated "${state.name}".`)
      } else {
        const created = await create.mutateAsync(request)
        toast.success(`Added "${created.name}".`)
      }
      onDone()
    } catch (err) {
      const fields = fieldErrors(err)
      if (fields && hasVisibleFieldError(fields)) {
        setErrors(fields)
        setError('Check the highlighted fields.')
        setFocusRequest((n) => n + 1)
      } else if (isConflict(err)) {
        toast.error(err.message)
      } else {
        setError(apiErrorMessage(err))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-4 rounded-md border border-border bg-card p-4">
      <h4 className="text-sm font-semibold text-foreground">{equipment ? `Edit ${equipment.name}` : 'Add unit'}</h4>

      <EquipmentFormFields
        state={state}
        setState={setState}
        errors={errors}
        setErrors={setErrors}
        currentOwner={equipment?.owner ?? null}
      />

      {equipment && <StatusField equipment={equipment} />}
      {equipment && <ScienceOfficersField equipment={equipment} />}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}

function StatusField({ equipment }: { equipment: Equipment }) {
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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="equipment-status">Status</Label>
      <Select value={equipment.status} onValueChange={handleChange} disabled={updateStatus.isPending}>
        <SelectTrigger id="equipment-status">
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
    </div>
  )
}

function ScienceOfficersField({ equipment }: { equipment: Equipment }) {
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
    <div className="flex flex-col gap-1.5">
      <Label>Science Officers assigned to this unit</Label>
      <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-2">
        {scienceOfficers.length === 0 && <p className="px-1 py-1 text-sm text-muted-foreground">No Science Officer accounts yet.</p>}
        {scienceOfficers.map((officer) => {
          const assignment = equipment.scienceOfficers.find((so) => so.userId === officer.id)
          return (
            <div key={officer.id} className="flex items-center justify-between gap-2 text-sm text-foreground">
              <label className="flex items-center gap-2">
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
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <Star className="size-3.5 fill-current" aria-hidden="true" />
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    disabled={isPending}
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
    </div>
  )
}
