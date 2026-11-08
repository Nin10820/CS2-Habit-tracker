import { ChartBar, Fire } from "@phosphor-icons/react"
import { useState, type ReactNode } from "react"
import { Bar, Card, SectionTitle } from "../components/ui"
import { addDays, formatDow, formatMonth, formatShort, range, startOfMonth, startOfWeek, type DayKey } from "../lib/date"
import { bestStreak, completion, currentStreak, pct, totalCheckIns } from "../lib/stats"
import type { AppData } from "../lib/types"
import { colorVar } from "../lib/types"

/** Week/month numbers, 30-day chart and per-habit breakdown. Shown under the Today list (beside it on wide screens). */
export function StatsPanel({ data, today }: { data: AppData; today: DayKey }) {
  if (data.habits.length === 0) return null

  const week = completion(data, data.habits, startOfWeek(today), today, today)
  const month = completion(data, data.habits, startOfMonth(today), today, today)
  const streaks = data.habits.map((h) => ({ h, cur: currentStreak(data.checks[h.id], today), best: bestStreak(data.checks[h.id]) }))
  const top = streaks.reduce((a, b) => (b.cur > a.cur ? b : a))

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 pt-2 text-xl font-semibold lg:pt-0">
        <ChartBar size={22} className="text-accent" /> Progress
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
        <Kpi label="This week" value={pct(week.rate)} sub={`${week.done} of ${week.possible} check-ins`} />
        <Kpi label={formatMonth(today)} value={pct(month.rate)} sub={`${month.done} of ${month.possible} check-ins`} />
        <Kpi
          label="Longest streak now"
          value={
            <span className="inline-flex items-center gap-1">
              {top.cur}
              <Fire size={20} weight="fill" className="text-flame" />
            </span>
          }
          sub={top.cur > 0 ? top.h.name : "Check in today to start one"}
        />
        <Kpi label="All check-ins" value={String(totalCheckIns(data))} sub={`${data.habits.length} habit${data.habits.length === 1 ? "" : "s"}`} />
      </div>

      <DailyChart data={data} today={today} />

      <Card>
        <SectionTitle right={<span className="text-xs text-ink-3">Last 30 days</span>}>By habit</SectionTitle>
        <ul className="divide-y divide-line">
          {streaks.map(({ h, cur, best }) => {
            const r = completion(data, [h], addDays(today, -29), today, today)
            return (
              <li key={h.id} className="py-3 first:pt-1 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorVar(h.color) }} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{h.name}</span>
                  <span className="font-title text-base font-semibold">{pct(r.rate)}</span>
                </div>
                <div className="mt-2">
                  <Bar value={r.rate ?? 0} color={colorVar(h.color)} />
                </div>
                <div className="mt-2 flex gap-4 text-xs text-ink-3">
                  <span>
                    Current <b className="font-semibold text-ink-2">{cur}</b>
                  </span>
                  <span>
                    Best <b className="font-semibold text-ink-2">{best}</b>
                  </span>
                  <span>
                    Done <b className="font-semibold text-ink-2">{r.done}</b>/{r.possible}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: ReactNode; sub: string }) {
  return (
    <Card className="!p-4">
      <p className="text-xs font-medium text-ink-3">{label}</p>
      <p className="mt-1 font-title text-[28px] leading-tight font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-ink-2" title={sub}>
        {sub}
      </p>
    </Card>
  )
}

/** 30 bars, one per day: share of habits done that day. Tap a bar to read it. */
function DailyChart({ data, today }: { data: AppData; today: DayKey }) {
  const days = range(addDays(today, -29), today)
  const rows = days.map((d) => ({ d, ...completion(data, data.habits, d, d, today) }))
  const [sel, setSel] = useState<DayKey>(today)
  const s = rows.find((r) => r.d === sel) ?? rows[rows.length - 1]
  const avg = completion(data, data.habits, days[0], today, today)

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-ink-3">Avg {pct(avg.rate)}</span>}>Last 30 days</SectionTitle>
      <div className="relative h-36">
        {[0.5, 1].map((g) => (
          <div key={g} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${g * 100}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-[3px]">
          {rows.map((r) => {
            const on = r.d === s.d
            return (
              <button
                key={r.d}
                onClick={() => setSel(r.d)}
                aria-label={`${formatShort(r.d)}: ${r.possible ? `${r.done} of ${r.possible} done` : "no habits yet"}`}
                aria-pressed={on}
                className="group flex h-full min-w-0 flex-1 items-end"
              >
                <span
                  className="w-full rounded-t-[3px] transition-[height,background-color]"
                  style={{
                    height: r.possible ? `${Math.max(r.rate ?? 0, 0.03) * 100}%` : "2px",
                    background: !r.possible
                      ? "var(--border)"
                      : on
                        ? "var(--accent)"
                        : "color-mix(in oklab, var(--accent) 45%, var(--surface-2))",
                  }}
                />
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-3">
        <span>{formatShort(days[0])}</span>
        <span>Today</span>
      </div>
      <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm" aria-live="polite">
        <b className="font-semibold">
          {formatDow(s.d)}, {formatShort(s.d)}
        </b>
        <span className="text-ink-2">
          {" · "}
          {s.possible ? `${s.done} of ${s.possible} done (${pct(s.rate)})` : "No habits yet"}
        </span>
      </p>
    </Card>
  )
}
