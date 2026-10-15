import { Link } from 'react-router-dom'

export function NotFound({ homePath, message }: { homePath: string; message: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg text-muted">{message}</p>
      <Link to={homePath} className="font-display text-lg font-semibold text-brand">
        Back to home
      </Link>
    </main>
  )
}
