import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { EntityDialog } from '@/components/entity-dialog'
import { Pencil, Trash2 } from 'lucide-react'
import { AddButton, AdminSection } from './admin-section'
import { ResponsiveList, RowActionsMenu } from '@/components/responsive-list'
import { useRowDialog } from '@/hooks/use-row-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDepartments } from './departments'
import { useResearchGroups } from './research-groups'
import { useFacilities } from './facilities'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { apiErrorMessage } from '@/lib/api-error-message'

export interface Room {
  id: number
  building: string
  floor: string
  roomNumber: string
  departmentId: number | null
  researchGroupId: number | null
  researchGroupName: string | null
  facilityId: number | null
  facilityName: string | null
}

export interface UpsertRoomRequest {
  building: string
  floor: string
  roomNumber: string
  departmentId?: number
  researchGroupId?: number
  facilityId?: number
}

export function useRooms() {
  return useQuery({ queryKey: ['rooms'], queryFn: () => apiClient.get<Room[]>('/rooms') })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertRoomRequest) => apiClient.post<Room>('/rooms', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })
}

export function useUpdateRoom(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertRoomRequest) => apiClient.put<Room>(`/rooms/${id}`, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      // Room labels and facility membership show up in both of these.
      queryClient.invalidateQueries({ queryKey: ['facilities'] })
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    },
  })
}

export function roomLabel(room: Pick<Room, 'building' | 'floor' | 'roomNumber'>) {
  return `${room.building} ${room.floor} ${room.roomNumber}`
}

function useDeleteRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<void>(`/rooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['facilities'] })
    },
  })
}

function DeleteRoomDialog({
  room,
  open,
  onOpenChange,
}: {
  room: Room
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const remove = useDeleteRoom()
  const label = roomLabel(room)

  async function handleDelete() {
    try {
      await remove.mutateAsync(room.id)
      toast.success(`Deleted room ${label}.`)
    } catch (err) {
      toast.error(`Couldn't delete room ${label}. ${apiErrorMessage(err)}`)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete room ${label}?`}
      description="Only rooms with no equipment in them can be deleted. This can't be undone."
      confirmLabel="Delete room"
      destructive
      onConfirm={handleDelete}
    />
  )
}

