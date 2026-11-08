import { ArrowCounterClockwise, Check, PencilSimple, Plus } from "@phosphor-icons/react"
import { Fragment } from "react"
import { dayOfMonth, formatDow, type DayKey } from "../lib/date"
import { fmtDuration } from "../lib/stats"
import { colorVar, type DayBlock, type DayItem } from "../lib/types"
import { Bar } from "./ui"

type ItemHandlers = {
  onToggle: (item: DayItem) => void
  onEdit: (item: DayItem) => void
  /** Clicking an item puts it in the Quick timer. */
  onFocus: (item: DayItem) => void
}

/** One day: header with progress, "Add task", then the day's cards (group cards and single cards). */
export function DayColumn({
  day,
  today,
  blocks,
  onToggle,
  onAdd,
  onEdit,
  onFocus,
  onSetTime,
  focusKey,
  className = "",
  now,
}: ItemHandlers & {
  day: DayKey
  today: DayKey
  blocks: DayBlock[]
  onAdd: () => void
  /** Change a card's time for this day; null goes back to the expected time. */
  onSetTime: (key: string, time: string | null) => void
  /** "day:kind:id" of the focused item, to highlight it. */
  focusKey?: string
  className?: string
  /** Current "HH:MM". When given and this is today, a "Now" line sits between past and upcoming cards. */
  now?: string
}) {
  const isToday = day === today
  const future = day > today
  const items = blocks.flatMap((b) => (b.kind === "group" ? b.items : [b.item]))
  const done = items.filter((i) => i.done).length
  // Untimed cards sort last, so they fall after the line.
  const nowAt = now && isToday ? blocks.findIndex((b) => (b.time ?? "99:99") > now) : -2
  const marker = nowAt === -2 ? -1 : nowAt === -1 ? blocks.length : nowAt
  const handlers: ItemHandlers = { onToggle, onEdit, onFocus }
  const isFocused = (i: DayItem) => focusKey === `${day}:${i.kind}:${i.id}`

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

      {blocks.length === 0 && <p className="px-1 py-3 text-center text-xs text-ink-3">Nothing planned.</p>}

      <ul className="flex flex-col gap-2">
        {blocks.map((b, idx) => (
          <Fragment key={b.key}>
            {idx === marker && <NowMarker time={now!} />}
            {b.kind === "group" ? (
              <GroupBlock block={b} future={future} isFocused={isFocused} onSetTime={(t) => onSetTime(b.key, t)} {...handlers} />
            ) : (
              <SingleBlock block={b} future={future} focused={isFocused(b.item)} onSetTime={(t) => onSetTime(b.key, t)} {...handlers} />
            )}
          </Fragment>
        ))}
        {marker === blocks.length && blocks.length > 0 && <NowMarker time={now!} />}
      </ul>
    </section>
  )
}

/** Thin line with the current time, between what's past and what's next. */
function NowMarker({ time }: { time: string }) {
  return (
    <li aria-label={`Now, ${time}`} className="flex items-center gap-2 py-0.5">
      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-on-accent tabular-nums">Now · {time}</span>
      <span className="h-0.5 flex-1 rounded-full bg-accent" aria-hidden />
    </li>
  )
}

const chip = "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums whitespace-nowrap"

/**
 * The card's time. It's only the expected time: click to change it for this day.
 * When changed, ↺ goes back to the expected one.
 */
function TimeChip({ time, expected, onChange }: { time?: string; expected?: string; onChange: (t: string | null) => void }) {
  const changed = !!time && time !== expected
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {/* The chip shows 24-hour text; an invisible time field on top opens the browser's picker
          (the field's own display follows the OS locale, often 12-hour). */}
      <span
        title={changed ? `Changed for this day · expected ${expected}` : "Expected time · click to change"}
        className={`relative hc-soft ${chip} text-ink focus-within:ring-2 focus-within:ring-accent ${changed ? "ring-1 ring-current" : ""}`}
      >
        {time ?? "--:--"}
        <input
          type="time"
          value={time ?? ""}
          onChange={(e) => onChange(e.target.value && e.target.value !== expected ? e.target.value : null)}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker()
            } catch {
              /* older browsers: typing still works */
            }
          }}
          aria-label={expected ? `Time, expected ${expected}` : "Time"}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
      {changed && (
        <button
          onClick={() => onChange(null)}
          aria-label={`Back to expected time ${expected ?? ""}`}
          title={`Back to ${expected ?? "no time"}`}
          className="press grid size-6 place-items-center rounded-full text-ink-3"
        >
          <ArrowCounterClockwise size={13} weight="bold" />
        </button>
      )}
    </span>
  )
}

