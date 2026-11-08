import { GROUPS } from "../config/groups"
import { addDays, weekdayId, type DayKey } from "./date"
import type { AppData, DayItem } from "./types"

const groupById = new Map(GROUPS.map((g) => [g.id, g]))

/** Config habits scheduled on this weekday, plus the day's one-off tasks, sorted by time. */
export function itemsForDay(data: AppData, day: DayKey): DayItem[] {
  const wd = weekdayId(day)
  const items: DayItem[] = []
  for (const g of GROUPS) {
    for (const h of g.habits) {
      if (h.days && !h.days.includes(wd)) continue
      items.push({ kind: "habit", id: h.id, name: h.name, time: h.time, minutes: h.minutes, group: g, done: !!data.checks[h.id]?.[day] })
    }
  }
  for (const t of data.tasks) {
    if (t.day !== day) continue
    const g = groupById.get(t.group) ?? GROUPS[0]
    items.push({ kind: "task", id: t.id, name: t.name, time: t.time, minutes: t.minutes, group: g, done: t.done })
  }
  return items.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"))
}

/** Done / total for a day. Days before first use and future days don't count. */
export function dayTotals(data: AppData, day: DayKey, today: DayKey) {
  const items = itemsForDay(data, day)
  const done = items.filter((i) => i.done).length
  const counts = day >= data.startedAt && day <= today
  return { done, total: items.length, rate: counts && items.length ? done / items.length : null }
}

/** Days in a row with every habit done. Today only adds once it's complete; it never breaks the streak. */
export function allHabitsStreak(data: AppData, today: DayKey): number {
  const habitsDone = (day: DayKey) => itemsForDay(data, day).filter((i) => i.kind === "habit").every((i) => i.done)
  let day = habitsDone(today) ? today : addDays(today, -1)
  let n = 0
  while (day >= data.startedAt && habitsDone(day)) {
    n++
    day = addDays(day, -1)
  }
  return n
}

export const pct = (rate: number | null) => (rate === null ? "–" : `${Math.round(rate * 100)}%`)

/** "0:30", "1:15" — compact duration for task cards. */
export const fmtDuration = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`
