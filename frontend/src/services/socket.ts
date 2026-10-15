// Live updates from the backend over Socket.IO. The payload types mirror the
// backend's src/types/events.ts.
import { io, type Socket } from 'socket.io-client'
import type { BatteryReading } from '../types'
import { API_URL, tokenStore } from './client'

interface TripFlags {
  deviated: boolean
  stationary: boolean
  traffic: boolean
  signalLost: boolean
}

export interface BackendAlert {
  id: string
  type: 'deviation' | 'stationary' | 'traffic' | 'signal_lost' | 'arrival' | 'driver_message'
  title: string
  message: string
  /** Trip id */
  trip: string
  createdAt: string
}

export interface ServerEvents {
  /** A rider's new position (admin only). */
  'trip:location': (event: {
    tripId: string
    lat: number
    lng: number
    battery: BatteryReading | null
    recordedAt: string
    flags: TripFlags
  }) => void
  /** A trip was created, assigned, started, picked up, arrived, completed or cancelled. */
  'trip:status': (event: { tripId: string; status: string }) => void
  /** Flags or ETA changed, e.g. after a traffic check or a lost signal. */
  'trip:update': (event: { tripId: string; flags: TripFlags; eta?: string }) => void
  /** A new alert for the admin. */
  'alert:new': (alert: BackendAlert) => void
}

let socket: Socket<ServerEvents> | null = null

function connect(): Socket<ServerEvents> {
  if (!socket) {
    // The token is read on every (re)connect, so a fresh login is picked up.
    socket = io(API_URL, { auth: (send) => send({ token: tokenStore.get() }) })
  }
  return socket
}

/** Listens for a server event; returns the function that stops listening. */
export function onServerEvent<E extends keyof ServerEvents>(event: E, handler: ServerEvents[E]): () => void {
  const connection = connect()
  // socket.io's typed overloads don't narrow through a generic event name
  const untyped = connection as unknown as Socket
  const listener = handler as (...args: unknown[]) => void
  untyped.on(event as string, listener)
  return () => {
    untyped.off(event as string, listener)
  }
}

/** Called on sign out so the next user doesn't inherit the connection. */
export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
