import { ApiError } from './api-client'

export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const firstFieldError = err.body?.errors ? Object.values(err.body.errors)[0]?.[0] : undefined
    return firstFieldError ?? err.message
  }
  return 'Something went wrong. Try again.'
}
