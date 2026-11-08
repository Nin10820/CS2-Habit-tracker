import { CalendarBlank, CaretDown, CaretLeft, CaretRight, Check, Funnel } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import { GROUPS } from "../config/groups"
import { addDays, dayOfMonth, formatDow, formatLong, formatMonthYear, startOfWeek, weekOf, type DayKey } from "../lib/date"
import { itemsForDay } from "../lib/stats"
import type { AppData, DayItem } from "../lib/types"
import { colorVar } from "../lib/types"
import { DayColumn } from "./DayColumn"
import { Ring } from "./ui"

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
}: {
  data: AppData
  today: DayKey
  onToggle: (item: DayItem, day: DayKey) => void
  onAdd: (day: DayKey) => void
  onEdit: (item: DayItem) => void
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [picked, setPicked] = useState<DayKey>(today)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  const days = weekOf(weekStart)
  const day = days.includes(picked) ? picked : days[0]
  const itemsOf = (d: DayKey) => itemsForDay(data, d).filter((i) => !hidden.has(i.group.id))

  // Bring today's column into view on load and whenever "Today" is pressed.
  const [scrollKey, setScrollKey] = useState(0)
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-day="${today}"]`)
    if (el && scroller.current) scroller.current.scrollTo({ left: el.offsetLeft - scroller.current.offsetLeft - 4, behavior: scrollKey ? "smooth" : "auto" })
  }, [scrollKey, today, weekStart])

  useEffect(() => {
    if (!filterOpen) return
    const close = (e: MouseEvent) => !filterRef.current?.contains(e.target as Node) && setFilterOpen(false)
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setFilterOpen(false)
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", esc)
    }
  }, [filterOpen])

  const goToday = () => {
    setWeekStart(startOfWeek(today))
    setPicked(today)
    setScrollKey((k) => k + 1)
  }
  const shiftWeek = (n: number) => {
    const next = addDays(weekStart, n * 7)
    setWeekStart(next)
    setPicked(next <= today && today <= addDays(next, 6) ? today : next)
  }

  const btn = "press flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold"

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">My tasks</h1>
          <p className="mt-1 text-base text-ink-2">{formatMonthYear(day)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-surface-2">
            <button onClick={() => shiftWeek(-1)} aria-label="Previous week" className="press grid size-10 place-items-center rounded-xl text-ink-2">
              <CaretLeft size={16} weight="bold" />
            </button>
            <button onClick={() => shiftWeek(1)} aria-label="Next week" className="press grid size-10 place-items-center rounded-xl text-ink-2">
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
          <button onClick={goToday} className={`${btn} bg-accent-soft text-accent`}>
            <CalendarBlank size={18} /> Today
          </button>
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              aria-expanded={filterOpen}
              aria-haspopup="true"
              className={`${btn} border border-line bg-surface ${hidden.size ? "text-accent" : "text-ink-2"}`}
            >
              <Funnel size={18} weight={hidden.size ? "fill" : "regular"} /> Filter <CaretDown size={12} weight="bold" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-line bg-surface p-2 shadow-card">
                <p className="px-2 pt-1 pb-2 text-xs font-semibold text-ink-3">Show groups</p>
                {GROUPS.map((g) => {
                  const on = !hidden.has(g.id)
                  const Icon = g.icon
                  return (
                    <button
                      key={g.id}
                      role="menuitemcheckbox"
                      aria-checked={on}
                      onClick={() =>
                        setHidden((h) => {
                          const n = new Set(h)
                          if (on) n.add(g.id)
                          else n.delete(g.id)
                          return n
                        })
                      }
                      style={{ ["--hc" as string]: colorVar(g.color) }}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm"
                    >
                      <span className={`grid size-5 place-items-center rounded-md border-2 ${on ? "bg-accent border-transparent text-on-accent" : "border-line"}`}>
                        {on && <Check size={12} weight="bold" />}
                      </span>
                      <Icon size={16} className="hc-text" /> {g.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
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
          day={day}
          today={today}
          items={itemsOf(day)}
          onToggle={(i) => onToggle(i, day)}
          onAdd={() => onAdd(day)}
          onEdit={onEdit}
        />
      </div>

      {/* 768px+: seven columns side by side */}
      <div ref={scroller} className="mt-5 hidden snap-x gap-3 overflow-x-auto pb-3 md:flex" style={{ scrollbarWidth: "thin" }}>
        {days.map((k) => (
          <DayColumn
            key={k}
            className="w-[236px] shrink-0 snap-start"
            day={k}
            today={today}
            items={itemsOf(k)}
            onToggle={(i) => onToggle(i, k)}
            onAdd={() => onAdd(k)}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  )
}
