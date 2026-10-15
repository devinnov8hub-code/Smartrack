import { useParams } from 'react-router-dom'
import { NotFound } from '../../components/NotFound'
import { NoticeCard, NotificationsSection } from '../../components/Notices'
import { DeliverySummary, PanelCard, PanelSection, TrackingLayout } from '../../components/TrackingLayout'
import { useLiveDelivery } from '../../hooks/useLiveDelivery'
import { mapPropsOf } from '../../lib/deliveryMap'
import type { Delivery, Notice, Rider, TrackingStatus } from '../../types'

const telephone = (rider: Rider) => `tel:${rider.phone.replace(/\s/g, '')}`

function ContactRiderLink({ rider }: { rider: Rider }) {
  return (
    <a href={telephone(rider)} className="text-brand">
      Contact the rider
    </a>
  )
}

function RiderCard({ rider, tracking }: { rider: Rider; tracking?: TrackingStatus }) {
  return (
    <PanelCard className="flex min-h-[164px] flex-col items-start justify-between gap-2 py-2.5">
      <div className="flex w-full items-center gap-3">
        <img src={rider.avatarUrl} alt="" className="size-[30px] shrink-0 rounded-full object-cover" />
        <p className="min-w-0 flex-1 font-num text-[22px] font-semibold">
          {rider.name} •{rider.vehicle}
        </p>
      </div>
      <p className="font-num text-lg text-muted">Plate Number •{rider.plateNumber}</p>
      {/* Not in the Figma frame: lets the admin check a "my phone died" claim. */}
      {tracking && (
        <p className="font-num text-lg text-muted">
          Battery •{tracking.battery === null ? 'Not reported' : `${tracking.battery}%`} • Last seen {tracking.lastSeen}
        </p>
      )}
      {rider.phone && (
        <div className="flex items-center gap-[17px] rounded-full border-[0.4px] border-line bg-white pr-[18px] text-lg font-medium whitespace-nowrap">
          <a href={telephone(rider)} className="rounded-full bg-navy px-5 py-2.5 text-white hover:brightness-110">
            Contact Rider
          </a>
          <span className="text-navy">{rider.phone}</span>
        </div>
      )}
    </PanelCard>
  )
}

/**
 * The alert floated over the map: one that just arrived, otherwise whatever
 * best describes the delivery's current state.
 */
function mapToast(delivery: Delivery, latestAlert: Notice | null): Notice | null {
  if (latestAlert) return { ...latestAlert, time: 'now' }
  if (delivery.routeState === 'off-route') {
    return delivery.notifications.find((notice) => notice.kind === 'warning') ?? null
  }
  if (delivery.status === 'delivered') {
    return {
      id: 'delivered',
      kind: 'success',
      title: 'Order Delivered',
      time: '',
      body: 'Your order has been delivered successfully. Thank you for using our service',
    }
  }
  if (delivery.arrived) {
    return delivery.notifications.find((notice) => notice.kind === 'success') ?? null
  }
  return null
}

export default function AdminTracking() {
  const { trackingNumber = '' } = useParams()
  const { delivery, path, latestAlert } = useLiveDelivery(trackingNumber)

  if (delivery === undefined) return null
  if (delivery === null) return <NotFound homePath="/admin" message={`No delivery found for ${trackingNumber}.`} />

  const { rider } = delivery
  const toast = mapToast(delivery, latestAlert)
  const contact = rider?.phone ? <ContactRiderLink rider={rider} /> : undefined

  return (
    <TrackingLayout
      title="Tracking delivery"
      trackingNumber={delivery.trackingNumber}
      homePath="/admin"
      map={{ ...mapPropsOf(delivery), path }}
      toast={toast && <NoticeCard toast notice={toast} action={toast.kind === 'warning' && contact} />}
    >
      <DeliverySummary delivery={delivery} />
      <PanelSection title="Rider details">
        {rider ? (
          <RiderCard rider={rider} tracking={delivery.tracking} />
        ) : (
          <p className="text-lg text-muted">No rider has been assigned to this delivery yet.</p>
        )}
      </PanelSection>
      <NotificationsSection
        notices={delivery.notifications}
        renderAction={(notice) => notice.kind === 'warning' && contact}
      />
    </TrackingLayout>
  )
}
