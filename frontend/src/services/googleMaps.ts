import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import type { Position } from '../types'

// Browser key: restrict it to this site's domains in the Google Cloud console
export const MAPS_KEY: string | undefined = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
// Advanced markers need a map ID; DEMO_MAP_ID works until you create your own
const MAP_ID: string = import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID'

if (MAPS_KEY) setOptions({ key: MAPS_KEY, v: 'weekly', region: 'NG' })

export { importLibrary }

/** The app stores positions as [lng, lat]; Google wants { lat, lng }. */
export const toLatLng = ([lng, lat]: Position): google.maps.LatLngLiteral => ({ lat, lng })

export const toPosition = (latLng: google.maps.LatLng | google.maps.LatLngLiteral): Position =>
  typeof latLng.lat === 'function'
    ? [(latLng as google.maps.LatLng).lng(), (latLng as google.maps.LatLng).lat()]
    : [(latLng as google.maps.LatLngLiteral).lng, (latLng as google.maps.LatLngLiteral).lat]

/** Options shared by every map in the app: a plain map with just the zoom buttons. */
export const baseMapOptions = (center: Position, zoom: number): google.maps.MapOptions => ({
  mapId: MAP_ID,
  center: toLatLng(center),
  zoom,
  disableDefaultUI: true,
  zoomControl: true,
  zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
  clickableIcons: false,
  gestureHandling: 'greedy',
})

/**
 * Wraps marker content in a zero-size box so the given point of the content
 * (x, y in px from its top-left) sits exactly on the marker's coordinate.
 */
export function anchored(content: HTMLElement, x: number, y: number): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:relative;width:0;height:0'
  content.style.position = 'absolute'
  content.style.left = `${-x}px`
  content.style.top = `${-y}px`
  wrapper.appendChild(content)
  return wrapper
}
