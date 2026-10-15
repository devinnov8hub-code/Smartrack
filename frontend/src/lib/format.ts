const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const day = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' })
const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

/** "25 Jun, 2025" */
export function formatDate(iso: string): string {
  const [dd, mon, year] = date.format(new Date(iso)).split(' ')
  return `${dd} ${mon}, ${year}`
}

/** "26 Jun, 11:45 AM" */
export function formatDateTime(iso: string): string {
  const value = new Date(iso)
  return `${day.format(value)}, ${time.format(value)}`
}

/** "now", "5 min ago", "3 hr ago", then the date. */
export function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return formatDateTime(iso)
}
