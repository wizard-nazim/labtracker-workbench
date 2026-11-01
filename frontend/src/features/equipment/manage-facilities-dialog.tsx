import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useFacilities, DeleteFacilityDialog, type Facility } from '@/features/admin/facilities'
import { roomLabel, useUpdateRoom, type Room } from '@/features/admin/rooms'
import { QuickCreateButton, QuickCreateFacilityDialog } from './quick-create-dialogs'

const NONE = 'none'

// Facilities belong to rooms, not to equipment, so they're edited here rather
// than as part of the equipment form. Everything in this panel saves straight
// away (and says so), so pressing the equipment form's save button never has
// hidden side effects.
export function ManageFacilitiesDialog({ room }: { room: Room | undefined }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="self-start">
          <Building2 aria-hidden="true" />
          Manage facilities
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage facilities</DialogTitle>
          <DialogDescription>Changes here save immediately.</DialogDescription>
        </DialogHeader>
        {room && <RoomFacilityPicker key={room.id} room={room} />}
        <FacilityList />
      </DialogContent>
    </Dialog>
  )
}

function RoomFacilityPicker({ room }: { room: Room }) {
  const id = useId()
  const { data: facilities } = useFacilities()
  const update = useUpdateRoom(room.id)
  const [createOpen, setCreateOpen] = useState(false)

  async function setFacility(value: string) {
    const facilityId = value === NONE ? undefined : Number(value)
    try {
      // PUT /rooms is a full replace, so send the room's other fields as they are.
      await update.mutateAsync({
        building: room.building,
        floor: room.floor,
        roomNumber: room.roomNumber,
        departmentId: room.departmentId ?? undefined,
        researchGroupId: room.researchGroupId ?? undefined,
        facilityId,
      })
      toast.success('Saved')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-facility`}>Facility for room {roomLabel(room)}</Label>
      <div className="flex gap-2">
        <Select value={room.facilityId ? String(room.facilityId) : NONE} onValueChange={setFacility} disabled={update.isPending}>
          <SelectTrigger id={`${id}-facility`} className="w-full min-w-0 flex-1">
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
        <QuickCreateButton label="Add new facility" onClick={() => setCreateOpen(true)} />
      </div>
      <QuickCreateFacilityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(newId) => void setFacility(String(newId))}
        returnFocusId={`${id}-facility`}
        defaultDepartmentId={room.departmentId ? String(room.departmentId) : ''}
      />
    </div>
  )
}

function FacilityList() {
  const { data: facilities, isLoading } = useFacilities()

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-foreground">All facilities</h3>
      {isLoading && <p className="text-sm text-muted-foreground">Loading facilities…</p>}
      {!isLoading && facilities?.length === 0 && <p className="text-sm text-muted-foreground">No facilities yet.</p>}
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {facilities?.map((facility) => (
          <li key={facility.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{facility.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {facility.departmentName}
                {facility.roomLabels.length > 0 ? ` · ${facility.roomLabels.length} room${facility.roomLabels.length === 1 ? '' : 's'}` : ' · No rooms'}
              </p>
            </div>
            <DeleteFacilityButton facility={facility} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function DeleteFacilityButton({ facility }: { facility: Facility }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-destructive"
        aria-label={`Delete ${facility.name}`}
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      <DeleteFacilityDialog facility={facility} open={open} onOpenChange={setOpen} />
    </>
  )
}
