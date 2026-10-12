// Remembers this browser's push token so it can be unregistered on sign out.
const KEY = 'smartrack.pushToken'

export const pushToken = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(KEY, token)
    } catch {
      // Storage blocked; the token just can't be unregistered on sign out.
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Nothing to clear.
    }
  },
}
