import { useNavigate } from 'react-router-dom'
import bell from '../assets/icons/bell.svg'
import logo from '../assets/icons/logo.svg'
import search from '../assets/icons/search.svg'
import signOut from '../assets/icons/sign-out.svg'
import { useUserContext } from '../lib/context'
import { api } from '../services/api'
import type { User } from '../types'
import { Button } from './ui/Button'

export function SignOutButton() {
  const navigate = useNavigate()
  const { setUser, setRole } = useUserContext()

  function onSignOut() {
    api.logout()
    setUser(null)
    setRole(null)
    navigate('/login')
  }

  return (
    <Button variant="ghost" size="sm" onClick={onSignOut}>
      Sign Out
      <img src={signOut} alt="" />
    </Button>
  )
}

/** Logo + sign out bar used on the form-style pages. */
export function Navbar() {
  return (
    <header className="flex items-center justify-between border-b-[0.4px] border-line bg-white px-6 py-2.5 lg:px-[61px]">
      <img src={logo} alt="GoShip" />
      <SignOutButton />
    </header>
  )
}

interface TopBarProps {
  user: User | null
  searchPlaceholder: string
  search: string
  onSearch: (value: string) => void
  showSignOut?: boolean
}

/** Search + notifications + profile row at the top of the home screens. */
export function TopBar({ user, searchPlaceholder, search: query, onSearch, showSignOut = true }: TopBarProps) {
  return (
    <div className="flex w-full items-center gap-3">
      <label className="flex h-[63px] min-w-0 flex-1 items-center gap-2 rounded-full border-[0.4px] border-line bg-white p-2.5">
        <img src={search} alt="" />
        <input
          type="search"
          value={query}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </label>
      <button
        type="button"
        aria-label="Notifications"
        className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
      >
        <img src={bell} alt="" className="max-w-none" />
      </button>
      {user && (
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="size-[63px] shrink-0 rounded-full object-cover"
        />
      )}
      {showSignOut && user && <SignOutButton />}
    </div>
  )
}
