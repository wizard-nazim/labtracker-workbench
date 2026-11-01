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

export function DeleteFacilityDialog({
  facility,
  open,
  onOpenChange,
}: {
  facility: Facility
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const remove = useDeleteFacility()

  async function handleDelete() {
    try {
      await remove.mutateAsync(facility.id)
      toast.success(`Deleted facility "${facility.name}".`)
    } catch (err) {
      toast.error(`Couldn't delete "${facility.name}". ${apiErrorMessage(err)}`)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
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
        <Label>Overseers (optional): Science Officers who look after this facility</Label>
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
      trigger={<AddButton>Add facility</AddButton>}
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

function EditFacilityDialog({
  facility,
  open,
  onOpenChange,
}: {
  facility: Facility
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
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
      title="Edit facility"
      submitLabel="Save changes"
      submitDisabled={!departmentId}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={onOpenChange}
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

function FacilityActions({ facility }: { facility: Facility }) {
  const dialog = useRowDialog<'edit' | 'delete'>()
  return (
    <>
      <RowActionsMenu triggerRef={dialog.triggerRef}
        itemName={facility.name}
        actions={[
          { label: 'Edit', icon: Pencil, onSelect: () => dialog.show('edit') },
          { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => dialog.show('delete') },
        ]}
      />
      {dialog.mounted === 'edit' && <EditFacilityDialog key={dialog.session} facility={facility} {...dialog.bind('edit')} />}
      <DeleteFacilityDialog facility={facility} {...dialog.bind('delete')} />
    </>
  )
}

function listOrDash(values: string[]) {
  return values.length > 0 ? values.join(', ') : '—'
}

export function FacilitiesTab() {
  const { data: facilities, isLoading, isError } = useFacilities()

  return (
    <AdminSection
      title="Facilities"
      description="Shared spaces such as BSL2 suites, looked after by Science Officers. Add rooms to a facility from the room's edit form."
      action={<CreateFacilityDialog />}
    >
      <ResponsiveList
        items={facilities}
        isLoading={isLoading}
        isError={isError}
        noun="facilities"
        getKey={(f) => f.id}
        empty={{ title: 'No facilities yet.', description: 'Add a facility, then add rooms to it.' }}
        columns={[
          { key: 'name', header: 'Facility', cell: (f) => <span className="font-medium text-foreground">{f.name}</span> },
          {
            key: 'rooms',
            header: 'Rooms',
            cell: (f) => <span className="text-muted-foreground">{listOrDash(f.roomLabels)}</span>,
          },
          {
            key: 'overseers',
            header: 'Overseers',
            cell: (f) => <span className="text-muted-foreground wrap-anywhere">{listOrDash(f.overseerEmails)}</span>,
          },
          {
            key: 'department',
            header: 'Department',
            className: 'hidden xl:table-cell',
            cell: (f) => <span className="text-muted-foreground">{f.departmentName}</span>,
          },
        ]}
        renderCard={(f) => (
          <>
            <p className="font-medium text-foreground">{f.name}</p>
            <p className="text-[13px] text-muted-foreground">
              {f.roomLabels.length === 0 ? 'No rooms yet' : `Rooms: ${f.roomLabels.join(', ')}`}
            </p>
            {f.overseerEmails.length > 0 && (
              <p className="text-[13px] text-muted-foreground wrap-anywhere">Overseen by {f.overseerEmails.join(', ')}</p>
            )}
          </>
        )}
        renderActions={(f) => <FacilityActions facility={f} />}
      />
    </AdminSection>
  )
}
