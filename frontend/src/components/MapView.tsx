import { lazy, Suspense } from 'react'
import { MAPS_KEY } from '../services/googleMaps'
import type { Position } from '../types'
import type { MapCanvasProps } from './map/MapCanvas'

// The map code is only downloaded by the screens that show a map.
const MapCanvas = lazy(() => import('./map/MapCanvas'))
const PinMap = lazy(() => import('./map/PinMap'))

const hasToken = Boolean(MAPS_KEY)

function Placeholder({ className }: { className: string }) {
  return (
    <div className={`flex items-center justify-center bg-field p-4 text-center text-sm text-muted ${className}`}>
      {!hasToken && 'Map unavailable: set VITE_GOOGLE_MAPS_API_KEY in .env'}
    </div>
  )
}

/** Live map of a delivery: planned route, driven path and the rider's position. */
export function MapView({ className = '', ...props }: MapCanvasProps) {
  if (!hasToken) return <Placeholder className={className} />
  return (
    <Suspense fallback={<Placeholder className={className} />}>
      <MapCanvas className={className} {...props} />
    </Suspense>
  )
}

interface PinPickerProps {
  position: Position
  onChange: (position: Position) => void
  className?: string
}

/** Map with a draggable pin for adjusting a chosen address. */
export function PinPicker({ className = '', ...props }: PinPickerProps) {
  if (!hasToken) return <Placeholder className={className} />
  return (
    <Suspense fallback={<Placeholder className={className} />}>
      <PinMap className={className} {...props} />
    </Suspense>
  )
}
