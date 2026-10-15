import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import calendar from '../../assets/icons/calendar.svg'
import viewIcon from '../../assets/icons/view.svg'
import { DataTable, type Column } from '../../components/DataTable'
import { TopBar } from '../../components/Header'
import { MapView } from '../../components/MapView'
import { CourierHeading, Timeline } from '../../components/Timeline'
import { WelcomeBanner } from '../../components/WelcomeBanner'
import { Button } from '../../components/ui/Button'
import { Modal, ModalMessage } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import { useAsync } from '../../hooks/useAsync'
import { useUserContext } from '../../lib/context'
import { mapPropsOf } from '../../lib/deliveryMap'
import { api } from '../../services/api'
import { MIN_START_BATTERY, readBattery } from '../../services/device'
import type { Delivery } from '../../types'
import type { LiveTrip } from '../../hooks/useTripTracking'
import { useRider } from './useRider'

type Tab = 'pending' | 'trips' | 'delivered' | 'cancelled'

const tabs: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending Deliveries' },
  { id: 'trips', label: 'Trips' },
  { id: 'delivered', label: 'Delivered' },
  // The design calls this tab "Lost"; the backend's equivalent is a cancelled delivery
  { id: 'cancelled', label: 'Cancelled' },
]

const columns: Column<Delivery>[] = [
  { header: 'Delivery Type', cell: (d) => d.deliveryType },
  { header: 'Delivery Range', cell: (d) => d.range },
  { header: 'Tracking Number', cell: (d) => d.trackingNumber },
  { header: 'Package Name', cell: (d) => d.packageName },
  { header: 'Date Ordered', cell: (d) => d.dateOrdered },
  { header: 'Delivery Location', cell: (d) => d.to },
]

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-sm">{label}</dt>
      <dd className="min-h-[47px] p-2.5 text-lg font-semibold text-muted">{value || '-'}</dd>
    </div>
  )
}

function DeliveryDetailsModal({
  delivery,
  onClose,
  onStart,
}: {
  delivery: Delivery
  onClose: () => void
  onStart: () => void
}) {
  const heading = 'font-display text-[22px] font-semibold text-navy'
  return (
    <Modal
      title="Delivery details"
      onClose={onClose}
      footer={
        <>
          <Button variant="neutral" size="auto" onClick={onClose}>
            {delivery.status === 'pending' ? 'Cancel' : 'Close'}
          </Button>
          {/* Only a delivery that hasn't started can be started */}
          {delivery.status === 'pending' && <Button onClick={onStart}>Start Trip</Button>}
        </>
      }
    >
      <div className="grid gap-6 px-5 py-[18px] sm:grid-cols-2">
        <section className="flex flex-col gap-6">
          <h3 className={heading}>Package details</h3>
          <dl className="flex flex-col gap-[18px]">
            <ReadOnlyField label="Package name" value={delivery.packageName} />
            <ReadOnlyField label="Delivery Type" value={delivery.deliveryType} />
            <ReadOnlyField label="Category" value={delivery.category} />
            <ReadOnlyField label="Description" value={delivery.description} />
          </dl>
        </section>
        <section className="flex flex-col gap-6">
          <h3 className={heading}>Delivery details</h3>
          <dl className="flex flex-col gap-[18px]">
            <ReadOnlyField label="Delivery" value={delivery.range} />
            <ReadOnlyField label="Pickup Location" value={delivery.from} />
            <ReadOnlyField label="Delivery Location" value={delivery.to} />
          </dl>
        </section>
      </div>
    </Modal>
  )
}

function ActiveTrip({ trip, live }: { trip: Delivery; live: LiveTrip }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-6">
      <CourierHeading label="Courier • In Transit" />
      <div className="flex flex-col gap-[31px]">
        <p className="font-display text-2xl font-semibold">
          <span className="text-navy">Tracking Number: </span>
          <span className="font-num font-medium">{trip.trackingNumber}</span>
        </p>
        <div className="flex flex-col gap-8 lg:h-[395px] lg:flex-row lg:gap-[53px]">
          <div className="flex shrink-0 flex-col justify-between gap-8 lg:w-[400px]">
            <Timeline events={trip.timeline} gap={47} />
            <Button variant="navy" size="sm" className="w-full" onClick={() => navigate(`/rider/trips/${trip.trackingNumber}`)}>
              View in full screen
              <img src={viewIcon} alt="" />
            </Button>
          </div>
          <MapView
            {...mapPropsOf(trip)}
            position={live.position ?? trip.lastPosition}
            offRoute={live.offRoute}
            className="h-[395px] min-w-0 flex-1 overflow-hidden rounded-card lg:h-full"
          />
        </div>
      </div>
    </div>
  )
}

function hasLocationAccess(): Promise<boolean> {
  if (!navigator.permissions) return Promise.resolve(false)
  return navigator.permissions.query({ name: 'geolocation' }).then(
    (status) => status.state === 'granted',
    () => false,
  )
}

type Dialog =
  | { kind: 'details' | 'location'; delivery: Delivery }
  | { kind: 'trip-in-progress' }
  | { kind: 'low-battery'; level: number }
  // The backend refused to start the trip and said why
  | { kind: 'refused'; message: string }

