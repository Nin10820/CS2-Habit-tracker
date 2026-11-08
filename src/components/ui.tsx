import type { ReactNode } from "react"

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5 ${className}`}>{children}</section>
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
