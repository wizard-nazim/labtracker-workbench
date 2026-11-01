import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { cn } from 'cn'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  apiErrorMessage,
  fieldErrors,
  focusFirstInvalidField,
  isConflict,
  type FieldErrors,
} from '@/lib/api-error-message'

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
  // Widens the dialog (e.g. "sm:max-w-2xl"). stickyFooter pins the footer to
  // the bottom of the scrolling content on desktop too; on phones the dialog
  // is full screen and its footer is always pinned.
  contentClassName?: string
  stickyFooter?: boolean
  // When given, validation errors (client-side FieldValidationError or an API
  // 400) are handed to the caller to show next to each field, and focus moves
  // to the first field the caller marked aria-invalid. Return false when none
  // of the errors belong to a field the form shows, so the message is shown
  // in the dialog instead.
  onFieldErrors?: (errors: FieldErrors) => boolean
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
  contentClassName,
  stickyFooter = false,
  onFieldErrors,
}: EntityDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const actualOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  // Runs after the render that marked fields invalid, so the query finds them.
  useEffect(() => {
    if (focusRequest === 0) return
    if (!focusFirstInvalidField(formRef.current)) {
      formRef.current?.querySelector<HTMLElement>('[data-slot="form-error"]')?.focus()
    }
  }, [focusRequest])

  function handleOpenChange(next: boolean) {
    if (!next) setError(null)
    setOpen(next)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit()
      setOpen(false)
    } catch (err) {
      const fields = fieldErrors(err)
      if (fields && onFieldErrors?.(fields)) {
        setError('Check the highlighted fields.')
        setFocusRequest((n) => n + 1)
      } else if (isConflict(err)) {
        toast.error(err.message)
      } else {
        setError(apiErrorMessage(err))
        if (fields) setFocusRequest((n) => n + 1)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={actualOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn(stickyFooter && 'sm:has-data-[slot=dialog-footer]:pb-0', contentClassName)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form ref={formRef} className="flex min-w-0 flex-1 flex-col gap-4" onSubmit={handleSubmit} noValidate={Boolean(onFieldErrors)}>
          {children}
          {error && (
            <p data-slot="form-error" role="alert" tabIndex={-1} className="text-sm text-destructive outline-none">
              {error}
            </p>
          )}
          <DialogFooter className={cn(stickyFooter && 'sm:sticky sm:mb-0 sm:bg-popover')}>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || submitDisabled}>
              {isSubmitting ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
