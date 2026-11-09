import { CalendarBlank, CaretDown, CaretLeft, CaretRight, Clock } from "@phosphor-icons/react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useClock } from "../lib/clock"
import { dragScroll } from "../lib/dragScroll"
import { addDays, addMonths, dayOfMonth, formatDow, formatLong, formatMonthYear, formatWeekMonths, isoWeek, range, startOfWeek, weekOf, type DayKey } from "../lib/date"
import { routineOn } from "../lib/routine"
import { blocksForDay, itemsForDay } from "../lib/stats"
import type { AppData, DayItem, RoutineItem } from "../lib/types"
import { MonthGrid, WeekGrid, type OpenBlock } from "./CalendarViews"
import { DayColumn, DayHead, TODAY_BG, type CardDrag } from "./DayColumn"
import { WeekSummary } from "./WeekSummary"
import { Ring } from "./ui"

type View = "days" | "week" | "month"
const VIEWS: [View, string][] = [
  ["days", "7 days"],
  ["week", "Week"],
  ["month", "Month"],
]

/** 7 days from yesterday (the default), Week or Month (from 768px), remembered in this browser. */
function useView() {
  const KEY = "habit-tracker:view-v2"
  const [view, setView] = useState<View>(() => {
    try {
      const v = localStorage.getItem(KEY)
      return v === "week" || v === "month" ? v : "days"
    } catch {
      return "days"
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(KEY, view)
    } catch {
      /* ignore */
    }
  }, [view])
  return [view, setView] as const
}

/**
 * "My tasks". From 768px: 7 days (yesterday, today and the next five) as card columns, or Week and
 * Month as Apple-style calendars. On phones a week strip picks one day to show.
 */
