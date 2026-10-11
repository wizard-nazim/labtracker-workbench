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
    toast.success(`Added research group "${name}".`)
    setName('')
    setDepartmentId('')
    setPrincipalInvestigatorId('')
  }

  return (
    <EntityDialog
      trigger={<Button size="sm">Add group</Button>}
      title="Add research group"
      submitLabel="Add group"
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

function EditResearchGroupDialog({ group }: { group: ResearchGroup }) {
  const [open, setOpen] = useState(false)
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
    toast.success(`Updated research group "${name}".`)
  }

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      }
      title="Edit research group"
      submitLabel="Save changes"
      submitDisabled={!departmentId || !principalInvestigatorId}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
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

export function ResearchGroupsTab() {
  const { data: groups, isLoading, isError } = useResearchGroups()

  return (
    <AdminSection
      title="Research groups"
      description="Groups of researchers led by a principal investigator."
      action={<CreateResearchGroupDialog />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Principal investigator</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))}

          {isError && (
            <TableEmptyState
              colSpan={4}
              tone="error"
              title="Couldn't load research groups."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && groups?.length === 0 && (
            <TableEmptyState colSpan={4} title="No research groups yet." />
          )}

          {groups?.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="font-medium text-foreground">{group.name}</TableCell>
              <TableCell className="text-muted-foreground">{group.departmentName}</TableCell>
              <TableCell className="text-muted-foreground">{group.principalInvestigatorName}</TableCell>
              <TableCell className="text-right">
                <EditResearchGroupDialog group={group} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  )
}
