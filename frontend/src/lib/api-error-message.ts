import { ApiError } from './api-client'

export type FieldErrors = Record<string, string[]>

// Thrown by a form's own submit handler when client-side checks fail, so the
// same error path (aria-invalid fields, focus the first one) handles both
// these and the API's 400 validation errors.
export class FieldValidationError extends Error {
  errors: FieldErrors

  constructor(errors: FieldErrors) {
    super('Check the highlighted fields.')
    this.errors = errors
  }
}

export function apiErrorMessage(err: unknown): string {
  if (err instanceof FieldValidationError) return err.message
  if (err instanceof ApiError) {
    const firstFieldError = err.body?.errors ? Object.values(err.body.errors)[0]?.[0] : undefined
    return firstFieldError ?? err.message
  }
  return 'Something went wrong. Try again.'
}

// Per-field errors keyed by the API's PascalCase property name (e.g. "RoomId"),
// or null when the error isn't a validation error.
export function fieldErrors(err: unknown): FieldErrors | null {
  if (err instanceof FieldValidationError) return err.errors
  if (err instanceof ApiError && err.status === 400 && err.body?.errors) {
    return Object.keys(err.body.errors).length > 0 ? err.body.errors : null
  }
  return null
}

export function isConflict(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 409
}

// Moves focus to the first field marked aria-invalid inside `root`, after
// React has rendered the error state. Returns false when nothing was found.
export function focusFirstInvalidField(root: HTMLElement | null): boolean {
  const target = root?.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!target) return false
  target.focus()
  target.scrollIntoView?.({ block: 'center', behavior: 'auto' })
  return true
}
