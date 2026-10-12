// Browser push notifications through Firebase Cloud Messaging. The backend
// sends a push for every alert; this side asks permission and hands the
// backend this browser's token.
import { firebaseConfig } from '../lib/firebase'

// Web Push certificate key: Firebase console > Project settings > Cloud Messaging > Web configuration
const VAPID_KEY: string | undefined = import.meta.env.VITE_FIREBASE_VAPID_KEY

/**
 * unsupported: this browser can't do web push (e.g. iOS Safari outside the Home Screen)
 * not-configured: VITE_FIREBASE_VAPID_KEY is missing
 * prompt: the user hasn't been asked yet
 * enabled / blocked: the user's answer
 */
export type PushState = 'unsupported' | 'not-configured' | 'prompt' | 'enabled' | 'blocked'

const fromPermission = (): PushState =>
  Notification.permission === 'granted' ? 'enabled' : Notification.permission === 'denied' ? 'blocked' : 'prompt'

export async function getPushState(): Promise<PushState> {
  if (!VAPID_KEY) return 'not-configured'
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  // Firebase is only downloaded by browsers that get this far
  const { isSupported } = await import('firebase/messaging')
  return (await isSupported()) ? fromPermission() : 'unsupported'
}

/**
 * Asks for permission if it hasn't been given, and returns this browser's
 * push token, or null when the user says no. Browsers only show the prompt in
 * response to a click, so call this from a button unless permission is already granted.
 */
export async function requestPushToken(): Promise<string | null> {
  if ((await Notification.requestPermission()) !== 'granted') return null
  const [{ getApps, initializeApp }, { getMessaging, getToken }] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ])
  const app = getApps()[0] ?? initializeApp(firebaseConfig)
  const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  return getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration })
}

export { fromPermission as currentPushState }
