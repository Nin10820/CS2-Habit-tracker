import { X } from "@phosphor-icons/react"
import { useEffect, useRef, type ReactNode } from "react"

/**
 * Bottom sheet on phones, centred dialog from 640px up. Closes on Esc and backdrop click.
 * `wide` is for reading: a larger panel whose body scrolls, with `header` shown above the title.
 * `page` is a wide panel with no title bar, just a floating close button: the content is the page.
 */
export function Sheet({
  title,
  onClose,
  children,
  wide = false,
  page = false,
  header,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  page?: boolean
  header?: ReactNode
}) {
  if (page) wide = true
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current()
    window.addEventListener("keydown", onKey)
    // Forms focus their first field; a reading panel focuses itself so it doesn't jump to a link.
    const first = wide ? panel.current : panel.current?.querySelector<HTMLElement>("input, button:not([data-close])")
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
        tabIndex={wide ? -1 : undefined}
        className={`sheet-in relative w-full rounded-t-3xl bg-surface shadow-card outline-none sm:rounded-3xl ${page ? "overflow-hidden" : ""} ${
          wide
            ? "flex max-h-[92dvh] max-w-3xl flex-col sm:max-h-[88dvh]"
            : "max-w-md px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:pb-5"
        }`}
      >
        {page ? (
          <button
            data-close
            onClick={onClose}
            aria-label="Close"
            className="press absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-surface/80 text-ink-2 backdrop-blur"
          >
            <X size={18} weight="bold" />
          </button>
        ) : (
        <div
          className={`flex justify-between gap-3 ${wide ? "shrink-0 items-start border-b border-line px-5 pt-5 pb-4 sm:px-8 sm:pt-6" : "mb-4 items-center"}`}
        >
          <div className="min-w-0">
            {header}
            <h2 className={`font-semibold ${wide ? "text-2xl" : "text-lg"}`}>{title}</h2>
          </div>
          <button
            data-close
            onClick={onClose}
            aria-label="Close"
            className="press grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        )}
        {page ? (
          <div className="min-h-0 overflow-y-auto pb-[max(24px,env(safe-area-inset-bottom))]">{children}</div>
        ) : wide ? (
          <div className="min-h-0 overflow-y-auto px-5 pt-4 pb-[max(24px,env(safe-area-inset-bottom))] sm:px-8 sm:pb-8">{children}</div>
        ) : (
          children
        )}
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
