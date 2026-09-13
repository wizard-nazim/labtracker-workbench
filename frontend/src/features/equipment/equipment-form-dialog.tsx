import { useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
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
import { useDepartments } from '@/features/admin/departments'
import { useEquipmentTypes } from '@/features/admin/equipment-types'
import { useRooms } from '@/features/admin/rooms'
import { EQUIPMENT_ICONS } from './equipment-icons'
import { useCreateEquipment, useUpdateEquipment, useUploadEquipmentImage } from './use-equipment'
import type { Equipment } from './types'

interface EquipmentFormState {
  name: string
  serialNumber: string
  description: string
  equipmentTypeId: string
  roomId: string
  owningDepartmentId: string
  isShared: boolean
  iconKey: string | null
  imageFile: File | null
  imagePreviewUrl: string | null
}

function useEquipmentFormState(initial?: Equipment) {
  const [state, setState] = useState<EquipmentFormState>({
    name: initial?.name ?? '',
    serialNumber: initial?.serialNumber ?? '',
    description: initial?.description ?? '',
    equipmentTypeId: initial ? String(initial.equipmentTypeId) : '',
    roomId: initial ? String(initial.roomId) : '',
    owningDepartmentId: initial ? String(initial.owningDepartmentId) : '',
    isShared: initial?.isShared ?? false,
    iconKey: initial?.iconKey ?? null,
    imageFile: null,
    imagePreviewUrl: null,
  })
  return [state, setState] as const
}

function EquipmentFormFields({
  state,
  setState,
}: {
  state: EquipmentFormState
  setState: Dispatch<SetStateAction<EquipmentFormState>>
}) {
  const { data: equipmentTypes } = useEquipmentTypes()
  const { data: rooms } = useRooms()
  const { data: departments } = useDepartments()

  function patch(fields: Partial<EquipmentFormState>) {
    setState((prev) => ({ ...prev, ...fields }))
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    patch({
      imageFile: file,
      imagePreviewUrl: file ? URL.createObjectURL(file) : null,
    })
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="equipment-name">Name</Label>
        <Input id="equipment-name" required value={state.name} onChange={(e) => patch({ name: e.target.value })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="equipment-serial">Serial number (optional)</Label>
        <Input
          id="equipment-serial"
          value={state.serialNumber}
          onChange={(e) => patch({ serialNumber: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="equipment-description">Description (optional)</Label>
        <Textarea
          id="equipment-description"
          value={state.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="equipment-type">Equipment type</Label>
        <Select value={state.equipmentTypeId} onValueChange={(v) => patch({ equipmentTypeId: v })}>
          <SelectTrigger id="equipment-type">
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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="equipment-room">Room</Label>
        <Select value={state.roomId} onValueChange={(v) => patch({ roomId: v })}>
          <SelectTrigger id="equipment-room">
            <SelectValue placeholder="Select a room" />
          </SelectTrigger>
          <SelectContent>
            {rooms?.map((room) => (
              <SelectItem key={room.id} value={String(room.id)}>
                {room.building} {room.floor} {room.roomNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="equipment-department">Owning department</Label>
        <Select value={state.owningDepartmentId} onValueChange={(v) => patch({ owningDepartmentId: v })}>
          <SelectTrigger id="equipment-department">
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
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="size-4 rounded border-border accent-primary"
          checked={state.isShared}
          onChange={(e) => patch({ isShared: e.target.checked })}
        />
        Shared across departments
      </label>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="equipment-image">Image (optional)</Label>
        <input
          id="equipment-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm file:text-foreground"
        />
        {state.imagePreviewUrl && (
          <img src={state.imagePreviewUrl} alt="Preview" className="mt-1 h-24 w-24 rounded-md border border-border object-cover" />
        )}
      </div>

      {!state.imagePreviewUrl && (
        <div className="flex flex-col gap-1.5">
          <Label>Fallback icon (used when no image is set)</Label>
          <div className="grid grid-cols-8 gap-1.5 rounded-md border border-border p-2 sm:grid-cols-10">
            {EQUIPMENT_ICONS.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                title={label}
                onClick={() => patch({ iconKey: state.iconKey === key ? null : key })}
                className={`flex items-center justify-center rounded-md border p-1.5 transition-colors ${
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

function toRequest(state: EquipmentFormState) {
  return {
    name: state.name,
    serialNumber: state.serialNumber || undefined,
    description: state.description || undefined,
    isShared: state.isShared,
    iconKey: state.iconKey ?? undefined,
    equipmentTypeId: Number(state.equipmentTypeId),
    roomId: Number(state.roomId),
    owningDepartmentId: Number(state.owningDepartmentId),
  }
}

export function CreateEquipmentDialog() {
  const [state, setState] = useEquipmentFormState()
  const create = useCreateEquipment()
  const uploadImage = useUploadEquipmentImage()

  async function handleSubmit() {
    const created = await create.mutateAsync(toRequest(state))
    if (state.imageFile) {
      await uploadImage.mutateAsync({ id: created.id, file: state.imageFile })
    }
    toast.success(`Added equipment "${created.name}".`)
    setState({
      name: '',
      serialNumber: '',
      description: '',
      equipmentTypeId: '',
      roomId: '',
      owningDepartmentId: '',
      isShared: false,
      iconKey: null,
      imageFile: null,
      imagePreviewUrl: null,
    })
  }

  const canSubmit = Boolean(state.name && state.equipmentTypeId && state.roomId && state.owningDepartmentId)

  return (
    <EntityDialog
      trigger={<Button size="sm">Add equipment</Button>}
      title="Add equipment"
      submitLabel="Add equipment"
      submitDisabled={!canSubmit}
      onSubmit={handleSubmit}
    >
      <EquipmentFormFields state={state} setState={setState} />
    </EntityDialog>
  )
}

export function EditEquipmentDialog({ equipment }: { equipment: Equipment }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useEquipmentFormState(equipment)
  const update = useUpdateEquipment(equipment.id)
  const uploadImage = useUploadEquipmentImage()

  async function handleSubmit() {
    await update.mutateAsync(toRequest(state))
    if (state.imageFile) {
      await uploadImage.mutateAsync({ id: equipment.id, file: state.imageFile })
    }
    toast.success(`Updated equipment "${state.name}".`)
  }

  const canSubmit = Boolean(state.name && state.equipmentTypeId && state.roomId && state.owningDepartmentId)

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      }
      title="Edit equipment"
      submitLabel="Save changes"
      submitDisabled={!canSubmit}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <EquipmentFormFields state={state} setState={setState} />
    </EntityDialog>
  )
}