export function WeekBoard({
  data,
  today,
  onToggle,
  onAdd,
  onEdit,
  onFocus,
  onFocusGroup,
  onGroupMenu,
  onRoutine,
  onDropRoutine,
  onDropCard,
  onReorder,
  dayParts = false,
  focusKey,
  leading,
  trailing,
}: {
  data: AppData
  today: DayKey
  onToggle: (item: DayItem, day: DayKey) => void
  onAdd: (day: DayKey) => void
  onEdit: (item: DayItem) => void
  onFocus: (item: DayItem, day: DayKey) => void
  onFocusGroup: (groupId: string, day: DayKey) => void
  /** The "⋯" on a group card: edit the group, or take it off the day. */
  onGroupMenu: (groupId: string, day: DayKey) => void
  /** Log a routine moment's time on a day. */
  onRoutine: (item: RoutineItem, day: DayKey) => void
  /** A routine moment dragged from the Routine card onto a day. */
  onDropRoutine: (id: string, day: DayKey) => void
  /** A card dragged from one day onto another. */
  onDropCard: (card: CardDrag, day: DayKey) => void
  /** A day's card order after a drop (card keys, top to bottom). */
  onReorder: (day: DayKey, keys: string[]) => void
  /** Split each day into Morning / Afternoon / Evening / Anytime (Settings). */
  dayParts?: boolean
  focusKey?: string
  /** Extra controls at the start / end of the top bar (panel toggles, theme, settings). */
  leading?: ReactNode
  trailing?: ReactNode
}) {
  // The day the views are built around: the 7 days start the day before it; Week and Month contain it.
  const [anchor, setAnchor] = useState<DayKey>(today)
  const [picked, setPicked] = useState<DayKey>(today)
  const [view, setView] = useView()
  const scroller = useRef<HTMLDivElement>(null)
  const clock = useClock()

  const weekStart = startOfWeek(anchor)
  const days = weekOf(anchor) // phone strip and Week view
  const DAY_COUNT = 7
  const cardDays = range(addDays(anchor, -1), addDays(anchor, DAY_COUNT - 2))
  const day = days.includes(picked) ? picked : days[0]

  // When the days change (load, arrows, "Today"), start from the first column, yesterday,
  // in case the columns are wider than the screen. (Columns are all as tall as the longest, so
  // each one's pinned heading stays up while the cards scroll.)
  const [scrollKey, setScrollKey] = useState(0)
  useEffect(() => {
    scroller.current?.scrollTo({ left: 0, behavior: scrollKey ? "smooth" : "auto" })
  }, [scrollKey, anchor, view])

  const goToday = () => {
    setAnchor(today)
    setPicked(today)
    setScrollKey((k) => k + 1)
  }
  // Arrows move 7 days, a week or a month. On phones (week strip) they always move a week.
  const shift = (n: number) => {
    const phone = !window.matchMedia("(min-width: 768px)").matches
    const next = phone || view === "week" ? addDays(anchor, n * 7) : view === "month" ? addMonths(anchor, n) : addDays(anchor, n * DAY_COUNT)
    setAnchor(next)
    const week = weekOf(next)
    setPicked(week.includes(today) ? today : week[0])
  }
  // A day picked in Week or Month opens the card days around it.
  const openDay = (d: DayKey) => {
    setAnchor(d)
    setPicked(d)
    setView("days")
  }
  const openBlock: OpenBlock = (b, d) => (b.kind === "group" ? onFocusGroup(b.group.id, d) : onFocus(b.item, d))
  const unit = view === "month" ? "month" : view === "week" ? "week" : "7 days"
  const title = view === "month" ? formatMonthYear(anchor) : view === "week" ? formatWeekMonths(weekStart) : formatWeekMonths(cardDays[0], DAY_COUNT)
  const routineFor = (d: DayKey) => routineOn(data, d).map((item) => ({ item, time: data.routine.log[item.id]?.[d] }))

  const btn = "press flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold"

  return (
    <div className="@container flex min-w-0 flex-col xl:h-full">
      {/* Top bar. From 1280px it spans the middle column, with the panel toggles at its ends.
          It stays one line there, so as the column narrows (both panels open) it drops the week
          label, the clock (the progress panel has one), the Today label and then the view picker. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3 xl:h-16 xl:shrink-0 xl:flex-nowrap xl:border-b xl:border-line xl:px-4">
        {leading}
        <div className="flex shrink-0 rounded-full border border-line bg-surface">
          <button onClick={() => shift(-1)} aria-label="Previous" title={`Previous ${unit}`} className="press grid size-9 place-items-center rounded-full text-ink-2">
            <CaretLeft size={16} weight="bold" />
          </button>
          <button onClick={() => shift(1)} aria-label="Next" title={`Next ${unit}`} className="press grid size-9 place-items-center rounded-full text-ink-2">
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 basis-0 items-baseline gap-2 md:flex-none md:basis-auto xl:flex-1 xl:basis-0">
          <h1 className="truncate text-xl leading-none font-semibold sm:text-2xl xl:text-[26px]">
            <span className="md:hidden">{formatWeekMonths(weekStart)}</span>
            <span className="hidden md:inline">{title}</span>
          </h1>
          {view !== "month" && (
            <span className="shrink-0 text-xs font-semibold tracking-wider whitespace-nowrap text-ink-2 uppercase sm:text-sm xl:@max-5xl:hidden">
              Week {isoWeek(view === "days" ? anchor : day)}
            </span>
          )}
        </div>
        <div className="relative hidden shrink-0 md:block xl:@max-2xl:hidden">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as View)}
            aria-label="View"
            className="press h-10 appearance-none rounded-full border border-line bg-surface pr-9 pl-4 text-sm font-semibold text-ink outline-none focus-visible:border-accent"
          >
            {VIEWS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <CaretDown size={12} weight="bold" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-2" />
        </div>
        <div className="flex w-full items-center justify-end gap-2 md:ml-auto md:w-auto xl:shrink-0">
          <button onClick={goToday} aria-label="Today" title="Today" className={`${btn} bg-accent-soft text-accent`}>
            <CalendarBlank size={18} /> <span className="xl:@max-4xl:hidden">Today</span>
          </button>
          <div
            aria-label={`Current time ${clock}`}
            // In the 7-day view (768px+) the clock lives in the week summary instead.
            className={`flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink tabular-nums xl:@max-4xl:hidden ${view === "days" ? "md:hidden" : ""}`}
          >
            <Clock size={18} className="text-ink-2" /> {clock}
          </div>
          {trailing}
        </div>
      </div>

      {/* Phones: week strip + one day */}
      <div className="mt-5 md:hidden">
        <div role="tablist" aria-label="Pick a day" className="grid grid-cols-7 gap-1.5">
          {days.map((k) => {
            const items = itemsForDay(data, k)
            const rate = items.length ? items.filter((i) => i.done).length / items.length : null
            const active = k === day
            return (
              <button
                key={k}
                role="tab"
                aria-selected={active}
                aria-label={formatLong(k)}
                onClick={() => setPicked(k)}
                className="press flex flex-col items-center gap-1 py-1"
              >
                <span className={`text-[10px] font-semibold tracking-[0.1em] uppercase ${k === today ? "text-accent" : "text-ink-2"}`}>{formatDow(k)}</span>
                <span className="relative grid place-items-center">
                  {!active && <Ring value={k > today ? null : rate} size={34} />}
                  <span
                    className={`grid size-[34px] place-items-center rounded-full font-title text-sm leading-none font-semibold ${
                      active ? "bg-accent text-on-accent" : k === today ? "absolute text-accent" : "absolute text-ink"
                    }`}
                  >
                    {dayOfMonth(k)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <DayColumn
          className="mt-4"
          showHeader={false}          day={day}
          today={today}
          blocks={blocksForDay(data, day)}
          onToggle={(i) => onToggle(i, day)}
          onAdd={() => onAdd(day)}
          onEdit={onEdit}
          onFocus={(i) => onFocus(i, day)}
          onFocusGroup={(g) => onFocusGroup(g, day)}
          onGroupMenu={(g) => onGroupMenu(g, day)}
          routine={routineFor(day)}
          onRoutine={(i) => onRoutine(i, day)}
          onDropRoutine={(id) => onDropRoutine(id, day)}
          onDropCard={(c) => onDropCard(c, day)}
          onReorder={(keys) => onReorder(day, keys)}
          dayParts={dayParts}
          focusKey={focusKey}
        />
      </div>

      {/* 768px+: 7 day columns of cards (scrolling sideways), or the Week / Month calendar */}
      {view === "days" ? (
        <>
        {/* One top section: the week summary (stays put), then the day heads band (scrolls sideways with the columns). */}
        {/* Set apart from the day heads below by a line. */}
        <div className="mt-5 hidden md:block xl:mt-0">
          <WeekSummary data={data} today={today} anchor={anchor} clock={clock} />
        </div>
        <div
          ref={scroller}
          {...dragScroll()}
          className="hidden cursor-grab snap-x scroll-px-4 overflow-x-auto pb-3 md:block xl:min-h-0 xl:flex-1 xl:overflow-auto xl:pb-0"
        >
          {/* One width for both rows (at least 296px a day), so each head sits right above its column. */}
          <div className="flex min-h-full flex-col" style={{ width: `max(100%, ${cardDays.length * 296 + (cardDays.length - 1) * 24 + 32}px)` }}>
          {/* All the day heads as one band, pinned while the cards scroll: date, done count, routine. */}
          <div className="z-20 flex gap-6 border-b border-line bg-surface px-4 shadow-[0_6px_12px_-10px_rgb(0_0_0/0.25)] xl:sticky xl:top-0">
            {cardDays.map((k) => (
              <div
                key={k}
                style={k === today ? { background: TODAY_BG } : undefined}
                className="flex min-w-0 flex-1 basis-0 flex-col gap-2 px-2 pt-2 pb-3"
              >
                <DayHead day={k} today={today} blocks={blocksForDay(data, k)} routine={routineFor(k)} onRoutine={(i) => onRoutine(i, k)} />
              </div>
            ))}
          </div>
          <div className="flex flex-1 gap-6 px-4">
          {cardDays.map((k) => (
            <DayColumn
              key={k}
              head={false}
              // Columns are as tall as the tallest (or the board) and hold the space kept clear for
              // the player, so today's tint runs to the very bottom.
              className="min-w-0 flex-1 basis-0 snap-start xl:pb-[calc(var(--player-space)+16px)]"              day={k}
              today={today}
              blocks={blocksForDay(data, k)}
              onToggle={(i) => onToggle(i, k)}
              onAdd={() => onAdd(k)}
              onEdit={onEdit}
              onFocus={(i) => onFocus(i, k)}
              onFocusGroup={(g) => onFocusGroup(g, k)}
              onGroupMenu={(g) => onGroupMenu(g, k)}
              routine={routineFor(k)}
              onRoutine={(i) => onRoutine(i, k)}
              onDropRoutine={(id) => onDropRoutine(id, k)}
              onDropCard={(c) => onDropCard(c, k)}
              onReorder={(keys) => onReorder(k, keys)}
              dayParts={dayParts}
              focusKey={focusKey}
            />
          ))}
          </div>
          </div>
        </div>
        </>
      ) : (
        <div className="mt-5 hidden overflow-x-auto md:flex xl:mt-0 xl:min-h-0 xl:flex-1">
          {view === "week" ? (
            <WeekGrid days={days} today={today} now={clock} data={data} onOpen={openBlock} onPickDay={openDay} />
          ) : (
            <MonthGrid month={anchor} today={today} data={data} onPickDay={openDay} />
          )}
        </div>
      )}
    </div>
  )
}
