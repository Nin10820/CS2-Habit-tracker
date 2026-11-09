import { SunHorizon } from "@phosphor-icons/react"
import { useState } from "react"
import { addDays, dayOfMonth, formatDow, range, type DayKey } from "../lib/date"
import { dayTotals } from "../lib/stats"
import type { AppData } from "../lib/types"
import { Card } from "./ui"

const DAYS = 14
const W = 300 // viewBox width; the svg scales to the card
const PAD_L = 34
const PAD_R = 8
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`
const pctText = (r: number) => `${Math.round(r * 100)}%`

type Row = { d: DayKey; wake?: number; done: number; total: number; rate: number | null }

/** Short line key in a series colour, for readouts and the table header. */
const Key = ({ color }: { color: string }) => <span className="inline-block h-0.5 w-3 shrink-0 rounded-full align-middle" style={{ background: color }} aria-hidden />

/**
 * Wake-up time next to how the day went, over the last 14 days:
 * two charts on the same days (wake time as dots, share of tasks done as bars; one scale each, never a
 * second axis), a dot plot of wake time against share done, and the average share done on days you got
 * up earlier vs later than your usual time. Hover or focus a day for its numbers; a table has them all.
 */
export function WakeCharts({ data, today }: { data: AppData; today: DayKey }) {
  const wakeItem = data.routine.items.find((i) => i.daily && i.when === "morning")
  const rows: Row[] = range(addDays(today, -(DAYS - 1)), today).map((d) => {
    const t = wakeItem ? data.routine.log[wakeItem.id]?.[d] : undefined
    return { d, wake: t ? toMin(t) : undefined, ...dayTotals(data, d, today) }
  })
  const logged = rows.filter((r) => r.wake !== undefined)
  const [hover, setHover] = useState<number | null>(null)
  // Readout: the hovered day, else the latest day with a wake time, else today.
  const shown = hover ?? (logged.length ? rows.indexOf(logged[logged.length - 1]) : DAYS - 1)
  const s = rows[shown]

  // Shared x: one slot per day.
  const slot = (W - PAD_L - PAD_R) / DAYS
  const cx = (i: number) => PAD_L + slot * (i + 0.5)

  // Wake chart y: earlier at the top, padded to whole half-hours.
  const wakes = logged.map((r) => r.wake!)
  const lo = wakes.length ? Math.floor((Math.min(...wakes) - 15) / 30) * 30 : 5 * 60
  const hi = wakes.length ? Math.ceil((Math.max(...wakes) + 15) / 30) * 30 : 8 * 60
  const HA = 92
  const TA = 8
  const BA = 8
  const yWake = (m: number) => TA + ((m - lo) / Math.max(1, hi - lo)) * (HA - TA - BA)

  // Done chart y: 0–100%.
  const HB = 92
  const TB = 6
  const BB = 22
  const yDone = (r: number) => TB + (1 - r) * (HB - TB - BB)

  // Earlier vs later than your usual (median) wake time, on days with both numbers.
  const both = logged.filter((r) => r.rate !== null)
  const sorted = [...both].map((r) => r.wake!).sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : undefined
  const avg = (xs: Row[]) => (xs.length ? xs.reduce((a, r) => a + (r.rate ?? 0), 0) / xs.length : null)
  const early = median !== undefined ? both.filter((r) => r.wake! <= median) : []
  const late = median !== undefined ? both.filter((r) => r.wake! > median) : []
  const enough = early.length >= 2 && late.length >= 2

  // Dot plot: wake time across, share done up.
  const HS = 150
  const TS = 8
  const BS = 24
  const xs = (m: number) => PAD_L + ((m - lo) / Math.max(1, hi - lo)) * (W - PAD_L - PAD_R)
  const ys = (r: number) => TS + (1 - r) * (HS - TS - BS)
  const ticks = [lo, Math.round((lo + hi) / 60 / 2) * 60, hi].filter((v, i, a) => a.indexOf(v) === i)

  const hit = (i: number) => ({
    onPointerEnter: () => setHover(i),
    onPointerLeave: () => setHover(null),
    onFocus: () => setHover(i),
    onBlur: () => setHover(null),
  })
  const band = (i: number, h: number) =>
    hover === i ? <rect x={cx(i) - slot / 2} y={0} width={slot} height={h} fill="var(--surface-2)" aria-hidden /> : null

  if (!wakeItem) return null

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">
            <SunHorizon size={16} /> Wake-up &amp; your day
          </p>
          <p className="mt-1 text-xs text-ink-3">Last {DAYS} days</p>
        </div>
      </div>

      {logged.length === 0 ? (
        <p className="mt-4 rounded-2xl border-2 border-dashed border-line px-3 py-4 text-center text-sm text-ink-3">
          Log when you get up for a few days to see how it shapes your day.
        </p>
      ) : (
        <>
          {/* Readout for the hovered (or latest) day: values lead, labels follow. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-3" aria-live="polite">
            <span className="font-medium text-ink-2">
              {formatDow(s.d)} {dayOfMonth(s.d)}
            </span>
            <span className="flex items-center gap-1.5">
              <Key color="var(--chart-wake)" />
              <strong className="font-semibold text-ink tabular-nums">{s.wake !== undefined ? hhmm(s.wake) : "–"}</strong> woke
            </span>
            <span className="flex items-center gap-1.5">
              <Key color="var(--chart-done)" />
              <strong className="font-semibold text-ink tabular-nums">{s.rate !== null ? pctText(s.rate) : "–"}</strong> done
              <span className="tabular-nums">
                ({s.done}/{s.total})
              </span>
            </span>
          </div>

          {/* Chart 1: wake time per day */}
          <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-ink-2">
            <Key color="var(--chart-wake)" /> Woke up at
          </p>
          <svg viewBox={`0 0 ${W} ${HA}`} className="mt-1 w-full overflow-visible" role="img" aria-label={`Wake-up time, last ${DAYS} days`}>
            {rows.map((_, i) => band(i, HA))}
            {[lo, hi].map((m) => (
              <g key={m}>
                <line x1={PAD_L} x2={W - PAD_R} y1={yWake(m)} y2={yWake(m)} stroke="var(--border)" strokeWidth="1" />
                <text x={PAD_L - 6} y={yWake(m) + 3} textAnchor="end" fontSize="9" fill="var(--text-3)">
                  {hhmm(m)}
                </text>
              </g>
            ))}
            {/* Line through consecutive logged days; a missing day breaks it. */}
            <path
              d={rows
                .map((r, i) => (r.wake === undefined ? "" : `${i > 0 && rows[i - 1].wake !== undefined ? "L" : "M"}${cx(i)},${yWake(r.wake)}`))
                .join(" ")}
              fill="none"
              stroke="var(--chart-wake)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {rows.map((r, i) =>
              r.wake === undefined ? null : (
                <circle key={r.d} cx={cx(i)} cy={yWake(r.wake)} r={hover === i ? 5 : 4} fill="var(--chart-wake)" stroke="var(--surface)" strokeWidth="2" />
              ),
            )}
            {rows.map((r, i) => (
              <rect key={r.d} x={cx(i) - slot / 2} y={0} width={slot} height={HA} fill="transparent" tabIndex={0} aria-label={`${formatDow(r.d)} ${dayOfMonth(r.d)}`} {...hit(i)} />
            ))}
          </svg>

          {/* Chart 2: share of tasks done per day, same days */}
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-2">
            <Key color="var(--chart-done)" /> Tasks done
          </p>
          <svg viewBox={`0 0 ${W} ${HB}`} className="mt-1 w-full overflow-visible" role="img" aria-label={`Share of tasks done, last ${DAYS} days`}>
            {rows.map((_, i) => band(i, HB - BB + 4))}
            {[0, 0.5, 1].map((r) => (
              <g key={r}>
                <line x1={PAD_L} x2={W - PAD_R} y1={yDone(r)} y2={yDone(r)} stroke="var(--border)" strokeWidth="1" />
                <text x={PAD_L - 6} y={yDone(r) + 3} textAnchor="end" fontSize="9" fill="var(--text-3)">
                  {r * 100}%
                </text>
              </g>
            ))}
            {rows.map((r, i) => {
              if (r.rate === null || r.rate === 0) return null
              const top = yDone(r.rate)
              const bw = slot - 4 // 2px surface gap each side
              const h = yDone(0) - top
              const rad = Math.min(4, h, bw / 2)
              const x0 = cx(i) - bw / 2
              // Rounded top, square base on the baseline.
              const d = `M${x0},${yDone(0)} V${top + rad} Q${x0},${top} ${x0 + rad},${top} H${x0 + bw - rad} Q${x0 + bw},${top} ${x0 + bw},${top + rad} V${yDone(0)} Z`
              return <path key={r.d} d={d} fill="var(--chart-done)" opacity={hover === null || hover === i ? 1 : 0.55} />
            })}
            {rows.map((r, i) => (
              <text
                key={r.d}
                x={cx(i)}
                y={HB - 6}
                textAnchor="middle"
                fontSize="9"
                fontWeight={r.d === today ? 600 : 400}
                fill={r.d === today ? "var(--text)" : "var(--text-3)"}
              >
                {i % 2 === (DAYS - 1) % 2 ? dayOfMonth(r.d) : ""}
              </text>
            ))}
            {rows.map((r, i) => (
              <rect key={r.d} x={cx(i) - slot / 2} y={0} width={slot} height={HB} fill="transparent" aria-hidden {...hit(i)} />
            ))}
          </svg>

          {/* Figures: earlier vs later than usual */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(
              [
                ["Earlier than usual", early],
                ["Later than usual", late],
              ] as const
            ).map(([label, set]) => (
              <div key={label} className="rounded-2xl bg-surface-2 px-3 py-2.5">
                <p className="text-xs text-ink-3">{label}</p>
                <p className="mt-0.5 font-title text-2xl font-semibold tabular-nums">{enough ? pctText(avg(set)!) : "–"}</p>
                <p className="text-xs text-ink-3">{enough ? `avg done · ${set.length} days` : "needs a few more days"}</p>
              </div>
            ))}
          </div>
          {median !== undefined && <p className="mt-1.5 text-xs text-ink-3">Usual wake-up: {hhmm(median)} (your middle time).</p>}

          {/* Chart 3: wake time vs share done, one dot per day */}
          {both.length >= 2 && (
            <>
              <p className="mt-4 text-xs font-medium text-ink-2">Wake-up time vs tasks done</p>
              <svg viewBox={`0 0 ${W} ${HS}`} className="mt-1 w-full overflow-visible" role="img" aria-label="Each day: wake-up time against share of tasks done">
                {[0, 0.5, 1].map((r) => (
                  <g key={r}>
                    <line x1={PAD_L} x2={W - PAD_R} y1={ys(r)} y2={ys(r)} stroke="var(--border)" strokeWidth="1" />
                    <text x={PAD_L - 6} y={ys(r) + 3} textAnchor="end" fontSize="9" fill="var(--text-3)">
                      {r * 100}%
                    </text>
                  </g>
                ))}
                {ticks.map((m) => (
                  <text key={m} x={xs(m)} y={HS - 6} textAnchor="middle" fontSize="9" fill="var(--text-3)">
                    {hhmm(m)}
                  </text>
                ))}
                {both.map((r) => {
                  const i = rows.indexOf(r)
                  const on = hover === i
                  return (
                    <g key={r.d} {...hit(i)}>
                      <circle cx={xs(r.wake!)} cy={ys(r.rate!)} r="12" fill="transparent" />
                      <circle cx={xs(r.wake!)} cy={ys(r.rate!)} r={on ? 6 : 4.5} fill="var(--chart-done)" stroke="var(--surface)" strokeWidth="2" />
                    </g>
                  )
                })}
              </svg>
              <p className="text-right text-[10px] text-ink-3">woke up at →</p>
            </>
          )}

          {/* Every number, without the charts */}
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer text-ink-3 select-none">Show as table</summary>
            <table className="mt-2 w-full text-left tabular-nums">
              <thead className="text-ink-3">
                <tr>
                  <th className="py-1 font-medium">Day</th>
                  <th className="py-1 font-medium">Woke</th>
                  <th className="py-1 font-medium">Tasks</th>
                  <th className="py-1 text-right font-medium">Done</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.d} className="border-t border-line text-ink-2">
                    <td className="py-1">
                      {formatDow(r.d)} {dayOfMonth(r.d)}
                    </td>
                    <td className="py-1">{r.wake !== undefined ? hhmm(r.wake) : "–"}</td>
                    <td className="py-1">
                      {r.done}/{r.total}
                    </td>
                    <td className="py-1 text-right">{r.rate !== null ? pctText(r.rate) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Card>
  )
}
