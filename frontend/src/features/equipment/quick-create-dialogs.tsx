import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/form-field'
import {
  apiErrorMessage,
  fieldErrors,
  focusFirstInvalidField,
  isConflict,
  FieldValidationError,
  type FieldErrors,
} from '@/lib/api-error-message'
import { useDepartments } from '@/features/admin/departments'
import { useCreateEquipmentType, type EquipmentType } from '@/features/admin/equipment-types'
import { useCreateRoom, useRooms, type Room } from '@/features/admin/rooms'
import { useCreateFacility, useFacilities, type Facility } from '@/features/admin/facilities'
import { useCreateResearchGroup, useResearchGroups, type ResearchGroup } from '@/features/admin/research-groups'
import { usePrincipalInvestigators } from '@/features/admin/principal-investigators'

const NONE = 'none'
// Tones down Chrome's black dropdown arrow on inputs with a <datalist>.
const SUGGESTION_INPUT = '[&::-webkit-calendar-picker-indicator]:opacity-40'

export interface QuickCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Gets the new id and the created record.
  onCreated: (id: number, created: unknown) => void
  // The Select trigger to hand focus back to when the dialog closes, whether
  // it was saved or cancelled. The dialog has no trigger of its own (it's
  // opened by the "+" button), so Radix wouldn't know where to return focus.
  returnFocusId: string
  // Prefill for the department picker, usually the equipment's own.
  defaultDepartmentId?: string
}

// "+" button placed next to a Select to create a new option without leaving
// the form. Its accessible name says what it adds, e.g. "Add new room".
export function QuickCreateButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="icon" aria-label={label} title={label} onClick={onClick}>
      <Plus aria-hidden="true" />
    </Button>
  )
}

// Shared shell: its own <form> (portaled out of the parent form in the DOM,
// but React still bubbles submit events up the component tree — hence
// stopPropagation, so the equipment form isn't submitted too), per-field
// errors and focus management. The parent form's state is never touched
// except through onCreated, so nothing already entered is lost.
function QuickCreateShell({
  open,
  onOpenChange,
  returnFocusId,
  title,
  description,
  submitLabel,
  onSubmit,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusId: string
  title: string
  description: string
  submitLabel: string
  onSubmit: () => Promise<void>
  children: (errors: FieldErrors) => ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          document.getElementById(returnFocusId)?.focus()
        }}
      >
        {/* Mounted only while open, so each opening starts with a blank form. */}
        <QuickCreateForm title={title} description={description} submitLabel={submitLabel} onSubmit={onSubmit} onDone={() => onOpenChange(false)}>
          {children}
        </QuickCreateForm>
      </DialogContent>
    </Dialog>
  )
}

