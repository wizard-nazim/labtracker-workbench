import { useId, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { ChevronDown, X } from 'lucide-react'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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

// Errors on these fields open "More options" so the field is visible.
const MORE_OPTIONS_FIELDS = [
  'SerialNumber',
  'Description',
  'OwnershipType',
  'OwnerUserId',
  'ResearchGroupId',
  'ImageUrl',
  'IconKey',
]

export function EquipmentFormFields({
  state,
  setState,
  errors = {},
  setErrors,
  currentOwner = null,
  moreOptionsExtra,
}: {
  state: EquipmentFormState
  setState: Dispatch<SetStateAction<EquipmentFormState>>
  errors?: FieldErrors
  setErrors?: Dispatch<SetStateAction<FieldErrors>>
  // The saved owner, shown when the user list isn't available (non-admins)
  // or the owner has since been deactivated.
  currentOwner?: EntityReference | null
  // Shown at the end of "More options" (e.g. status and science officers
  // when editing).
  moreOptionsExtra?: ReactNode
}) {
  const id = useId()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SuperAdmin'
  const { data: equipmentTypes } = useEquipmentTypes()
  const { data: rooms } = useRooms()
  const { data: departments } = useDepartments()
  const { data: researchGroups } = useResearchGroups()
  const [quickCreate, setQuickCreate] = useState<QuickCreateKind>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  // With one department (the usual case) it's filled in for you and tucked
  // under "More options"; with several, it has to be chosen up front.
  const singleDepartment = departments?.length === 1 ? departments[0] : undefined
  const departmentIsEssential = (departments?.length ?? 0) > 1
  const departmentValue = state.owningDepartmentId || (singleDepartment ? String(singleDepartment.id) : '')

  const moreHasError =
    MORE_OPTIONS_FIELDS.some((key) => errors[key]?.length) || (!departmentIsEssential && Boolean(errors.OwningDepartmentId?.length))
  const isMoreOpen = moreOpen || moreHasError

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

  const departmentField = (
    <FormField id={fieldId.department} label="Owning department" errors={errors.OwningDepartmentId}>
      {(control) => (
        <Select value={departmentValue} onValueChange={(v) => patch({ owningDepartmentId: v })}>
          <SelectTrigger {...control} className="w-full">
            <SelectValue placeholder="Choose a department" />
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
  )

  return (
    <>
      <div className="flex min-w-0 flex-col gap-4">
        <FormField id={fieldId.name} label="Name" hint="As people in the lab call it, e.g. Nikon confocal microscope." errors={errors.Name}>
          {(control) => (
            <Input {...control} required autoComplete="off" value={state.name} onChange={(e) => patch({ name: e.target.value })} />
          )}
        </FormField>

        <FormField id={fieldId.type} label="Type" errors={errors.EquipmentTypeId}>
          {(control) => (
            <div className="flex gap-2">
              <Select value={state.equipmentTypeId} onValueChange={(v) => patch({ equipmentTypeId: v })}>
                <SelectTrigger {...control} className="w-full min-w-0 flex-1">
                  <SelectValue placeholder="Choose a type" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes?.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSuperAdmin && <QuickCreateButton label="Add a new type" onClick={() => setQuickCreate('type')} />}
            </div>
          )}
        </FormField>

        <FormField
          id={fieldId.room}
          label="Room"
          hint={selectedRoom?.facilityName ? `Part of the ${selectedRoom.facilityName} facility.` : undefined}
          errors={errors.RoomId}
        >
          {(control) => (
            <div className="flex gap-2">
              <RoomSelect control={control} rooms={rooms} value={state.roomId} onChange={(v) => selectRoom(v)} />
              {isSuperAdmin && <QuickCreateButton label="Add a new room" onClick={() => setQuickCreate('room')} />}
            </div>
          )}
        </FormField>

        {departmentIsEssential && departmentField}
      </div>

      <Collapsible open={isMoreOpen} onOpenChange={setMoreOpen} className="min-w-0 rounded-lg border border-border">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group/more flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">More options</span>
              <span className="block text-xs text-muted-foreground">
                Serial number, owner, lab, sharing, photo{moreOptionsExtra ? ', status, science officers' : ''}
              </span>
            </span>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/more:rotate-180"
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex min-w-0 flex-col gap-4 border-t border-border px-3 pt-4 pb-4">
          <div className={departmentIsEssential ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2'}>
            <FormField id={fieldId.serial} label="Serial number (optional)" errors={errors.SerialNumber}>
              {(control) => (
                <Input {...control} autoComplete="off" value={state.serialNumber} onChange={(e) => patch({ serialNumber: e.target.value })} />
              )}
            </FormField>
            {!departmentIsEssential && departmentField}
          </div>

          <FormField id={fieldId.description} label="Description (optional)" errors={errors.Description}>
            {(control) => (
              <Textarea {...control} rows={2} value={state.description} onChange={(e) => patch({ description: e.target.value })} />
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
            hint={labIsFromRoom ? "Filled in from the room's lab. You can change it." : undefined}
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
                {isSuperAdmin && <QuickCreateButton label="Add a new lab" onClick={() => setQuickCreate('lab')} />}
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
            Shared with other departments
          </label>

          <ImageAndIconFields state={state} patch={patch} />

          {isSuperAdmin && <ManageFacilitiesDialog room={selectedRoom} />}

          {moreOptionsExtra && <div className="flex flex-col gap-4 border-t border-border pt-4">{moreOptionsExtra}</div>}
        </CollapsibleContent>
      </Collapsible>

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
            defaultDepartmentId={departmentValue}
          />
          <QuickCreateLabDialog
            open={quickCreate === 'lab'}
            onOpenChange={(open) => setQuickCreate(open ? 'lab' : null)}
            onCreated={(newId) => patch({ researchGroupId: String(newId) })}
            returnFocusId={fieldId.lab}
            defaultDepartmentId={departmentValue}
          />
        </>
      )}
    </>
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
        <SelectValue placeholder="Choose a room" />
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
            <SelectValue placeholder="Choose a person" />
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
  const [iconsOpen, setIconsOpen] = useState(false)
  const selectedIcon = EQUIPMENT_ICONS.find((icon) => icon.key === state.iconKey)
  const SelectedIcon = selectedIcon?.icon

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium text-foreground">Photo or icon (optional)</legend>
      <div className="flex flex-wrap items-center gap-3">
        {state.imageUrl && (
          <img src={state.imageUrl} alt="Chosen photo" className="size-16 rounded-md border border-border object-cover" />
        )}
        <ImageGalleryDialog
          trigger={
            <Button type="button" size="sm" variant="outline">
              {state.imageUrl ? 'Change photo' : 'Choose a photo'}
            </Button>
          }
          onSelect={(url) => patch({ imageUrl: url })}
        />
        {state.imageUrl && (
          <Button type="button" size="sm" variant="ghost" onClick={() => patch({ imageUrl: null })}>
            <X className="size-3.5" aria-hidden="true" />
            Remove photo
          </Button>
        )}
      </div>

      {!state.imageUrl && (
        <Collapsible open={iconsOpen} onOpenChange={setIconsOpen} className="flex min-w-0 flex-col gap-2">
          <CollapsibleTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="group/icons self-start">
              {SelectedIcon ? <SelectedIcon aria-hidden="true" /> : null}
              {selectedIcon ? `Icon: ${selectedIcon.label}` : 'Or choose an icon'}
              <ChevronDown className="transition-transform group-data-[state=open]/icons:rotate-180" aria-hidden="true" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p id={iconLabelId} className="sr-only">
              Icon, used when there's no photo
            </p>
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
                  className={`flex items-center justify-center rounded-md border p-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                    state.iconKey === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-transparent text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </fieldset>
  )
}
