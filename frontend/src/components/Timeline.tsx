import truck from '../assets/icons/truck.svg'
import type { TimelineEvent } from '../types'

interface TimelineProps {
  events: TimelineEvent[]
  /** Vertical gap between events, in px. */
  gap?: number
}

/** Drawn in CSS rather than with the fixed 3-stop Figma graphic so it follows the event count. */
export function Timeline({ events, gap = 34 }: TimelineProps) {
  return (
    <ol className="flex w-full flex-col">
      {events.map((event, index) => {
        const last = index === events.length - 1
        return (
          <li key={`${event.title}-${event.time}`} className="flex gap-5">
            <div className="flex w-[13px] shrink-0 flex-col items-center pt-1.5">
              <span className={`size-[11px] shrink-0 rounded-full border-2 bg-white ${last ? 'border-brand' : 'border-line'}`} />
              {!last && <span className="w-px flex-1 bg-line" />}
            </div>
            <div
              className="flex min-w-0 flex-1 items-start justify-between gap-4"
              style={{ paddingBottom: last ? 0 : gap }}
            >
              <div className="flex min-w-0 flex-col gap-[9px]">
                <p className="font-display text-lg font-semibold">{event.title}</p>
                <p className="text-muted">{event.detail}</p>
              </div>
              <p className="shrink-0 text-sm text-muted">{event.time}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** "Courier • In Transit" title with the truck glyph. */
export function CourierHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div aria-hidden className="relative size-9 shrink-0 -scale-x-100 overflow-clip">
        <img src={truck} alt="" className="absolute top-[21.88%] left-[6.25%] max-w-none" />
      </div>
      <h2 className="font-display text-[28px] font-semibold whitespace-nowrap">{label}</h2>
    </div>
  )
}
