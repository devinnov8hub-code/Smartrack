import admin1 from '../assets/illustrations/banner/admin-1.svg'
import admin2 from '../assets/illustrations/banner/admin-2.svg'
import admin3 from '../assets/illustrations/banner/admin-3.svg'
import admin4 from '../assets/illustrations/banner/admin-4.svg'
import rider1 from '../assets/illustrations/banner/rider-1.svg'
import rider2 from '../assets/illustrations/banner/rider-2.svg'
import rider3 from '../assets/illustrations/banner/rider-3.svg'
import rider4 from '../assets/illustrations/banner/rider-4.svg'
import texture from '../assets/images/banner-texture.png'
import type { Role } from '../types'

// The map illustration is four layered SVGs positioned by inset inside a 329x220 frame.
const insets = [
  '30% 65.83% 29.75% 21.25%',
  '29.38% 34.75% 29.5% 27.58%',
  '39.13% 17.58% 20.88% 48.67%',
  '22% 55.83% 53.25% 32.42%',
]

const layers: Record<Role, string[]> = {
  admin: [admin1, admin2, admin3, admin4],
  rider: [rider1, rider2, rider3, rider4],
}

interface WelcomeBannerProps {
  role: Role
  name?: string
  message: string
}

export function WelcomeBanner({ role, name, message }: WelcomeBannerProps) {
  return (
    <section
      className={`relative w-full shrink-0 overflow-clip rounded-card ${role === 'rider' ? 'h-[205px]' : 'h-[159px]'}`}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(245deg, rgb(255, 92, 47) 16.126%, rgba(255, 104, 62, 0.77) 100.66%)' }}
      />
      <img src={texture} alt="" className="absolute inset-0 size-full object-cover opacity-[0.08]" />
      <div className="absolute top-[28px] left-[26px] flex w-[563px] max-w-[calc(100%-52px)] flex-col gap-3 text-white">
        <h1 className="font-display text-[28px] font-semibold">Welcome Back{name ? `, ${name}` : ''}</h1>
        <p className="text-lg">{message}</p>
      </div>
      <div aria-hidden className="absolute top-[33px] -right-[92px] hidden h-[220px] w-[329px] overflow-clip md:block">
        {layers[role].map((src, index) => (
          <div key={src} className="absolute" style={{ inset: insets[index] }}>
            <img src={src} alt="" className="block size-full max-w-none" />
          </div>
        ))}
      </div>
    </section>
  )
}
