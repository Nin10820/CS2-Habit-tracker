import { addDays, range, type DayKey } from "./date"
import type { AppData, Habit } from "./types"

type Checks = Record<DayKey, true> | undefined

/** Days in a row, ending today. If today isn't done yet, the streak still counts up to yesterday. */
export function currentStreak(checks: Checks, today: DayKey): number {
  if (!checks) return 0
  let day = checks[today] ? today : addDays(today, -1)
  let n = 0
  while (checks[day]) {
    n++
    day = addDays(day, -1)
  }
  return n
}

export function bestStreak(checks: Checks): number {
  if (!checks) return 0
  const days = Object.keys(checks).sort()
  let best = 0
  let run = 0
  let prev: DayKey | null = null
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

const isActive = (h: Habit, day: DayKey) => h.createdAt <= day

/** Done and possible check-ins for a set of habits over a span of days (future days ignored). */
export function completion(data: AppData, habits: Habit[], from: DayKey, to: DayKey, today: DayKey) {
  let done = 0
  let possible = 0
  const end = to < today ? to : today
  if (from > end) return { done, possible, rate: null as number | null }
  for (const day of range(from, end)) {
    for (const h of habits) {
      if (!isActive(h, day)) continue
      possible++
      if (data.checks[h.id]?.[day]) done++
    }
  }
  return { done, possible, rate: possible ? done / possible : null }
}

export function totalCheckIns(data: AppData): number {
  return data.habits.reduce((sum, h) => sum + Object.keys(data.checks[h.id] ?? {}).length, 0)
}

export const pct = (rate: number | null) => (rate === null ? "–" : `${Math.round(rate * 100)}%`)
