import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import arrowLeft from '../assets/icons/arrow-left.svg'
import type { Delivery } from '../types'
import type { MapCanvasProps } from './map/MapCanvas'
import { MapView } from './MapView'

// Width of the details panel, which the map keeps clear when framing the route
const PANEL_WIDTH = 544

interface TrackingLayoutProps {
  title: string
  trackingNumber: string
  homePath: string
  map: Omit<MapCanvasProps, 'className' | 'leftInset'>
  /** Floating alert shown over the map. */
  toast?: ReactNode
  children: ReactNode
}

/** Full-screen map with the frosted details panel on the left. */
export function TrackingLayout({ title, trackingNumber, homePath, map, toast, children }: TrackingLayoutProps) {
  return (
    <div className="relative h-screen min-h-[600px] overflow-hidden">
      <MapView {...map} leftInset={PANEL_WIDTH} className="absolute inset-0 size-full" />
      <aside className="absolute inset-y-0 left-0 w-[544px] max-w-full overflow-y-auto bg-white/85 pt-[79px] pr-5 pb-5 pl-6 backdrop-blur-[4px] sm:pl-[58px]">
        <div className="flex flex-col gap-[54px]">
          <header className="flex flex-col gap-3">
            <h1 className="font-display text-2xl font-semibold text-brand">{title}</h1>
            <nav className="flex h-11 items-center gap-2.5 rounded-full bg-field p-2.5 font-num font-medium">
              <Link to={homePath} aria-label="Back to home">
                <img src={arrowLeft} alt="" />
              </Link>
              <p>
                <Link to={homePath}>Home</Link> / <span className="font-normal text-muted">{trackingNumber}</span>
              </p>
            </nav>
          </header>
          <div className="flex flex-col gap-[42px]">{children}</div>
        </div>
      </aside>
      {toast && <div className="absolute top-10 right-[18px] left-[calc(50%+20px)] hidden lg:block">{toast}</div>}
    </div>
  )
}

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-6">
      <h2 className="font-display text-[22px] font-semibold text-navy">{title}</h2>
      {children}
    </section>
  )
}

export function PanelCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-full rounded-card border-[0.4px] border-line bg-surface px-5 ${className}`}>{children}</div>
  )
}

function Detail({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <dt className="font-num text-navy">{label}</dt>
      <dd className={large ? 'text-[32px]' : 'text-lg'}>{value}</dd>
    </div>
  )
}

interface DeliverySummaryProps {
  delivery: Delivery
  showTrackingNumber?: boolean
}

/** "Intra-State delivery" block: tracking number plus the from / to / ETA / type grid. */
export function DeliverySummary({ delivery, showTrackingNumber = true }: DeliverySummaryProps) {
  return (
    <PanelSection title={`${delivery.range} delivery`}>
      <dl className="flex flex-col gap-6">
        {showTrackingNumber && <Detail label="Tracking Number" value={delivery.trackingNumber} large />}
        <div className="grid grid-cols-2 gap-6">
          <Detail label="From" value={delivery.from} />
          <Detail label="To" value={delivery.to} />
          <Detail label="Estimated delivery Time" value={delivery.eta} />
          <Detail label="Package Type" value={delivery.deliveryType} />
        </div>
      </dl>
    </PanelSection>
  )
}
