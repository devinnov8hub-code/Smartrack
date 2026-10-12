import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import smartrackLogo from "../assets/icons/smartrack_logo.png"
import envelope from '../assets/icons/envelope.svg'
import eye from '../assets/icons/eye.svg'
import { useUserContext } from '../lib/context'
import { api } from '../services/api'
import { Button } from './ui/Button'
import { TextField } from './ui/Field'

const pieces = import.meta.glob<string>('../assets/illustrations/login/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

function Piece({ inset, name }: { inset: string; name: string }) {
  return (
    <div className="absolute" style={{ inset }}>
      <img src={pieces[`../assets/illustrations/login/${name}.svg`]} alt="" className="block size-full max-w-none" />
    </div>
  )
}

/** Isometric logistics artwork, layered from the exported Figma vectors (626x459 frame). */
function LoginIllustration() {
  return (
    <div aria-hidden className="relative aspect-[626/459] w-full max-w-[626px] overflow-clip">
      <div className="absolute overflow-clip" style={{ inset: '35.41% 13.57% 12.09% 14.07%' }}>
        <Piece inset="0.92% 0 0 8.46%" name="c318c" />
        <Piece inset="0 7.87% 2.5% 0" name="f9870" />
      </div>
      <Piece inset="38% 24.77% 17.73% 23.07%" name="6d8bd" />
      <div className="absolute overflow-clip" style={{ inset: '48.91% 72.37% 10.45% 6.2%' }}>
        <Piece inset="70.11% 36.88% 0 26.7%" name="5d79b" />
        <Piece inset="70.11% 36.88% 0 36.88%" name="a763c" />
        <Piece inset="71.16% 39.47% 3.43% 26.7%" name="7fe26" />
        <Piece inset="86.66% 49.67% 0.01% 26.7%" name="98e33" />
        <Piece inset="0 0 1.17% 2.58%" name="ad623" />
        <Piece inset="39.56% 0 0.22% 96.43%" name="13f3c" />
        <Piece inset="0 0.33% 59.1% 1.12%" name="0a231" />
        <Piece inset="1.09% 2.58% 0 0" name="f27ba" />
        <Piece inset="5.08% 6.51% 3.99% 3.93%" name="61b10" />
      </div>
      <Piece inset="44.41% 33.33% 27.18% 31.33%" name="aef57" />
      <Piece inset="35.41% 42.73% 43.27% 46.87%" name="ae85c" />
      <Piece inset="59.14% 77.87% 21.27% 10.27%" name="92cb7" />
      <Piece inset="73.23% 76.6% 19.27% 18.97%" name="e9cd4" />
      <Piece inset="64.64% 6.1% 7.36% 64.73%" name="93477" />
      <Piece inset="26.23% 64.7% 51.59% 11.53%" name="0d405" />
      <Piece inset="42.91% 45.27% 49.68% 49.33%" name="a9a89" />
      <Piece inset="20.36% 69.47% 57.23% 14.63%" name="d7e00" />
      <Piece inset="54.32% 46.63% 34.41% 37.17%" name="ca724" />
      <Piece inset="7.18% 7.93% 48.27% 57.63%" name="212ee" />
    </div>
  )
}

export function LoginScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { setUser, setRole } = useUserContext()

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const user = await api.login(email, password)
      setUser(user)
      setRole(user.role)
      // Admins land on /admin and riders on /rider
      navigate(`/${user.role}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-brand-tint lg:grid-cols-[708fr_732fr]">
      <section className="hidden flex-col justify-center gap-[70px] px-[60px] py-10 lg:flex">
        <LoginIllustration />
        <div className="flex max-w-[563px] flex-col gap-8">
          <div className="flex items-center gap-3">
            <img src={smartrackLogo} alt="Smartrack" />  
          </div>
          <p className="text-lg">
            Track every delivery with confidence from pickup to destination. Get real-time rider updates, route
            alerts, and delivery details all in one place.
          </p>
        </div>
      </section>

      <section className="flex flex-col justify-center gap-8 bg-surface/85 px-6 py-10 backdrop-blur-[4px] sm:px-[54px]">
        <div className="flex flex-col items-start gap-2.5">
          <img src={smartrackLogo} alt="Smartrack" className='h-4' />
          <h1 className="font-display text-[42px] font-semibold text-brand">Welcome Back!</h1>
          <p className="text-lg">Login to access your account.</p>
        </div>
        <form onSubmit={onSubmit} className="flex w-full max-w-[617px] flex-col gap-10">
          <div className="flex flex-col gap-[30px]">
            <TextField
              large
              label="Enter email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email@user.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              leading={<img src={envelope} alt="" />}
            />
            <TextField
              large
              label="Enter password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              leading={
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((shown) => !shown)}
                >
                  <img src={eye} alt="" />
                </button>
              }
            />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            LOGIN
          </Button>
          {/* Riders can't sign themselves up; their admin creates the account. */}
          <span className="text-center text-muted">
            Managing deliveries?{' '}
            <Link to="/register" className="text-brand underline">
              Create an admin account
            </Link>
          </span>
        </form>
      </section>
    </main>
  )
}
