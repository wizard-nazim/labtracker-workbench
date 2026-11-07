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
import { FIELD_OF_STUDY_OPTIONS, type FieldOfStudy } from '@/types/field-of-study'
import { LabPicker } from './research-groups'

export interface User {
  id: number
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
  phone: string | null
  mustChangePassword: boolean
}

interface CreateAccountRequest {
  email: string
  password: string
  role: UserRole
  fullName: string
  studentNumber?: string
  fieldOfStudy?: FieldOfStudy
  researchGroupIds: number[]
}

// Principal Investigator accounts are provisioned from the Admin → Principal
// Investigators tab instead, so they're not offered here. Students and Science
// Officers get a researcher profile (their name, labs) along with the login.
type AccountKind = 'Student' | 'ScienceOfficer' | 'SuperAdmin'

const ACCOUNT_KINDS: { value: AccountKind; label: string; role: UserRole }[] = [
  { value: 'Student', label: 'Student', role: 'Researcher' },
  { value: 'ScienceOfficer', label: 'Science Officer', role: 'ScienceOfficer' },
  { value: 'SuperAdmin', label: 'Super Admin', role: 'SuperAdmin' },
]

// /users is SuperAdmin-only; pass enabled=false for other roles to skip the 403.
export function useUsers(enabled = true) {
  return useQuery({ queryKey: ['users'], queryFn: () => apiClient.get<User[]>('/users'), enabled })
}

function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    // A Super Admin has no researcher profile, so it uses the plain endpoint.
    mutationFn: (request: CreateAccountRequest) =>
      request.role === 'SuperAdmin'
        ? apiClient.post<User>('/users', { email: request.email, password: request.password, role: request.role })
        : apiClient.post<User>('/users/accounts', request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
    },
  })
}

function useUpdateUserStatus(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (isActive: boolean) => apiClient.patch<User>(`/users/${id}/status`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

function CreateAccountDialog() {
  const [kind, setKind] = useState<AccountKind>('Student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [fieldOfStudy, setFieldOfStudy] = useState<FieldOfStudy | ''>('')
  const [researchGroupIds, setResearchGroupIds] = useState<number[]>([])
  const create = useCreateAccount()

  const isStudent = kind === 'Student'
  const hasProfile = kind !== 'SuperAdmin'
  const role = ACCOUNT_KINDS.find((k) => k.value === kind)!.role

  async function handleSubmit() {
    await create.mutateAsync({
      email,
      password,
      role,
      fullName,
      studentNumber: studentNumber || undefined,
      fieldOfStudy: fieldOfStudy || undefined,
      researchGroupIds,
    })
    toast.success(`Added ${hasProfile ? fullName : email}. Give them the temporary password in person.`)
    setEmail('')
    setPassword('')
    setFullName('')
    setStudentNumber('')
    setFieldOfStudy('')
    setResearchGroupIds([])
  }

  return (
    <EntityDialog
      trigger={<AddButton>Add account</AddButton>}
      title="Add account"
      description="They sign in with the temporary password you set here, then must choose their own."
      submitLabel="Add account"
      submitDisabled={isStudent && researchGroupIds.length === 0}
      onSubmit={handleSubmit}
      stickyFooter
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-kind">Account type</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as AccountKind)}>
          <SelectTrigger id="account-kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasProfile && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-name">Full name</Label>
          <Input id="account-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-email">Email</Label>
        <Input id="account-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-password">Temporary password</Label>
        <Input
          id="account-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby="account-password-hint"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p id="account-password-hint" className="text-xs text-muted-foreground">
          At least 8 characters. You won't see the password they choose.
        </p>
      </div>
      {hasProfile && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-number">{isStudent ? 'Student number' : 'Staff number (optional)'}</Label>
            <Input
              id="account-number"
              required={isStudent}
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
            />
          </div>
          {isStudent && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-field-of-study">Field of study (optional)</Label>
              <Select
                value={fieldOfStudy || 'none'}
                onValueChange={(v) => setFieldOfStudy(v === 'none' ? '' : (v as FieldOfStudy))}
              >
                <SelectTrigger id="account-field-of-study">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {FIELD_OF_STUDY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <LabPicker
            label={isStudent ? 'Labs (choose at least one)' : 'Labs (optional)'}
            selected={researchGroupIds}
            onChange={setResearchGroupIds}
          />
        </>
      )}
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
      description="Change the email this person signs in with, or set a temporary password they must replace at their next sign-in."
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
        <Label htmlFor={`login-password-${user.id}`}>Temporary password (optional)</Label>
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
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge variant={user.isActive ? 'secondary' : 'outline'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
      {user.mustChangePassword && <Badge variant="outline">Temporary password</Badge>}
    </span>
  )
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
          { label: 'Edit login / set password', icon: KeyRound, onSelect: () => dialog.show('login') },
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
    <AdminSection title="Users" description="Everyone who can sign in, and what they're allowed to do." action={<CreateAccountDialog />}>
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
        empty={{ title: 'No users yet.', description: 'Add the first account so they can sign in.' }}
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
