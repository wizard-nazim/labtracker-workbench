import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  trigger: ReactNode
  title: string
  description: ReactNode
  confirmLabel: string
  // Destructive actions (delete) get the red button; reversible ones don't.
  destructive?: boolean
  // Errors are the caller's to report (usually a toast); the dialog closes
  // either way so focus goes back to the trigger.
  onConfirm: () => void | Promise<void>
}

// The AlertDialog confirm pattern from the admin danger zone, wrapped so every
// "Are you sure?" reads and behaves the same: Cancel is focused first, and
// focus returns to the button that opened it.
export function ConfirmDialog({ trigger, title, description, confirmLabel, destructive = false, onConfirm }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? 'destructive' : 'default'} onClick={() => void onConfirm()}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
