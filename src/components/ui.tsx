import { CaretUp, Plus } from "@phosphor-icons/react"
import type { ReactNode } from "react"

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
