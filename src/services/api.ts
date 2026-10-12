// Single seam between the screens and the backend. The backend speaks of
// trips, drivers and managers; the screens speak of deliveries, riders and
// admins. All translation between the two happens in this file.
import avatar from '../assets/images/avatar.png'
import riderAvatar from '../assets/images/rider-avatar.png'
import { formatDate, formatDateTime, timeAgo } from '../lib/format'
import type {
  BatteryReading,
  Delivery,
  DeliveryRange,
  DeliveryStatus,
  DeliveryType,
  LocationPing,
  MarkDeliveredResult,
  NewOrder,
  Notice,
  PingResult,
  PlaceInput,
  Position,
  Rider,
  RouteState,
  StartTripResult,
  Stats,
  TimelineEvent,
  TrackingEvent,
  User,
} from '../types'
import { ApiError, request, tokenStore } from './client'
import { pushToken } from './pushToken'
import { disconnectSocket, type BackendAlert } from './socket'

// ---- Backend shapes ----

interface BackendUser {
  id: string
  name: string
  email: string
  phone?: string
  role: 'manager' | 'driver'
}

interface AuthPayload {
  user: BackendUser
  token: string
}

interface BackendVehicle {
  plateNumber: string
  make?: string
  type?: string
}

interface BackendDriver extends BackendUser {
  vehicle?: BackendVehicle | null
}

interface BackendPlace {
  name?: string
  address?: string
  location: { coordinates: Position }
}

type BackendTripStatus = 'pending' | 'in_progress' | 'arrived' | 'completed' | 'cancelled'

interface BackendTrip {
  id: string
  reference?: string
  cargo?: string
  notes?: string
  package?: { name?: string; deliveryType?: DeliveryType; category?: string; description?: string }
  range?: DeliveryRange
  origin: BackendPlace
  destination: BackendPlace
  status: BackendTripStatus
  driver?: BackendUser | null
  vehicle?: BackendVehicle | null
  route?: { geometry?: { coordinates: Position[] } }
  lastLocation?: { location?: { coordinates: Position } }
  tracking?: { battery?: BatteryReading; lastSeenAt?: string }
  eta?: string
  flags?: { deviated: boolean }
  createdAt: string
  startedAt?: string
  pickedUpAt?: string
  arrivedAt?: string
  completedAt?: string
  cancelledAt?: string
}

interface PingResponse {
  status: BackendTripStatus
  flags: { deviated: boolean }
}

// ---- Translation ----

/** The backend calls the two roles manager / driver; the screens call them admin / rider. */
function toUser(user: BackendUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === 'manager' ? 'admin' : 'rider',
    // The backend has no profile photos yet.
    avatarUrl: avatar,
  }
}

function toRider(driver: BackendUser, vehicle?: BackendVehicle | null): Rider {
  return {
    id: driver.id,
    name: driver.name,
    avatarUrl: riderAvatar,
    vehicle: vehicle?.type || vehicle?.make || 'Vehicle',
    plateNumber: vehicle?.plateNumber ?? '-',
    phone: driver.phone ?? '',
  }
}

const statuses: Record<BackendTripStatus, DeliveryStatus> = {
  pending: 'pending',
  in_progress: 'in-transit',
  // Arrived but not yet handed over still counts as in transit
  arrived: 'in-transit',
  completed: 'delivered',
  cancelled: 'cancelled',
}

function routeStateOf(trip: BackendTrip): RouteState {
  if (trip.status === 'arrived' || trip.status === 'completed') return 'arrived'
  return trip.flags?.deviated ? 'off-route' : 'on-route'
}

const placeName = (place: BackendPlace, fallback: string) => place.name || place.address || fallback

function timelineOf(trip: BackendTrip, from: string, to: string): TimelineEvent[] {
  const steps: [title: string, detail: string, at: string | undefined][] = [
    ['Order Placed', from, trip.createdAt],
    ['Transit', 'Trip started', trip.startedAt],
    ['Picked Up', from, trip.pickedUpAt],
    ['Arrived', to, trip.arrivedAt],
    ['Delivered', to, trip.completedAt],
    ['Cancelled', 'Delivery cancelled', trip.cancelledAt],
  ]
  return steps
    .filter((step): step is [string, string, string] => Boolean(step[2]))
    .sort((a, b) => a[2].localeCompare(b[2]))
    .map(([title, detail, at]) => ({ title, detail, time: formatDateTime(at) }))
}

