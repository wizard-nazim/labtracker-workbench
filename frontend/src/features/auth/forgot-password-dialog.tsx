import { useState, type FormEvent } from 'react'
import { ApiError, apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// Asks a Super Admin to reset the password. The API replies the same way
// whether or not the email has an account, and so does this dialog.
export function ForgotPasswordDialog({ initialEmail }: { initialEmail: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setEmail(initialEmail)
      setSent(false)
      setError(null)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // The dialog sits inside the sign-in form in the React tree, and React
    // bubbles events through portals: don't let this submit sign in too.
    event.stopPropagation()
    setError(null)
    setIsSending(true)
    try {
      await apiClient.post('/auth/password-reset-requests', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : 'Could not send the request right now. Please try again.',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-[13px]">
          Forgot password?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forgot your password?</DialogTitle>
          <DialogDescription>
            {sent
              ? "If that account exists, your administrator has been asked to reset it. They'll give you a temporary password."
              : "Enter your email and we'll ask your administrator to reset your password."}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)}>
              Back to sign in
            </Button>
          </DialogFooter>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isSending}>
                {isSending ? 'Sending…' : 'Ask for a reset'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
