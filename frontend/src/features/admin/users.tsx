import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { EntityDialog } from '@/components/entity-dialog'
import { KeyRound, UserCheck, UserX } from 'lucide-react'
import { AddButton, AdminSection } from './admin-section'
import { ResponsiveList, RowActionsMenu } from '@/components/responsive-list'
import { useRowDialog } from '@/hooks/use-row-dialog'
import { apiErrorMessage } from '@/lib/api-error-message'
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

import { ROLE_LABEL, type UserRole } from '@/types/roles'

export interface User {
  id: number
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
  phone: string | null
}

interface CreateUserRequest {
  email: string
  password: string
  role: UserRole
}


// Principal Investigator accounts are provisioned from the Admin → Principal
// Investigators tab instead, so they're not offered as a role here.
const CREATABLE_ROLES: UserRole[] = ['SuperAdmin', 'ScienceOfficer', 'Researcher']

// /users is SuperAdmin-only; pass enabled=false for other roles to skip the 403.
export function useUsers(enabled = true) {
  return useQuery({ queryKey: ['users'], queryFn: () => apiClient.get<User[]>('/users'), enabled })
}

function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateUserRequest) => apiClient.post<User>('/users', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

function useUpdateUserStatus(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (isActive: boolean) => apiClient.patch<User>(`/users/${id}/status`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

function CreateUserDialog() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('Researcher')
  const create = useCreateUser()

  async function handleSubmit() {
    await create.mutateAsync({ email, password, role })
    toast.success(`Added user "${email}".`)
    setEmail('')
    setPassword('')
    setRole('Researcher')
  }

  return (
    <EntityDialog
      trigger={<AddButton>Add user</AddButton>}
      title="Add user"
      description="They can sign in immediately with this email and password."
      submitLabel="Add user"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-email">Email</Label>
        <Input id="user-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-password">Password</Label>
        <Input
          id="user-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-role">Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
          <SelectTrigger id="user-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREATABLE_ROLES.map((value) => (
              <SelectItem key={value} value={value}>
                {ROLE_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </EntityDialog>
  )
}

function useUpdateUserLogin(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: { email: string; password: string | null }) => apiClient.put<User>(`/users/${id}/login`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

// Mainly for imported science officers, who arrive with a placeholder email
// and no usable password; also fixes a typo'd email on any account.
function EditLoginDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [email, setEmail] = useState(user.email)
  const [password, setPassword] = useState('')
  const updateLogin = useUpdateUserLogin(user.id)

  async function handleSubmit() {
    await updateLogin.mutateAsync({ email, password: password || null })
    toast.success(`Saved the login for "${email}".`)
    setPassword('')
  }

  return (
    <EntityDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit login"
      description="Change the email this person signs in with, and optionally set a new password."
      submitLabel="Save login"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`login-email-${user.id}`}>Email</Label>
        <Input
          id={`login-email-${user.id}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`login-password-${user.id}`}>New password (optional)</Label>
        <Input
          id={`login-password-${user.id}`}
          type="password"
          minLength={8}
          autoComplete="new-password"
          aria-describedby={`login-password-hint-${user.id}`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p id={`login-password-hint-${user.id}`} className="text-xs text-muted-foreground">
          At least 8 characters. Leave empty to keep the current password.
        </p>
      </div>
    </EntityDialog>
  )
}

function StatusBadge({ user }: { user: User }) {
  return <Badge variant={user.isActive ? 'secondary' : 'outline'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
}

function UserActions({ user }: { user: User }) {
  const dialog = useRowDialog<'login'>()
  const updateStatus = useUpdateUserStatus(user.id)

  async function toggleStatus() {
    try {
      await updateStatus.mutateAsync(!user.isActive)
      toast.success(user.isActive ? `Deactivated "${user.email}".` : `Activated "${user.email}".`)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <>
      <RowActionsMenu triggerRef={dialog.triggerRef}
        itemName={user.email}
        actions={[
          { label: 'Edit login', icon: KeyRound, onSelect: () => dialog.show('login') },
          user.isActive
            ? { label: 'Deactivate', icon: UserX, onSelect: toggleStatus, disabled: updateStatus.isPending, destructive: true }
            : { label: 'Activate', icon: UserCheck, onSelect: toggleStatus, disabled: updateStatus.isPending },
        ]}
      />
      {dialog.mounted === 'login' && <EditLoginDialog key={dialog.session} user={user} {...dialog.bind('login')} />}
    </>
  )
}

export function UsersTab() {
  const { data: users, isLoading, isError } = useUsers()

  return (
    <AdminSection title="Users" description="Everyone who can sign in, and what they're allowed to do." action={<CreateUserDialog />}>
      <ResponsiveList
        items={users}
        isLoading={isLoading}
        isError={isError}
        noun="users"
        getKey={(u) => u.id}
        search={{
          label: 'Search users',
          placeholder: 'Search by email or role',
          text: (u) => `${u.email} ${ROLE_LABEL[u.role]} ${u.phone ?? ''}`,
        }}
        empty={{ title: 'No users yet.', description: 'Add the first user so they can sign in.' }}
        columns={[
          { key: 'email', header: 'Email', cell: (u) => <span className="font-medium text-foreground wrap-anywhere">{u.email}</span> },
          { key: 'role', header: 'Role', cell: (u) => <span className="text-muted-foreground">{ROLE_LABEL[u.role]}</span> },
          {
            key: 'phone',
            header: 'Phone',
            className: 'hidden lg:table-cell',
            cell: (u) => <span className="text-muted-foreground">{u.phone ?? '—'}</span>,
          },
          { key: 'status', header: 'Status', cell: (u) => <StatusBadge user={u} /> },
        ]}
        renderCard={(u) => (
          <>
            <p className="font-medium text-foreground wrap-anywhere">{u.email}</p>
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              {ROLE_LABEL[u.role]}
              <StatusBadge user={u} />
            </div>
          </>
        )}
        renderActions={(u) => <UserActions user={u} />}
      />
    </AdminSection>
  )
}
