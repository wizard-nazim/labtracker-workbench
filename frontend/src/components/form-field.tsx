import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

export interface FieldControlProps {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

interface FormFieldProps {
  id: string
  label: ReactNode
  hint?: ReactNode
  errors?: string[]
  // The control after the label, given the id and aria wiring to spread onto
  // the focusable element (input, textarea or Select trigger).
  children: (control: FieldControlProps) => ReactNode
}

// Label + control + hint + error, with the error linked through
// aria-describedby and the control marked aria-invalid so screen readers
// announce it and the form can focus the first invalid field.
export function FormField({ id, label, hint, errors, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = errors?.length ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-invalid': errorId ? true : undefined, 'aria-describedby': describedBy })}
      {errorId && (
        <p id={errorId} className="text-sm text-destructive">
          {errors!.join(' ')}
        </p>
      )}
      {hintId && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}
