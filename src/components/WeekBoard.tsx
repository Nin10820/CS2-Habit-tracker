import { CalendarBlank, CaretDown, CaretLeft, CaretRight, Clock } from "@phosphor-icons/react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useClock } from "../lib/clock"
import { addDays, dayOfMonth, formatDow, formatFull, formatLong, formatWeekRange, isoWeek, startOfWeek, weekOf, type DayKey } from "../lib/date"
import { blocksForDay, itemsForDay } from "../lib/stats"
import type { AppData, DayItem } from "../lib/types"
import { DayColumn } from "./DayColumn"
import { Ring } from "./ui"

type View = "day" | "week"

/** Day or Week view (from 768px), remembered in this browser. */
function useView() {
  const KEY = "habit-tracker:view"
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem(KEY) === "day" ? "day" : "week"
    } catch {
      return "week"
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
 * "My tasks": the whole week. From 768px the seven days sit side by side and scroll sideways;
 * on phones a week strip picks one day to show.
 */
export function WeekBoard({
  data,
  today,
  onToggle,
  onAdd,
  onEdit,
  onFocus,
  onFocusGroup,
  onSetTime,
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
  onSetTime: (day: DayKey, key: string, time: string | null) => void
  focusKey?: string
  /** Extra controls at the start / end of the top bar (panel toggles, theme, settings). */
  leading?: ReactNode
  trailing?: ReactNode
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [picked, setPicked] = useState<DayKey>(today)
  const [view, setView] = useView()
  const scroller = useRef<HTMLDivElement>(null)
  const clock = useClock()

  const days = weekOf(weekStart)
  const day = days.includes(picked) ? picked : days[0]

  // Bring today's column into view on load and whenever "Today" is pressed.
  const [scrollKey, setScrollKey] = useState(0)
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-day="${today}"]`)
    const sc = scroller.current
    if (!el || !sc) return
    const left = sc.scrollLeft + el.getBoundingClientRect().left - sc.getBoundingClientRect().left - parseFloat(getComputedStyle(sc).paddingLeft)
    sc.scrollTo({ left, behavior: scrollKey ? "smooth" : "auto" })
  }, [scrollKey, today, weekStart, view])

  const goToday = () => {
    setWeekStart(startOfWeek(today))
    setPicked(today)
    setScrollKey((k) => k + 1)
  }
  // Arrows move a day in Day view, a week in Week view.
  const shift = (n: number) => {
    if (view === "day") {
      const next = addDays(day, n)
      setPicked(next)
      setWeekStart(startOfWeek(next))
      return
    }
    const next = addDays(weekStart, n * 7)
    setWeekStart(next)
    setPicked(next <= today && today <= addDays(next, 6) ? today : next)
  }
  const unit = view === "day" ? "day" : "week"

  const btn = "press flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold"

  return (
    <div className="flex min-w-0 flex-col xl:h-full">
      {/* Top bar. From 1280px it spans the middle column, with the panel toggles at its ends. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3 xl:h-16 xl:shrink-0 xl:flex-nowrap xl:border-b xl:border-line xl:px-4">
        {leading}
        <div className="flex shrink-0 rounded-full border border-line bg-surface">
          <button onClick={() => shift(-1)} aria-label={`Previous ${unit}`} className="press grid size-9 place-items-center rounded-full text-ink-2">
            <CaretLeft size={16} weight="bold" />
          </button>
          <button onClick={() => shift(1)} aria-label={`Next ${unit}`} className="press grid size-9 place-items-center rounded-full text-ink-2">
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 basis-0 items-baseline gap-2 md:flex-none md:basis-auto">
          <h1 className="truncate text-lg font-semibold sm:text-2xl xl:text-[28px]">
            {view === "day" ? formatFull(day) : formatWeekRange(weekStart)}
          </h1>
          <span className="shrink-0 text-xs font-semibold tracking-wider whitespace-nowrap text-ink-2 uppercase sm:text-sm">Week {isoWeek(day)}</span>
        </div>
        <div className="relative hidden shrink-0 md:block">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as View)}
            aria-label="View"
            className="press h-10 appearance-none rounded-full border border-line bg-surface pr-9 pl-4 text-sm font-semibold text-ink outline-none focus-visible:border-accent"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
          </select>
          <CaretDown size={12} weight="bold" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-2" />
        </div>
        <div className="flex w-full items-center justify-end gap-2 md:ml-auto md:w-auto">
          <button onClick={goToday} className={`${btn} bg-accent-soft text-accent`}>
            <CalendarBlank size={18} /> Today
          </button>
          <div
            aria-label={`Current time ${clock}`}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink tabular-nums"
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
                className={`press flex flex-col items-center gap-1 rounded-2xl py-2 ${active ? "bg-accent text-on-accent" : "bg-surface text-ink-2"}`}
              >
                <span className="text-[11px] font-medium">{k === today ? "Today" : formatDow(k)}</span>
                <span className="relative grid place-items-center">
                  {!active && <Ring value={k > today ? null : rate} size={30} />}
                  <span className={`text-sm font-semibold ${active ? "leading-[30px]" : "absolute text-ink"}`}>{dayOfMonth(k)}</span>
                </span>
              </button>
            )
          })}
        </div>
        <DayColumn
          className="mt-4"
          now={clock}
          day={day}
          today={today}
          blocks={blocksForDay(data, day)}
          onSetTime={(key, t) => onSetTime(day, key, t)}
          onToggle={(i) => onToggle(i, day)}
          onAdd={() => onAdd(day)}
          onEdit={onEdit}
          onFocus={(i) => onFocus(i, day)}
          onFocusGroup={(g) => onFocusGroup(g, day)}
          focusKey={focusKey}
        />
      </div>

      {/* 768px+: seven columns side by side */}
      <div
        ref={scroller}
        className="mt-5 hidden snap-x scroll-px-4 xl:scroll-px-20 items-start gap-5 overflow-x-auto pb-3 md:flex xl:mt-0 xl:min-h-0 xl:flex-1 xl:overflow-auto xl:px-20 xl:py-4"
      >
        {view === "day" ? (
          <DayColumn
            className="mx-auto w-full max-w-3xl"
            now={clock}
            day={day}
            today={today}
            blocks={blocksForDay(data, day)}
          onSetTime={(key, t) => onSetTime(day, key, t)}
            onToggle={(i) => onToggle(i, day)}
            onAdd={() => onAdd(day)}
            onEdit={onEdit}
            onFocus={(i) => onFocus(i, day)}
            onFocusGroup={(g) => onFocusGroup(g, day)}
            focusKey={focusKey}
          />
        ) : (
          days.map((k) => (
            <DayColumn
              key={k}
              className="min-w-[236px] flex-1 snap-start xl:min-w-[128px]"
              day={k}
              today={today}
              blocks={blocksForDay(data, k)}
              onSetTime={(key, t) => onSetTime(k, key, t)}
              onToggle={(i) => onToggle(i, k)}
              onAdd={() => onAdd(k)}
              onEdit={onEdit}
              onFocus={(i) => onFocus(i, k)}
              onFocusGroup={(g) => onFocusGroup(g, k)}
              focusKey={focusKey}
            />
          ))
        )}
      </div>
    </div>
  )
}
