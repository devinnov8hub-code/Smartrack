export type Role = 'admin' | 'rider'

/** How a delivery is shown to users; the backend's trip statuses are folded into these. */
export type DeliveryStatus = 'pending' | 'in-transit' | 'delivered' | 'cancelled'
export type DeliveryType = 'Parcel' | 'Cargo'
export type DeliveryRange = 'Intra-State' | 'Inter-State'

/** Where the rider is relative to the planned route; drives the map + alerts. */
export type RouteState = 'on-route' | 'off-route' | 'arrived'

/** A map coordinate in GeoJSON order: [longitude, latitude]. */
export type Position = [number, number]

export interface Rider {
  id: string
  name: string
  avatarUrl: string
  vehicle: string
  plateNumber: string
  phone: string
}

export interface TimelineEvent {
  title: string
  detail: string
  time: string
}

export type NoticeKind = 'warning' | 'success' | 'message'

export interface Notice {
  id: string
  kind: NoticeKind
  title: string
  body: string
  time: string
}

export interface BatteryReading {
  /** 0-100 */
  level: number
  charging: boolean
}

/** Sent by the rider's device on a fixed interval while a trip is active. */
export interface LocationPing {
  position: Position
  accuracy: number
  /** null when the browser doesn't expose battery state (iOS, Firefox). */
  battery: BatteryReading | null
  recordedAt: string
}

/** What the backend concluded from a ping. */
export interface PingResult {
  offRoute: boolean
  arrived: boolean
}

/** Why tracking was interrupted or resumed, as far as the browser can tell. */
export type TrackingEventType =
  | 'backgrounded'
  | 'resumed'
  | 'offline'
  | 'online'
  | 'location-denied'
  | 'location-unavailable'

export interface TrackingEvent {
  type: TrackingEventType
  battery: BatteryReading | null
  recordedAt: string
}

/** Latest device state the backend holds for a rider on a trip. */
export interface TrackingStatus {
  battery: number | null
  lastSeen: string
}

export interface Delivery {
  /** Backend trip id; used for every action on the delivery. */
  id: string
  /** What users see and what the page URLs carry. */
  trackingNumber: string
  packageName: string
  deliveryType: DeliveryType
  range: DeliveryRange
  category: string
  description: string
  dateOrdered: string
  status: DeliveryStatus
  from: string
  to: string
  eta: string
  routeState: RouteState
  /** The rider has collected the package. */
  pickedUp: boolean
  /** The rider is at the destination and can mark the delivery done. */
  arrived: boolean
  rider?: Rider
  tracking?: TrackingStatus
  timeline: TimelineEvent[]
  notifications: Notice[]
  origin: Position
  destination: Position
  /** Planned route; only present when a single delivery is fetched. */
  route?: Position[]
  /** The rider's last reported position. */
  lastPosition?: Position
}

export interface Stats {
  totalRiders: number
  routeDeviations: number
  activeDeliveries: number
  totalDeliveries: number
}

/** A pickup or drop-off point chosen on the order form. */
export interface PlaceInput {
  name: string
  address?: string
  position: Position
}

export interface NewOrder {
  packageName: string
  deliveryType: DeliveryType
  category: string
  description: string
  from: PlaceInput
  to: PlaceInput
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl: string
}

export type MarkDeliveredResult = { ok: true } | { ok: false; reason: 'destination-not-reached' }
export type StartTripResult =
  | { ok: true }
  | { ok: false; reason: 'trip-in-progress' }
  // Low battery, vehicle already out, and anything else the backend refuses with a message
  | { ok: false; reason: 'refused'; message: string }
