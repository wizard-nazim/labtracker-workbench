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
import { useUsers } from './users'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { apiErrorMessage } from '@/lib/api-error-message'

export interface Facility {
  id: number
  name: string
  departmentId: number
  departmentName: string
  overseerUserIds: number[]
  overseerEmails: string[]
  roomLabels: string[]
}

interface UpsertFacilityRequest {
  name: string
  departmentId: number
  overseerUserIds: number[]
}

export function useFacilities() {
  return useQuery({ queryKey: ['facilities'], queryFn: () => apiClient.get<Facility[]>('/facilities') })
}

export function useCreateFacility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertFacilityRequest) => apiClient.post<Facility>('/facilities', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['facilities'] }),
  })
}

function useUpdateFacility(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertFacilityRequest) => apiClient.put<Facility>(`/facilities/${id}`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['facilities'] }),
  })
}

function useDeleteFacility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<void>(`/facilities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] })
      // Its rooms are unlinked, which changes room and equipment facility labels.
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    },
  })
}

export function DeleteFacilityButton({ facility }: { facility: Facility }) {
  const remove = useDeleteFacility()

  async function handleDelete() {
    try {
      await remove.mutateAsync(facility.id)
      toast.success('Deleted')
    } catch (err) {
      toast.error(`Couldn't delete "${facility.name}". ${apiErrorMessage(err)}`)
    }
  }

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost" className="text-destructive" disabled={remove.isPending} aria-label={`Delete ${facility.name}`}>
          Delete
        </Button>
      }
      title={`Delete "${facility.name}"?`}
      description="Its rooms stay, but they'll no longer be part of a facility, and its overseers lose access through it. This can't be undone."
      confirmLabel="Delete facility"
      destructive
      onConfirm={handleDelete}
    />
  )
}

function FacilityFields({
  name,
  setName,
  departmentId,
  setDepartmentId,
  overseerUserIds,
  setOverseerUserIds,
}: {
  name: string
  setName: (v: string) => void
  departmentId: string
  setDepartmentId: (v: string) => void
  overseerUserIds: number[]
  setOverseerUserIds: (v: number[]) => void
}) {
  const { data: departments } = useDepartments()
  const { data: users } = useUsers()
  const scienceOfficers = users?.filter((u) => u.role === 'ScienceOfficer') ?? []

  function toggleOverseer(id: number) {
    setOverseerUserIds(
      overseerUserIds.includes(id) ? overseerUserIds.filter((o) => o !== id) : [...overseerUserIds, id],
    )
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="facility-name">Name</Label>
        <Input id="facility-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="facility-department">Department</Label>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger id="facility-department">
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
      <div className="flex flex-col gap-1.5">
        <Label>Overseers (optional — Science Officers who manage this facility)</Label>
        <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-2">
          {scienceOfficers.length === 0 && (
            <p className="px-1 py-1 text-sm text-muted-foreground">No Science Officer accounts yet.</p>
          )}
          {scienceOfficers.map((officer) => (
            <label key={officer.id} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border accent-primary"
                checked={overseerUserIds.includes(officer.id)}
                onChange={() => toggleOverseer(officer.id)}
              />
              {officer.email}
            </label>
          ))}
        </div>
      </div>
    </>
  )
}

function CreateFacilityDialog() {
  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [overseerUserIds, setOverseerUserIds] = useState<number[]>([])
  const create = useCreateFacility()

  async function handleSubmit() {
    await create.mutateAsync({ name, departmentId: Number(departmentId), overseerUserIds })
    toast.success(`Added facility "${name}".`)
    setName('')
    setDepartmentId('')
    setOverseerUserIds([])
  }

  return (
    <EntityDialog
      trigger={<Button size="sm">Add facility</Button>}
      title="Add facility"
      submitLabel="Add facility"
      submitDisabled={!departmentId}
      onSubmit={handleSubmit}
    >
      <FacilityFields
        name={name}
        setName={setName}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        overseerUserIds={overseerUserIds}
        setOverseerUserIds={setOverseerUserIds}
      />
    </EntityDialog>
  )
}

function EditFacilityDialog({ facility }: { facility: Facility }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(facility.name)
  const [departmentId, setDepartmentId] = useState(String(facility.departmentId))
  const [overseerUserIds, setOverseerUserIds] = useState<number[]>(facility.overseerUserIds)
  const update = useUpdateFacility(facility.id)

  async function handleSubmit() {
    await update.mutateAsync({ name, departmentId: Number(departmentId), overseerUserIds })
    toast.success(`Updated facility "${name}".`)
  }

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      }
      title="Edit facility"
      submitLabel="Save changes"
      submitDisabled={!departmentId}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <FacilityFields
        name={name}
        setName={setName}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        overseerUserIds={overseerUserIds}
        setOverseerUserIds={setOverseerUserIds}
      />
    </EntityDialog>
  )
}

export function FacilitiesTab() {
  const { data: facilities, isLoading, isError } = useFacilities()

  return (
    <AdminSection
      title="Facilities"
      description="Department-level facilities (e.g. BSL2 labs) that Science Officers can be assigned to oversee. Assign a room to a facility from the Rooms tab."
      action={<CreateFacilityDialog />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Overseers</TableHead>
            <TableHead>Rooms</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))}

          {isError && (
            <TableEmptyState
              colSpan={5}
              tone="error"
              title="Couldn't load facilities."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && facilities?.length === 0 && (
            <TableEmptyState colSpan={5} title="No facilities yet." />
          )}

          {facilities?.map((facility) => (
            <TableRow key={facility.id}>
              <TableCell className="font-medium text-foreground">{facility.name}</TableCell>
              <TableCell className="text-muted-foreground">{facility.departmentName}</TableCell>
              <TableCell className="text-muted-foreground">
                {facility.overseerEmails.length > 0 ? facility.overseerEmails.join(', ') : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {facility.roomLabels.length > 0 ? facility.roomLabels.join(', ') : '—'}
              </TableCell>
              <TableCell className="text-right">
                <EditFacilityDialog facility={facility} />
                <DeleteFacilityButton facility={facility} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  )
}
