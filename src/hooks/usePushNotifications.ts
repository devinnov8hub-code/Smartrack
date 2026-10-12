import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { currentPushState, getPushState, requestPushToken, type PushState } from '../services/push'
import { pushToken } from '../services/pushToken'

/** Gets a push token (asking permission if needed) and registers it with the backend. */
async function register(): Promise<PushState> {
  const token = await requestPushToken()
  if (!token) return currentPushState()
  await api.registerPushToken(token)
  pushToken.set(token)
  return 'enabled'
}

/**
 * Push notifications for the signed-in user. `state` is undefined until the
 * browser has been checked. A browser that already allowed notifications is
 * registered straight away; otherwise call `enable` from a button.
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getPushState()
      // Tokens can change, so an already-allowed browser re-registers on every visit
      .then((found) => (found === 'enabled' ? register() : found))
      .then((found) => {
        if (!cancelled) setState(found)
      })
      .catch((caught) => console.error(caught))
    return () => {
      cancelled = true
    }
  }, [])

  async function enable() {
    setError('')
    try {
      setState(await register())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not turn on notifications.')
    }
  }

  return { state, error, enable }
}