export function toNotice(alert: BackendAlert): Notice {
  return {
    id: alert.id,
    kind: alert.type === 'arrival' ? 'success' : alert.type === 'driver_message' ? 'message' : 'warning',
    title: alert.title,
    body: alert.message,
    time: timeAgo(alert.createdAt),
  }
}

function toDelivery(trip: BackendTrip, alerts: BackendAlert[] = []): Delivery {
  const from = placeName(trip.origin, 'Pickup')
  const to = placeName(trip.destination, 'Destination')
  const { tracking } = trip
  return {
    id: trip.id,
    trackingNumber: trip.reference || trip.id,
    packageName: trip.package?.name || trip.cargo || 'Package',
    deliveryType: trip.package?.deliveryType ?? 'Parcel',
    // Unknown when the addresses couldn't be tied to a state
    range: trip.range ?? 'Intra-State',
    category: trip.package?.category ?? '',
    description: trip.package?.description || trip.notes || '',
    dateOrdered: formatDate(trip.createdAt),
    status: statuses[trip.status],
    from,
    to,
    eta: trip.eta ? formatDateTime(trip.eta) : '-',
    routeState: routeStateOf(trip),
    pickedUp: Boolean(trip.pickedUpAt),
    arrived: trip.status === 'arrived',
    rider: trip.driver ? toRider(trip.driver, trip.vehicle) : undefined,
    tracking:
      tracking?.battery || tracking?.lastSeenAt
        ? {
            battery: tracking.battery?.level ?? null,
            lastSeen: tracking.lastSeenAt ? timeAgo(tracking.lastSeenAt) : 'not yet',
          }
        : undefined,
    timeline: timelineOf(trip, from, to),
    notifications: alerts.map(toNotice),
    origin: trip.origin.location.coordinates,
    destination: trip.destination.location.coordinates,
    route: trip.route?.geometry?.coordinates,
    lastPosition: trip.lastLocation?.location?.coordinates,
  }
}

function toBackendPlace({ name, address, position: [lng, lat] }: PlaceInput) {
  return { name, address, lat, lng }
}

/** Resolves to null instead of throwing when the backend answers 404. */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

const tripPath = (idOrTrackingNumber: string) => `/trips/${encodeURIComponent(idOrTrackingNumber)}`

