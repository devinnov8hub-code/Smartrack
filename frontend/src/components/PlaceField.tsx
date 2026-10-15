import { useEffect, useState } from 'react'
import mapPinArea from '../assets/icons/map-pin-area.svg'
import { searchPlaces } from '../services/places'
import type { PlaceInput } from '../types'
import { PinPicker } from './MapView'
import { TextField } from './ui/Field'

const MIN_QUERY_LENGTH = 3

interface PlaceFieldProps {
  label: string
  placeholder: string
  value: PlaceInput | null
  onChange: (value: PlaceInput | null) => void
  /** Shows the "Use my location" shortcut. */
  allowCurrentLocation?: boolean
}

/**
 * Address input: type to get suggestions, pick one, then drag the pin if the
 * exact spot (a shop, a gate) isn't where the suggestion landed.
 */
export function PlaceField({ label, placeholder, value, onChange, allowCurrentLocation }: PlaceFieldProps) {
  const [text, setText] = useState(value?.name ?? '')
  const [found, setSuggestions] = useState<PlaceInput[]>([])
  // Only search for what the user typed, not for text we filled in ourselves
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const query = text.trim()
    if (!searching || query.length < MIN_QUERY_LENGTH) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then(setSuggestions)
        .catch(() => {})
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [text, searching])

  // Results for an earlier query are hidden as soon as searching stops
  const suggestions = searching && text.trim().length >= MIN_QUERY_LENGTH ? found : []

  function onType(next: string) {
    setText(next)
    setSearching(true)
    // The pin stays where it is; the typed text becomes the place's display name
    if (value) onChange({ ...value, name: next })
  }

  function choose(place: PlaceInput) {
    setText(place.name)
    setSearching(false)
    onChange(place)
  }

  function fillCurrentLocation() {
    navigator.geolocation?.getCurrentPosition(({ coords }) =>
      choose({ name: text.trim() || 'My location', position: [coords.longitude, coords.latitude] }),
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <TextField
          label={label}
          placeholder={placeholder}
          required
          autoComplete="off"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          value={text}
          onChange={(event) => onType(event.target.value)}
          onBlur={() => setSearching(false)}
          trailing={
            allowCurrentLocation && (
              <button
                type="button"
                onClick={fillCurrentLocation}
                className="flex shrink-0 items-center gap-2.5 text-xs text-brand"
              >
                Use my location
                <img src={mapPinArea} alt="" />
              </button>
            )
          }
        />
        {suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-field border-[0.4px] border-line bg-white shadow-lg"
          >
            {suggestions.map((place) => (
              <li key={`${place.name}-${place.position.join()}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  // mousedown fires before the input's blur closes the list
                  onMouseDown={(event) => {
                    event.preventDefault()
                    choose(place)
                  }}
                  className="block w-full px-2.5 py-2 text-left text-sm hover:bg-field"
                >
                  {place.name}
                  {place.address && place.address !== place.name && (
                    <span className="block text-xs text-muted">{place.address}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {value ? (
        <>
          <PinPicker
            position={value.position}
            onChange={(position) => onChange({ name: text.trim() || value.name, position })}
            className="h-[180px] w-full overflow-hidden rounded-field border-[0.4px] border-line"
          />
          <p className="text-xs text-muted">Drag the pin or click the map to set the exact spot.</p>
        </>
      ) : (
        <p className="text-xs text-muted">Start typing a street or area, then pick it from the list.</p>
      )}
    </div>
  )
}