function QuickCreateForm({
  title,
  description,
  submitLabel,
  onSubmit,
  onDone,
  children,
}: {
  title: string
  description: string
  submitLabel: string
  onSubmit: () => Promise<void>
  onDone: () => void
  children: (errors: FieldErrors) => ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    event.stopPropagation()
    setErrors({})
    setMessage(null)
    setIsSubmitting(true)
    try {
      await onSubmit()
      onDone()
    } catch (err) {
      const fields = fieldErrors(err)
      if (fields) {
        setErrors(fields)
        // Wait for the error render before looking for the invalid field.
        requestAnimationFrame(() => {
          if (!focusFirstInvalidField(formRef.current)) setMessage(apiErrorMessage(err))
        })
      } else if (isConflict(err)) {
        toast.error(err.message)
      } else {
        setMessage(apiErrorMessage(err))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <form ref={formRef} noValidate className="flex min-w-0 flex-1 flex-col gap-4" onSubmit={handleSubmit}>
        {children(errors)}
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

function requireFields(checks: Record<string, string | false>) {
  const errors: FieldErrors = {}
  for (const [field, message] of Object.entries(checks)) if (message) errors[field] = [message]
  if (Object.keys(errors).length > 0) throw new FieldValidationError(errors)
}

// Puts the new item into the cached list straight away, so the parent Select
// can show it as selected before the background refetch finishes. Resolves
// once that list has re-rendered: a Radix Select inside a form mirrors its
// options into a hidden native <select>, and selecting a value that has no
// option there yet makes it fall back to empty, so onCreated must wait.
function useAppendToList() {
  const queryClient = useQueryClient()
  return async function append<T extends { id: number }>(queryKey: string, item: T) {
    queryClient.setQueryData<T[]>([queryKey], (old) => (old ? [...old.filter((o) => o.id !== item.id), item] : [item]))
    await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
  }
}

export function QuickCreateEquipmentTypeDialog({ open, onOpenChange, onCreated, returnFocusId }: QuickCreateProps) {
  const [name, setName] = useState('')
  const create = useCreateEquipmentType()
  const append = useAppendToList()
  const id = useId()

  async function handleSubmit() {
    requireFields({ Name: !name.trim() && 'Enter a name for the type.' })
    const created = await create.mutateAsync({ name: name.trim() })
    await append<EquipmentType>('equipment-types', created)
    onCreated(created.id, created)
    toast.success(`Added equipment type "${created.name}".`)
  }

  function handleOpenChange(next: boolean) {
    if (!next) setName('')
    onOpenChange(next)
  }

  return (
    <QuickCreateShell
      open={open}
      onOpenChange={handleOpenChange}
      returnFocusId={returnFocusId}
      title="Add equipment type"
      description="It's selected for this equipment once added."
      submitLabel="Add type"
      onSubmit={handleSubmit}
    >
      {(errors) => (
        <FormField id={`${id}-name`} label="Name" hint="For example: Centrifuge, Microscope." errors={errors.Name}>
          {(control) => <Input {...control} autoFocus value={name} onChange={(e) => setName(e.target.value)} />}
        </FormField>
      )}
    </QuickCreateShell>
  )
}

function distinct(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function QuickCreateRoomDialog({ open, onOpenChange, onCreated, returnFocusId, defaultDepartmentId = '' }: QuickCreateProps) {
  const id = useId()
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  // Follows the equipment form's department until changed here.
  const [departmentOverride, setDepartmentOverride] = useState<string | null>(null)
  const departmentId = departmentOverride ?? defaultDepartmentId
  const setDepartmentId = (value: string) => setDepartmentOverride(value)
  const [researchGroupId, setResearchGroupId] = useState('')
  const [facilityId, setFacilityId] = useState('')
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false)
  const { data: rooms } = useRooms()
  const { data: departments } = useDepartments()
  const { data: researchGroups } = useResearchGroups()
  const { data: facilities } = useFacilities()
  const create = useCreateRoom()
  const append = useAppendToList()

  const buildings = useMemo(() => distinct((rooms ?? []).map((r) => r.building)), [rooms])
  const floors = useMemo(
    () =>
      distinct(
        (rooms ?? [])
          .filter((r) => !building.trim() || r.building.toLowerCase() === building.trim().toLowerCase())
          .map((r) => r.floor),
      ),
    [rooms, building],
  )

  function reset() {
    setBuilding('')
    setFloor('')
    setRoomNumber('')
    setDepartmentOverride(null)
    setResearchGroupId('')
    setFacilityId('')
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleSubmit() {
    requireFields({
      Building: !building.trim() && 'Enter the building.',
      Floor: !floor.trim() && 'Enter the floor.',
      RoomNumber: !roomNumber.trim() && 'Enter the room number.',
    })
    const created = await create.mutateAsync({
      building: building.trim(),
      floor: floor.trim(),
      roomNumber: roomNumber.trim(),
      departmentId: departmentId ? Number(departmentId) : undefined,
      researchGroupId: researchGroupId ? Number(researchGroupId) : undefined,
      facilityId: facilityId ? Number(facilityId) : undefined,
    })
    await append<Room>('rooms', created)
    onCreated(created.id, created)
    toast.success(`Added room ${created.roomNumber}.`)
  }

  return (
    <>
      <QuickCreateShell
        open={open}
        onOpenChange={handleOpenChange}
        returnFocusId={returnFocusId}
        title="Add room"
        description="It's selected for this equipment once added."
        submitLabel="Add room"
        onSubmit={handleSubmit}
      >
        {(errors) => (
          <>
            <FormField id={`${id}-building`} label="Building" errors={errors.Building}>
              {(control) => (
                <>
                  <Input {...control} autoFocus list={`${id}-buildings`} className={SUGGESTION_INPUT} autoComplete="off" value={building} onChange={(e) => setBuilding(e.target.value)} />
                  <datalist id={`${id}-buildings`}>
                    {buildings.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </>
              )}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id={`${id}-floor`} label="Floor" hint="For example: 4th Floor." errors={errors.Floor}>
                {(control) => (
                  <>
                    <Input {...control} list={`${id}-floors`} className={SUGGESTION_INPUT} autoComplete="off" value={floor} onChange={(e) => setFloor(e.target.value)} />
                    <datalist id={`${id}-floors`}>
                      {floors.map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
                  </>
                )}
              </FormField>
              <FormField id={`${id}-number`} label="Room number" errors={errors.RoomNumber}>
                {(control) => <Input {...control} autoComplete="off" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />}
              </FormField>
            </div>
            <FormField id={`${id}-department`} label="Department (optional)" hint="Leave empty for a shared room." errors={errors.DepartmentId}>
              {(control) => (
                <Select value={departmentId || NONE} onValueChange={(v) => setDepartmentId(v === NONE ? '' : v)}>
                  <SelectTrigger {...control} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No department (shared)</SelectItem>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id={`${id}-lab`} label="Lab (optional)" errors={errors.ResearchGroupId}>
              {(control) => (
                <Select value={researchGroupId || NONE} onValueChange={(v) => setResearchGroupId(v === NONE ? '' : v)}>
                  <SelectTrigger {...control} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No lab</SelectItem>
                    {researchGroups?.map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField id={`${id}-facility`} label="Facility (optional)" errors={errors.FacilityId}>
              {(control) => (
                <div className="flex gap-2">
                  <Select value={facilityId || NONE} onValueChange={(v) => setFacilityId(v === NONE ? '' : v)}>
                    <SelectTrigger {...control} className="w-full min-w-0 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No facility</SelectItem>
                      {facilities?.map((facility) => (
                        <SelectItem key={facility.id} value={String(facility.id)}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <QuickCreateButton label="Add new facility" onClick={() => setFacilityDialogOpen(true)} />
                </div>
              )}
            </FormField>
          </>
        )}
      </QuickCreateShell>

      <QuickCreateFacilityDialog
        open={facilityDialogOpen}
        onOpenChange={setFacilityDialogOpen}
        onCreated={(newId) => setFacilityId(String(newId))}
        returnFocusId={`${id}-facility`}
        defaultDepartmentId={departmentId || defaultDepartmentId}
      />
    </>
  )
}

export function QuickCreateFacilityDialog({ open, onOpenChange, onCreated, returnFocusId, defaultDepartmentId = '' }: QuickCreateProps) {
  const id = useId()
  const [name, setName] = useState('')
  // Follows the equipment form's department until changed here.
  const [departmentOverride, setDepartmentOverride] = useState<string | null>(null)
  const departmentId = departmentOverride ?? defaultDepartmentId
  const setDepartmentId = (value: string) => setDepartmentOverride(value)
  const { data: departments } = useDepartments()
  const create = useCreateFacility()
  const append = useAppendToList()

  function handleOpenChange(next: boolean) {
    if (!next) {
      setName('')
      setDepartmentOverride(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit() {
    requireFields({
      Name: !name.trim() && 'Enter a name for the facility.',
      DepartmentId: !departmentId && 'Choose the department it belongs to.',
    })
    const created = await create.mutateAsync({ name: name.trim(), departmentId: Number(departmentId), overseerUserIds: [] })
    await append<Facility>('facilities', created)
    onCreated(created.id, created)
    toast.success(`Added facility "${created.name}".`)
  }

  return (
    <QuickCreateShell
      open={open}
      onOpenChange={handleOpenChange}
      returnFocusId={returnFocusId}
      title="Add facility"
      description="Add overseers later from Admin, Facilities."
      submitLabel="Add facility"
      onSubmit={handleSubmit}
    >
      {(errors) => (
        <>
          <FormField id={`${id}-name`} label="Name" hint="For example: BSL2 Mammalian." errors={errors.Name}>
            {(control) => <Input {...control} autoFocus value={name} onChange={(e) => setName(e.target.value)} />}
          </FormField>
          <FormField id={`${id}-department`} label="Department" errors={errors.DepartmentId}>
            {(control) => (
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger {...control} className="w-full">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </>
      )}
    </QuickCreateShell>
  )
}

export function QuickCreateLabDialog({ open, onOpenChange, onCreated, returnFocusId, defaultDepartmentId = '' }: QuickCreateProps) {
  const id = useId()
  const [name, setName] = useState('')
  // Follows the equipment form's department until changed here.
  const [departmentOverride, setDepartmentOverride] = useState<string | null>(null)
  const departmentId = departmentOverride ?? defaultDepartmentId
  const setDepartmentId = (value: string) => setDepartmentOverride(value)
  const [principalInvestigatorId, setPrincipalInvestigatorId] = useState('')
  const { data: departments } = useDepartments()
  const { data: principalInvestigators } = usePrincipalInvestigators()
  const create = useCreateResearchGroup()
  const append = useAppendToList()

  function handleOpenChange(next: boolean) {
    if (!next) {
      setName('')
      setDepartmentOverride(null)
      setPrincipalInvestigatorId('')
    }
    onOpenChange(next)
  }

  async function handleSubmit() {
    requireFields({
      Name: !name.trim() && 'Enter a name for the lab.',
      DepartmentId: !departmentId && 'Choose the department it belongs to.',
      PrincipalInvestigatorId: !principalInvestigatorId && 'Choose the principal investigator who leads it.',
    })
    const created = await create.mutateAsync({
      name: name.trim(),
      departmentId: Number(departmentId),
      principalInvestigatorId: Number(principalInvestigatorId),
    })
    await append<ResearchGroup>('research-groups', created)
    onCreated(created.id, created)
    toast.success(`Added lab "${created.name}".`)
  }

  return (
    <QuickCreateShell
      open={open}
      onOpenChange={handleOpenChange}
      returnFocusId={returnFocusId}
      title="Add lab"
      description="It's selected for this equipment once added."
      submitLabel="Add lab"
      onSubmit={handleSubmit}
    >
      {(errors) => (
        <>
          <FormField id={`${id}-name`} label="Name" hint="For example: Plant Stress." errors={errors.Name}>
            {(control) => <Input {...control} autoFocus value={name} onChange={(e) => setName(e.target.value)} />}
          </FormField>
          <FormField id={`${id}-department`} label="Department" errors={errors.DepartmentId}>
            {(control) => (
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger {...control} className="w-full">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField
            id={`${id}-pi`}
            label="Principal investigator"
            hint={principalInvestigators?.length === 0 ? 'Add a principal investigator in Admin first.' : undefined}
            errors={errors.PrincipalInvestigatorId}
          >
            {(control) => (
              <Select value={principalInvestigatorId} onValueChange={setPrincipalInvestigatorId}>
                <SelectTrigger {...control} className="w-full">
                  <SelectValue placeholder="Select a principal investigator" />
                </SelectTrigger>
                <SelectContent>
                  {principalInvestigators?.map((pi) => (
                    <SelectItem key={pi.id} value={String(pi.id)}>
                      {pi.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </>
      )}
    </QuickCreateShell>
  )
}
