import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { EntityDialog } from '@/components/entity-dialog'
import { Pencil } from 'lucide-react'
import { AddButton, AdminSection } from './admin-section'
import { ResponsiveList, RowActionsMenu } from '@/components/responsive-list'
import { useRowDialog } from '@/hooks/use-row-dialog'
import { Badge } from '@/components/ui/badge'
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
import { PrerequisiteHint, SETUP_LINKS } from './prerequisite-hint'

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
        Can manage their lab's equipment (add and edit it, post maintenance notices)
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
  const { data: departments } = useDepartments()

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
      trigger={<AddButton>Add PI</AddButton>}
      title="Add principal investigator"
      description="Leave the password blank to add them without a login for now."
      submitLabel="Add PI"
      submitDisabled={!departmentId}
      onSubmit={handleSubmit}
    >
      <PrerequisiteHint
        before="every principal investigator belongs to one."
        items={[{ missing: departments?.length === 0, what: 'a department', to: SETUP_LINKS.departments }]}
      />
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
        <Label htmlFor="pi-password">Password (optional, sets up their login)</Label>
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

function EditPiDialog({
  pi,
  open,
  onOpenChange,
}: {
  pi: PrincipalInvestigator
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
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
      title="Edit principal investigator"
      submitLabel="Save changes"
      submitDisabled={!departmentId}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={onOpenChange}
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
      {!pi.hasLogin && <p className="text-xs text-muted-foreground">No login yet, so this PI can't sign in.</p>}
    </EntityDialog>
  )
}

function LoginBadge({ pi }: { pi: PrincipalInvestigator }) {
  return <Badge variant={pi.hasLogin ? 'secondary' : 'outline'}>{pi.hasLogin ? 'Can sign in' : 'No login'}</Badge>
}

function PiActions({ pi }: { pi: PrincipalInvestigator }) {
  const dialog = useRowDialog<'edit'>()
  return (
    <>
      <RowActionsMenu triggerRef={dialog.triggerRef} itemName={pi.fullName} actions={[{ label: 'Edit', icon: Pencil, onSelect: () => dialog.show('edit') }]} />
      {dialog.mounted === 'edit' && <EditPiDialog key={dialog.session} pi={pi} {...dialog.bind('edit')} />}
    </>
  )
}

export function PrincipalInvestigatorsTab() {
  const { data: pis, isLoading, isError } = usePrincipalInvestigators()

  return (
    <AdminSection
      title="Principal investigators"
      description="PIs lead labs. They can be given a login and permission to manage their lab's equipment."
      action={<CreatePiDialog />}
    >
      <ResponsiveList
        items={pis}
        isLoading={isLoading}
        isError={isError}
        noun="principal investigators"
        getKey={(pi) => pi.id}
        search={{
          label: 'Search principal investigators',
          placeholder: 'Search by name or email',
          text: (pi) => `${pi.fullName} ${pi.email} ${pi.departmentName}`,
        }}
        empty={{ title: 'No principal investigators yet.', description: 'Add the first PI, then create their lab.' }}
        columns={[
          { key: 'name', header: 'Name', cell: (pi) => <span className="font-medium text-foreground">{pi.fullName}</span> },
          { key: 'email', header: 'Email', cell: (pi) => <span className="text-muted-foreground wrap-anywhere">{pi.email}</span> },
          {
            key: 'department',
            header: 'Department',
            className: 'hidden xl:table-cell',
            cell: (pi) => <span className="text-muted-foreground">{pi.departmentName}</span>,
          },
          { key: 'login', header: 'Login', cell: (pi) => <LoginBadge pi={pi} /> },
          {
            key: 'permissions',
            header: 'Manages equipment',
            className: 'hidden lg:table-cell',
            cell: (pi) => <span className="text-muted-foreground">{pi.hasEquipmentPermissions ? 'Yes' : 'No'}</span>,
          },
        ]}
        renderCard={(pi) => (
          <>
            <p className="font-medium text-foreground">{pi.fullName}</p>
            <p className="text-[13px] text-muted-foreground wrap-anywhere">{pi.email}</p>
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <LoginBadge pi={pi} />
              {pi.hasEquipmentPermissions && <span>Manages equipment</span>}
            </div>
          </>
        )}
        renderActions={(pi) => <PiActions pi={pi} />}
      />
    </AdminSection>
  )
}
