import { useEffect, useRef } from "react"
import { dayOfMonth, formatDow, formatLong, monthGrid, type DayKey } from "../lib/date"
import { blocksForDay } from "../lib/stats"
import { colorVar, type AppData, type DayBlock } from "../lib/types"

/** What a calendar block opens: a group card focuses the group, a single card focuses its item. */
export type OpenBlock = (block: DayBlock, day: DayKey) => void

const HOUR = 48 // px per hour in the week grid
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const blockMinutes = (b: DayBlock) => (b.kind === "group" ? b.items.reduce((s, i) => s + (i.minutes ?? 0), 0) : (b.item.minutes ?? 0)) || 30
const blockGroup = (b: DayBlock) => (b.kind === "group" ? b.group : b.item.group)
const blockName = (b: DayBlock) => (b.kind === "group" ? b.group.label : b.item.name)
const blockDone = (b: DayBlock) => (b.kind === "group" ? b.items.length > 0 && b.items.every((i) => i.done) : b.item.done)

/** Places timed blocks side by side where they overlap: each gets a lane and the lane count of its cluster. */
function layout(blocks: DayBlock[]) {
  const timed = blocks
    .filter((b) => b.time)
    .map((b) => ({ b, start: toMin(b.time!), end: toMin(b.time!) + blockMinutes(b) }))
    .sort((a, b) => a.start - b.start)
  const out: { b: DayBlock; start: number; end: number; lane: number; lanes: number }[] = []
  let cluster: typeof out = []
  let clusterEnd = -1
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1))
    cluster.forEach((c) => out.push({ ...c, lanes }))
    cluster = []
  }
  for (const e of timed) {
    if (e.start >= clusterEnd) flush()
    const used = new Set(cluster.filter((c) => c.end > e.start).map((c) => c.lane))
    let lane = 0
    while (used.has(lane)) lane++
    cluster.push({ ...e, lane, lanes: 1 })
    clusterEnd = Math.max(clusterEnd, e.end)
  }
  flush()
  return out
}

/** Day heading in Apple style: weekday, then the date; today's date in a red circle. */
function DayHead({ day, today, onPick }: { day: DayKey; today: DayKey; onPick: () => void }) {
  const isToday = day === today
  return (
    <button onClick={onPick} title={`Open ${formatLong(day)}`} className="flex items-center justify-center gap-1.5 py-2 text-sm">
      <span className={isToday ? "font-semibold text-now" : "text-ink-2"}>{formatDow(day)}</span>
      <span
        className={`grid size-7 place-items-center rounded-full font-semibold tabular-nums ${isToday ? "bg-now text-white" : "text-ink"}`}
      >
        {dayOfMonth(day)}
      </span>
    </button>
  )
}

/**
 * Week as a time grid, like Apple Calendar: hours down the side, one column per day, each card as a
 * block at its time and as long as its tasks. Cards without a time sit in the all-day row. A red line marks now.
 */
