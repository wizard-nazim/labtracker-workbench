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

export interface PrincipalInvestigator {
  id: number
  fullName: string
  email: string
  departmentId: number
  departmentName: string
}

interface UpsertPrincipalInvestigatorRequest {
  fullName: string
  email: string
  departmentId: number
}

export function usePrincipalInvestigators() {
  return useQuery({
    queryKey: ['principal-investigators'],
    queryFn: () => apiClient.get<PrincipalInvestigator[]>('/principal-investigators'),
  })
}

function useCreatePrincipalInvestigator() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertPrincipalInvestigatorRequest) =>
      apiClient.post<PrincipalInvestigator>('/principal-investigators', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['principal-investigators'] }),
  })
}

function useUpdatePrincipalInvestigator(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertPrincipalInvestigatorRequest) =>
      apiClient.put<PrincipalInvestigator>(`/principal-investigators/${id}`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['principal-investigators'] }),
  })
}

function PiFields({
  fullName,
  setFullName,
  email,
  setEmail,
  departmentId,
  setDepartmentId,
}: {
  fullName: string
  setFullName: (v: string) => void
  email: string
  setEmail: (v: string) => void
  departmentId: string
  setDepartmentId: (v: string) => void
}) {
  const { data: departments } = useDepartments()

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pi-name">Full name</Label>
        <Input id="pi-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pi-email">Email</Label>
        <Input id="pi-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pi-department">Department</Label>
        <Select value={departmentId} onValueChange={setDepartmentId} required>
          <SelectTrigger id="pi-department">
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
    </>
  )
}

function CreatePiDialog() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const create = useCreatePrincipalInvestigator()

  async function handleSubmit() {
    await create.mutateAsync({ fullName, email, departmentId: Number(departmentId) })
    toast.success(`Added principal investigator "${fullName}".`)
    setFullName('')
    setEmail('')
    setDepartmentId('')
  }

  return (
    <EntityDialog
      trigger={<Button size="sm">Add PI</Button>}
      title="Add principal investigator"
      submitLabel="Add PI"
      submitDisabled={!departmentId}
      onSubmit={handleSubmit}
    >
      <PiFields
        fullName={fullName}
        setFullName={setFullName}
        email={email}
        setEmail={setEmail}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
      />
    </EntityDialog>
  )
}

function EditPiDialog({ pi }: { pi: PrincipalInvestigator }) {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState(pi.fullName)
  const [email, setEmail] = useState(pi.email)
  const [departmentId, setDepartmentId] = useState(String(pi.departmentId))
  const update = useUpdatePrincipalInvestigator(pi.id)

  async function handleSubmit() {
    await update.mutateAsync({ fullName, email, departmentId: Number(departmentId) })
    toast.success(`Updated principal investigator "${fullName}".`)
  }

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      }
      title="Edit principal investigator"
      submitLabel="Save changes"
      submitDisabled={!departmentId}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <PiFields
        fullName={fullName}
        setFullName={setFullName}
        email={email}
        setEmail={setEmail}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
      />
    </EntityDialog>
  )
}

export function PrincipalInvestigatorsTab() {
  const { data: pis, isLoading, isError } = usePrincipalInvestigators()

  return (
    <AdminSection
      title="Principal investigators"
      description="PIs lead research groups. They don't log in to LabTracker themselves."
      action={<CreatePiDialog />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
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
              title="Couldn't load principal investigators."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && pis?.length === 0 && (
            <TableEmptyState colSpan={4} title="No principal investigators yet." />
          )}

          {pis?.map((pi) => (
            <TableRow key={pi.id}>
              <TableCell className="font-medium text-foreground">{pi.fullName}</TableCell>
              <TableCell className="text-muted-foreground">{pi.email}</TableCell>
              <TableCell className="text-muted-foreground">{pi.departmentName}</TableCell>
              <TableCell className="text-right">
                <EditPiDialog pi={pi} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  )
}
