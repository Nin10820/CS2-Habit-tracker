import { ArrowCounterClockwise, Check, Clock, DotsThree, Moon, PencilSimple, Plus, Sun, SunHorizon } from "@phosphor-icons/react"
import { Fragment, useState, type DragEvent, type KeyboardEvent } from "react"
import { dayOfMonth, formatDow, type DayKey } from "../lib/date"
import { colorVar, type DayBlock, type DayItem, type RoutineItem } from "../lib/types"
import { dayPart, type DayPart } from "../lib/prefs"
import { ROUTINE_DRAG } from "./Routine"

/** Drag data for a card moved to another day: a whole group card, or a one-off task's card. */
export const CARD_DRAG = "application/x-day-card"
export type CardDrag = { from: DayKey; kind: "group" | "task"; id: string }

/** Today's column tint: opaque, so the pinned heading can use it too and hide the cards scrolling under. */
const TODAY_BG = "color-mix(in oklab, var(--accent) 6%, var(--bg))"

/**
 * Props for a clickable title inside a draggable card. Chrome won't start a drag from a <button>,
 * so titles are elements with the button role instead: clicks, Enter and Space still work.
 */
const pressable = (onPress: () => void) => ({
  role: "button" as const,
  tabIndex: 0,
  onClick: onPress,
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onPress()
    }
  },
})

