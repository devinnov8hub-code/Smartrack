import type { ReactNode } from 'react'
import bellEmpty from '../assets/icons/bell-empty.svg'
import bellXs from '../assets/icons/bell-xs.svg'
import chat from '../assets/icons/chat.svg'
import check from '../assets/icons/check.svg'
import warning from '../assets/icons/warning.svg'
import type { Notice, NoticeKind } from '../types'

const kinds: Record<NoticeKind, { icon: string; badge: string; border: string; toastBorder: string; shadow: string }> = {
  warning: {
    icon: warning,
    badge: 'bg-danger-soft',
    border: 'border-danger-line',
    toastBorder: 'border-danger',
    shadow: 'shadow-[0_4px_4px_rgba(255,55,0,0.25)]',
  },
  success: {
    icon: check,
    badge: 'bg-success-soft',
    border: 'border-line',
    toastBorder: 'border-line',
    shadow: 'shadow-[0_4px_4px_rgba(169,232,97,0.25)]',
  },
  message: {
    icon: chat,
    badge: 'bg-info-soft',
    border: 'border-line',
    toastBorder: 'border-line',
    shadow: 'shadow-[0_4px_4px_rgba(169,232,97,0.25)]',
  },
}

interface NoticeCardProps {
  notice: Omit<Notice, 'id'>
  /** Inline link shown after the body, e.g. "Contact the rider". */
  action?: ReactNode
  /** Large floating variant shown over the map. */
  toast?: boolean
}

export function NoticeCard({ notice, action, toast }: NoticeCardProps) {
  const kind = kinds[notice.kind]
  return (
    <div
      role={toast ? 'status' : undefined}
      className={`flex min-h-[110px] w-full items-center gap-[23px] rounded-card border-[0.4px] bg-white/85 px-5 py-2.5 backdrop-blur-[4px] ${
        toast ? `${kind.toastBorder} ${kind.shadow}` : kind.border
      }`}
    >
      <div className={`flex size-[52px] shrink-0 items-center justify-center rounded-full ${kind.badge}`}>
        <img src={kind.icon} alt="" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
        <div className="flex items-center justify-between gap-4">
          <p className={toast ? 'font-num text-[22px] font-medium' : 'text-base'}>{notice.title}</p>
          <p className={`shrink-0 font-num text-muted ${toast ? 'text-lg' : 'text-sm'}`}>{notice.time}</p>
        </div>
        <p className={toast ? 'text-base' : 'text-sm'}>
          {notice.body}
          {action && <>. {action}</>}
        </p>
      </div>
    </div>
  )
}

interface NotificationsSectionProps {
  notices: Notice[]
  renderAction?: (notice: Notice) => ReactNode
}

export function NotificationsSection({ notices, renderAction }: NotificationsSectionProps) {
  return (
    <section className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-[11px]">
        <span className="flex size-[23px] shrink-0 items-center justify-center rounded-full bg-navy">
          <img src={bellXs} alt="" />
        </span>
        <h2 className="font-display text-[22px] font-semibold text-navy">Notifications</h2>
      </div>
      {notices.length === 0 ? (
        <div className="flex h-[177px] w-full flex-col items-center justify-center gap-3.5 rounded-card bg-field px-5 py-2.5 text-center text-muted">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-muted">
            <img src={bellEmpty} alt="" className="max-w-none" />
          </span>
          <div className="flex flex-col gap-[9px]">
            <p className="text-lg">No Notifications yet</p>
            <p className="text-sm">You’re all caught up. New delivery updates and alerts will appear here.</p>
          </div>
        </div>
      ) : (
        notices.map((notice) => <NoticeCard key={notice.id} notice={notice} action={renderAction?.(notice)} />)
      )}
    </section>
  )
}
