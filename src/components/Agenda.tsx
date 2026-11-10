import type { KeyboardEvent, ReactNode } from "react"
import { dragScroll } from "../lib/dragScroll"
import { dayOfMonth, formatDow, type DayKey } from "../lib/date"
import { groupDefs, itemsForDay } from "../lib/stats"
import { colorVar, type AppData, type DayItem, type GroupDef } from "../lib/types"
import { capFirst, CheckCircle, fmtMinutes } from "./DayColumn"

/**
 * Agenda: one row per day, one column per group. "Other" comes first and holds every stand-alone
 * action and one-off task; then your groups in their order. Each cell is the group's card for that
 * day: its name and count on a soft band, then the items (click a name to focus, the circle ticks).
 */
export function Agenda({
  data,
  days,
  today,
  onToggle,
  onFocus,
  focusKey,
}: {
  data: AppData
  days: DayKey[]
  today: DayKey
  onToggle: (item: DayItem, day: DayKey) => void
  onFocus: (item: DayItem, day: DayKey) => void
  /** "day:kind:id" of the focused item, to highlight it. */
  focusKey?: string
}) {
  const defs = groupDefs(data)
  const other = data.groups.find((g) => g.standalone)
  const columns: { def: GroupDef; has: (i: DayItem) => boolean }[] = [
    // Other: the stand-alone list plus one-off tasks in no group.
    ...(other ? [{ def: defs.get(other.id)!, has: (i: DayItem) => i.group.standalone === true }] : []),
    ...data.groups.filter((g) => !g.standalone).map((g) => ({ def: defs.get(g.id)!, has: (i: DayItem) => i.group.id === g.id })),
  ]

  return (
    <div {...dragScroll()} className="cursor-grab overflow-x-auto px-4 pt-4 pb-[calc(var(--player-space)+16px)] xl:min-h-0 xl:flex-1 xl:overflow-auto">
      <div className="grid items-start gap-x-4 gap-y-5" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(260px, 1fr))` }}>
        {days.map((d) => {
          const items = itemsForDay(data, d)
          const isToday = d === today
          return (
            <Row key={d}>
              {/* Day: weekday over the date; today in a soft box. */}
              <div className={`sticky left-0 z-10 flex flex-col items-center rounded-2xl py-2 ${isToday ? "bg-surface-2" : "bg-bg"}`}>
                <span className={`text-[11px] font-semibold tracking-[1px] uppercase ${isToday ? "text-accent" : "text-ink-2"}`}>{formatDow(d)}</span>
                <span className="font-title text-[22px] leading-7 font-medium tabular-nums">{String(dayOfMonth(d)).padStart(2, "0")}</span>
              </div>
              {columns.map(({ def, has }) => (
                <Cell
                  key={def.id}
                  group={def}
                  items={items.filter(has)}
                  future={d > today}
                  focusKey={focusKey}
                  day={d}
                  onToggle={(i) => onToggle(i, d)}
                  onFocus={(i) => onFocus(i, d)}
                />
              ))}
            </Row>
          )
        })}
      </div>
    </div>
  )
}

/** A day's cells sit straight in the grid; this just groups them for reading the code. */
const Row = ({ children }: { children: ReactNode }) => <>{children}</>

function Cell({
  group,
  items,
  future,
  day,
  focusKey,
  onToggle,
  onFocus,
}: {
  group: GroupDef
  items: DayItem[]
  future: boolean
  day: DayKey
  focusKey?: string
  onToggle: (item: DayItem) => void
  onFocus: (item: DayItem) => void
}) {
  const Icon = group.icon
  const done = items.filter((i) => i.done).length
  const press = (i: DayItem) => ({
    role: "button" as const,
    tabIndex: 0,
    onClick: () => onFocus(i),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onFocus(i)
      }
    },
  })

  return (
    <section style={{ ["--hc" as string]: colorVar(group.color) }} className="overflow-hidden rounded-2xl border border-card-line bg-surface" aria-label={`${group.label}, ${formatDow(day)}`}>
      <div className="hc-soft flex items-center gap-2 px-3.5 py-2.5">
        <Icon size={15} className="hc-text shrink-0" aria-hidden />
        <span className="hc-ink min-w-0 truncate text-[13px] font-semibold">{capFirst(group.label)}</span>
        <span className="shrink-0 text-xs text-ink-2 tabular-nums">({items.length ? `${done}/${items.length}` : 0})</span>
      </div>
      {items.length === 0 ? (
        <p className="px-3.5 py-4 text-center text-xs text-ink-3">Nothing planned</p>
      ) : (
        <ul className="divide-y divide-card-line">
          {items.map((i) => {
            const focused = focusKey === `${day}:${i.kind}:${i.id}`
            const ItemIcon = i.group.icon
            return (
              <li key={`${i.kind}-${i.id}`} style={{ ["--hc" as string]: colorVar(i.group.color) }} className={`flex items-center gap-3 px-3.5 py-3 ${focused ? "shadow-[inset_3px_0_0_var(--accent)]" : ""}`}>
                <span className="hc-soft grid size-7 shrink-0 place-items-center rounded-full" aria-hidden>
                  <ItemIcon size={14} className="hc-text" />
                </span>
                <div {...press(i)} aria-current={focused ? "true" : undefined} title="Focus on this" className="min-w-0 flex-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <span className={`block text-[13.5px] leading-5 font-[550] break-words ${i.done ? "text-ink-3 line-through" : ""}`}>{i.name}</span>
                  {i.minutes ? <span className="mt-0.5 block text-xs leading-4 text-ink-3 tabular-nums">{i.time ? `${i.time} · ` : ""}{fmtMinutes(i.minutes)}</span> : i.time ? <span className="mt-0.5 block text-xs leading-4 text-ink-3 tabular-nums">{i.time}</span> : null}
                </div>
                <CheckCircle item={i} future={future} onToggle={() => onToggle(i)} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
