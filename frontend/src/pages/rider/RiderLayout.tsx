import { useReducer } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { useServerEvent } from '../../hooks/useServerEvent'
import { useTripTracking } from '../../hooks/useTripTracking'
import { api } from '../../services/api'
import type { RiderContext } from './useRider'

/** Wraps the signed-in rider screens so tracking keeps running as the rider moves between them. */
export default function RiderLayout() {
  const location = useLocation()
  const [tripsVersion, bump] = useReducer((count: number) => count + 1, 0)
  // Assigned, started, arrived, completed or cancelled
  useServerEvent('trip:status', bump)

  // Re-checked on every navigation as well: starting or finishing a trip always navigates.
  const activeTrip = useAsync(api.getActiveTrip, [location.key, tripsVersion])
  const live = useTripTracking(activeTrip?.id)

  return <Outlet context={{ activeTrip, live, tripsVersion } satisfies RiderContext} />
}
