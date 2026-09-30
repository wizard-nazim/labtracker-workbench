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

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => apiClient.get<User[]>('/users') })
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
      trigger={<Button size="sm">Add user</Button>}
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

function StatusToggleButton({ user }: { user: User }) {
  const updateStatus = useUpdateUserStatus(user.id)

  async function handleClick() {
    await updateStatus.mutateAsync(!user.isActive)
    toast.success(user.isActive ? `Deactivated "${user.email}".` : `Activated "${user.email}".`)
  }

  return (
    <Button size="sm" variant="ghost" disabled={updateStatus.isPending} onClick={handleClick}>
      {user.isActive ? 'Deactivate' : 'Activate'}
    </Button>
  )
}

export function UsersTab() {
  const { data: users, isLoading, isError } = useUsers()

  return (
    <AdminSection title="Users" description="Accounts that can sign in to LabTracker." action={<CreateUserDialog />}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden md:table-cell">Phone</TableHead>
            <TableHead>Status</TableHead>
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
              title="Couldn't load users."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && users?.length === 0 && <TableEmptyState colSpan={5} title="No users yet." />}

          {users?.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium text-foreground">{user.email}</TableCell>
              <TableCell className="text-muted-foreground">{ROLE_LABEL[user.role]}</TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{user.phone ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={user.isActive ? 'secondary' : 'outline'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <StatusToggleButton user={user} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  )
}
