import { Check, Clock, DotsThree, Moon, PencilSimple, Plus, Sun, SunHorizon } from "@phosphor-icons/react"
import { Fragment, useLayoutEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactElement, type RefObject } from "react"
import { getCardDrag, setCardDrag, setDropSlot, useCardDrag } from "../lib/cardDrag"
import { dayOfMonth, formatDow, type DayKey } from "../lib/date"
import { colorVar, type DayBlock, type DayItem, type RoutineItem } from "../lib/types"
import { dayPart, type DayPart } from "../lib/prefs"
import { ROUTINE_DRAG } from "./Routine"

/** Drag data for a card moved to another day: a whole group card, or a one-off task's card. */
export const CARD_DRAG = "application/x-day-card"
export type CardDrag = { from: DayKey; kind: "group" | "task"; id: string }

/** Today's column tint: opaque, so the pinned heading can use it too and hide the cards scrolling under. */
export const TODAY_BG ="color-mix(in oklab, var(--accent) 3.5%, var(--bg))"

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

/**
 * Makes a card draggable within its day or to another day. Once the browser has its drag picture,
 * the card leaves its list (hidden, not removed: Chrome drops `dragend` for removed sources).
 */
function cardDrag(data: CardDrag, key: string) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.setData(CARD_DRAG, JSON.stringify(data))
      e.dataTransfer.effectAllowed = "move"
      setCardDrag({ key, from: data.from, height: e.currentTarget.offsetHeight, lifted: false })
      setTimeout(() => setCardDrag((s) => (s && s.key === key ? { ...s, lifted: true } : s)))
    },
    onDragEnd: () => setCardDrag(null),
  }
}

/** How a card looks during a drag: the dragged one is out of the list, the rest dim. */
type DragLook = "lifted" | "dim" | undefined

/** Props for a card's <li>: its key (for the drop position and slide animation) and its drag look. */
const cardLi = (key: string, look: DragLook) => ({
  "data-key": key,
  "data-lifted": look === "lifted" || undefined,
  hidden: look === "lifted",
})

/** Grab cursor on draggable cards; the others fade (with a slight shrink) while a card is dragged. */
const dragClass = (drag: unknown, look: DragLook) =>
  `transition-[opacity,scale] duration-200 ${drag ? "cursor-grab select-none active:cursor-grabbing" : ""} ${look === "dim" ? "scale-[0.985] opacity-45" : ""}`

/** Where the dragged card will land: a dashed frame the size of the card. */
function DropSlot({ height }: { height: number }) {
  return <li aria-hidden className="drop-slot rounded-2xl border-2 border-dashed border-accent bg-accent/5" style={{ height }} />
}

/**
 * Slide cards to their new place when the list changes (FLIP): remember each card's offset, and
 * after a re-render play the move from the old offset. offsetTop ignores running transforms.
 */
