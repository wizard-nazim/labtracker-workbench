import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { EntityDialog } from '@/components/entity-dialog'
import { AdminSection } from './admin-section'
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
import { Button } from '@/components/ui/button'
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

interface UpsertRoomRequest {
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

function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertRoomRequest) => apiClient.post<Room>('/rooms', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })
}

function useUpdateRoom(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertRoomRequest) => apiClient.put<Room>(`/rooms/${id}`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  })
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
        <Label htmlFor="room-department">Department (optional, for shared rooms)</Label>
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
        <Label htmlFor="room-lab">Lab (optional — a lab's rooms can span multiple floors)</Label>
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
        <Label htmlFor="room-facility">Facility (optional — a facility's rooms can span multiple floors)</Label>
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
      trigger={<Button size="sm">Add room</Button>}
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

function EditRoomDialog({ room }: { room: Room }) {
  const [open, setOpen] = useState(false)
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
      trigger={
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      }
      title="Edit room"
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
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

export function RoomsTab() {
  const { data: rooms, isLoading, isError } = useRooms()

  return (
    <AdminSection title="Rooms" description="Physical locations where equipment lives." action={<CreateRoomDialog />}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Building</TableHead>
            <TableHead>Floor</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Lab</TableHead>
            <TableHead>Facility</TableHead>
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
            <TableEmptyState
              colSpan={6}
              tone="error"
              title="Couldn't load rooms."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && rooms?.length === 0 && <TableEmptyState colSpan={6} title="No rooms yet." />}

          {rooms?.map((room) => (
            <TableRow key={room.id}>
              <TableCell className="text-muted-foreground">{room.building}</TableCell>
              <TableCell className="text-muted-foreground">{room.floor}</TableCell>
              <TableCell className="font-medium text-foreground">{room.roomNumber}</TableCell>
              <TableCell className="text-muted-foreground">{room.researchGroupName ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{room.facilityName ?? '—'}</TableCell>
              <TableCell className="text-right">
                <EditRoomDialog room={room} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  )
}
