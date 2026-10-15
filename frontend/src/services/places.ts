import type { PlaceInput, Position } from '../types'

// Addresses are searched within this country (ISO code). Matches the backend's GEOCODE_COUNTRY.
const COUNTRY = 'ng'
const GEOCODE_URL = 'https://api.mapbox.com/search/geocode/v6/forward'

interface GeocodeResponse {
  features?: {
    geometry: { coordinates: Position }
    properties: { name?: string; full_address?: string; place_formatted?: string }
  }[]
}

/**
 * Address suggestions for what the user has typed so far. Mapbox knows streets,
 * areas and towns here but very few landmarks, which is why the form also lets
 * the user drag the pin to the exact spot.
 */
export async function searchPlaces(query: string, signal: AbortSignal): Promise<PlaceInput[]> {
  const url =
    `${GEOCODE_URL}?q=${encodeURIComponent(query)}&autocomplete=true&country=${COUNTRY}&limit=5` +
    `&access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`
  const response = await fetch(url, { signal })
  if (!response.ok) return []
  const body = (await response.json()) as GeocodeResponse
  return (body.features ?? []).map(({ geometry, properties }) => {
    const address = properties.full_address || [properties.name, properties.place_formatted].filter(Boolean).join(', ')
    // The short name is what the rest of the app shows; the full address tells similar names apart
    return { name: properties.name || address, address, position: geometry.coordinates }
  })
}
