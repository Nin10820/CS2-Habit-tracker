import { Fire, Moon, MoonStars, Timer, type Icon } from "@phosphor-icons/react"
import { addDays, formatDow, formatLong, isoWeek, weekOf, type DayKey } from "../lib/date"
import { allHabitsStreak, dayTotals } from "../lib/stats"
import type { AppData } from "../lib/types"
import { Ring } from "./ui"

/** "3h 40m", "45m", "0m". */
const fmtTime = (m: number) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`)
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const fmtClock = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
/** Bedtime in minutes on the evening's own scale: 00:30 counts as 24:30, later than 23:45. */
const bedMin = (t: string) => {
  const m = toMin(t)
  return m < 12 * 60 ? m + 24 * 60 : m
}

/**
 * The top of the 7-day board, one card: the time now and what's left today, the week's % done,
 * four small numbers (focus time, streak, earliest bedtime, nights with 8h+ of sleep), and a line
 * of the share of tasks done each day, Monday to Sunday. Only days up to today count.
 */
export function WeekSummary({ data, today, anchor, clock }: { data: AppData; today: DayKey; anchor: DayKey; clock: string }) {
  const days = weekOf(anchor)
  const week = days.map((d) => ({ d, ...dayTotals(data, d, today) }))
  const counted = week.filter((w) => w.rate !== null)
  const done = counted.reduce((s, w) => s + w.done, 0)
  const total = counted.reduce((s, w) => s + w.total, 0)
  const rate = total ? done / total : null
  const isThisWeek = days.includes(today)
  const t = dayTotals(data, today, today)
  const left = t.total - t.done

  // Focus clock time, Monday to today.
  const focusMin = Math.round(days.filter((d) => d <= today).reduce((s, d) => s + (data.focus?.[d] ?? 0), 0) / 60)
  const streak = allHabitsStreak(data, today)

  // Sleep, from the "Đi ngủ" (evening) and "Thức dậy" (morning) moments: a night is the bedtime on
  // a day and the wake-up the next morning.
  const sleepItem = data.routine.items.find((i) => i.daily && i.when === "evening")
  const wakeItem = data.routine.items.find((i) => i.daily && i.when === "morning")
  const beds = days
    .filter((d) => d <= today)
    .map((d) => ({ d, t: sleepItem ? data.routine.log[sleepItem.id]?.[d] : undefined }))
    .filter((b): b is { d: DayKey; t: string } => !!b.t)
  const earliest = beds.reduce<{ d: DayKey; m: number } | null>((e, b) => (!e || bedMin(b.t) < e.m ? { d: b.d, m: bedMin(b.t) } : e), null)
  const nights = beds.flatMap((b) => {
    const w = wakeItem ? data.routine.log[wakeItem.id]?.[addDays(b.d, 1)] : undefined
    if (!w) return []
    const slept = toMin(w) + 24 * 60 - bedMin(b.t)
    return slept > 0 && slept < 16 * 60 ? [slept] : []
  })
  const fullNights = nights.filter((m) => m >= 8 * 60).length

  const stats: { icon: Icon; label: string; value: string; tone?: string }[] = [
    { icon: Timer, label: "Focus time", value: fmtTime(focusMin) },
    { icon: Fire, label: "Streak", value: `${streak} ${streak === 1 ? "day" : "days"}`, tone: "text-flame" },
    { icon: Moon, label: "Earliest bedtime", value: earliest ? `${fmtClock(earliest.m)} · ${formatDow(earliest.d)}` : "Not logged" },
    { icon: MoonStars, label: "8h+ nights", value: nights.length ? `${fullNights} of ${nights.length}` : "Not logged" },
  ]

  return (
    <section aria-label={`Week ${isoWeek(anchor)} summary`} className="@container border-b border-line bg-surface">
      <div className="flex items-stretch divide-x divide-line px-4 py-4">
        {/* Now: the time, today's date and how much is left today. */}
        <div className="flex shrink-0 flex-col justify-center pr-6">
          <p className="text-xs font-semibold tracking-wider text-ink-3 uppercase">Now</p>
          <p className="mt-0.5 font-title text-[30px] leading-9 font-semibold tabular-nums" aria-label={`Current time ${clock}`}>
            {clock}
          </p>
          <p className="text-xs text-ink-3">{formatLong(today)}</p>
          <p className="mt-1 text-xs font-medium text-accent tabular-nums">
            {t.total === 0 ? "Nothing planned today" : left === 0 ? "All done today" : `${left} ${left === 1 ? "task" : "tasks"} left today`}
          </p>
        </div>

        {/* The week: % done so far in a ring. */}
        <div className="flex shrink-0 items-center gap-3 px-6">
          <div className="relative grid place-items-center">
            <Ring value={rate} size={64} stroke={6} />
            <span className="absolute font-title text-base font-semibold tabular-nums">{rate === null ? "–" : `${Math.round(rate * 100)}%`}</span>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-ink-3 uppercase">Week {isoWeek(anchor)}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">{total ? `${done} of ${total} tasks` : "No tasks yet"}</p>
            <p className="text-xs text-ink-3">{isThisWeek ? "Monday to today" : "That week"}</p>
          </div>
        </div>

        {/* Four small numbers; they step aside when the board is narrow. */}
        <dl className="grid shrink-0 grid-cols-2 gap-2 px-6 @max-[64rem]:hidden">
          {stats.map(({ icon: I, label, value, tone }) => (
            <div key={label} className="flex min-w-[156px] items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2">
              <I size={18} weight={tone ? "fill" : "regular"} className={tone ?? "text-ink-3"} aria-hidden />
              <div className="min-w-0">
                <dt className="text-[11px] leading-4 text-ink-3">{label}</dt>
                <dd className="truncate text-sm leading-5 font-semibold tabular-nums">{value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <DoneLine week={week} today={today} />
      </div>
    </section>
  )
}

/**
 * Share of tasks done each day as a line. The line and its soft fill are an SVG stretched to the
 * box; the dots and labels are HTML on top, so they keep their shape at any width.
 */
function DoneLine({ week, today }: { week: { d: DayKey; done: number; total: number; rate: number | null }[]; today: DayKey }) {
  const x = (i: number) => ((i + 0.5) / week.length) * 100
  const y = (rate: number) => 90 - rate * 80 // 10% headroom, 10% floor
  const pts = week.flatMap((w, i) => (w.rate === null ? [] : [{ i, x: x(i), y: y(w.rate), w }]))
  const line = pts.map((p, k) => `${k ? "L" : "M"}${p.x},${p.y}`).join(" ")
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1].x},100 L${pts[0].x},100 Z` : ""

  return (
    <div className="flex min-w-[260px] flex-1 flex-col pl-6">
      <p className="text-xs font-semibold tracking-wider text-ink-3 uppercase">Done each day</p>
      <div className="relative mt-2 min-h-16 flex-1" role="img" aria-label={`Share of tasks done each day: ${pts.map((p) => `${formatDow(p.w.d)} ${Math.round(p.w.rate! * 100)}%`).join(", ") || "no days yet"}`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {[10, 50, 90].map((g) => (
            <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="var(--border)" strokeDasharray={g === 90 ? undefined : "2 3"} vectorEffect="non-scaling-stroke" />
          ))}
          {area && <path d={area} fill="color-mix(in oklab, var(--accent) 12%, transparent)" />}
          {pts.length > 1 && <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {pts.map((p) => {
          const isToday = p.w.d === today
          return (
            <span key={p.w.d} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }} title={`${formatDow(p.w.d)}: ${p.w.done} of ${p.w.total} done`}>
              <span className={`absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[10.5px] font-semibold whitespace-nowrap tabular-nums ${isToday ? "text-accent" : "text-ink-3"}`}>
                {Math.round(p.w.rate! * 100)}%
              </span>
              <span className={`block rounded-full border-2 border-surface ${isToday ? "size-3.5 bg-accent" : "size-2.5 bg-[color-mix(in_oklab,var(--accent)_55%,var(--surface))]"}`} />
            </span>
          )
        })}
      </div>
      <div className="mt-1.5 grid" style={{ gridTemplateColumns: `repeat(${week.length}, minmax(0, 1fr))` }}>
        {week.map((w) => (
          <span key={w.d} className="flex justify-center">
            <span className={`rounded-full px-1.5 text-[11px] leading-4 ${w.d === today ? "bg-accent font-semibold text-on-accent" : w.rate === null ? "text-ink-3/60" : "text-ink-3"}`}>
              {formatDow(w.d).slice(0, 2)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
