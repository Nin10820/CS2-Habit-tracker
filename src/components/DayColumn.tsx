import { Check, Plus } from "@phosphor-icons/react"
import { dayOfMonth, formatDow, type DayKey } from "../lib/date"
import { fmtMinutes } from "../lib/stats"
import { colorVar, type DayItem } from "../lib/types"
import { Bar } from "./ui"

/** One day: header with progress, "Add task", then the day's habits and tasks as cards. */
export function DayColumn({
  day,
  today,
  items,
  onToggle,
  onAdd,
  onEdit,
  className = "",
}: {
  day: DayKey
  today: DayKey
  items: DayItem[]
  onToggle: (item: DayItem) => void
  onAdd: () => void
  onEdit: (item: DayItem) => void
  className?: string
}) {
  const isToday = day === today
  const future = day > today
  const done = items.filter((i) => i.done).length

  return (
    <section data-day={day} aria-label={`${formatDow(day)} ${dayOfMonth(day)}`} className={`flex flex-col gap-2 ${className}`}>
      <header className={`rounded-2xl px-4 py-3 ${isToday ? "bg-accent-soft" : "bg-surface-2"}`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={`font-title text-sm font-semibold ${isToday ? "text-accent" : "text-ink-2"}`}>{isToday ? "Today" : formatDow(day)}</p>
            <p className="font-title text-3xl leading-none font-semibold">{dayOfMonth(day)}</p>
          </div>
          <div className="w-24 shrink-0 text-right">
            <p className="text-xs font-medium text-ink-2">
              {done} / {items.length} tasks
            </p>
            <div className="mt-1.5">
              <Bar value={items.length ? done / items.length : 0} />
            </div>
          </div>
        </div>
      </header>

      <button
        onClick={onAdd}
        className="press flex h-10 items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-sm font-semibold text-ink-2"
      >
        <Plus size={16} weight="bold" /> Add task
      </button>

      {items.length === 0 && <p className="px-1 py-3 text-center text-xs text-ink-3">Nothing planned.</p>}

      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <TaskCard key={`${i.kind}-${i.id}`} item={i} future={future} onToggle={() => onToggle(i)} onEdit={() => onEdit(i)} />
        ))}
      </ul>
    </section>
  )
}

function TaskCard({ item, future, onToggle, onEdit }: { item: DayItem; future: boolean; onToggle: () => void; onEdit: () => void }) {
  const Icon = item.group.icon
  // Habits toggle from anywhere on the card; one-off tasks open their editor, and the circle toggles.
  const onBody = item.kind === "task" ? onEdit : future ? undefined : onToggle

  return (
    <li
      style={{ ["--hc" as string]: colorVar(item.group.color) }}
      className="relative flex overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
    >
      <span className="hc-fill w-1 shrink-0 opacity-70" aria-hidden />
      <button
        onClick={onBody}
        disabled={!onBody}
        className="min-w-0 flex-1 py-3 pr-1 pl-3 text-left"
        aria-label={item.kind === "task" ? `Edit ${item.name}` : undefined}
      >
        {(item.time || item.minutes) && (
          <span className="flex items-center gap-2 text-xs text-ink-3">
            {item.time && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-semibold text-ink-2 tabular-nums">{item.time}</span>}
            {fmtMinutes(item.minutes)}
          </span>
        )}
        <span className={`mt-1.5 block font-semibold leading-snug ${item.done ? "text-ink-3 line-through decoration-1" : ""}`}>{item.name}</span>
        <span className="hc-soft mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-ink-2">
          <Icon size={12} className="hc-text" /> {item.group.label}
          {item.kind === "task" && <span className="text-ink-3">· one-off</span>}
        </span>
      </button>
      <button
        onClick={onToggle}
        disabled={future}
        aria-pressed={item.done}
        aria-label={future ? `${item.name}: can't tick a future day` : item.done ? `Mark ${item.name} not done` : `Mark ${item.name} done`}
        className="grid w-12 shrink-0 place-items-center disabled:opacity-35"
      >
        <span
          className={`grid size-7 place-items-center rounded-full border-2 transition-colors ${
            item.done ? "hc-fill border-transparent text-white" : "border-line"
          }`}
        >
          {item.done && <Check size={14} weight="bold" className="pop" />}
        </span>
      </button>
    </li>
  )
}
