import type { MapCanvasProps } from '../components/map/MapCanvas'
import type { Delivery } from '../types'

/** What the map needs to draw a delivery as last reported by the backend. */
export function mapPropsOf(delivery: Delivery): MapCanvasProps {
  return {
    origin: delivery.origin,
    destination: delivery.destination,
    route: delivery.route,
    position: delivery.lastPosition,
    offRoute: delivery.routeState === 'off-route',
  }
}
