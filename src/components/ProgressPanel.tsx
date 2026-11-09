import { ChartBar, CheckSquare, Clock, Fire, Target, TrendUp } from "@phosphor-icons/react"
import { DAILY_GOAL } from "../config/groups"
import { useClock } from "../lib/clock"
import { formatDow, weekOf, type DayKey } from "../lib/date"
import { allHabitsStreak, dayTotals, pct } from "../lib/stats"
import type { AppData } from "../lib/types"
import { Bar, Card } from "./ui"
import { WakeCharts } from "./WakeCharts"

const Label = ({ icon: Icon, children }: { icon: typeof Target; children: string }) => (
  <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">
    <Icon size={16} /> {children}
  </p>
)

/** "Your progress": today vs. the daily goal, this week's bars and trend, weekly total and streak. */
export function ProgressPanel({ data, today, showTitle = true }: { data: AppData; today: DayKey; showTitle?: boolean }) {
  const clock = useClock()
  const week = weekOf(today).map((d) => ({ d, ...dayTotals(data, d, today) }))
  const t = week.find((w) => w.d === today)!
  const weekDone = week.reduce((s, w) => s + (w.d <= today ? w.done : 0), 0)
  const streak = allHabitsStreak(data, today)

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between gap-3 xl:h-16">
          <h2 className="text-2xl font-semibold">Your progress</h2>
          <span className="flex items-center gap-1.5 text-base text-ink-2 tabular-nums">
            <Clock size={18} /> {clock}
          </span>
        </div>
      )}

      <Card>
        <Label icon={Target}>Daily goal</Label>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="font-title text-2xl font-semibold">
            {t.done} / {DAILY_GOAL} tasks
          </p>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
            {Math.round(Math.min(1, t.done / DAILY_GOAL) * 100)}%
          </span>
        </div>
        <div className="mt-3">
          <Bar value={Math.min(1, t.done / DAILY_GOAL)} />
        </div>
        <p className="mt-2 text-xs text-ink-3">{t.total} planned today</p>
      </Card>

      <WeekBars week={week} today={today} />
      <TrendLine week={week} today={today} />
      <WakeCharts data={data} today={today} />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-accent-soft p-4">
          <CheckSquare size={22} className="text-accent" />
          <p className="mt-2 font-title text-3xl font-semibold">{weekDone}</p>
          <p className="text-sm text-accent">tasks this week</p>
          <p className="mt-0.5 text-xs text-ink-3">Done, Monday to today</p>
        </div>
        <div className="rounded-3xl p-4" style={{ background: "color-mix(in oklab, var(--flame) 14%, var(--surface))" }}>
          <Fire size={22} weight="fill" className="text-flame" />
          <p className="mt-2 font-title text-3xl font-semibold">{streak}-day</p>
          <p className="text-sm text-flame">streak</p>
          <p className="mt-0.5 text-xs text-ink-3">Days with every habit done</p>
        </div>
      </div>
    </div>
  )
}

type WeekRow = { d: DayKey; done: number; total: number; rate: number | null }

/** Completed tasks per day this week, with the daily goal as a dashed line. */
function WeekBars({ week, today }: { week: WeekRow[]; today: DayKey }) {
  const max = Math.max(DAILY_GOAL, ...week.map((w) => w.done), 1)
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <Label icon={ChartBar}>Completed this week</Label>
        <span className="text-xs text-ink-3">Goal: {DAILY_GOAL}</span>
      </div>
      <div className="relative mt-4 h-32">
        <div className="absolute inset-x-0 border-t-2 border-dashed border-line" style={{ bottom: `${(DAILY_GOAL / max) * 100}%` }} aria-hidden />
        <div className="absolute inset-0 flex items-end gap-2">
          {week.map((w) => {
            // Future days and days before you started using the app have no data yet.
            const future = w.rate === null && w.d !== today
            return (
              <div key={w.d} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${formatDow(w.d)}: ${w.done} done`}>
                {!future && <span className="mb-1 text-center text-xs font-semibold text-ink-2">{w.done}</span>}
                <span
                  className="w-full rounded-t-lg"
                  style={{
                    height: future ? "3px" : `${Math.max(w.done / max, 0.03) * 100}%`,
                    background: future ? "var(--border)" : w.d === today ? "var(--accent)" : "color-mix(in oklab, var(--accent) 35%, var(--surface-2))",
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {week.map((w) => (
          <span key={w.d} className={`flex-1 text-center text-xs ${w.d === today ? "font-semibold text-accent" : "text-ink-3"}`}>
            {formatDow(w.d)}
          </span>
        ))}
      </div>
    </Card>
  )
}

/** Share of the day's tasks done, Monday to today. Real data only; future days stay empty. */
function TrendLine({ week, today }: { week: WeekRow[]; today: DayKey }) {
  const W = 300
  const H = 140
  const pad = { l: 34, r: 12, t: 8, b: 28 }
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / 6
  const y = (r: number) => pad.t + (1 - r) * (H - pad.t - pad.b)
  const pts = week.map((w, i) => ({ i, r: w.rate })).filter((p): p is { i: number; r: number } => p.r !== null)
  const line = pts.map((p, k) => `${k ? "L" : "M"}${x(p.i)},${y(p.r)}`).join(" ")
  const area = pts.length > 1 ? `${line} L${x(pts[pts.length - 1].i)},${y(0)} L${x(pts[0].i)},${y(0)} Z` : ""
  const avg = pts.length ? pts.reduce((s, p) => s + p.r, 0) / pts.length : null

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label icon={TrendUp}>Completion rate</Label>
          <p className="mt-1 text-xs text-ink-3">Share of each day's tasks done</p>
        </div>
        <span className="text-xs text-ink-3">Avg {pct(avg)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Completion rate this week, average ${pct(avg)}`}>
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((r) => (
          <g key={r}>
            <line x1={pad.l} x2={W - pad.r} y1={y(r)} y2={y(r)} stroke="var(--border)" strokeDasharray={r ? "3 4" : undefined} />
            <text x={pad.l - 6} y={y(r) + 4} textAnchor="end" fontSize="10" fill="var(--text-3)">
              {r * 100}%
            </text>
          </g>
        ))}
        {area && <path d={area} fill="url(#trend-fill)" />}
        {pts.length > 1 && <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {pts.map((p) => (
          <circle key={p.i} cx={x(p.i)} cy={y(p.r)} r="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
        ))}
        {week.map((w, i) => (
          <text
            key={w.d}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fontWeight={w.d === today ? 600 : 400}
            fill={w.d === today ? "var(--accent)" : "var(--text-3)"}
          >
            {formatDow(w.d)}
          </text>
        ))}
      </svg>
    </Card>
  )
}
