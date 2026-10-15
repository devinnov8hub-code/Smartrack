import { env } from "./env";
import { ApiError } from "../utils/ApiError";
import type { Position } from "../utils/geo";

// Google Maps Platform: Routes API for routes, ETA and traffic, Geocoding API for addresses
const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export interface PlannedRoute {
  geometry: { type: "LineString"; coordinates: Position[] };
  distanceMeters: number;
  // durationSeconds reflects live traffic, typicalDurationSeconds the time without traffic
  durationSeconds: number;
  typicalDurationSeconds?: number;
}

interface RoutesResponse {
  error?: { message?: string };
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    staticDuration?: string;
    polyline?: { encodedPolyline?: string };
  }>;
}

if (!env.googleMapsKey) {
  console.warn(
    "[maps] GOOGLE_MAPS_API_KEY not set - trips use a straight-line route and traffic detection is off",
  );
}

export const isConfigured = (): boolean => Boolean(env.googleMapsKey);

export interface GeocodedPlace {
  name: string;
  address: string;
  // State or region the place is in
  region?: string;
  coordinates: Position;
}

interface GeocodeResponse {
  status: string;
  error_message?: string;
  results?: Array<{
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    address_components: Array<{ long_name: string; types: string[] }>;
  }>;
}

async function geocodeRequest(params: string): Promise<GeocodedPlace | null> {
  let body: GeocodeResponse;
  try {
    const response = await fetch(`${GEOCODE_URL}?${params}&key=${env.googleMapsKey}`, {
      signal: AbortSignal.timeout(8000),
    });
    body = (await response.json()) as GeocodeResponse;
    if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
      throw new Error(body.error_message || body.status || `HTTP ${response.status}`);
    }
  } catch (err) {
    throw new ApiError(502, `Could not look up the address with Google Maps: ${(err as Error).message}`);
  }

  const result = body.results?.[0];
  if (!result) return null;
  const { formatted_address, geometry, address_components } = result;
  const region = address_components.find((part) =>
    part.types.includes("administrative_area_level_1"),
  );
  return {
    name: formatted_address.split(",")[0].trim(),
    address: formatted_address,
    region: region?.long_name,
    coordinates: [geometry.location.lng, geometry.location.lat],
  };
}

// Turns a typed address into coordinates. Returns null when nothing matches.
export const geocode = (query: string): Promise<GeocodedPlace | null> =>
  geocodeRequest(`address=${encodeURIComponent(query)}&components=country:${env.geocodeCountry}`);

// Names the place at a coordinate. Returns null when nothing is there.
export const reverseGeocode = ([lng, lat]: Position): Promise<GeocodedPlace | null> =>
  geocodeRequest(`latlng=${lat},${lng}`);

// Google's encoded polyline format, decoded to [lng, lat] pairs
export function decodePolyline(encoded: string): Position[] {
  const points: Position[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const next = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += next();
    lng += next();
    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

// "1234s" -> 1234
const seconds = (duration: string | undefined): number | undefined =>
  duration ? Number.parseFloat(duration) : undefined;

const waypoint = ([lng, lat]: Position) => ({
  location: { latLng: { latitude: lat, longitude: lng } },
});

// Returns null when Google finds no drivable route
export async function getRoute(from: Position, to: Position): Promise<PlannedRoute | null> {
  let body: RoutesResponse;
  try {
    const response = await fetch(ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.googleMapsKey ?? "",
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: waypoint(from),
        destination: waypoint(to),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
      signal: AbortSignal.timeout(8000),
    });
    body = (await response.json()) as RoutesResponse;
    if (!response.ok) throw new Error(body.error?.message || `HTTP ${response.status}`);
  } catch (err) {
    throw new ApiError(502, `Could not get a route from Google Maps: ${(err as Error).message}`);
  }

  const route = body.routes?.[0];
  if (!route?.polyline?.encodedPolyline) return null;

  return {
    geometry: { type: "LineString", coordinates: decodePolyline(route.polyline.encodedPolyline) },
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: seconds(route.duration) ?? 0,
    typicalDurationSeconds: seconds(route.staticDuration),
  };
}