function useSlide(list: RefObject<HTMLUListElement | null>) {
  const prev = useRef(new Map<string, number>())
  useLayoutEffect(() => {
    const ul = list.current
    if (!ul) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const next = new Map<string, number>()
    for (const li of ul.querySelectorAll<HTMLElement>(":scope > li[data-key]:not([hidden])")) {
      const key = li.dataset.key!
      const was = prev.current.get(key)
      next.set(key, li.offsetTop)
      if (!reduce && was !== undefined && Math.abs(was - li.offsetTop) > 1) {
        li.animate([{ transform: `translateY(${was - li.offsetTop}px)` }, { transform: "none" }], {
          duration: 260,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        })
      }
    }
    prev.current = next
  })
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
  onReorder,
  focusKey,
  className = "",
  showHeader = true,
  head = true,
  dayParts = false,
}: ItemHandlers & {
  /** Draw the pinned head (date + routine) in the column. The 7-day board draws them as one band instead. */
  head?: boolean
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
  /** The day's card keys, top to bottom, after a card was dropped into this day. */
  onReorder?: (keys: string[]) => void
  /** "day:kind:id" of the focused item, to highlight it. */
  focusKey?: string
  className?: string
}) {
  const isToday = day === today
  const future = day > today
  const handlers: ItemHandlers = { onToggle, onEdit, onFocus }
  // Highlight while a routine moment or another day's card is dragged over this day.
  const [dropping, setDropping] = useState(false)
  const isRoutine = (e: DragEvent<HTMLElement>) => e.dataTransfer.types.includes(ROUTINE_DRAG)
  const isCard = (e: DragEvent<HTMLElement>) => e.dataTransfer.types.includes(CARD_DRAG)
  const isFocused = (i: DayItem) => focusKey === `${day}:${i.kind}:${i.id}`

  // Card drag: the lifted card is out of its list, the others dim, and a slot shows where it lands.
  const drag = useCardDrag()
  const list = useRef<HTMLUListElement>(null)
  useSlide(list)
  // A group's card has the same key on every day, so the lifted one is the key on the day it left.
  const lookOf = (key: string): DragLook => (!drag?.lifted ? undefined : key === drag.key && day === drag.from ? "lifted" : "dim")
  const slotAt = drag?.lifted && drag.over?.day === day ? drag.over.index : -1
  const visibleCount = blocks.filter((b) => lookOf(b.key) !== "lifted").length
  /** Slot index under the pointer: before the first card whose middle is below it. */
  const slotIndexAt = (y: number) => {
    const ul = list.current
    if (!ul) return 0
    const top = ul.getBoundingClientRect().top
    const lis = [...ul.querySelectorAll<HTMLElement>(":scope > li[data-key]:not([hidden])")]
    const i = lis.findIndex((li) => y < top + li.offsetTop + li.offsetHeight / 2)
    return i === -1 ? lis.length : i
  }
  // Rendering: walk the cards, counting the visible ones, and put the slot before visible card n.
  let visibleIdx = 0
  const slotBefore = (b: DayBlock): ReactElement | null => {
    if (lookOf(b.key) === "lifted") return null
    return visibleIdx++ === slotAt ? <DropSlot height={drag!.height} /> : null
  }

  return (
    <section
      data-day={day}
      aria-label={`${formatDow(day)} ${dayOfMonth(day)}`}
      style={isToday ? { background: TODAY_BG } : undefined}
      className={`@container flex flex-col gap-2 px-2 pb-2 transition-shadow ${dropping ? "ring-2 ring-accent" : ""} ${className}`}
      onDragOver={(e) => {
        const routine = !!onDropRoutine && isRoutine(e)
        const card = !!onDropCard && isCard(e)
        if (!routine && !card) return
        e.preventDefault()
        e.dataTransfer.dropEffect = card ? "move" : "copy"
        if (card) setDropSlot(day, slotIndexAt(e.clientY))
        else setDropping(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setDropping(false)
        if (getCardDrag()?.over?.day === day) setDropSlot(undefined)
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
            const s = getCardDrag()
            // The day's new order: the other cards as shown, with the dropped one where the slot was.
            const keys = blocks.map((b) => b.key).filter((k) => k !== s?.key)
            if (s) keys.splice(s.over?.day === day ? Math.min(s.over.index, keys.length) : keys.length, 0, s.key)
            if (card.from !== day) onDropCard(card)
            onReorder?.(keys)
          } catch {
            /* not ours */
          }
          setCardDrag(null)
        }
      }}
    >
      {/* Pinned while the cards scroll: the day heading and the routine buttons (today's in its tint).
          The 7-day board leaves it out and draws all the heads as one band (DayHead). */}
      {head && (
        <div
          style={isToday ? { background: TODAY_BG } : undefined}
          className={`sticky top-14 z-20 -mx-2 flex flex-col gap-2 px-2 pt-3 pb-2 xl:top-0 ${isToday ? "" : "bg-bg"}`}
        >
          <DayHead day={day} today={today} blocks={blocks} routine={routine} onRoutine={onRoutine} showHeader={showHeader} />
        </div>
      )}
      {!head && <div className="h-1" aria-hidden />}

      <button
        onClick={onAdd}
        className="press flex h-10 items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-sm font-medium text-ink-2"
      >
        <Plus size={16} weight="bold" /> Add
      </button>

      {blocks.length === 0 && <p className="px-1 py-3 text-center text-xs text-ink-3">Nothing planned.</p>}

      <ul ref={list} className="relative flex flex-col gap-4">
        {blocks.map((b, idx) => (
          <Fragment key={b.key}>
            {dayParts && (idx === 0 || dayPart(blocks[idx - 1].time) !== dayPart(b.time)) && <PartDivider part={dayPart(b.time)} />}
            {slotBefore(b)}
            {b.kind === "group" ? (
              <GroupBlock
                block={b}
                future={future}
                look={lookOf(b.key)}
                isFocused={isFocused}
                groupFocused={focusKey === `${day}:group:${b.group.id}`}
                onFocusGroup={() => onFocusGroup(b.group.id)}
                onMenu={() => onGroupMenu(b.group.id)}
                drag={onDropCard ? cardDrag({ from: day, kind: "group", id: b.group.id }, b.key) : undefined}
                {...handlers}
              />
            ) : (
              <SingleBlock
                block={b}
                future={future}
                look={lookOf(b.key)}
                focused={isFocused(b.item)}
                drag={
                  onDropCard
                    ? cardDrag(
                        b.item.kind === "task" ? { from: day, kind: "task", id: b.item.id } : { from: day, kind: "group", id: b.item.group.id },
                        b.key,
                      )
                    : undefined
                }
                {...handlers}
              />
            )}
          </Fragment>
        ))}
        {slotAt >= visibleCount && <DropSlot height={drag!.height} />}
      </ul>
    </section>
  )
}

