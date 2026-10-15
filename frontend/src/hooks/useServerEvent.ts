import { useEffect, useRef } from 'react'
import { onServerEvent, type ServerEvents } from '../services/socket'

/** Runs `handler` whenever the backend pushes `event`, for as long as the component is mounted. */
export function useServerEvent<E extends keyof ServerEvents>(event: E, handler: ServerEvents[E]) {
  // Always call the newest handler without re-subscribing on every render
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })

  useEffect(() => {
    const relay = ((...args: unknown[]) => (latest.current as (...a: unknown[]) => void)(...args)) as ServerEvents[E]
    return onServerEvent(event, relay)
  }, [event])
}
