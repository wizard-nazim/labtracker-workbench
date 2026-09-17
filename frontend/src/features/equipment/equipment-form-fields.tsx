import type { Dispatch, SetStateAction } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
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
import { ImageGalleryDialog } from './image-gallery-dialog'
import type { EquipmentFormState } from './equipment-form-state'

export function EquipmentFormFields({
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
        <Label>Image (optional)</Label>
        <div className="flex items-center gap-3">
          {state.imageUrl && (
            <img src={state.imageUrl} alt="Preview" className="size-16 rounded-md border border-border object-cover" />
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
