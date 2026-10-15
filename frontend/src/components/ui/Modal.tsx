import { useEffect, type ReactNode } from 'react'
import closeIcon from '../../assets/icons/close.svg'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Action buttons; laid out in a row, each sharing the width equally. */
  footer: ReactNode
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-full w-[676px] max-w-full flex-col overflow-y-auto rounded-card border border-modal-line bg-white"
      >
        <header className="flex items-center justify-between border-b-[0.4px] border-line px-5 py-3">
          <h2 className="font-display text-[22px] font-semibold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            <img src={closeIcon} alt="" />
          </button>
        </header>
        {children}
        <footer className="flex items-stretch gap-[23px] border-t-[0.4px] border-line px-5 py-2.5 *:flex-1">
          {footer}
        </footer>
      </div>
    </div>
  )
}

/** Plain text body used by the confirmation / error modals. */
export function ModalMessage({ children }: { children: ReactNode }) {
  return <p className="min-h-[108px] w-full px-5 py-3.5 text-lg">{children}</p>
}
