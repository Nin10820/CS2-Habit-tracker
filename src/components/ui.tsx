import { CaretUp, Plus } from "@phosphor-icons/react"
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react"

const pad2 = (n: number) => String(n).padStart(2, "0")

/**
 * A time picker made of two number fields, hour (1–12) and minute (00–59), plus a quiet AM/PM
 * switch. `value` and `onChange` use 24-hour "HH:MM". ↑/↓ step a field; typing the hour moves on to
 * the minutes. Unlike the browser's time field, it never cuts off and reads the same everywhere.
 */
export function TimeField({ id, value, onChange, label = "Time" }: { id?: string; value: string; onChange: (v: string) => void; label?: string }) {
  const set = /^\d\d:\d\d$/.test(value)
  const h24 = set ? Number(value.slice(0, 2)) : 0
  const min = set ? Number(value.slice(3, 5)) : 0
  const pm = set && h24 >= 12
  const h12 = h24 % 12 || 12
  // What's typed while a field has focus; null shows the value.
  const [hText, setHText] = useState<string | null>(null)
  const [mText, setMText] = useState<string | null>(null)
  const minutes = useRef<HTMLInputElement>(null)

  const emit = (h: number, m: number, isPm: boolean) => onChange(`${pad2((h % 12) + (isPm ? 12 : 0))}:${pad2(m)}`)
  const wrap = (n: number, lo: number, hi: number) => (n < lo ? hi : n > hi ? lo : n)
  const step = (e: KeyboardEvent<HTMLInputElement>, field: "h" | "m") => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return
    e.preventDefault()
    const d = e.key === "ArrowUp" ? 1 : -1
    if (field === "h") {
      setHText(null)
      emit(wrap(h12 + d, 1, 12), min, pm)
    } else {
      setMText(null)
      emit(h12, wrap(min + d * (e.shiftKey ? 10 : 1), 0, 59), pm)
    }
  }
  const field = "w-[2.2ch] bg-transparent text-center font-title text-lg font-semibold text-ink tabular-nums outline-none placeholder:text-ink-3"
  const half = (isPm: boolean) =>
    `rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${pm === isPm && set ? "bg-surface text-ink-2 shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-ink-3"}`

  return (
    <div role="group" aria-label={label} className="flex h-11 shrink-0 items-center gap-0.5 rounded-xl border border-line bg-bg pr-1 pl-2.5 focus-within:border-accent">
      <input
        id={id}
        inputMode="numeric"
        aria-label="Hour"
        placeholder="--"
        maxLength={2}
        value={hText ?? (set ? String(h12) : "")}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => setHText(null)}
        onKeyDown={(e) => step(e, "h")}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, "").slice(0, 2)
          setHText(t)
          const n = Number(t)
          if (t && n >= 1 && n <= 12) emit(n, min, pm)
          // "1" could still become 10–12; anything else is a whole hour, so go on to minutes.
          if (t.length === 2 || (t && n > 1)) minutes.current?.focus()
        }}
        className={field}
      />
      <span className="font-title text-lg font-semibold text-ink-3">:</span>
      <input
        ref={minutes}
        inputMode="numeric"
        aria-label="Minute"
        placeholder="--"
        maxLength={2}
        value={mText ?? (set ? pad2(min) : "")}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => setMText(null)}
        onKeyDown={(e) => step(e, "m")}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, "").slice(0, 2)
          setMText(t)
          const n = Number(t)
          if (t && n <= 59) emit(h12, n, pm)
        }}
        className={field}
      />
      <span className="ml-1.5 flex rounded-lg bg-surface-2 p-0.5">
        <button type="button" aria-pressed={set && !pm} onClick={() => emit(h12, min, false)} className={half(false)}>
          AM
        </button>
        <button type="button" aria-pressed={pm} onClick={() => emit(h12, min, true)} className={half(true)}>
          PM
        </button>
      </span>
    </div>
  )
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-card-line bg-surface p-4 ${className}`}>{children}</section>
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold">{children}</h2>
      {right}
    </div>
  )
}

export function Bar({ value, color = "var(--accent)" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  )
}

/** Small progress ring for a day's completion. */
export function Ring({ value, size = 28, stroke = 3 }: { value: number | null; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      {value !== null && value > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * value} ${c}`}
          className="transition-[stroke-dasharray] duration-300"
        />
      )}
    </svg>
  )
}

/**
 * Section heading of the side panel: a pill with the name and count that folds the list,
 * plus small actions on the right.
 */
export function PillHeader({
  label,
  count,
  open,
  onToggle,
  icon,
  tinted = false,
  children,
}: {
  label: ReactNode
  count?: string
  open: boolean
  onToggle: () => void
  /** Small icon before the name. */
  icon?: ReactNode
  /** Fill with the group's soft color (needs --hc set on a parent) instead of plain grey. */
  tinted?: boolean
  /** Actions on the right (add, edit, open…). */
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`press flex min-w-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium tracking-[0.5px] text-ink uppercase ${tinted ? "hc-soft" : "bg-surface-2"}`}
      >
        {icon}
        <span className="truncate">{label}</span>
        {count && <span className="shrink-0 tabular-nums">({count})</span>}
        <CaretUp size={12} weight="bold" className={`shrink-0 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
      {children && <div className="flex shrink-0 items-center gap-1">{children}</div>}
    </div>
  )
}

/** Small round action next to a PillHeader. */
export const pillAction = "press grid size-7 place-items-center rounded-full bg-surface-2 text-ink-2"

/** Empty state under a side panel heading: a dashed box with a hint and a + on the right. */
export function DashedEmpty({ text, onAdd, addLabel }: { text: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="flex h-10 items-center justify-between rounded-2xl border-2 border-dashed border-line pr-2 pl-3 text-sm text-ink-3">
      <span className="truncate">{text}</span>
      {onAdd && (
        <button onClick={onAdd} aria-label={addLabel ?? "Add"} title={addLabel} className="press grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3">
          <Plus size={13} weight="bold" />
        </button>
      )}
    </div>
  )
}

/** A rounded row in the side panel lists: round icon on the left, then the content. */
export const listRow = "flex min-h-[50px] items-center gap-3 rounded-2xl bg-surface py-2.5 pr-3.5 pl-2 shadow-card"
