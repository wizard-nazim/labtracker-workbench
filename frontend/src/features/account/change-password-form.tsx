import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/auth-context'
import { apiClient } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ME_KEY } from './use-me'

interface ChangePasswordResponse {
  token: string
}

function useChangePassword() {
  const queryClient = useQueryClient()
  const { replaceToken } = useAuth()
  return useMutation({
    mutationFn: (request: { currentPassword: string; newPassword: string }) =>
      apiClient.put<ChangePasswordResponse>('/auth/me/password', request),
    // The change ends every existing session, this one included, so carry on
    // with the token that comes back.
    onSuccess: async (result) => {
      replaceToken(result.token)
      await queryClient.invalidateQueries({ queryKey: ME_KEY })
    },
  })
}

// Shared by My account and the forced change after an admin-set password.
export function ChangePasswordForm({
  currentLabel = 'Current password',
  submitLabel = 'Change password',
  onChanged,
}: {
  currentLabel?: string
  submitLabel?: string
  onChanged?: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const change = useChangePassword()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirm) {
      setError("The new passwords don't match.")
      return
    }
    try {
      await change.mutateAsync({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
      onChanged?.()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-current">{currentLabel}</Label>
        <Input
          id="password-current"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-new">New password</Label>
        <Input
          id="password-new"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-describedby="password-new-hint"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <p id="password-new-hint" className="text-xs text-muted-foreground">
          At least 8 characters. Nobody else, administrators included, can see it.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-confirm">Confirm new password</Label>
        <Input
          id="password-confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div>
        <Button type="submit" size="sm" disabled={change.isPending}>
          {change.isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