export const api = {
  // ---- Auth ----
  /** Public sign up only creates admins; rider accounts are created by their admin. */
  async register(name: string, email: string, password: string): Promise<User> {
    const { user, token } = await request<AuthPayload>('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    })
    tokenStore.set(token)
    return toUser(user)
  },

  /** One login for everyone: the account's role decides which screens they get. */
  async login(email: string, password: string): Promise<User> {
    const { user, token } = await request<AuthPayload>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    tokenStore.set(token)
    return toUser(user)
  },

  /** Restores the signed-in user from the stored token. */
  async getCurrentUser(): Promise<User> {
    return toUser(await request<BackendUser>('/auth/me'))
  },

  logout() {
    // Stop pushes to this browser. Sent before the session token is cleared; not waited for.
    const token = pushToken.get()
    if (token) {
      request('/auth/fcm-token', { method: 'DELETE', body: { token } }).catch(() => {})
      pushToken.clear()
    }
    tokenStore.clear()
    disconnectSocket()
  },

  /** Registers this browser to receive the signed-in user's alerts as push notifications. */
  async registerPushToken(token: string): Promise<void> {
    await request('/auth/fcm-token', { method: 'POST', body: { token } })
  },

  // ---- Deliveries (admins see the ones they created, riders the ones assigned to them) ----
  async getDeliveries(): Promise<Delivery[]> {
    const trips = await request<BackendTrip[]>('/trips?limit=100')
    return trips.map((trip) => toDelivery(trip))
  },

  /** One delivery with its planned route. `withAlerts` is admin-only. */
  async getDelivery(trackingNumber: string, { withAlerts = false } = {}): Promise<Delivery | null> {
    const trip = await orNull(request<BackendTrip>(tripPath(trackingNumber)))
    if (!trip) return null
    const alerts = withAlerts ? await request<BackendAlert[]>(`/alerts?tripId=${trip.id}&limit=50`) : []
    return toDelivery(trip, alerts)
  },

  /** The path the rider has actually driven so far, oldest first. */
  async getDrivenPath(deliveryId: string): Promise<Position[]> {
    const pings = await request<{ lat: number; lng: number }[]>(`${tripPath(deliveryId)}/locations`)
    return pings.map((ping) => [ping.lng, ping.lat])
  },

  // ---- Admin ----
  getStats(): Promise<Stats> {
    return request<Stats>('/stats')
  },

  /** Riders who are active, have a vehicle and aren't out on a trip. */
  async getAvailableRiders(): Promise<Rider[]> {
    const drivers = await request<BackendDriver[]>('/drivers?available=true&limit=100')
    return drivers.map((driver) => toRider(driver, driver.vehicle))
  },

  /** Creates the order without a rider; the rider is assigned in the next step. */
  async createOrder(order: NewOrder): Promise<Delivery> {
    const trip = await request<BackendTrip>('/trips', {
      method: 'POST',
      body: {
        package: {
          name: order.packageName,
          deliveryType: order.deliveryType,
          category: order.category,
          description: order.description,
        },
        origin: toBackendPlace(order.from),
        destination: toBackendPlace(order.to),
      },
    })
    return toDelivery(trip)
  },

  async assignRider(deliveryId: string, riderId: string): Promise<Delivery> {
    const trip = await request<BackendTrip>(`${tripPath(deliveryId)}/assign`, {
      method: 'POST',
      body: { driverId: riderId },
    })
    return toDelivery(trip)
  },

  // ---- Rider ----
  /** The trip the rider is currently on, with its route; null when there is none. */
  async getActiveTrip(): Promise<Delivery | null> {
    const [active] = await request<BackendTrip[]>('/trips?status=in_progress,arrived&limit=1')
    return active ? api.getDelivery(active.id) : null
  },

  async startTrip(deliveryId: string, battery: BatteryReading | null): Promise<StartTripResult> {
    try {
      await request(`${tripPath(deliveryId)}/start`, { method: 'POST', body: { battery } })
      return { ok: true }
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 409) throw error
      if (error.code === 'trip-in-progress') return { ok: false, reason: 'trip-in-progress' }
      return { ok: false, reason: 'refused', message: error.message }
    }
  },

  async markPickup(deliveryId: string): Promise<void> {
    await request(`${tripPath(deliveryId)}/pickup`, { method: 'POST' })
  },

  async markDelivered(deliveryId: string): Promise<MarkDeliveredResult> {
    try {
      await request(`${tripPath(deliveryId)}/complete`, { method: 'POST' })
      return { ok: true }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'destination-not-reached') {
        return { ok: false, reason: 'destination-not-reached' }
      }
      throw error
    }
  },

  /** Sends a note to the admin; it appears in their notifications for this delivery. */
  async sendComplaint(deliveryId: string, complaint: string, description: string): Promise<void> {
    await request(`${tripPath(deliveryId)}/messages`, {
      method: 'POST',
      body: { category: complaint, description },
    })
  },

  // ---- Rider device tracking ----
  async sendLocationPing(deliveryId: string, ping: LocationPing): Promise<PingResult> {
    const [lng, lat] = ping.position
    try {
      const result = await request<PingResponse>(`${tripPath(deliveryId)}/location`, {
        method: 'POST',
        body: { lat, lng, accuracy: ping.accuracy, battery: ping.battery, timestamp: ping.recordedAt },
      })
      return { offRoute: result.flags.deviated, arrived: result.status === 'arrived' }
    } catch (error) {
      // The backend stops accepting pings once the rider has arrived
      if (error instanceof ApiError && error.status === 409) return { offRoute: false, arrived: true }
      throw error
    }
  },

  async reportTrackingEvent(deliveryId: string, event: TrackingEvent): Promise<void> {
    await request(`${tripPath(deliveryId)}/events`, {
      method: 'POST',
      body: { type: event.type, battery: event.battery, timestamp: event.recordedAt },
    })
  },
}
