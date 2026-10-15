// HTTP client for the backend. The base URL comes from VITE_API_URL in .env;
// every backend route lives under /api.
export const API_URL: string = import.meta.env.VITE_API_URL
const TOKEN_KEY = 'smartrack.token'

export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number
  /** Stable machine-readable reason from the backend, e.g. "trip-in-progress". */
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      // Storage blocked (private mode); the session just won't survive a reload.
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Nothing to clear.
    }
  },
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

/** Calls the backend, attaches the session token, and unwraps the `{ data }` envelope. */
export async function request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const token = tokenStore.get()
  let response: Response
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }

  if (response.status === 204) return undefined as T
  const json = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(json?.message ?? 'Something went wrong. Please try again.', response.status, json?.code)
  }
  return json?.data as T
}
