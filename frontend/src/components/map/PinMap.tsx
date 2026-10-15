import { useEffect, useRef } from 'react'
import { baseMapOptions, importLibrary, toLatLng, toPosition } from '../../services/googleMaps'
import type { Position } from '../../types'

interface PinMapProps {
  position: Position
  /** Called when the pin is dragged or the map is clicked. */
  onChange: (position: Position) => void
  className?: string
}

/** Small map with one draggable pin, for fixing the exact spot of an address. */
export default function PinMap({ position, onChange, className = '' }: PinMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([importLibrary('maps'), importLibrary('marker')]).then(([{ Map }, { AdvancedMarkerElement, PinElement }]) => {
      if (cancelled) return
      const map = new Map(container.current!, baseMapOptions(position, 14))
      const marker = new AdvancedMarkerElement({
        map,
        position: toLatLng(position),
        gmpDraggable: true,
        content: new PinElement({ background: '#ff3700', borderColor: '#c22d00', glyphColor: '#ffffff' }),
      })
      marker.addListener('dragend', () => {
        if (marker.position) onChangeRef.current(toPosition(marker.position as google.maps.LatLngLiteral))
      })
      map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) onChangeRef.current(toPosition(event.latLng))
      })
      mapRef.current = map
      markerRef.current = marker
    })
    return () => {
      cancelled = true
      if (markerRef.current) markerRef.current.map = null
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const key = position.join()
  useEffect(() => {
    if (markerRef.current) markerRef.current.position = toLatLng(position)
    mapRef.current?.panTo(toLatLng(position))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <div className={className}>
      <div ref={container} className="size-full" />
    </div>
  )
}