export function WeekGrid({
  days,
  today,
  now,
  data,
  onOpen,
  onPickDay,
}: {
  days: DayKey[]
  today: DayKey
  /** "HH:MM" */
  now: string
  data: AppData
  onOpen: OpenBlock
  onPickDay: (day: DayKey) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const perDay = days.map((d) => ({ day: d, blocks: blocksForDay(data, d) }))
  const allDay = perDay.some((p) => p.blocks.some((b) => !b.time))
  const nowMin = toMin(now)

  // Start scrolled to a little before the first card of the week (or 7:00).
  const first = Math.min(7 * 60, ...perDay.flatMap((p) => p.blocks.filter((b) => b.time).map((b) => toMin(b.time!))))
  useEffect(() => {
    scroller.current?.scrollTo({ top: Math.max(0, (first / 60 - 0.5) * HOUR) })
  }, [days[0]]) // only when the week changes

  const cols = "grid grid-cols-[52px_repeat(7,minmax(0,1fr))]"

  return (
    <div className="flex h-[72vh] min-h-0 min-w-[760px] flex-1 flex-col xl:h-auto">
      <div className={`${cols} border-b border-line`}>
        <span />
        {days.map((d) => (
          <DayHead key={d} day={d} today={today} onPick={() => onPickDay(d)} />
        ))}
      </div>

      {allDay && (
        <div className={`${cols} border-b border-line`}>
          <span className="pt-1.5 pr-2 text-right text-[10px] text-ink-3">all-day</span>
          {perDay.map(({ day, blocks }) => (
            <div key={day} className="space-y-0.5 border-l border-line p-1">
              {blocks
                .filter((b) => !b.time)
                .map((b) => (
                  <button
                    key={b.key}
                    onClick={() => onOpen(b, day)}
                    style={{ ["--hc" as string]: colorVar(blockGroup(b).color) }}
                    className={`hc-soft block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-semibold ${blockDone(b) ? "line-through opacity-60" : ""}`}
                  >
                    {blockName(b)}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className={`${cols} relative`} style={{ height: 24 * HOUR }}>
          {/* Hour labels */}
          <div className="relative">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-ink-3 tabular-nums" style={{ top: h * HOUR }}>
                {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </span>
            ))}
            {days.includes(today) && (
              <span
                className="absolute right-1 z-10 -translate-y-1/2 rounded bg-surface px-0.5 text-[10px] font-semibold text-now tabular-nums"
                style={{ top: (nowMin / 60) * HOUR }}
              >
                {now}
              </span>
            )}
          </div>

          {perDay.map(({ day, blocks }) => (
            <div key={day} className="relative border-l border-line">
              {/* Hour lines */}
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="absolute inset-x-0 border-t border-line/70" style={{ top: h * HOUR }} />
              ))}
              {layout(blocks).map(({ b, start, end, lane, lanes }) => {
                const done = blockDone(b)
                const height = Math.max(18, ((end - start) / 60) * HOUR - 2)
                return (
                  <button
                    key={b.key}
                    onClick={() => onOpen(b, day)}
                    title={`${blockName(b)} · ${b.time}`}
                    style={{
                      ["--hc" as string]: colorVar(blockGroup(b).color),
                      top: (start / 60) * HOUR + 1,
                      height,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                    }}
                    className={`hc-soft absolute overflow-hidden rounded-md border-l-[3px] border-[var(--hc)] px-1.5 py-0.5 text-left ${done ? "opacity-55" : ""}`}
                  >
                    <span className={`hc-text block truncate text-[11px] leading-tight font-semibold ${done ? "line-through" : ""}`}>{blockName(b)}</span>
                    {height > 30 && <span className="block truncate text-[10px] leading-tight text-ink-2 tabular-nums">{b.time}</span>}
                  </button>
                )
              })}
              {day === today && (
                <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: (nowMin / 60) * HOUR }}>
                  <div className="h-0.5 bg-now" />
                  <div className="absolute -top-[3px] -left-1 size-2 rounded-full bg-now" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Month as a grid of days, like Apple Calendar: each day lists its cards by time (up to three, then
 * "+ n more"); today's date in a red circle; days of other months faded. Tap a day to open it.
 */
export function MonthGrid({ month, today, data, onPickDay }: { month: DayKey; today: DayKey; data: AppData; onPickDay: (day: DayKey) => void }) {
  const weeks = monthGrid(month)
  const inMonth = (d: DayKey) => d.slice(0, 7) === month.slice(0, 7)
  const MAX = 3

  return (
    <div className="flex min-w-[700px] flex-1 flex-col xl:min-h-0">
      <div className="grid grid-cols-7 border-b border-line">
        {weeks[0].map((d) => (
          <span key={d} className="py-2 pr-2 text-right text-xs text-ink-2">
            {formatDow(d)}
          </span>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(110px, 1fr))` }}>
        {weeks.flat().map((d) => {
          const blocks = blocksForDay(data, d)
          const isToday = d === today
          return (
            <button
              key={d}
              onClick={() => onPickDay(d)}
              title={`Open ${formatLong(d)}`}
              className={`flex min-w-0 flex-col border-r border-b border-line p-1 text-left hover:bg-surface-2/60 ${inMonth(d) ? "" : "bg-surface-2/40"}`}
            >
              <span className="flex justify-end">
                <span
                  className={`grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums ${
                    isToday ? "bg-now text-white" : inMonth(d) ? "text-ink" : "text-ink-3"
                  }`}
                >
                  {dayOfMonth(d)}
                </span>
              </span>
              <span className="mt-0.5 flex min-w-0 flex-col gap-px">
                {blocks.slice(0, MAX).map((b) => (
                  <span
                    key={b.key}
                    style={{ ["--hc" as string]: colorVar(blockGroup(b).color) }}
                    className={`flex min-w-0 items-center gap-1 text-[11px] leading-4 ${inMonth(d) ? "" : "opacity-50"} ${blockDone(b) ? "text-ink-3 line-through" : "text-ink"}`}
                  >
                    <span className="hc-fill size-1.5 shrink-0 rounded-full" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{blockName(b)}</span>
                    {b.time && <span className="shrink-0 text-[10px] text-ink-3 tabular-nums">{b.time}</span>}
                  </span>
                ))}
                {blocks.length > MAX && <span className="pl-2.5 text-[10px] text-ink-3">+ {blocks.length - MAX} more</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