export default function RiderHome() {
  const navigate = useNavigate()
  const { user } = useUserContext()
  const { activeTrip, live, tripsVersion } = useRider()
  const deliveries = useAsync(api.getDeliveries, [tripsVersion])
  const [tab, setTab] = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<Dialog | null>(null)

  const query = search.trim().toLowerCase()
  const rows = deliveries?.filter(
    (d) =>
      d.status === tab &&
      (!query || d.trackingNumber.toLowerCase().includes(query) || d.packageName.toLowerCase().includes(query)),
  )

  async function beginTrip(delivery: Delivery) {
    // The backend re-checks the battery rule, so it can't be skipped from the browser
    const result = await api.startTrip(delivery.id, await readBattery())
    if (result.ok) navigate(`/rider/trips/${delivery.trackingNumber}`)
    else if (result.reason === 'trip-in-progress') setDialog({ kind: 'trip-in-progress' })
    else setDialog({ kind: 'refused', message: result.message })
  }

  async function onStartTrip(delivery: Delivery) {
    // Skipped where the browser can't report battery (iOS, Firefox).
    const battery = await readBattery()
    if (battery && !battery.charging && battery.level < MIN_START_BATTERY) {
      setDialog({ kind: 'low-battery', level: battery.level })
      return
    }
    if (await hasLocationAccess()) await beginTrip(delivery)
    else setDialog({ kind: 'location', delivery })
  }

  function enableLocation(delivery: Delivery) {
    // Triggers the browser permission prompt; the trip only starts once access is granted.
    navigator.geolocation.getCurrentPosition(
      () => beginTrip(delivery),
      () => setDialog({ kind: 'location', delivery }),
    )
  }

  const close = () => setDialog(null)

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-[42px] px-6 pt-[37px] pb-10 lg:px-[60px]">
      <div className="flex flex-col gap-6">
        <TopBar
          user={user}
          searchPlaceholder="Search by tracking number or name..."
          search={search}
          onSearch={setSearch}
        />
        <div className="flex flex-col gap-[31px]">
          <WelcomeBanner
            role="rider"
            name={user?.name}
            message="Manage your deliveries, stay updated on trip details, and communicate with admin whenever you need support."
          />
          <div className="flex">
            <Tabs tabs={tabs} value={tab} onChange={setTab} />
          </div>
        </div>
      </div>

      {tab === 'trips' ? (
        activeTrip ? (
          <ActiveTrip trip={activeTrip} live={live} />
        ) : (
          activeTrip === null && (
            <p className="py-16 text-center text-lg text-muted">
              No trip in progress. Start one from Pending Deliveries.
            </p>
          )
        )
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-[28px] font-semibold text-ink">
              {tabs.find((item) => item.id === tab)?.label}
            </h2>
            <div className="flex h-12 items-center gap-2.5 rounded-full bg-white px-5 py-2.5 font-medium whitespace-nowrap">
              <img src={calendar} alt="" />
              01/02/25 - 23/10/26
            </div>
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(d) => d.id}
            onOpen={(delivery) => setDialog({ kind: 'details', delivery })}
            emptyMessage="No deliveries here yet."
          />
        </div>
      )}

      {dialog?.kind === 'details' && (
        <DeliveryDetailsModal delivery={dialog.delivery} onClose={close} onStart={() => onStartTrip(dialog.delivery)} />
      )}
      {dialog?.kind === 'location' && (
        <Modal
          title="Location Access Required"
          onClose={close}
          footer={
            <>
              <Button variant="neutral" size="auto" onClick={close}>
                Close
              </Button>
              <Button size="md-compact" onClick={() => enableLocation(dialog.delivery)}>
                Enable Location
              </Button>
            </>
          }
        >
          <ModalMessage>
            Please allow this browser to access your location before starting the trip. Location access is needed to
            track your route and confirm delivery progress.
          </ModalMessage>
        </Modal>
      )}
      {dialog?.kind === 'low-battery' && (
        <Modal
          title="Battery Too Low"
          onClose={close}
          footer={
            <Button variant="neutral" size="auto" onClick={close}>
              Close
            </Button>
          }
        >
          <ModalMessage>
            Your battery is at {dialog.level}%. Charge to at least {MIN_START_BATTERY}% or plug in your phone before
            starting the trip, so tracking stays on for the whole delivery.
          </ModalMessage>
        </Modal>
      )}
      {dialog?.kind === 'refused' && (
        <Modal
          title="Trip Can’t Start"
          onClose={close}
          footer={
            <Button variant="neutral" size="auto" onClick={close}>
              Close
            </Button>
          }
        >
          <ModalMessage>{dialog.message}.</ModalMessage>
        </Modal>
      )}
      {dialog?.kind === 'trip-in-progress' && (
        <Modal
          title="Trip Already in Progress"
          onClose={close}
          footer={
            <Button variant="neutral" size="auto" onClick={close}>
              Close
            </Button>
          }
        >
          <ModalMessage>
            You can’t start a new delivery while another trip is active. Complete your current trip before starting
            the next one.
          </ModalMessage>
        </Modal>
      )}
    </div>
  )
}
