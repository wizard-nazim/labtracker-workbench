import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { EntityDialog } from '@/components/entity-dialog'
import { Pencil } from 'lucide-react'
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
import { usePrincipalInvestigators } from './principal-investigators'

export interface ResearchGroup {
  id: number
  name: string
  departmentId: number
  departmentName: string
  principalInvestigatorId: number
  principalInvestigatorName: string
}

interface UpsertResearchGroupRequest {
  name: string
  departmentId: number
  principalInvestigatorId: number
}

export function useResearchGroups() {
  return useQuery({ queryKey: ['research-groups'], queryFn: () => apiClient.get<ResearchGroup[]>('/research-groups') })
}

export function useCreateResearchGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertResearchGroupRequest) => apiClient.post<ResearchGroup>('/research-groups', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['research-groups'] }),
  })
}

function useUpdateResearchGroup(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertResearchGroupRequest) => apiClient.put<ResearchGroup>(`/research-groups/${id}`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['research-groups'] }),
  })
}

function ResearchGroupFields({
  name,
  setName,
  departmentId,
  setDepartmentId,
  principalInvestigatorId,
  setPrincipalInvestigatorId,
}: {
  name: string
  setName: (v: string) => void
  departmentId: string
  setDepartmentId: (v: string) => void
  principalInvestigatorId: string
  setPrincipalInvestigatorId: (v: string) => void
}) {
  const { data: departments } = useDepartments()
  const { data: pis } = usePrincipalInvestigators()

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-name">Name</Label>
        <Input id="group-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-department">Department</Label>
        <Select value={departmentId} onValueChange={setDepartmentId} required>
          <SelectTrigger id="group-department">
            <SelectValue placeholder="Select department" />
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
        <Label htmlFor="group-pi">Principal investigator</Label>
        <Select value={principalInvestigatorId} onValueChange={setPrincipalInvestigatorId} required>
          <SelectTrigger id="group-pi">
            <SelectValue placeholder="Select principal investigator" />
          </SelectTrigger>
          <SelectContent>
            {pis?.map((pi) => (
              <SelectItem key={pi.id} value={String(pi.id)}>
                {pi.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

function CreateResearchGroupDialog() {
  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [principalInvestigatorId, setPrincipalInvestigatorId] = useState('')
  const create = useCreateResearchGroup()

  async function handleSubmit() {
    await create.mutateAsync({
      name,
      departmentId: Number(departmentId),
      principalInvestigatorId: Number(principalInvestigatorId),
    })
    toast.success(`Added lab "${name}".`)
    setName('')
    setDepartmentId('')
    setPrincipalInvestigatorId('')
  }

  return (
    <EntityDialog
      trigger={<AddButton>Add lab</AddButton>}
      title="Add lab"
      submitLabel="Add lab"
      submitDisabled={!departmentId || !principalInvestigatorId}
      onSubmit={handleSubmit}
    >
      <ResearchGroupFields
        name={name}
        setName={setName}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        principalInvestigatorId={principalInvestigatorId}
        setPrincipalInvestigatorId={setPrincipalInvestigatorId}
      />
    </EntityDialog>
  )
}

function EditResearchGroupDialog({
  group,
  open,
  onOpenChange,
}: {
  group: ResearchGroup
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(group.name)
  const [departmentId, setDepartmentId] = useState(String(group.departmentId))
  const [principalInvestigatorId, setPrincipalInvestigatorId] = useState(String(group.principalInvestigatorId))
  const update = useUpdateResearchGroup(group.id)

  async function handleSubmit() {
    await update.mutateAsync({
      name,
      departmentId: Number(departmentId),
      principalInvestigatorId: Number(principalInvestigatorId),
    })
    toast.success(`Updated lab "${name}".`)
  }

  return (
    <EntityDialog
      title="Edit lab"
      submitLabel="Save changes"
      submitDisabled={!departmentId || !principalInvestigatorId}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ResearchGroupFields
        name={name}
        setName={setName}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        principalInvestigatorId={principalInvestigatorId}
        setPrincipalInvestigatorId={setPrincipalInvestigatorId}
      />
    </EntityDialog>
  )
}

function LabActions({ group }: { group: ResearchGroup }) {
  const dialog = useRowDialog<'edit'>()
  return (
    <>
      <RowActionsMenu triggerRef={dialog.triggerRef} itemName={group.name} actions={[{ label: 'Edit', icon: Pencil, onSelect: () => dialog.show('edit') }]} />
      {dialog.mounted === 'edit' && <EditResearchGroupDialog key={dialog.session} group={group} {...dialog.bind('edit')} />}
    </>
  )
}

// Called "research groups" in the API; "labs" everywhere people see it.
export function ResearchGroupsTab() {
  const { data: groups, isLoading, isError } = useResearchGroups()

  return (
    <AdminSection title="Labs" description="Each lab is led by a principal investigator." action={<CreateResearchGroupDialog />}>
      <ResponsiveList
        items={groups}
        isLoading={isLoading}
        isError={isError}
        noun="labs"
        getKey={(g) => g.id}
        search={{
          label: 'Search labs',
          placeholder: 'Search by lab or PI',
          text: (g) => `${g.name} ${g.principalInvestigatorName} ${g.departmentName}`,
        }}
        empty={{ title: 'No labs yet.', description: 'Add a principal investigator first, then add their lab.' }}
        columns={[
          { key: 'name', header: 'Lab', cell: (g) => <span className="font-medium text-foreground">{g.name}</span> },
          { key: 'pi', header: 'Principal investigator', cell: (g) => <span className="text-muted-foreground">{g.principalInvestigatorName}</span> },
          {
            key: 'department',
            header: 'Department',
            className: 'hidden lg:table-cell',
            cell: (g) => <span className="text-muted-foreground">{g.departmentName}</span>,
          },
        ]}
        renderCard={(g) => (
          <>
            <p className="font-medium text-foreground">{g.name}</p>
            <p className="text-[13px] text-muted-foreground">Led by {g.principalInvestigatorName}</p>
          </>
        )}
        renderActions={(g) => <LabActions group={g} />}
      />
    </AdminSection>
  )
}
