import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error-message'
import { EntityDialog } from '@/components/entity-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ResponsiveList, RowActionsMenu } from '@/components/responsive-list'
import { useRowDialog } from '@/hooks/use-row-dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROLE_LABEL, type UserRole } from '@/types/roles'
import { AdminSection } from './admin-section'

export type PasswordResetStatus = 'Pending' | 'Completed' | 'Dismissed'

export interface PasswordResetRequest {
  id: number
  userId: number
  email: string
  fullName: string | null
  role: UserRole
  createdAt: string
  status: PasswordResetStatus
  resolvedByEmail: string | null
  resolvedAt: string | null
}

const REQUESTS_KEY = ['password-reset-requests']
export const PENDING_REQUESTS_KEY = [...REQUESTS_KEY, 'pending-count']

function usePasswordResetRequests(history: boolean) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, history ? 'history' : 'pending'],
    queryFn: () =>
      apiClient.get<PasswordResetRequest[]>(history ? '/password-reset-requests' : '/password-reset-requests?status=Pending'),
  })
}

// Polled like notifications, so the hub's badge catches new requests.
export function usePendingRequestCount() {
  return useQuery({
    queryKey: PENDING_REQUESTS_KEY,
    queryFn: () => apiClient.get<number>('/password-reset-requests/pending-count'),
    refetchInterval: 60_000,
  })
}

function useCloseRequest(id: number) {
  const queryClient = useQueryClient()
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: REQUESTS_KEY })
    // The user's row in People › Users shows the Temporary password badge.
    void queryClient.invalidateQueries({ queryKey: ['users'] })
  }
  return {
    resolve: useMutation({
      mutationFn: (newPassword: string) => apiClient.post<void>(`/password-reset-requests/${id}/resolve`, { newPassword }),
      onSuccess,
    }),
    dismiss: useMutation({
      mutationFn: () => apiClient.post<void>(`/password-reset-requests/${id}/dismiss`),
      onSuccess,
    }),
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function who(request: PasswordResetRequest) {
  return request.fullName ?? request.email
}

function AssignPasswordDialog({
  request,
  open,
  onOpenChange,
}: {
  request: PasswordResetRequest
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [password, setPassword] = useState('')
  const { resolve } = useCloseRequest(request.id)

  async function handleSubmit() {
    await resolve.mutateAsync(password)
    toast.success(`Temporary password set for ${who(request)}. Give it to them in person.`)
  }

  return (
    <EntityDialog
      title="Assign a temporary password"
      description={`For ${who(request)} (${request.email}). They'll be asked to choose their own when they sign in, and any devices they're signed in on are signed out.`}
      submitLabel="Set password"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="assign-password">Temporary password</Label>
        <Input
          id="assign-password"
          type="text"
          autoComplete="off"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
    </EntityDialog>
  )
}

function PendingActions({ request }: { request: PasswordResetRequest }) {
  const dialog = useRowDialog<'assign' | 'dismiss'>()
  const { dismiss } = useCloseRequest(request.id)

  async function handleDismiss() {
    try {
      await dismiss.mutateAsync()
      toast.success('Request dismissed.')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <>
      <RowActionsMenu
        triggerRef={dialog.triggerRef}
        itemName={who(request)}
        actions={[
          { label: 'Assign new password', icon: KeyRound, onSelect: () => dialog.show('assign') },
          { label: 'Dismiss', icon: X, onSelect: () => dialog.show('dismiss') },
        ]}
      />
      {dialog.mounted === 'assign' && (
        <AssignPasswordDialog key={dialog.session} request={request} {...dialog.bind('assign')} />
      )}
      <ConfirmDialog
        {...dialog.bind('dismiss')}
        title="Dismiss this request?"
        description={`${who(request)}'s password stays as it is. Dismiss requests you didn't expect or have already dealt with another way.`}
        confirmLabel="Dismiss"
        onConfirm={handleDismiss}
      />
    </>
  )
}

function Person({ request }: { request: PasswordResetRequest }) {
  return (
    <div className="min-w-0">
      <p className="font-medium text-foreground wrap-anywhere">{who(request)}</p>
      <p className="text-[13px] text-muted-foreground wrap-anywhere">
        {request.fullName ? `${request.email} · ` : ''}
        {ROLE_LABEL[request.role]}
      </p>
    </div>
  )
}

export function PendingRequestsTab() {
  const { data, isLoading, isError } = usePasswordResetRequests(false)

  return (
    <AdminSection
      title="Password resets"
      description="People who used Forgot password on the sign-in page. Assign a temporary password and give it to them in person; they choose their own when they sign in."
    >
      <ResponsiveList
        items={data}
        isLoading={isLoading}
        isError={isError}
        noun="password reset requests"
        getKey={(r) => r.id}
        empty={{ title: 'No open requests.', description: 'New requests appear here and in your notifications.' }}
        columns={[
          { key: 'who', header: 'Person', cell: (r) => <Person request={r} /> },
          { key: 'when', header: 'Asked', cell: (r) => <span className="text-muted-foreground">{formatDateTime(r.createdAt)}</span> },
        ]}
        renderCard={(r) => (
          <>
            <Person request={r} />
            <p className="text-[13px] text-muted-foreground">Asked {formatDateTime(r.createdAt)}</p>
          </>
        )}
        renderActions={(r) => <PendingActions request={r} />}
      />
    </AdminSection>
  )
}

function Outcome({ request }: { request: PasswordResetRequest }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge variant={request.status === 'Completed' ? 'secondary' : 'outline'}>
        {request.status === 'Completed' ? 'Password assigned' : 'Dismissed'}
      </Badge>
      {request.resolvedAt && (
        <span className="text-[13px] text-muted-foreground">
          {formatDateTime(request.resolvedAt)}
          {request.resolvedByEmail ? ` by ${request.resolvedByEmail}` : ''}
        </span>
      )}
    </span>
  )
}

export function RequestHistoryTab() {
  const { data, isLoading, isError } = usePasswordResetRequests(true)

  return (
    <AdminSection title="History" description="The last 200 requests that were dealt with, newest first.">
      <ResponsiveList
        items={data}
        isLoading={isLoading}
        isError={isError}
        noun="past requests"
        getKey={(r) => r.id}
        search={{
          label: 'Search past requests',
          placeholder: 'Search by name or email',
          text: (r) => `${r.fullName ?? ''} ${r.email}`,
        }}
        empty={{ title: 'Nothing here yet.' }}
        columns={[
          { key: 'who', header: 'Person', cell: (r) => <Person request={r} /> },
          { key: 'asked', header: 'Asked', cell: (r) => <span className="text-muted-foreground">{formatDateTime(r.createdAt)}</span> },
          { key: 'outcome', header: 'Outcome', cell: (r) => <Outcome request={r} /> },
        ]}
        renderCard={(r) => (
          <>
            <Person request={r} />
            <Outcome request={r} />
          </>
        )}
      />
    </AdminSection>
  )
}
