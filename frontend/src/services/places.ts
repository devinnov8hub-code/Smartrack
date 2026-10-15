import type { PlaceInput } from '../types'
import { importLibrary, MAPS_KEY, toPosition } from './googleMaps'

// Addresses are searched within this country (ISO code). Matches the backend's GEOCODE_COUNTRY.
const COUNTRY = 'ng'

/** A suggestion from Google Places; its exact position is fetched once it is picked. */
export interface PlaceSuggestion {
  id: string
  name: string
  address?: string
  prediction: google.maps.places.PlacePrediction
}

// Suggestions and the pick that follows share a session, which Google bills as one lookup
let session: google.maps.places.AutocompleteSessionToken | undefined

/**
 * Address suggestions for what the user has typed so far. Google knows streets,
 * businesses and landmarks; the form still lets the user drag the pin to the exact spot.
 */
export async function searchPlaces(query: string, signal: AbortSignal): Promise<PlaceSuggestion[]> {
  if (!MAPS_KEY) return []
  const { AutocompleteSuggestion, AutocompleteSessionToken } = await importLibrary('places')
  session ??= new AutocompleteSessionToken()
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: query,
    includedRegionCodes: [COUNTRY],
    sessionToken: session,
  })
  signal.throwIfAborted()
  return suggestions.flatMap(({ placePrediction: prediction }) =>
    prediction
      ? [
          {
            id: prediction.placeId,
            // The short name is what the rest of the app shows; the full text tells similar names apart
            name: prediction.mainText?.text || prediction.text.text,
            address: prediction.text.text,
            prediction,
          },
        ]
      : [],
  )
}

/** Looks up the position of a picked suggestion. */
export async function resolvePlace(suggestion: PlaceSuggestion): Promise<PlaceInput> {
  const place = suggestion.prediction.toPlace()
  await place.fetchFields({ fields: ['location', 'formattedAddress'] })
  // Fetching the place ends the session; the next search starts a new one
  session = undefined
  if (!place.location) throw new Error(`No location for ${suggestion.name}`)
  return {
    name: suggestion.name,
    address: place.formattedAddress || suggestion.address,
    position: toPosition(place.location),
  }
}