/**
 * A day's head: weekday and date (today in a soft box), done count, then the routine buttons.
 */
export function DayHead({
  day,
  today,
  blocks,
  routine = [],
  onRoutine,
  showHeader = true,
}: {
  day: DayKey
  today: DayKey
  blocks: DayBlock[]
  routine?: { item: RoutineItem; time?: string }[]
  onRoutine?: (item: RoutineItem) => void
  showHeader?: boolean
}) {
  const isToday = day === today
  const future = day > today
  const items = blocks.flatMap((b) => (b.kind === "group" ? b.items : [b.item]))
  const done = items.filter((i) => i.done).length

  return (
    <>
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
                  time ? "hc-soft hc-text" : "border-[1.5px] border-dashed border-[color-mix(in_oklab,var(--hc)_40%,transparent)] bg-surface text-ink-2"
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
    </>
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
    <li className={`flex items-center gap-3 px-3.5 py-3.5 ${focused ? "bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))] shadow-[inset_3px_0_0_var(--accent)]" : ""}`}>
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
const bandLabel = "hc-ink min-w-0 truncate text-[13px] font-semibold"
/** "tiếng anh" → "Tiếng anh": first letter capital, the rest as typed. */
const capFirst = (s: string) => s.charAt(0).toLocaleUpperCase("vi") + s.slice(1)

/** A group's card: band with the group's name and done/total, then its items as rows. */
function GroupBlock({
  block,
  future,
  isFocused,
  groupFocused,
  onFocusGroup,
  onMenu,
  drag,
  look,
  onToggle,
  onEdit,
  onFocus,
}: ItemHandlers & {
  block: Extract<DayBlock, { kind: "group" }>
  /** Drag handlers to move the card to another day. */
  drag?: ReturnType<typeof cardDrag>
  look?: DragLook
  future: boolean
  isFocused: (i: DayItem) => boolean
  groupFocused: boolean
  onFocusGroup: () => void
  onMenu: () => void
}) {
  const { group, items } = block
  const Icon = group.icon
  const total = items.reduce((s, i) => s + (i.minutes ?? 0), 0)
  const done = items.filter((i) => i.done).length

  return (
    <li {...cardLi(block.key, look)} style={{ ["--hc" as string]: colorVar(group.color) }} className={`${cardFrame(groupFocused)} ${dragClass(drag, look)}`} {...drag}>
      <div className="hc-soft flex items-center gap-1.5 py-2.5 pr-1.5 pl-3.5">
        <div
          {...pressable(onFocusGroup)}
          aria-current={groupFocused ? "true" : undefined}
          title={total ? `Focus on this group · ${fmtMinutes(total)} in all` : "Focus on this group"}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Icon size={15} className="hc-text shrink-0" aria-hidden />
          <span className={bandLabel}>{capFirst(group.label)}</span>
          <span className="-ml-0.5 shrink-0 text-xs text-ink-2 tabular-nums">
            ({done}/{items.length})
          </span>
        </div>
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
  look,
  onToggle,
  onEdit,
  onFocus,
}: ItemHandlers & {
  block: Extract<DayBlock, { kind: "single" }>
  drag?: ReturnType<typeof cardDrag>
  look?: DragLook
  future: boolean
  focused: boolean
}) {
  const { item } = block
  const Icon = item.group.icon

  return (
    <li {...cardLi(block.key, look)} style={{ ["--hc" as string]: colorVar(item.group.color) }} className={`${cardFrame(focused)} ${dragClass(drag, look)}`} {...drag}>
      <div className="hc-soft flex items-center gap-2 py-2.5 pr-2.5 pl-3.5">
        <Icon size={15} className="hc-text shrink-0" aria-hidden />
        <span className={`${bandLabel} flex-1`}>{capFirst(item.group.label)}</span>
      </div>
      <ul>
        <ItemRow item={item} future={future} focused={false} onToggle={() => onToggle(item)} onEdit={() => onEdit(item)} onFocus={() => onFocus(item)} />
      </ul>
    </li>
  )
}
