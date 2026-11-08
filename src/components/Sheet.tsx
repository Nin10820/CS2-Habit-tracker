import { X } from "@phosphor-icons/react"
import { useEffect, useRef, type ReactNode } from "react"

/** Bottom sheet on phones, centred dialog from 640px up. Closes on Esc and backdrop click. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current()
    window.addEventListener("keydown", onKey)
    const first = panel.current?.querySelector<HTMLElement>("input, button:not([data-close])")
    first?.focus()
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
      prev?.focus?.()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-in relative w-full max-w-md rounded-t-3xl bg-surface px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-card sm:rounded-3xl sm:pb-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            data-close
            onClick={onClose}
            aria-label="Close"
            className="press grid size-9 place-items-center rounded-full bg-surface-2 text-ink-2"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="text-ink-2">{body}</p>
      <div className="mt-6 flex gap-3">
        <button onClick={onClose} className="press h-12 flex-1 rounded-2xl bg-surface-2 font-semibold">
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className="press h-12 flex-1 rounded-2xl bg-danger font-semibold text-white"
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
