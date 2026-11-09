import { ArrowCounterClockwise, Check, Clock, DotsThree, Moon, PencilSimple, Plus, Sun, SunHorizon } from "@phosphor-icons/react"
import { Fragment, useState, type DragEvent } from "react"
import { dayOfMonth, formatDow, type DayKey } from "../lib/date"
import { colorVar, type DayBlock, type DayItem, type RoutineItem } from "../lib/types"
import { dayPart, type DayPart } from "../lib/prefs"
import { ROUTINE_DRAG } from "./Routine"

type ItemHandlers = {
  onToggle: (item: DayItem) => void
  onEdit: (item: DayItem) => void
  /** Clicking an item puts it in the Quick timer. */
  onFocus: (item: DayItem) => void
}

/** One day: header with progress, "Add" (a group or a one-off task), then the day's cards (group cards and single cards). */
export function DayColumn({
  day,
  today,
  blocks,
  onToggle,
  onAdd,
  onEdit,
  onFocus,
  onFocusGroup,
  onGroupMenu,
  routine = [],
  onRoutine,
  onDropRoutine,
  onSetTime,
  focusKey,
  className = "",
  now,
  showHeader = true,
  dayParts = false,
}: ItemHandlers & {
  /** Split the cards into Morning / Afternoon / Evening / Anytime with a divider line (Settings). */
  dayParts?: boolean
  /** The weekday / date heading. Phones leave it out: their day strip above already shows it. */
  showHeader?: boolean
  day: DayKey
  today: DayKey
  blocks: DayBlock[]
  onAdd: () => void
  /** Clicking a group card's title puts the whole group in the Quick timer. */
  onFocusGroup: (groupId: string) => void
  onGroupMenu: (groupId: string) => void
  /** This day's routine moments and their logged times. */
  routine?: { item: RoutineItem; time?: string }[]
  onRoutine?: (item: RoutineItem) => void
  /** A routine moment dragged here from the Routine card. */
  onDropRoutine?: (id: string) => void
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
  // Highlight while a routine moment is dragged over this day.
  const [dropping, setDropping] = useState(false)
  const isRoutine = (e: DragEvent<HTMLElement>) => e.dataTransfer.types.includes(ROUTINE_DRAG)
  const isFocused = (i: DayItem) => focusKey === `${day}:${i.kind}:${i.id}`

  return (
    <section
      data-day={day}
      aria-label={`${formatDow(day)} ${dayOfMonth(day)}`}
      className={`@container flex flex-col gap-2 rounded-2xl transition-shadow ${dropping ? "ring-2 ring-accent ring-offset-4 ring-offset-bg" : ""} ${className}`}
      onDragOver={(e) => {
        if (!onDropRoutine || !isRoutine(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
        setDropping(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false)
      }}
      onDrop={(e) => {
        setDropping(false)
        const id = e.dataTransfer.getData(ROUTINE_DRAG)
        if (id && onDropRoutine) {
          e.preventDefault()
          onDropRoutine(id)
        }
      }}
    >
      {/* Flat day heading: weekday, then the date; today's date sits in a filled circle. */}
      {showHeader && (
      <header className="flex flex-col items-center pb-1">
        {/* Today sits in a soft box. */}
        <div className={`flex flex-col items-center rounded-2xl px-4 pt-2 pb-1 ${isToday ? "bg-surface-2" : ""}`}>
        <p className="text-[11px] font-medium tracking-[1px] text-ink uppercase">{formatDow(day)}</p>
        <p className="font-title text-xl leading-7 font-medium text-ink tabular-nums">
          {String(dayOfMonth(day)).padStart(2, "0")}
        </p>
        </div>
        <p className="mt-0.5 text-[11px] font-medium text-ink-3 tabular-nums" title={`${done} of ${items.length} tasks done`}>
          {items.length ? `${done}/${items.length} done` : "\u00a0"}
        </p>
      </header>
      )}

      {routine.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Routine">
          {routine.map(({ item, time }) => {
            const Icon = item.when === "morning" ? SunHorizon : Moon
            return (
              <button
                key={item.id}
                onClick={() => onRoutine?.(item)}
                // On a future day only the moments you added can be opened (to take them off again).
                disabled={future && item.daily}
                title={time ? `${item.name} at ${time}` : `Log ${item.name}`}
                aria-label={time ? `${item.name} at ${time}` : `Log ${item.name}`}
                className={`press flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-semibold disabled:opacity-40 ${
                  time ? "bg-accent-soft text-accent" : "border border-dashed border-line text-ink-3"
                }`}
              >
                <Icon size={14} className={item.when === "morning" ? "shrink-0 text-[var(--h-amber)]" : "shrink-0 text-[var(--h-violet)]"} />
                {/* Narrow columns show just the icon and time; the name is in the tooltip. */}
                <span className="truncate @max-[13rem]:hidden">{item.name}</span>
                {time && <span className="shrink-0 tabular-nums">{time}</span>}
              </button>
            )
          })}
        </div>
      )}

      <button
        onClick={onAdd}
        className="press flex h-10 items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-sm font-semibold text-ink-2"
      >
        <Plus size={16} weight="bold" /> Add
      </button>

      {blocks.length === 0 && <p className="px-1 py-3 text-center text-xs text-ink-3">Nothing planned.</p>}

      <ul className="flex flex-col gap-3">
        {blocks.map((b, idx) => (
          <Fragment key={b.key}>
            {idx === marker && <NowMarker time={now!} />}
            {dayParts && (idx === 0 || dayPart(blocks[idx - 1].time) !== dayPart(b.time)) && <PartDivider part={dayPart(b.time)} />}
            {b.kind === "group" ? (
              <GroupBlock
                block={b}
                future={future}
                isFocused={isFocused}
                groupFocused={focusKey === `${day}:group:${b.group.id}`}
                onFocusGroup={() => onFocusGroup(b.group.id)}
                onMenu={() => onGroupMenu(b.group.id)}
                onSetTime={(t) => onSetTime(b.key, t)}
                {...handlers}
              />
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

const PARTS: Record<DayPart, [string, typeof Sun]> = {
  morning: ["Morning", SunHorizon],
  afternoon: ["Afternoon", Sun],
  evening: ["Evening", Moon],
  anytime: ["Anytime", Clock],
}

/** Part-of-day divider: icon, name, then a line. */
function PartDivider({ part }: { part: DayPart }) {
  const [label, Icon] = PARTS[part]
  return (
    <li aria-label={label} className="flex items-center gap-2 pt-1 text-[11px] font-semibold tracking-[0.12em] text-ink-2 uppercase">
      <Icon size={14} aria-hidden />
      {label}
      <span className="h-px flex-1 bg-line" aria-hidden />
    </li>
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

const chip = "rounded-md px-1 py-px text-[11px] font-semibold tabular-nums whitespace-nowrap"

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
        className={`relative bg-surface/80 ${chip} text-ink focus-within:ring-2 focus-within:ring-accent ${changed ? "ring-1 ring-current" : ""}`}
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

function CheckCircle({ item, future, onToggle, size = "size-[22px]" }: { item: DayItem; future: boolean; onToggle: () => void; size?: string }) {
  return (
    <button
      onClick={onToggle}
      disabled={future}
      aria-pressed={item.done}
      aria-label={future ? `${item.name}: can't tick a future day` : item.done ? `Mark ${item.name} not done` : `Mark ${item.name} done`}
      className="-m-1.5 grid shrink-0 place-items-center p-1.5 disabled:opacity-35"
    >
      <span
        className={`grid ${size} place-items-center rounded-full border-[1.5px] transition-colors ${
          item.done ? "hc-fill border-transparent text-white" : "border-ink text-ink-3"
        }`}
      >
        <Check size={11} weight="bold" className={item.done ? "pop" : "opacity-0"} />
      </span>
    </button>
  )
}

/** "30m", "1h", "1h 30m". */
const fmtMinutes = (m: number) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`)

/** A task row in a day card: round icon, name with its length under it, then the tick. */
function ItemRow({
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
  return (
    <li className={`flex items-center gap-3 px-3 py-2.5 ${focused ? "ring-2 ring-accent ring-inset" : ""}`}>
      <span className="hc-soft grid size-7 shrink-0 place-items-center rounded-full" aria-hidden>
        <Icon size={14} className="hc-text" />
      </span>
      <button onClick={onFocus} aria-current={focused ? "true" : undefined} title="Focus on this" className="min-w-0 flex-1 text-left">
        <span className={`block text-xs leading-4 font-semibold break-words ${item.done ? "text-ink-3 line-through" : ""}`}>{item.name}</span>
        {item.minutes ? <span className="mt-0.5 block text-[11px] leading-4 text-ink-2 tabular-nums">{fmtMinutes(item.minutes)}</span> : null}
      </button>
      {item.kind === "task" && (
        <button onClick={onEdit} aria-label={`Edit ${item.name}`} title="Edit task" className="press grid size-7 shrink-0 place-items-center rounded-full text-ink-3">
          <PencilSimple size={13} />
        </button>
      )}
      <CheckCircle item={item} future={future} onToggle={onToggle} />
    </li>
  )
}

/** Card frame: a band in the group's soft color (icon, NAME (count), time, actions), then the rows. */
const cardFrame = (focused: boolean) =>
  `overflow-hidden rounded-2xl border bg-surface ${focused ? "border-accent" : "border-card-line"}`
const bandLabel = "min-w-0 truncate text-[11px] font-medium tracking-[0.6px] text-ink uppercase"

/** A group's card: band with the group's name and done/total, then its items as rows. */
function GroupBlock({
  block,
  future,
  isFocused,
  groupFocused,
  onFocusGroup,
  onMenu,
  onSetTime,
  onToggle,
  onEdit,
  onFocus,
}: ItemHandlers & {
  block: Extract<DayBlock, { kind: "group" }>
  future: boolean
  isFocused: (i: DayItem) => boolean
  groupFocused: boolean
  onFocusGroup: () => void
  onMenu: () => void
  onSetTime: (t: string | null) => void
}) {
  const { group, items } = block
  const Icon = group.icon
  const total = items.reduce((s, i) => s + (i.minutes ?? 0), 0)
  const done = items.filter((i) => i.done).length

  return (
    <li style={{ ["--hc" as string]: colorVar(group.color) }} className={cardFrame(groupFocused)}>
      <div className="hc-soft flex items-center gap-1.5 py-1.5 pr-1 pl-3">
        <button
          onClick={onFocusGroup}
          aria-current={groupFocused ? "true" : undefined}
          title={total ? `Focus on this group · ${fmtMinutes(total)} in all` : "Focus on this group"}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Icon size={15} className="hc-text shrink-0" aria-hidden />
          <span className={bandLabel}>{group.label}</span>
          <span className="-ml-0.5 shrink-0 text-[11px] font-medium text-ink tabular-nums">
            ({done}/{items.length})
          </span>
        </button>
        <TimeChip time={block.time} expected={block.expected} onChange={onSetTime} />
        <button onClick={onMenu} aria-label={`${group.label} options`} title="Group options" className="press -ml-1 grid size-6 shrink-0 place-items-center rounded-full text-ink-2">
          <DotsThree size={16} weight="bold" />
        </button>
      </div>
      <ul className="divide-y divide-card-line">
        {items.length === 0 && (
          <li>
            <button onClick={onMenu} className="w-full px-3 py-2.5 text-left text-sm text-ink-3">
              No tasks in this group yet. Tap to add some.
            </button>
          </li>
        )}
        {items.map((i) => (
          <ItemRow
            key={`${i.kind}-${i.id}`}
            item={i}
            future={future}
            focused={isFocused(i)}
            onToggle={() => onToggle(i)}
            onEdit={() => onEdit(i)}
            onFocus={() => onFocus(i)}
          />
        ))}
      </ul>
    </li>
  )
}

/** A standalone card: band with its group's name (or "Task" for a one-off) and time, then the one row. */
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
    <li style={{ ["--hc" as string]: colorVar(item.group.color) }} className={cardFrame(focused)}>
      <div className="hc-soft flex items-center gap-2 py-1.5 pr-2.5 pl-3">
        <Icon size={15} className="hc-text shrink-0" aria-hidden />
        <span className={`${bandLabel} flex-1`}>{item.group.label}</span>
        <TimeChip time={block.time} expected={block.expected} onChange={onSetTime} />
      </div>
      <ul>
        <ItemRow item={item} future={future} focused={false} onToggle={() => onToggle(item)} onEdit={() => onEdit(item)} onFocus={() => onFocus(item)} />
      </ul>
    </li>
  )
}
