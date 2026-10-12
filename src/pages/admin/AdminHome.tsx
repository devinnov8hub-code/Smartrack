import { useReducer, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import bell from '../../assets/icons/bell.svg'
import bolt from '../../assets/icons/bolt.svg'
import calendar from '../../assets/icons/calendar.svg'
import mapPinArea from '../../assets/icons/map-pin-area-sm.svg'
import packageSm from '../../assets/icons/package-sm.svg'
import packageIcon from '../../assets/icons/package.svg'
import plusLight from '../../assets/icons/plus-light.svg'
import plus from '../../assets/icons/plus.svg'
import riderIcon from '../../assets/icons/rider.svg'
import { DataTable, StatusBadge, type Column } from '../../components/DataTable'
import { TopBar } from '../../components/Header'
import { MapView } from '../../components/MapView'
import { StatCard } from '../../components/StatCard'
import { CourierHeading, Timeline } from '../../components/Timeline'
import { WelcomeBanner } from '../../components/WelcomeBanner'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { useAsync } from '../../hooks/useAsync'
import { useLiveDelivery } from '../../hooks/useLiveDelivery'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { useServerEvent } from '../../hooks/useServerEvent'
import { mapPropsOf } from '../../lib/deliveryMap'
import { useUserContext } from '../../lib/context'
import { api } from '../../services/api'
import type { Delivery, DeliveryStatus } from '../../types'

type Filter = 'all' | Exclude<DeliveryStatus, 'pending'>

const tabs: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All Deliveries' },
  { id: 'in-transit', label: 'In Transit' },
  { id: 'delivered', label: 'Delivered' },
  // The design calls this tab "Lost"; the backend's equivalent is a cancelled delivery
  { id: 'cancelled', label: 'Cancelled' },
]

const statusLabels: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  'in-transit': 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const columns: Column<Delivery>[] = [
  { header: 'Delivery Type', cell: (d) => d.deliveryType },
  { header: 'Package Name', cell: (d) => <span className="text-ink">{d.packageName}</span> },
  { header: 'Tracking Number', cell: (d) => d.trackingNumber },
  { header: 'Date Ordered', cell: (d) => <span className="text-ink">{d.dateOrdered}</span> },
  { header: 'Status', cell: (d) => <StatusBadge status={d.status} /> },
]

export default function AdminHome() {
  const navigate = useNavigate()
  const { user } = useUserContext()
  // Any change to a delivery, or a new alert, refreshes the numbers and the table
  const [version, refresh] = useReducer((count: number) => count + 1, 0)
  useServerEvent('trip:status', refresh)
  useServerEvent('alert:new', refresh)
  const stats = useAsync(api.getStats, [version])
  const deliveries = useAsync(api.getDeliveries, [version])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Delivery | null>(null)
  const push = usePushNotifications()
  // The table row has no route; the preview loads the full delivery and follows it live
  const preview = useLiveDelivery(selected?.trackingNumber)
  const shown = preview.delivery ?? selected

  const query = search.trim().toLowerCase()
  const rows = deliveries?.filter(
    (d) =>
      (filter === 'all' || d.status === filter) &&
      (!query || d.trackingNumber.toLowerCase().includes(query) || d.packageName.toLowerCase().includes(query)),
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px]">
      <main
        className={`flex min-w-0 flex-1 flex-col gap-[42px] px-6 pt-[37px] pb-10 lg:pl-[60px] ${selected ? 'lg:pr-[46px]' : 'lg:pr-[60px]'}`}
      >
        <div className="flex flex-col gap-6">
          <TopBar
            user={user}
            searchPlaceholder="Search by id or name..."
            search={search}
            onSearch={setSearch}
            showSignOut={!selected}
          />
          {/* Not in the Figma: browsers only allow the permission prompt after a click */}
          {push.state === 'prompt' && (
            <div className="flex flex-wrap items-center gap-3 rounded-card border-[0.4px] border-line bg-white px-5 py-3">
              <img src={bell} alt="" className="size-6" />
              <p className="min-w-0 flex-1">
                Get route, signal and delivery alerts even when this tab is closed.
                {push.error && <span className="block text-sm text-danger">{push.error}</span>}
              </p>
              <Button variant="navy" size="sm" onClick={push.enable}>
                Turn on notifications
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-[31px]">
            <WelcomeBanner
              role="admin"
              name={user?.name}
              message="Track your deliveries, manage your shipments, and stay updated in real time."
            />
            <h2 className="font-display text-[28px] font-semibold text-ink">Overview</h2>
            <div className="flex flex-wrap gap-3.5">
              <StatCard compact={!!selected} icon={riderIcon} title="Total Riders" subtitle="Number of registered riders" value={stats?.totalRiders} />
              <StatCard compact={!!selected} icon={mapPinArea} title="Route Deviations" subtitle="Outside delivery route" value={stats?.routeDeviations} />
              <StatCard compact={!!selected} icon={bolt} title="Active Deliveries" subtitle="Currently in progress" value={stats?.activeDeliveries} />
              <StatCard compact={!!selected} icon={packageSm} title="Total Deliveries" subtitle="All deliveries completed" value={stats?.totalDeliveries} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-[31px]">
            <Tabs tabs={tabs} value={filter} onChange={setFilter} />
            <Button size="sm" onClick={() => navigate('/admin/orders/new')}>
              Create a delivery
              <img src={plus} alt="" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-[28px] font-semibold text-ink">
              {tabs.find((tab) => tab.id === filter)?.label}
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
            onOpen={setSelected}
            emptyMessage="No deliveries match this view."
          />
        </div>
      </main>

      {shown && (
        <aside className="sticky top-0 h-screen w-[462px] shrink-0 overflow-y-auto bg-white pr-[35px] pl-5 max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:max-w-full max-lg:shadow-xl">
          <div className="flex min-h-full flex-col justify-center gap-[53px] py-6">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-col gap-2">
              <CourierHeading label={`Courier • ${statusLabels[shown.status]}`} />
              <p className="font-num text-2xl font-medium text-muted">{shown.trackingNumber}</p>
            </div>
            <button
              type="button"
              aria-label="Close preview"
              onClick={() => setSelected(null)}
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted hover:brightness-110"
            >
              <img src={plusLight} alt="" className="-rotate-135" />
            </button>
          </div>
          <MapView
            {...mapPropsOf(shown)}
            path={preview.path}
            className="h-[345px] w-full shrink-0 overflow-hidden rounded-card"
          />
          <Timeline events={shown.timeline} />
          <Button variant="navy" size="sm" className="w-full" onClick={() => navigate(`/admin/track/${shown.trackingNumber}`)}>
            Track Delivery
            <img src={packageIcon} alt="" />
          </Button>
          </div>
        </aside>
      )}
    </div>
  )
}