function RoomFields({
  building,
  setBuilding,
  floor,
  setFloor,
  roomNumber,
  setRoomNumber,
  departmentId,
  setDepartmentId,
  researchGroupId,
  setResearchGroupId,
  facilityId,
  setFacilityId,
}: {
  building: string
  setBuilding: (v: string) => void
  floor: string
  setFloor: (v: string) => void
  roomNumber: string
  setRoomNumber: (v: string) => void
  departmentId: string
  setDepartmentId: (v: string) => void
  researchGroupId: string
  setResearchGroupId: (v: string) => void
  facilityId: string
  setFacilityId: (v: string) => void
}) {
  const { data: departments } = useDepartments()
  const { data: researchGroups } = useResearchGroups()
  const { data: facilities } = useFacilities()

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="room-building">Building</Label>
        <Input id="room-building" required value={building} onChange={(e) => setBuilding(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="room-floor">Floor</Label>
        <Input id="room-floor" required value={floor} onChange={(e) => setFloor(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="room-number">Room number</Label>
        <Input id="room-number" required value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="room-department">Department (optional; leave empty for a shared room)</Label>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger id="room-department">
            <SelectValue placeholder="No department (shared)" />
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="room-lab">Lab (optional)</Label>
        <Select value={researchGroupId} onValueChange={setResearchGroupId}>
          <SelectTrigger id="room-lab">
            <SelectValue placeholder="No lab" />
          </SelectTrigger>
          <SelectContent>
            {researchGroups?.map((group) => (
              <SelectItem key={group.id} value={String(group.id)}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="room-facility">Facility (optional, e.g. a BSL2 suite)</Label>
        <Select value={facilityId} onValueChange={setFacilityId}>
          <SelectTrigger id="room-facility">
            <SelectValue placeholder="No facility" />
          </SelectTrigger>
          <SelectContent>
            {facilities?.map((facility) => (
              <SelectItem key={facility.id} value={String(facility.id)}>
                {facility.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

function CreateRoomDialog() {
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [researchGroupId, setResearchGroupId] = useState('')
  const [facilityId, setFacilityId] = useState('')
  const create = useCreateRoom()

  async function handleSubmit() {
    await create.mutateAsync({
      building,
      floor,
      roomNumber,
      departmentId: departmentId ? Number(departmentId) : undefined,
      researchGroupId: researchGroupId ? Number(researchGroupId) : undefined,
      facilityId: facilityId ? Number(facilityId) : undefined,
    })
    toast.success(`Added room ${roomNumber}.`)
    setBuilding('')
    setFloor('')
    setRoomNumber('')
    setDepartmentId('')
    setResearchGroupId('')
    setFacilityId('')
  }

  return (
    <EntityDialog
      trigger={<AddButton>Add room</AddButton>}
      title="Add room"
      submitLabel="Add room"
      onSubmit={handleSubmit}
    >
      <RoomFields
        building={building}
        setBuilding={setBuilding}
        floor={floor}
        setFloor={setFloor}
        roomNumber={roomNumber}
        setRoomNumber={setRoomNumber}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        researchGroupId={researchGroupId}
        setResearchGroupId={setResearchGroupId}
        facilityId={facilityId}
        setFacilityId={setFacilityId}
      />
    </EntityDialog>
  )
}

function EditRoomDialog({
  room,
  open,
  onOpenChange,
}: {
  room: Room
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [building, setBuilding] = useState(room.building)
  const [floor, setFloor] = useState(room.floor)
  const [roomNumber, setRoomNumber] = useState(room.roomNumber)
  const [departmentId, setDepartmentId] = useState(room.departmentId ? String(room.departmentId) : '')
  const [researchGroupId, setResearchGroupId] = useState(room.researchGroupId ? String(room.researchGroupId) : '')
  const [facilityId, setFacilityId] = useState(room.facilityId ? String(room.facilityId) : '')
  const update = useUpdateRoom(room.id)

  async function handleSubmit() {
    await update.mutateAsync({
      building,
      floor,
      roomNumber,
      departmentId: departmentId ? Number(departmentId) : undefined,
      researchGroupId: researchGroupId ? Number(researchGroupId) : undefined,
      facilityId: facilityId ? Number(facilityId) : undefined,
    })
    toast.success(`Updated room ${roomNumber}.`)
  }

  return (
    <EntityDialog
      title="Edit room"
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={onOpenChange}
    >
      <RoomFields
        building={building}
        setBuilding={setBuilding}
        floor={floor}
        setFloor={setFloor}
        roomNumber={roomNumber}
        setRoomNumber={setRoomNumber}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        researchGroupId={researchGroupId}
        setResearchGroupId={setResearchGroupId}
        facilityId={facilityId}
        setFacilityId={setFacilityId}
      />
    </EntityDialog>
  )
}

function RoomActions({ room }: { room: Room }) {
  const dialog = useRowDialog<'edit' | 'delete'>()
  return (
    <>
      <RowActionsMenu triggerRef={dialog.triggerRef}
        itemName={`room ${roomLabel(room)}`}
        actions={[
          { label: 'Edit', icon: Pencil, onSelect: () => dialog.show('edit') },
          { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => dialog.show('delete') },
        ]}
      />
      {dialog.mounted === 'edit' && <EditRoomDialog key={dialog.session} room={room} {...dialog.bind('edit')} />}
      <DeleteRoomDialog room={room} {...dialog.bind('delete')} />
    </>
  )
}

export function RoomsTab() {
  const { data: rooms, isLoading, isError } = useRooms()

  return (
    <AdminSection title="Rooms" description="Where equipment is kept. Each piece of equipment belongs to one room." action={<CreateRoomDialog />}>
      <ResponsiveList
        items={rooms}
        isLoading={isLoading}
        isError={isError}
        noun="rooms"
        getKey={(r) => r.id}
        search={{
          label: 'Search rooms',
          placeholder: 'Search by building, room, lab or facility',
          text: (r) => `${roomLabel(r)} ${r.researchGroupName ?? ''} ${r.facilityName ?? ''}`,
        }}
        empty={{ title: 'No rooms yet.', description: 'Add the first room.' }}
        columns={[
          { key: 'room', header: 'Room', cell: (r) => <span className="font-medium text-foreground">{r.roomNumber}</span> },
          { key: 'building', header: 'Building', cell: (r) => <span className="text-muted-foreground">{r.building}</span> },
          { key: 'floor', header: 'Floor', cell: (r) => <span className="text-muted-foreground">{r.floor}</span> },
          {
            key: 'lab',
            header: 'Lab',
            className: 'hidden lg:table-cell',
            cell: (r) => <span className="text-muted-foreground">{r.researchGroupName ?? '—'}</span>,
          },
          { key: 'facility', header: 'Facility', cell: (r) => <span className="text-muted-foreground">{r.facilityName ?? '—'}</span> },
        ]}
        renderCard={(r) => (
          <>
            <p className="font-medium text-foreground">Room {r.roomNumber}</p>
            <p className="text-[13px] text-muted-foreground">
              {r.building}, {r.floor}
            </p>
            {(r.facilityName || r.researchGroupName) && (
              <p className="text-[13px] text-muted-foreground">
                {[r.facilityName, r.researchGroupName].filter(Boolean).join(', ')}
              </p>
            )}
          </>
        )}
        renderActions={(r) => <RoomActions room={r} />}
      />
    </AdminSection>
  )
}
