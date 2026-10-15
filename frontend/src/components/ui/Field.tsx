import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import caretDown from '../../assets/icons/caret-down.svg'

const box =
  'flex w-full gap-2 rounded-field border-[0.4px] border-line bg-field p-2.5 focus-within:border-muted'
const control = 'min-w-0 flex-1 bg-transparent text-black outline-none placeholder:text-muted'

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="group flex w-full flex-col gap-2">
      <span className="text-sm text-muted group-focus-within:text-black">{label}</span>
      {children}
    </label>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Rendered before the input, e.g. an icon. */
  leading?: ReactNode
  /** Rendered after the input, e.g. an inline action. */
  trailing?: ReactNode
  /** Larger variant used on the login screens. */
  large?: boolean
}

export function TextField({ label, leading, trailing, large, ...props }: TextFieldProps) {
  return (
    <FieldShell label={label}>
      <div className={`${box} items-center ${large ? 'h-[65px] text-lg' : 'h-[47px] text-base'}`}>
        {leading}
        <input className={control} {...props} />
        {trailing}
      </div>
    </FieldShell>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: string[]
  placeholder?: string
}

export function SelectField({ label, options, placeholder, ...props }: SelectFieldProps) {
  return (
    <FieldShell label={label}>
      <div className={`${box} relative h-[47px] items-center text-base`}>
        <select className={`${control} appearance-none pr-8 invalid:text-muted`} {...props}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option} value={option} className="text-black">
              {option}
            </option>
          ))}
        </select>
        <img src={caretDown} alt="" className="pointer-events-none absolute right-2.5" />
      </div>
    </FieldShell>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function TextAreaField({ label, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell label={label}>
      <div className={`${box} h-[116px] text-base`}>
        <textarea className={`${control} resize-none`} {...props} />
      </div>
    </FieldShell>
  )
}
