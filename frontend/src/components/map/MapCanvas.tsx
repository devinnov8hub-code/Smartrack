import { useEffect, useRef, useState } from 'react'
import van from '../../assets/icons/truck.svg'
import { anchored, baseMapOptions, importLibrary, toLatLng, toPosition } from '../../services/googleMaps'
import type { Position } from '../../types'

const ROUTE_COLOR = '#3b20d8'
// The van glides to each new position instead of jumping
const GLIDE_MS = 1000
// How long after a position update the van keeps pulsing as "moving"
const MOVING_MS = 20_000
// Framing never zooms in closer than this
const MAX_FRAME_ZOOM = 15

export interface MapCanvasProps {
  origin: Position
  destination: Position
  /** The planned route. */
  route?: Position[]
  /** Where the rider has actually driven. */
  path?: Position[]
  /** The rider's current position. */
  position?: Position
  offRoute?: boolean
  /** Width in px covered by an overlay on the left, kept clear when framing the route. */
  leftInset?: number
  className?: string
}

// A van in a round badge, with a ring that pulses while position updates keep arriving.
// The badge centre (22px, 22px) sits on the rider's position, the "Off route" tag beside it.
function vehicleElement() {
  const element = document.createElement('div')
  element.className = 'flex items-center gap-2'
  element.innerHTML =
    '<span class="relative flex size-11 items-center justify-center">' +
    '<span data-pulse class="absolute inset-0 hidden animate-ping rounded-full"></span>' +
    '<span data-badge class="relative flex size-11 items-center justify-center rounded-full border-2 bg-white shadow-md">' +
    `<img data-van src="${van}" alt="" class="w-7 transition-transform" />` +
    '</span></span>' +
    '<span data-label class="whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-danger shadow-md">Off route</span>'
  return anchored(element, 22, 22)
}

function originElement() {
  const element = document.createElement('div')
  element.className = 'size-3.5 rounded-full border-[3px] border-navy bg-white shadow'
  return anchored(element, 7, 7)
}

// Pixel position of a coordinate within the map's visible area
function screenPoint(map: google.maps.Map, position: Position) {
  const projection = map.getProjection()
  const bounds = map.getBounds()
  const zoom = map.getZoom()
  if (!projection || !bounds || zoom === undefined) return null
  const topLeft = projection.fromLatLngToPoint({
    lat: bounds.getNorthEast().lat(),
    lng: bounds.getSouthWest().lng(),
  })
  const point = projection.fromLatLngToPoint(toLatLng(position))
  if (!topLeft || !point) return null
  const scale = 2 ** zoom
  return { x: (point.x - topLeft.x) * scale, y: (point.y - topLeft.y) * scale }
}

