import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useRef } from 'react'
import type { Position } from '../../types'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

interface PinMapProps {
  position: Position
  /** Called when the pin is dragged or the map is clicked. */
  onChange: (position: Position) => void
  className?: string
}

/** Small map with one draggable pin, for fixing the exact spot of an address. */
export default function PinMap({ position, onChange, className = '' }: PinMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: container.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: position,
      zoom: 14,
    })
    const marker = new mapboxgl.Marker({ color: '#ff3700', draggable: true }).setLngLat(position).addTo(map)
    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat()
      onChangeRef.current([lng, lat])
    })
    map.on('click', (event) => onChangeRef.current([event.lngLat.lng, event.lngLat.lat]))
    mapRef.current = map
    markerRef.current = marker
    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const key = position.join()
  useEffect(() => {
    markerRef.current?.setLngLat(position)
    mapRef.current?.easeTo({ center: position })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // mapbox-gl.css sets its own position on the map element, so layout classes go on a wrapper
  return (
    <div className={className}>
      <div ref={container} className="size-full" />
    </div>
  )
}
