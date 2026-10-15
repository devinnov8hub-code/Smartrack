import type { Feature, LineString } from 'geojson'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useRef, useState } from 'react'
import van from '../../assets/icons/truck.svg'
import type { Position } from '../../types'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const ROUTE_COLOR = '#3b20d8'
// The van glides to each new position instead of jumping
const GLIDE_MS = 1000
// How long after a position update the van keeps pulsing as "moving"
const MOVING_MS = 20_000

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

const line = (coordinates: Position[]): Feature<LineString> => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates },
})

// A van in a round badge, with a ring that pulses while position updates keep arriving
function vehicleElement() {
  const element = document.createElement('div')
  element.className = 'flex items-center gap-2'
  element.innerHTML =
    '<span class="relative flex size-11 items-center justify-center">' +
    '<span data-pulse class="absolute inset-0 hidden animate-ping rounded-full"></span>' +
    '<span data-badge class="relative flex size-11 items-center justify-center rounded-full border-2 bg-white shadow-md">' +
    `<img data-van src="${van}" alt="" class="w-7 transition-transform" />` +
    '</span></span>' +
    '<span data-label class="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-danger shadow-md">Off route</span>'
  return element
}

function originElement() {
  const element = document.createElement('div')
  element.className = 'size-3.5 rounded-full border-[3px] border-navy bg-white shadow'
  return element
}

/** Live Mapbox map: planned route, driven path, pickup, destination and the rider. */
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
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const vehicleRef = useRef<mapboxgl.Marker | null>(null)
  const glideRef = useRef(0)
  const movingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: container.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: origin,
      zoom: 11,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: line([]) })
      map.addSource('path', { type: 'geojson', data: line([]) })
      const round = { 'line-cap': 'round', 'line-join': 'round' } as const
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: round,
        paint: { 'line-color': ROUTE_COLOR, 'line-width': 6, 'line-opacity': 0.35 },
      })
      map.addLayer({
        id: 'path',
        type: 'line',
        source: 'path',
        layout: round,
        paint: { 'line-color': ROUTE_COLOR, 'line-width': 6 },
      })
      setReady(true)
    })
    mapRef.current = map
    return () => {
      cancelAnimationFrame(glideRef.current)
      clearTimeout(movingTimer.current)
      map.remove()
      mapRef.current = null
      vehicleRef.current = null
      setReady(false)
    }
    // The map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fits the pickup, destination, planned route and (optionally) the rider into view
  function frame(map: mapboxgl.Map, withRider: boolean) {
    const bounds = new mapboxgl.LngLatBounds(origin, origin).extend(destination)
    route?.forEach((point) => bounds.extend(point))
    if (withRider && position) bounds.extend(position)
    // The full-screen map leaves room for the floating alert and the side panel;
    // the small embedded maps only need a little breathing space
    const edge = leftInset ? 60 : 32
    map.fitBounds(bounds, {
      padding: { top: leftInset ? 150 : edge, bottom: edge, right: edge, left: edge + leftInset },
      maxZoom: 15,
      duration: withRider ? 600 : 0,
    })
  }

  const originKey = origin.join()
  const destinationKey = destination.join()

  // Pickup and destination pins, and the framing of the whole route
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const markers = [
      new mapboxgl.Marker({ element: originElement() }).setLngLat(origin).addTo(map),
      new mapboxgl.Marker({ color: '#ff3700' }).setLngLat(destination).addTo(map),
    ]
    frame(map, false)
    return () => markers.forEach((marker) => marker.remove())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, originKey, destinationKey, route, leftInset])

  useEffect(() => {
    const source = ready ? mapRef.current?.getSource<mapboxgl.GeoJSONSource>('route') : undefined
    source?.setData(line(route ?? []))
  }, [ready, route])

  useEffect(() => {
    const source = ready ? mapRef.current?.getSource<mapboxgl.GeoJSONSource>('path') : undefined
    source?.setData(line(path ?? []))
  }, [ready, path])

  const positionKey = position?.join()

  // The rider's marker moves in place rather than being re-created on every ping
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    if (!position) {
      vehicleRef.current?.remove()
      vehicleRef.current = null
      return
    }
    const placed = vehicleRef.current
    const marker =
      placed ??
      // Anchored on the left so the "Off route" tag sits beside the van; the offset centres the badge
      new mapboxgl.Marker({ element: vehicleElement(), anchor: 'left', offset: [-22, 0] }).setLngLat(position).addTo(map)
    vehicleRef.current = marker

    const element = marker.getElement()
    const part = (name: string) => element.querySelector<HTMLElement>(`[data-${name}]`)!
    part('badge').classList.toggle('border-danger', offRoute)
    part('badge').classList.toggle('border-navy', !offRoute)
    part('pulse').classList.toggle('bg-danger/40', offRoute)
    part('pulse').classList.toggle('bg-navy/40', !offRoute)
    part('label').classList.toggle('hidden', !offRoute)

    // A position that arrives after the van is already on the map means it is moving now
    const from = marker.getLngLat()
    if (placed && (from.lng !== position[0] || from.lat !== position[1])) {
      // The artwork faces left; it is mirrored when travelling east
      part('van').classList.toggle('-scale-x-100', position[0] > from.lng)
      part('pulse').classList.remove('hidden')
      clearTimeout(movingTimer.current)
      movingTimer.current = setTimeout(() => part('pulse').classList.add('hidden'), MOVING_MS)

      cancelAnimationFrame(glideRef.current)
      const startedAt = performance.now()
      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / GLIDE_MS)
        marker.setLngLat([
          from.lng + (position[0] - from.lng) * progress,
          from.lat + (position[1] - from.lat) * progress,
        ])
        if (progress < 1) glideRef.current = requestAnimationFrame(step)
      }
      glideRef.current = requestAnimationFrame(step)
    }

    // A rider who wanders out of view (or behind the left panel) is brought back in
    const { x, y } = map.project(position)
    const { clientWidth, clientHeight } = map.getContainer()
    const margin = 40
    const hidden =
      x < leftInset + margin || x > clientWidth - margin || y < margin || y > clientHeight - margin
    if (hidden) frame(map, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, positionKey, offRoute])

  // mapbox-gl.css sets its own position on the map element, so layout classes go on a wrapper
  return (
    <div className={className} role="img" aria-label="Delivery route map">
      <div ref={container} className="size-full" />
    </div>
  )
}
