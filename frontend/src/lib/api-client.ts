import { authStorage } from './auth-storage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// VITE_API_BASE_URL includes the /api suffix; static files (uploaded images)
// are served from the API's origin, not under /api, so strip it back off.
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

export interface ApiErrorBody {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  status: number
  body: ApiErrorBody | null

  constructor(status: number, message: string, body: ApiErrorBody | null = null) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = authStorage.getToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    const message = body?.detail ?? body?.title ?? response.statusText
    throw new ApiError(response.status, message, body)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

// Separate from `request`: a multipart body must not get the JSON Content-Type
// header (the browser sets its own, boundary included).
async function uploadFile<T>(path: string, file: File): Promise<T> {
  const token = authStorage.getToken()
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    const message = body?.detail ?? body?.title ?? response.statusText
    throw new ApiError(response.status, message, body)
  }
  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
  uploadFile,
}
