import { useId, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { X } from 'lucide-react'
import { cn } from 'cn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/form-field'
import { useAuth } from '@/context/auth-context'
import type { FieldErrors } from '@/lib/api-error-message'
import { ROLE_LABEL, type UserRole } from '@/types/roles'
import { useDepartments } from '@/features/admin/departments'
import { useEquipmentTypes } from '@/features/admin/equipment-types'
import { useRooms, type Room } from '@/features/admin/rooms'
import { useResearchGroups } from '@/features/admin/research-groups'
import { useUsers } from '@/features/admin/users'
import { EQUIPMENT_ICONS } from './equipment-icons'
import { ImageGalleryDialog } from './image-gallery-dialog'
import {
  QuickCreateButton,
  QuickCreateEquipmentTypeDialog,
  QuickCreateLabDialog,
  QuickCreateRoomDialog,
} from './quick-create-dialogs'
import { ManageFacilitiesDialog } from './manage-facilities-dialog'
import type { EquipmentFormState } from './equipment-form-state'
import type { EntityReference, OwnershipType } from './types'

const NONE = 'none'
const OWNER_ROLES: UserRole[] = ['ScienceOfficer', 'Researcher', 'PrincipalInvestigator']

// Which API field (PascalCase, as in validation errors) each state key feeds,
// so editing a field clears its error.
const ERROR_KEY: Partial<Record<keyof EquipmentFormState, string>> = {
  name: 'Name',
  serialNumber: 'SerialNumber',
  description: 'Description',
  equipmentTypeId: 'EquipmentTypeId',
  roomId: 'RoomId',
  owningDepartmentId: 'OwningDepartmentId',
  ownershipType: 'OwnershipType',
  ownerUserId: 'OwnerUserId',
  researchGroupId: 'ResearchGroupId',
  imageUrl: 'ImageUrl',
  iconKey: 'IconKey',
}

type QuickCreateKind = 'type' | 'room' | 'lab' | null

export function EquipmentFormFields({
  state,
  setState,
  errors = {},
  setErrors,
  currentOwner = null,
}: {
  state: EquipmentFormState
  setState: Dispatch<SetStateAction<EquipmentFormState>>
  errors?: FieldErrors
  setErrors?: Dispatch<SetStateAction<FieldErrors>>
  // The saved owner, shown when the user list isn't available (non-admins)
  // or the owner has since been deactivated.
  currentOwner?: EntityReference | null
}) {
  const id = useId()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SuperAdmin'
  const { data: equipmentTypes } = useEquipmentTypes()
  const { data: rooms } = useRooms()
  const { data: departments } = useDepartments()
  const { data: researchGroups } = useResearchGroups()
  const [quickCreate, setQuickCreate] = useState<QuickCreateKind>(null)

  const fieldId = {
    name: `${id}-name`,
    serial: `${id}-serial`,
    description: `${id}-description`,
    type: `${id}-type`,
    room: `${id}-room`,
    department: `${id}-department`,
    owner: `${id}-owner`,
    lab: `${id}-lab`,
  }

  const selectedRoom = rooms?.find((r) => String(r.id) === state.roomId)

  function patch(fields: Partial<EquipmentFormState>) {
    setState((prev) => ({ ...prev, ...fields }))
    if (setErrors) {
      const cleared = Object.keys(fields)
        .map((key) => ERROR_KEY[key as keyof EquipmentFormState])
        .filter((key): key is string => Boolean(key))
      if (cleared.some((key) => errors[key])) {
        setErrors((prev) => {
          const next = { ...prev }
          for (const key of cleared) delete next[key]
          return next
        })
      }
    }
  }

  // The lab follows the room's lab unless the admin picked a different one:
  // it's replaced only while it's empty or still the previous room's lab.
  function selectRoom(roomId: string, roomList: Room[] | undefined = rooms) {
    const previousRoomLab = selectedRoom?.researchGroupId ? String(selectedRoom.researchGroupId) : ''
    const nextRoom = roomList?.find((r) => String(r.id) === roomId)
    const nextRoomLab = nextRoom?.researchGroupId ? String(nextRoom.researchGroupId) : ''
    const labFollowsRoom = state.researchGroupId === '' || state.researchGroupId === previousRoomLab
    patch(labFollowsRoom ? { roomId, researchGroupId: nextRoomLab } : { roomId })
  }

  const labIsFromRoom =
    Boolean(selectedRoom?.researchGroupId) && state.researchGroupId === String(selectedRoom?.researchGroupId)

  return (
    <>
      <Section legend="Details">
        <FormField id={fieldId.name} label="Name" errors={errors.Name}>
          {(control) => (
            <Input {...control} required autoComplete="off" value={state.name} onChange={(e) => patch({ name: e.target.value })} />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={fieldId.serial} label="Serial number (optional)" errors={errors.SerialNumber}>
            {(control) => (
              <Input {...control} autoComplete="off" value={state.serialNumber} onChange={(e) => patch({ serialNumber: e.target.value })} />
            )}
          </FormField>

          <FormField id={fieldId.type} label="Equipment type" errors={errors.EquipmentTypeId}>
            {(control) => (
              <div className="flex gap-2">
                <Select value={state.equipmentTypeId} onValueChange={(v) => patch({ equipmentTypeId: v })}>
                  <SelectTrigger {...control} className="w-full min-w-0 flex-1">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes?.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isSuperAdmin && <QuickCreateButton label="Add new equipment type" onClick={() => setQuickCreate('type')} />}
              </div>
            )}
          </FormField>
        </div>

        <FormField id={fieldId.description} label="Description (optional)" errors={errors.Description}>
          {(control) => (
            <Textarea {...control} value={state.description} onChange={(e) => patch({ description: e.target.value })} />
          )}
        </FormField>

        <ImageAndIconFields state={state} patch={patch} />
      </Section>

      <Section legend="Location">
        <FormField
          id={fieldId.room}
          label="Room"
          hint={
            selectedRoom
              ? selectedRoom.facilityName
                ? `Part of the ${selectedRoom.facilityName} facility.`
                : 'Not part of a facility.'
              : undefined
          }
          errors={errors.RoomId}
        >
          {(control) => (
            <div className="flex gap-2">
              <RoomSelect control={control} rooms={rooms} value={state.roomId} onChange={(v) => selectRoom(v)} />
              {isSuperAdmin && <QuickCreateButton label="Add new room" onClick={() => setQuickCreate('room')} />}
            </div>
          )}
        </FormField>

        {isSuperAdmin && <ManageFacilitiesDialog room={selectedRoom} />}
      </Section>

      <Section legend="Ownership and lab">
        <FormField id={fieldId.department} label="Owning department" errors={errors.OwningDepartmentId}>
          {(control) => (
            <Select value={state.owningDepartmentId} onValueChange={(v) => patch({ owningDepartmentId: v })}>
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

        <OwnershipToggle
          name={`${id}-ownership`}
          value={state.ownershipType}
          // Only admins can list users to pick an owner; others keep what's saved.
          individualDisabled={!isSuperAdmin && state.ownershipType !== 'Individual'}
          onChange={(ownershipType) =>
            patch(ownershipType === 'Department' ? { ownershipType, ownerUserId: '' } : { ownershipType })
          }
        />

        {state.ownershipType === 'Individual' && (
          <OwnerField
            id={fieldId.owner}
            canPick={isSuperAdmin}
            value={state.ownerUserId}
            currentOwner={currentOwner}
            errors={errors.OwnerUserId}
            onChange={(ownerUserId) => patch({ ownerUserId })}
          />
        )}

        <FormField
          id={fieldId.lab}
          label="Lab (optional)"
          hint={labIsFromRoom ? "Prefilled from the room's lab. You can change it." : undefined}
          errors={errors.ResearchGroupId}
        >
          {(control) => (
            <div className="flex gap-2">
              <Select value={state.researchGroupId || NONE} onValueChange={(v) => patch({ researchGroupId: v === NONE ? '' : v })}>
                <SelectTrigger {...control} className="w-full min-w-0 flex-1">
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
              {isSuperAdmin && <QuickCreateButton label="Add new lab" onClick={() => setQuickCreate('lab')} />}
            </div>
          )}
        </FormField>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4 rounded border-border accent-primary"
            checked={state.isShared}
            onChange={(e) => patch({ isShared: e.target.checked })}
          />
          Shared across departments
        </label>
      </Section>

      {isSuperAdmin && (
        <>
          <QuickCreateEquipmentTypeDialog
            open={quickCreate === 'type'}
            onOpenChange={(open) => setQuickCreate(open ? 'type' : null)}
            onCreated={(newId) => patch({ equipmentTypeId: String(newId) })}
            returnFocusId={fieldId.type}
          />
          <QuickCreateRoomDialog
            open={quickCreate === 'room'}
            onOpenChange={(open) => setQuickCreate(open ? 'room' : null)}
            // `rooms` is from before the room existed, so pass the new one in
            // for the lab prefill.
            onCreated={(newId, created) => selectRoom(String(newId), [...(rooms ?? []), created as Room])}
            returnFocusId={fieldId.room}
            defaultDepartmentId={state.owningDepartmentId}
          />
          <QuickCreateLabDialog
            open={quickCreate === 'lab'}
            onOpenChange={(open) => setQuickCreate(open ? 'lab' : null)}
            onCreated={(newId) => patch({ researchGroupId: String(newId) })}
            returnFocusId={fieldId.lab}
            defaultDepartmentId={state.owningDepartmentId}
          />
        </>
      )}
    </>
  )
}

function Section({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-3 text-sm font-semibold text-foreground">{legend}</legend>
      {children}
    </fieldset>
  )
}

// Rooms grouped by building and floor, so a long list is scannable.
function RoomSelect({
  control,
  rooms,
  value,
  onChange,
}: {
  control: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }
  rooms: Room[] | undefined
  value: string
  onChange: (value: string) => void
}) {
  const groups = useMemo(() => {
    const byKey = new Map<string, { label: string; rooms: Room[] }>()
    const sorted = [...(rooms ?? [])].sort(
      (a, b) =>
        a.building.localeCompare(b.building) ||
        a.floor.localeCompare(b.floor, undefined, { numeric: true }) ||
        a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }),
    )
    for (const room of sorted) {
      const key = `${room.building}\u0000${room.floor}`
      if (!byKey.has(key)) byKey.set(key, { label: `${room.building}, ${room.floor}`, rooms: [] })
      byKey.get(key)!.rooms.push(room)
    }
    return [...byKey.entries()]
  }, [rooms])

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger {...control} className="w-full min-w-0 flex-1">
        <SelectValue placeholder="Select a room" />
      </SelectTrigger>
      <SelectContent>
        {groups.map(([key, group]) => (
          <SelectGroup key={key}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.rooms.map((room) => (
              <SelectItem key={room.id} value={String(room.id)}>
                {room.building} {room.floor} {room.roomNumber}
                {room.facilityName ? ` (${room.facilityName})` : ''}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

function OwnershipToggle({
  name,
  value,
  individualDisabled,
  onChange,
}: {
  name: string
  value: OwnershipType
  individualDisabled: boolean
  onChange: (value: OwnershipType) => void
}) {
  const options: { value: OwnershipType; label: string; disabled: boolean }[] = [
    { value: 'Department', label: 'The department', disabled: false },
    { value: 'Individual', label: 'A person', disabled: individualDisabled },
  ]

  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-foreground">Owned by</legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-input p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer items-center justify-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
              value === option.value ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted/60',
              option.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
              className="size-3.5 accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
      {individualDisabled && <p className="text-xs text-muted-foreground">Only admins can assign equipment to a person.</p>}
    </fieldset>
  )
}

function OwnerField({
  id,
  canPick,
  value,
  currentOwner,
  errors,
  onChange,
}: {
  id: string
  canPick: boolean
  value: string
  currentOwner: EntityReference | null
  errors?: string[]
  onChange: (value: string) => void
}) {
  // /users is admin-only, so only fetch it for admins.
  const { data: users } = useUsers(canPick)
  const options = (users ?? []).filter(
    (u) => OWNER_ROLES.includes(u.role) && (u.isActive || String(u.id) === value),
  )

  if (!canPick) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>Owner</Label>
        <p className="text-sm text-foreground">{currentOwner?.name ?? 'Not set'}</p>
      </div>
    )
  }

  return (
    <FormField
      id={id}
      label="Owner"
      hint="A Science Officer, researcher or principal investigator. Deactivated accounts can't be chosen."
      errors={errors}
    >
      {(control) => (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger {...control} className="w-full">
            <SelectValue placeholder="Select a person" />
          </SelectTrigger>
          <SelectContent>
            {options.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.email} · {ROLE_LABEL[u.role]}
                {!u.isActive ? ' (deactivated)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  )
}

function ImageAndIconFields({
  state,
  patch,
}: {
  state: EquipmentFormState
  patch: (fields: Partial<EquipmentFormState>) => void
}) {
  const iconLabelId = useId()
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label>Image (optional)</Label>
        <div className="flex items-center gap-3">
          {state.imageUrl && (
            <img src={state.imageUrl} alt="Selected image" className="size-16 rounded-md border border-border object-cover" />
          )}
          <div className="flex flex-col gap-1.5">
            <ImageGalleryDialog
              trigger={
                <Button type="button" size="sm" variant="outline">
                  Browse gallery
                </Button>
              }
              onSelect={(url) => patch({ imageUrl: url })}
            />
            {state.imageUrl && (
              <Button type="button" size="sm" variant="ghost" onClick={() => patch({ imageUrl: null })}>
                <X className="size-3.5" aria-hidden="true" />
                Remove image
              </Button>
            )}
          </div>
        </div>
      </div>

      {!state.imageUrl && (
        <div className="flex flex-col gap-1.5">
          <Label id={iconLabelId}>Fallback icon (used when no image is set)</Label>
          <div
            role="group"
            aria-labelledby={iconLabelId}
            className="grid grid-cols-6 gap-1.5 rounded-md border border-border p-2 min-[400px]:grid-cols-8 sm:grid-cols-10"
          >
            {EQUIPMENT_ICONS.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={state.iconKey === key}
                onClick={() => patch({ iconKey: state.iconKey === key ? null : key })}
                className={`flex items-center justify-center rounded-md border p-1.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                  state.iconKey === key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
