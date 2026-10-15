import { useOutletContext } from 'react-router-dom'
import type { LiveTrip } from '../../hooks/useTripTracking'
import type { Delivery } from '../../types'

export interface RiderContext {
  /** The trip in progress with its route; null when there is none, undefined while loading. */
  activeTrip: Delivery | null | undefined
  /** The rider's live position and route state for the active trip. */
  live: LiveTrip
  /** Changes whenever the backend reports a change to one of the rider's trips. */
  tripsVersion: number
}

/** What RiderLayout shares with the rider screens rendered inside it. */
export function useRider() {
  return useOutletContext<RiderContext>()
}
