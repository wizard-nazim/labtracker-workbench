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
import { Badge } from '@/components/ui/badge'
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
  userId: number | null
  hasLogin: boolean
  hasEquipmentPermissions: boolean
}

interface UpsertPrincipalInvestigatorRequest {
  fullName: string
  email: string
  departmentId: number
  hasEquipmentPermissions: boolean
  password?: string
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
  hasEquipmentPermissions,
  setHasEquipmentPermissions,
}: {
  fullName: string
  setFullName: (v: string) => void
  email: string
  setEmail: (v: string) => void
  departmentId: string
  setDepartmentId: (v: string) => void
  hasEquipmentPermissions: boolean
  setHasEquipmentPermissions: (v: boolean) => void
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
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="size-4 rounded border-border accent-primary"
          checked={hasEquipmentPermissions}
          onChange={(e) => setHasEquipmentPermissions(e.target.checked)}
        />
        Can manage equipment for their lab (add/edit equipment, post maintenance notices)
      </label>
    </>
  )
}

function CreatePiDialog() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [hasEquipmentPermissions, setHasEquipmentPermissions] = useState(false)
  const [password, setPassword] = useState('')
  const create = useCreatePrincipalInvestigator()

  async function handleSubmit() {
    await create.mutateAsync({
      fullName,
      email,
      departmentId: Number(departmentId),
      hasEquipmentPermissions,
      password: password || undefined,
    })
    toast.success(`Added principal investigator "${fullName}".`)
    setFullName('')
    setEmail('')
    setDepartmentId('')
    setHasEquipmentPermissions(false)
    setPassword('')
  }

  return (
    <EntityDialog
      trigger={<Button size="sm">Add PI</Button>}
      title="Add principal investigator"
      description="Leave the password blank to add them without a login for now."
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
        hasEquipmentPermissions={hasEquipmentPermissions}
        setHasEquipmentPermissions={setHasEquipmentPermissions}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pi-password">Password (optional — sets up their login)</Label>
        <Input
          id="pi-password"
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
    </EntityDialog>
  )
}

function EditPiDialog({ pi }: { pi: PrincipalInvestigator }) {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState(pi.fullName)
  const [email, setEmail] = useState(pi.email)
  const [departmentId, setDepartmentId] = useState(String(pi.departmentId))
  const [hasEquipmentPermissions, setHasEquipmentPermissions] = useState(pi.hasEquipmentPermissions)
  const update = useUpdatePrincipalInvestigator(pi.id)

  async function handleSubmit() {
    await update.mutateAsync({ fullName, email, departmentId: Number(departmentId), hasEquipmentPermissions })
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
        hasEquipmentPermissions={hasEquipmentPermissions}
        setHasEquipmentPermissions={setHasEquipmentPermissions}
      />
      {!pi.hasLogin && <p className="text-xs text-muted-foreground">No login yet — this PI can't sign in.</p>}
    </EntityDialog>
  )
}

export function PrincipalInvestigatorsTab() {
  const { data: pis, isLoading, isError } = usePrincipalInvestigators()

  return (
    <AdminSection
      title="Principal investigators"
      description="PIs lead research groups and can optionally log in and be given equipment permissions."
      action={<CreatePiDialog />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Department</TableHead>
            <TableHead>Login</TableHead>
            <TableHead>Permissions</TableHead>
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
              title="Couldn't load principal investigators."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && pis?.length === 0 && (
            <TableEmptyState colSpan={6} title="No principal investigators yet." />
          )}

          {pis?.map((pi) => (
            <TableRow key={pi.id}>
              <TableCell className="font-medium text-foreground">{pi.fullName}</TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{pi.email}</TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">{pi.departmentName}</TableCell>
              <TableCell>
                <Badge variant={pi.hasLogin ? 'secondary' : 'outline'}>{pi.hasLogin ? 'Active' : 'No login'}</Badge>
              </TableCell>
              <TableCell>
                {pi.hasEquipmentPermissions ? (
                  <Badge variant="secondary">Equipment</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
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