/** Makes a card draggable to another day; it fades while it's being dragged. */
function cardDrag(data: CardDrag) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.setData(CARD_DRAG, JSON.stringify(data))
      e.dataTransfer.effectAllowed = "move"
      e.currentTarget.style.opacity = "0.45"
    },
    onDragEnd: (e: DragEvent<HTMLElement>) => {
      e.currentTarget.style.opacity = ""
    },
  }
}

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
  onDropCard,
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
  /** A card dragged here from another day. */
  onDropCard?: (card: CardDrag) => void
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
  // Highlight while a routine moment or another day's card is dragged over this day.
  const [dropping, setDropping] = useState(false)
  const isRoutine = (e: DragEvent<HTMLElement>) => e.dataTransfer.types.includes(ROUTINE_DRAG)
  const isCard = (e: DragEvent<HTMLElement>) => e.dataTransfer.types.includes(CARD_DRAG)
  const isFocused = (i: DayItem) => focusKey === `${day}:${i.kind}:${i.id}`

  return (
    <section
      data-day={day}
      aria-label={`${formatDow(day)} ${dayOfMonth(day)}`}
      style={isToday ? { background: TODAY_BG } : undefined}
      className={`@container flex flex-col gap-2 rounded-[22px] px-2 pb-2 transition-shadow ${dropping ? "ring-2 ring-accent" : ""} ${className}`}
      onDragOver={(e) => {
        const routine = !!onDropRoutine && isRoutine(e)
        const card = !!onDropCard && isCard(e)
        if (!routine && !card) return
        e.preventDefault()
        e.dataTransfer.dropEffect = card ? "move" : "copy"
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
          return
        }
        const raw = e.dataTransfer.getData(CARD_DRAG)
        if (raw && onDropCard) {
          e.preventDefault()
          try {
            const card = JSON.parse(raw) as CardDrag
            if (card.from !== day) onDropCard(card)
          } catch {
            /* not ours */
          }
        }
      }}
    >
      {/* Pinned while the cards scroll: the day heading and the routine buttons (today's in its tint). */}
      <div
        style={isToday ? { background: TODAY_BG } : undefined}
        className={`sticky top-14 z-20 -mx-2 flex flex-col gap-2 rounded-t-[22px] px-2 pt-3 pb-2 xl:top-0 ${isToday ? "" : "bg-bg"}`}
      >
      {showHeader && (
      <header className="flex flex-col items-center pb-1">
        {/* Today sits in a soft box. */}
        <div className={`flex flex-col items-center rounded-2xl px-4 pt-2 pb-1 ${isToday ? "bg-surface-2" : ""}`}>
        <p className="text-xs font-medium tracking-[1px] text-ink-2 uppercase">{formatDow(day)}</p>
        <p className="mt-0.5 font-title text-[22px] leading-7 font-medium text-ink tabular-nums">
          {String(dayOfMonth(day)).padStart(2, "0")}
        </p>
        </div>
        <p className="mt-1 text-xs text-ink-3 tabular-nums" title={`${done} of ${items.length} tasks done`}>
          {items.length ? `${done}/${items.length} done` : "\u00a0"}
        </p>
      </header>
      )}

      {routine.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Routine">
          {routine.map(({ item, time }) => {
            // Colour follows the icon: amber sun for morning, violet moon for evening, grey clock for your own.
            const Icon = !item.daily ? Clock : item.when === "morning" ? SunHorizon : Moon
            const color = !item.daily ? "slate" : item.when === "morning" ? "amber" : "violet"
            return (
              <button
                key={item.id}
                onClick={() => onRoutine?.(item)}
                // On a future day only the moments you added can be opened (to take them off again).
                disabled={future && item.daily}
                title={time ? `${item.name} at ${time}` : `Log ${item.name}`}
                aria-label={time ? `${item.name} at ${time}` : `Log ${item.name}`}
                style={{ ["--hc" as string]: colorVar(color) }}
                className={`press flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium disabled:opacity-40 ${
                  time ? "hc-soft hc-text" : "border-[1.5px] border-dashed border-[color-mix(in_oklab,var(--hc)_40%,transparent)] text-ink-2"
                }`}
              >
                <Icon size={18} weight={time ? "fill" : "regular"} className="hc-text shrink-0" />
                {/* Narrow columns show just the icon and time; the name is in the tooltip. */}
                {/* Once a time is logged, the icon says which one: narrow columns keep just icon + time. */}
                <span className={`truncate @max-[13rem]:hidden ${time ? "@max-[22rem]:hidden" : ""}`}>{item.name}</span>
                {time && <span className="shrink-0 tabular-nums">{time}</span>}
              </button>
            )
          })}
        </div>
      )}
      </div>

      <button
        onClick={onAdd}
        className="press flex h-10 items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-sm font-medium text-ink-2"
      >
        <Plus size={16} weight="bold" /> Add
      </button>

      {blocks.length === 0 && <p className="px-1 py-3 text-center text-xs text-ink-3">Nothing planned.</p>}

      <ul className="flex flex-col gap-4">
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
                drag={onDropCard ? cardDrag({ from: day, kind: "group", id: b.group.id }) : undefined}
                onSetTime={(t) => onSetTime(b.key, t)}
                {...handlers}
              />
            ) : (
              <SingleBlock
                block={b}
                future={future}
                focused={isFocused(b.item)}
                onSetTime={(t) => onSetTime(b.key, t)}
                drag={
                  onDropCard
                    ? cardDrag(b.item.kind === "task" ? { from: day, kind: "task", id: b.item.id } : { from: day, kind: "group", id: b.item.group.id })
                    : undefined
                }
                {...handlers}
              />
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
    <li aria-label={label} className="flex items-center gap-2 pt-2 text-xs font-medium tracking-[0.12em] text-ink-3 uppercase">
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

const chip = "rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums whitespace-nowrap"

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
    <li className={`flex items-center gap-3 px-3.5 py-3.5 ${focused ? "ring-2 ring-accent ring-inset" : ""}`}>
      <span className="hc-soft grid size-7 shrink-0 place-items-center rounded-full" aria-hidden>
        <Icon size={14} className="hc-text" />
      </span>
      <div
        {...pressable(onFocus)}
        aria-current={focused ? "true" : undefined}
        title="Focus on this"
        className="min-w-0 flex-1 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className={`block text-[13.5px] leading-5 font-medium break-words ${item.done ? "text-ink-3 line-through" : ""}`}>{item.name}</span>
        {item.minutes ? <span className="mt-0.5 block text-xs leading-4 text-ink-3 tabular-nums">{fmtMinutes(item.minutes)}</span> : null}
      </div>
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
const bandLabel = "min-w-0 truncate text-xs font-medium tracking-[0.6px] text-ink uppercase"

/** A group's card: band with the group's name and done/total, then its items as rows. */
function GroupBlock({
  block,
  future,
  isFocused,
  groupFocused,
  onFocusGroup,
  onMenu,
  drag,
  onSetTime,
  onToggle,
  onEdit,
  onFocus,
}: ItemHandlers & {
  block: Extract<DayBlock, { kind: "group" }>
  /** Drag handlers to move the card to another day. */
  drag?: ReturnType<typeof cardDrag>
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
    <li style={{ ["--hc" as string]: colorVar(group.color) }} className={`${cardFrame(groupFocused)} ${drag ? "cursor-grab select-none active:cursor-grabbing" : ""}`} {...drag}>
      <div className="hc-soft flex items-center gap-1.5 py-2.5 pr-1.5 pl-3.5">
        <div
          {...pressable(onFocusGroup)}
          aria-current={groupFocused ? "true" : undefined}
          title={total ? `Focus on this group · ${fmtMinutes(total)} in all` : "Focus on this group"}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Icon size={15} className="hc-text shrink-0" aria-hidden />
          <span className={bandLabel}>{group.label}</span>
          <span className="-ml-0.5 shrink-0 text-xs text-ink-2 tabular-nums">
            ({done}/{items.length})
          </span>
        </div>
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
  drag,
  onSetTime,
  onToggle,
  onEdit,
  onFocus,
}: ItemHandlers & {
  block: Extract<DayBlock, { kind: "single" }>
  drag?: ReturnType<typeof cardDrag>
  future: boolean
  focused: boolean
  onSetTime: (t: string | null) => void
}) {
  const { item } = block
  const Icon = item.group.icon

  return (
    <li style={{ ["--hc" as string]: colorVar(item.group.color) }} className={`${cardFrame(focused)} ${drag ? "cursor-grab select-none active:cursor-grabbing" : ""}`} {...drag}>
      <div className="hc-soft flex items-center gap-2 py-2.5 pr-2.5 pl-3.5">
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
