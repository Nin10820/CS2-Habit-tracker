import { Check, PencilSimple, Plus } from "@phosphor-icons/react"
import { dayOfMonth, formatDow, type DayKey } from "../lib/date"
import { fmtDuration } from "../lib/stats"
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
  onFocus,
  focusKey,
  className = "",
  grid = false,
}: {
  day: DayKey
  today: DayKey
  items: DayItem[]
  onToggle: (item: DayItem) => void
  onAdd: () => void
  onEdit: (item: DayItem) => void
  /** Clicking a card puts it in the Quick timer. */
  onFocus: (item: DayItem) => void
  /** "day:kind:id" of the focused item, to highlight it. */
  focusKey?: string
  className?: string
  /** Day view: lay the cards out in a grid instead of one column. */
  grid?: boolean
}) {
  const isToday = day === today
  const future = day > today
  const done = items.filter((i) => i.done).length

  return (
    <section data-day={day} aria-label={`${formatDow(day)} ${dayOfMonth(day)}`} className={`flex flex-col gap-2 ${className}`}>
      <header className={`rounded-2xl px-3 py-3 sm:px-4 ${isToday ? "bg-accent-soft" : "bg-surface-2"}`}>
        <div className="flex items-end justify-between gap-2">
          <div className="shrink-0">
            <p className={`font-title text-sm font-semibold ${isToday ? "text-accent" : "text-ink-2"}`}>{isToday ? "Today" : formatDow(day)}</p>
            <p className="font-title text-3xl leading-none font-semibold">{dayOfMonth(day)}</p>
          </div>
          <div className="min-w-0 max-w-24 flex-1 text-right">
            <p className="truncate text-xs font-medium text-ink-2">
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

      <ul className={grid ? "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3" : "flex flex-col gap-2"}>
        {items.map((i) => (
          <TaskCard
            key={`${i.kind}-${i.id}`}
            item={i}
            future={future}
            focused={focusKey === `${day}:${i.kind}:${i.id}`}
            onToggle={() => onToggle(i)}
            onEdit={() => onEdit(i)}
            onFocus={() => onFocus(i)}
          />
        ))}
      </ul>
    </section>
  )
}

function TaskCard({
  item,
  future,
  focused,
  onToggle,
  onEdit,
  onFocus,
}: {
  item: DayItem
  future: boolean
  focused: boolean
  onToggle: () => void
  onEdit: () => void
  onFocus: () => void
}) {
  const Icon = item.group.icon
  const chip = "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums whitespace-nowrap"

  // Layout: time ··· duration / title / tick + group icon (or edit, for one-off tasks) ··· # group.
  // The card body puts it in the Quick timer; the circle ticks it.
  return (
    <li
      style={{ ["--hc" as string]: colorVar(item.group.color) }}
      className={`rounded-xl border bg-surface shadow-card ${focused ? "border-transparent ring-2 ring-accent" : "border-line"}`}
    >
      <button onClick={onFocus} aria-current={focused ? "true" : undefined} title="Focus on this" className="block w-full px-3 pt-3 text-left">
        {(item.time || item.minutes) && (
          <span className="flex items-center gap-2">
            {item.time && <span className={`${chip} hc-soft text-ink`}>{item.time}</span>}
            {item.minutes && <span className={`${chip} ml-auto bg-surface-2 text-ink-2`}>{fmtDuration(item.minutes)}</span>}
          </span>
        )}
        <span className={`mt-2 block font-semibold leading-snug break-words ${item.done ? "text-ink-3" : ""}`}>{item.name}</span>
      </button>
      <div className="flex items-center gap-2 px-3 pt-2 pb-3">
        <button
          onClick={onToggle}
          disabled={future}
          aria-pressed={item.done}
          aria-label={future ? `${item.name}: can't tick a future day` : item.done ? `Mark ${item.name} not done` : `Mark ${item.name} done`}
          className="-m-2 grid shrink-0 place-items-center p-2 disabled:opacity-35"
        >
          <span
            className={`grid size-6 place-items-center rounded-full border-2 transition-colors ${
              item.done ? "hc-fill border-transparent text-white" : "border-line text-ink-3"
            }`}
          >
            <Check size={12} weight="bold" className={item.done ? "pop" : "opacity-60"} />
          </span>
        </button>
        {item.kind === "task" ? (
          <button onClick={onEdit} aria-label={`Edit ${item.name}`} title="Edit task" className="press -m-1.5 grid shrink-0 place-items-center rounded-full p-1.5 text-ink-3">
            <PencilSimple size={15} />
          </button>
        ) : (
          <Icon size={15} className="hc-text shrink-0" aria-hidden />
        )}
        <span className="ml-auto min-w-0 truncate text-xs text-ink-3" title={item.group.label}>
          <span className="hc-text font-semibold">#</span>
          {item.group.label}
          {item.kind === "task" && " · one-off"}
        </span>
      </div>
    </li>
  )
}
