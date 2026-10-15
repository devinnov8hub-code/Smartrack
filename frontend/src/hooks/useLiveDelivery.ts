import { useEffect, useReducer, useState } from 'react'
import { api, toNotice } from '../services/api'
import type { Delivery, Notice, Position } from '../types'
import { useServerEvent } from './useServerEvent'

interface Snapshot {
  /** The tracking number this was loaded for. */
  trackingNumber: string
  delivery: Delivery | null
  path: Position[]
  latestAlert: Notice | null
}

/**
 * One delivery for the admin, kept current over the socket: the rider's
 * position and driven path, battery, route state, and new alerts.
 * `delivery` is undefined while loading and null when it doesn't exist.
 */
export function useLiveDelivery(trackingNumber: string | undefined) {
  const [snapshot, setSnapshot] = useState<Snapshot>()
  const [version, reload] = useReducer((count: number) => count + 1, 0)

  useEffect(() => {
    if (!trackingNumber) return
    let cancelled = false
    async function load(tracking: string) {
      const delivery = await api.getDelivery(tracking, { withAlerts: true })
      const path = delivery && delivery.status !== 'pending' ? await api.getDrivenPath(delivery.id) : []
      if (cancelled) return
      setSnapshot((current) => ({
        trackingNumber: tracking,
        delivery,
        path,
        // A refetch of the same delivery keeps the alert that is on screen
        latestAlert: current?.trackingNumber === tracking ? current.latestAlert : null,
      }))
    }
    load(trackingNumber).catch((error) => console.error(error))
    return () => {
      cancelled = true
    }
  }, [trackingNumber, version])

  // A snapshot of another delivery is never shown while the requested one loads
  const current = snapshot?.trackingNumber === trackingNumber ? snapshot : undefined
  const id = current?.delivery?.id

  const update = (change: (delivery: Delivery, snapshot: Snapshot) => Partial<Snapshot>) =>
    setSnapshot((latest) => (latest?.delivery ? { ...latest, ...change(latest.delivery, latest) } : latest))

  useServerEvent('trip:location', (event) => {
    if (event.tripId !== id) return
    const position: Position = [event.lng, event.lat]
    update((delivery, { path }) => ({
      path: [...path, position],
      delivery: {
        ...delivery,
        lastPosition: position,
        routeState: delivery.routeState === 'arrived' ? 'arrived' : event.flags.deviated ? 'off-route' : 'on-route',
        tracking: { battery: event.battery?.level ?? delivery.tracking?.battery ?? null, lastSeen: 'now' },
      },
    }))
  })

  // Status, timeline and ETA changes are rarer, so they just refetch
  useServerEvent('trip:status', (event) => {
    if (event.tripId === id) reload()
  })
  useServerEvent('trip:update', (event) => {
    if (event.tripId === id) reload()
  })

  useServerEvent('alert:new', (alert) => {
    if (alert.trip !== id) return
    const notice = toNotice(alert)
    update((delivery) => ({
      latestAlert: notice,
      delivery: { ...delivery, notifications: [notice, ...delivery.notifications] },
    }))
  })

  return {
    delivery: current?.delivery,
    path: current?.path ?? [],
    /** The newest alert that arrived while this screen was open. */
    latestAlert: current?.latestAlert ?? null,
  }
}
