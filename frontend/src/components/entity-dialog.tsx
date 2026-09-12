import { useState, type FormEvent, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/api-error-message'

interface EntityDialogProps {
  trigger?: ReactNode
  title: string
  description?: string
  submitLabel?: string
  submitDisabled?: boolean
  children: ReactNode
  onSubmit: () => Promise<void>
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Owns the dialog's open state, submit/loading/error handling, and chrome.
// Callers own their own field state and pass it via children + onSubmit —
// this exists purely to avoid re-writing that boilerplate in every CRUD dialog.
export function EntityDialog({
  trigger,
  title,
  description,
  submitLabel = 'Save',
  submitDisabled = false,
  children,
  onSubmit,
  open,
  onOpenChange,
}: EntityDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const actualOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit()
      setOpen(false)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={actualOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {children}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || submitDisabled}>
              {isSubmitting ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