/** Live Google map: planned route, driven path, pickup, destination and the rider. */
export default function MapCanvas({
  origin,
  destination,
  route,
  path,
  position,
  offRoute = false,
  leftInset = 0,
  className = '',
}: MapCanvasProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const routeLine = useRef<google.maps.Polyline | null>(null)
  const pathLine = useRef<google.maps.Polyline | null>(null)
  const vehicleRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const glideRef = useRef(0)
  const movingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([importLibrary('maps'), importLibrary('marker')]).then(([{ Map, Polyline }]) => {
      if (cancelled) return
      const map = new Map(container.current!, baseMapOptions(origin, 11))
      const line = { strokeColor: ROUTE_COLOR, strokeWeight: 6, clickable: false, map }
      routeLine.current = new Polyline({ ...line, strokeOpacity: 0.35 })
      pathLine.current = new Polyline({ ...line, strokeOpacity: 1 })
      mapRef.current = map
      setReady(true)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(glideRef.current)
      clearTimeout(movingTimer.current)
      routeLine.current?.setMap(null)
      pathLine.current?.setMap(null)
      if (vehicleRef.current) vehicleRef.current.map = null
      mapRef.current = null
      vehicleRef.current = null
      setReady(false)
    }
    // The map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fits the pickup, destination, planned route and (optionally) the rider into view
  function frame(map: google.maps.Map, withRider: boolean) {
    const bounds = new google.maps.LatLngBounds(toLatLng(origin))
    bounds.extend(toLatLng(destination))
    route?.forEach((point) => bounds.extend(toLatLng(point)))
    if (withRider && position) bounds.extend(toLatLng(position))
    // The full-screen map leaves room for the floating alert and the side panel;
    // the small embedded maps only need a little breathing space
    const edge = leftInset ? 60 : 32
    map.fitBounds(bounds, { top: leftInset ? 150 : edge, bottom: edge, right: edge, left: edge + leftInset })
    google.maps.event.addListenerOnce(map, 'idle', () => {
      if ((map.getZoom() ?? 0) > MAX_FRAME_ZOOM) map.setZoom(MAX_FRAME_ZOOM)
    })
  }

  const originKey = origin.join()
  const destinationKey = destination.join()

  // Pickup and destination pins, and the framing of the whole route
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const { AdvancedMarkerElement, PinElement } = google.maps.marker
    const markers = [
      new AdvancedMarkerElement({ map, position: toLatLng(origin), content: originElement() }),
      new AdvancedMarkerElement({
        map,
        position: toLatLng(destination),
        content: new PinElement({ background: '#ff3700', borderColor: '#c22d00', glyphColor: '#ffffff' }),
      }),
    ]
    frame(map, false)
    return () =>
      markers.forEach((marker) => {
        marker.map = null
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, originKey, destinationKey, route, leftInset])

  useEffect(() => {
    if (ready) routeLine.current?.setPath((route ?? []).map(toLatLng))
  }, [ready, route])

  useEffect(() => {
    if (ready) pathLine.current?.setPath((path ?? []).map(toLatLng))
  }, [ready, path])

  const positionKey = position?.join()

  // The rider's marker moves in place rather than being re-created on every ping
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    if (!position) {
      if (vehicleRef.current) vehicleRef.current.map = null
      vehicleRef.current = null
      return
    }
    const placed = vehicleRef.current
    const marker =
      placed ??
      new google.maps.marker.AdvancedMarkerElement({
        map,
        position: toLatLng(position),
        content: vehicleElement(),
        zIndex: 10,
      })
    vehicleRef.current = marker

    const element = marker.content as HTMLElement
    const part = (name: string) => element.querySelector<HTMLElement>(`[data-${name}]`)!
    part('badge').classList.toggle('border-danger', offRoute)
    part('badge').classList.toggle('border-navy', !offRoute)
    part('pulse').classList.toggle('bg-danger/40', offRoute)
    part('pulse').classList.toggle('bg-navy/40', !offRoute)
    part('label').classList.toggle('hidden', !offRoute)

    // A position that arrives after the van is already on the map means it is moving now
    const [fromLng, fromLat] = toPosition(marker.position as google.maps.LatLngLiteral)
    if (placed && (fromLng !== position[0] || fromLat !== position[1])) {
      // The artwork faces left; it is mirrored when travelling east
      part('van').classList.toggle('-scale-x-100', position[0] > fromLng)
      part('pulse').classList.remove('hidden')
      clearTimeout(movingTimer.current)
      movingTimer.current = setTimeout(() => part('pulse').classList.add('hidden'), MOVING_MS)

      cancelAnimationFrame(glideRef.current)
      const startedAt = performance.now()
      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / GLIDE_MS)
        marker.position = {
          lng: fromLng + (position[0] - fromLng) * progress,
          lat: fromLat + (position[1] - fromLat) * progress,
        }
        if (progress < 1) glideRef.current = requestAnimationFrame(step)
      }
      glideRef.current = requestAnimationFrame(step)
    }

    // A rider who wanders out of view (or behind the left panel) is brought back in
    const point = screenPoint(map, position)
    const { clientWidth, clientHeight } = map.getDiv()
    const margin = 40
    const hidden =
      point &&
      (point.x < leftInset + margin ||
        point.x > clientWidth - margin ||
        point.y < margin ||
        point.y > clientHeight - margin)
    if (hidden) frame(map, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, positionKey, offRoute])

  return (
    <div className={className} role="img" aria-label="Delivery route map">
      <div ref={container} className="size-full" />
    </div>
  )
}
