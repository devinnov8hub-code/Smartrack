import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { readBattery } from '../services/device'
import type { Position, TrackingEventType } from '../types'

const PING_INTERVAL_MS = 15_000

/** What the rider's own device and the backend currently say about the active trip. */
export interface LiveTrip {
  position?: Position
  offRoute: boolean
  arrived: boolean
}

const idle: LiveTrip = { offRoute: false, arrived: false }

/**
 * While a trip is active: sends a location + battery ping on a fixed interval
 * (a heartbeat, so a stationary rider still reports), keeps the screen awake,
 * and reports why tracking was interrupted when the browser can tell.
 * Returns the rider's position and what the backend made of the last ping.
 */
export function useTripTracking(deliveryId: string | undefined): LiveTrip {
  // Tagged with the trip it belongs to, so a new trip never shows the last one's state
  const [state, setState] = useState<{ id?: string; live: LiveTrip }>({ live: idle })

  useEffect(() => {
    if (!deliveryId || !navigator.geolocation) return

    const setLive = (change: Partial<LiveTrip>) =>
      setState((current) => ({
        id: deliveryId,
        live: { ...(current.id === deliveryId ? current.live : idle), ...change },
      }))

    let stopped = false
    let arrived = false
    let coords: GeolocationCoordinates | null = null
    let wakeLock: WakeLockSentinel | null = null

    async function ping() {
      // The backend takes no more pings once the rider is at the destination
      if (!coords || !deliveryId || arrived) return
      try {
        const result = await api.sendLocationPing(deliveryId, {
          position: [coords.longitude, coords.latitude],
          accuracy: coords.accuracy,
          battery: await readBattery(),
          recordedAt: new Date().toISOString(),
        })
        arrived = result.arrived
        if (!stopped) setLive(result)
      } catch {
        // Offline or the server is down; the next heartbeat tries again.
      }
    }

    async function report(type: TrackingEventType) {
      if (!deliveryId || arrived) return
      try {
        await api.reportTrackingEvent(deliveryId, {
          type,
          battery: await readBattery(),
          recordedAt: new Date().toISOString(),
        })
      } catch {
        // Best effort: these explain a gap, they aren't needed to keep tracking.
      }
    }

    // The lock is dropped whenever the page is hidden, so it's re-requested on return.
    async function keepAwake() {
      try {
        wakeLock = (await navigator.wakeLock?.request('screen')) ?? null
        if (stopped) wakeLock?.release()
      } catch {
        // Denied (e.g. battery saver); tracking still works while the screen is on.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        report('resumed')
        keepAwake()
      } else {
        report('backgrounded')
      }
    }
    const onOffline = () => report('offline')
    const onOnline = () => report('online')

    const watchId = navigator.geolocation.watchPosition(
      (fix) => {
        const first = !coords
        coords = fix.coords
        setLive({ position: [fix.coords.longitude, fix.coords.latitude] })
        if (first) ping()
      },
      (error) => report(error.code === error.PERMISSION_DENIED ? 'location-denied' : 'location-unavailable'),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    )
    const interval = setInterval(ping, PING_INTERVAL_MS)
    keepAwake()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    return () => {
      stopped = true
      navigator.geolocation.clearWatch(watchId)
      clearInterval(interval)
      wakeLock?.release()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [deliveryId])

  return state.id === deliveryId ? state.live : idle
}
