import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'navy' | 'outline' | 'ghost' | 'neutral'
type Size = 'auto' | 'sm' | 'md' | 'md-compact' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white font-display rounded-card hover:brightness-95',
  navy: 'bg-navy text-white font-sans font-medium rounded-card hover:brightness-110',
  outline: 'bg-white border border-brand text-brand font-display rounded-card hover:bg-brand-tint',
  ghost: 'text-ink font-display rounded-card hover:bg-black/5',
  neutral: 'bg-white border-[0.4px] border-muted text-black font-display font-semibold rounded-xl hover:bg-field',
}

const sizes: Record<Size, string> = {
  // Stretches to its row; used by the secondary modal action.
  auto: 'min-h-[42px] text-lg',
  sm: 'h-12 text-lg',
  md: 'h-[55px] text-[22px] font-semibold',
  'md-compact': 'h-[55px] text-lg font-semibold',
  lg: 'h-[78px] text-[22px] font-semibold drop-shadow-[0_4px_2px_rgba(255,55,0,0.25)]',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center gap-2.5 px-5 py-2.5 whitespace-nowrap transition disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}
