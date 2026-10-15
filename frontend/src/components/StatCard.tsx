interface StatCardProps {
  icon: string
  title: string
  subtitle: string
  value?: number
  /** Smaller variant used when the delivery preview panel is open. */
  compact?: boolean
}

export function StatCard({ icon, title, subtitle, value, compact }: StatCardProps) {
  return (
    <article
      className={`flex min-w-0 flex-1 flex-col justify-between gap-2 rounded-card border-[0.4px] border-line py-2.5 drop-shadow-[0_0_2.5px_rgba(255,55,0,0.12)] ${
        compact ? 'min-h-[116px] basis-[190px] px-4' : 'min-h-[150px] basis-[240px] px-5'
      }`}
      style={{ backgroundImage: 'linear-gradient(240deg, #ffe4dc 0%, #ffffff 72%)' }}
    >
      <div className="flex items-start gap-2">
        <div
          className="flex h-[25px] w-[29px] shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundImage: 'linear-gradient(229.6deg, rgb(255, 55, 0) 0%, rgb(235, 160, 139) 124.63%)' }}
        >
          <img src={icon} alt="" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <h3 className={`font-display font-medium ${compact ? 'text-base' : 'text-lg'}`}>{title}</h3>
          <p className={`text-muted ${compact ? 'text-xs' : 'text-sm'}`}>{subtitle}</p>
        </div>
      </div>
      <p className={`font-num font-medium ${compact ? 'text-2xl' : 'text-[34px]'}`}>{value ?? '–'}</p>
    </article>
  )
}