function CheckCircle({ item, future, onToggle, size = "size-6" }: { item: DayItem; future: boolean; onToggle: () => void; size?: string }) {
  return (
    <button
      onClick={onToggle}
      disabled={future}
      aria-pressed={item.done}
      aria-label={future ? `${item.name}: can't tick a future day` : item.done ? `Mark ${item.name} not done` : `Mark ${item.name} done`}
      className="-m-1.5 grid shrink-0 place-items-center p-1.5 disabled:opacity-35"
    >
      <span
        className={`grid ${size} place-items-center rounded-full border-2 transition-colors ${
          item.done ? "hc-fill border-transparent text-white" : "border-line text-ink-3"
        }`}
      >
        <Check size={11} weight="bold" className={item.done ? "pop" : "opacity-60"} />
      </span>
    </button>
  )
}

/** A group's card: time ··· total duration / group name ··· x/y / its items, each tickable and focusable. */
function GroupBlock({
  block,
  future,
  isFocused,
  onSetTime,
  onToggle,
  onEdit,
  onFocus,
}: ItemHandlers & {
  block: Extract<DayBlock, { kind: "group" }>
  future: boolean
  isFocused: (i: DayItem) => boolean
  onSetTime: (t: string | null) => void
}) {
  const { group, items } = block
  const Icon = group.icon
  const total = items.reduce((s, i) => s + (i.minutes ?? 0), 0)
  const done = items.filter((i) => i.done).length

  return (
    <li style={{ ["--hc" as string]: colorVar(group.color) }} className="rounded-xl border border-line bg-surface shadow-card">
      <div className="flex items-center gap-2 px-3 pt-3">
        <TimeChip time={block.time} expected={block.expected} onChange={onSetTime} />
        {total > 0 && <span className={`${chip} ml-auto bg-surface-2 text-ink-2`}>{fmtDuration(total)}</span>}
      </div>
      <div className="flex items-center gap-2 px-3 pt-2">
        <Icon size={16} className="hc-text shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-semibold">{group.label}</span>
        <span className="shrink-0 text-xs font-medium text-ink-3 tabular-nums">
          {done}/{items.length}
        </span>
      </div>
      <ul className="px-1.5 pt-1.5 pb-2">
        {items.map((i) => {
          const focused = isFocused(i)
          return (
            <li key={`${i.kind}-${i.id}`} className={`flex items-center gap-1 rounded-lg pl-1.5 ${focused ? "ring-2 ring-accent ring-inset" : ""}`}>
              <CheckCircle item={i} future={future} onToggle={() => onToggle(i)} size="size-5" />
              <button
                onClick={() => onFocus(i)}
                aria-current={focused ? "true" : undefined}
                title="Focus on this"
                className={`min-w-0 flex-1 py-1.5 pl-1.5 text-left text-sm leading-snug break-words ${i.done ? "text-ink-3" : ""}`}
              >
                {i.name}
              </button>
              {i.kind === "task" && (
                <button onClick={() => onEdit(i)} aria-label={`Edit ${i.name}`} title="Edit task" className="press grid size-7 shrink-0 place-items-center rounded-full text-ink-3">
                  <PencilSimple size={13} />
                </button>
              )}
              {i.minutes ? <span className="shrink-0 pr-1.5 text-[11px] text-ink-3 tabular-nums">{i.minutes}′</span> : null}
            </li>
          )
        })}
      </ul>
    </li>
  )
}

/** A standalone card: time ··· duration / name / tick + icon ··· # group. */
function SingleBlock({
  block,
  future,
  focused,
  onSetTime,
  onToggle,
  onEdit,
  onFocus,
}: ItemHandlers & {
  block: Extract<DayBlock, { kind: "single" }>
  future: boolean
  focused: boolean
  onSetTime: (t: string | null) => void
}) {
  const { item } = block
  const Icon = item.group.icon

  return (
    <li
      style={{ ["--hc" as string]: colorVar(item.group.color) }}
      className={`rounded-xl border bg-surface shadow-card ${focused ? "border-transparent ring-2 ring-accent" : "border-line"}`}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <TimeChip time={block.time} expected={block.expected} onChange={onSetTime} />
        {item.minutes ? <span className={`${chip} ml-auto bg-surface-2 text-ink-2`}>{fmtDuration(item.minutes)}</span> : null}
      </div>
      <button onClick={() => onFocus(item)} aria-current={focused ? "true" : undefined} title="Focus on this" className="block w-full px-3 pt-2 text-left">
        <span className={`block font-semibold leading-snug break-words ${item.done ? "text-ink-3" : ""}`}>{item.name}</span>
      </button>
      <div className="flex items-center gap-2 px-3 pt-2 pb-3">
        <CheckCircle item={item} future={future} onToggle={() => onToggle(item)} />
        {item.kind === "task" ? (
          <button onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`} title="Edit task" className="press -m-1.5 grid shrink-0 place-items-center rounded-full p-1.5 text-ink-3">
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
