import { addDays, toKey, type DayKey } from "./date"
import type { AppData, RoutineItem } from "./types"

const pad = (n: number) => String(n).padStart(2, "0")
export const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const fromMin = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`

/**
 * The day a routine moment counts for, right now. Evening moments logged after midnight
 * (before 4:00) still belong to the evening before.
 */
export function routineDay(item: RoutineItem, now: Date): DayKey {
  const today = toKey(now)
  return item.when === "evening" && now.getHours() < 4 ? addDays(today, -1) : today
}

/** Is it the part of the day this moment is asked about? Morning 3:00–13:59, evening 19:00–3:59. */
export function inWindow(item: RoutineItem, now: Date): boolean {
  const h = now.getHours()
  return item.when === "morning" ? h >= 3 && h < 14 : h >= 19 || h < 4
}

/**
 * Your usual time for a moment: the average of its last 14 logs, to 5 minutes.
 * Times before noon count as after midnight, so 23:30 and 00:30 average to 00:00.
 */
export function usualTime(data: AppData, item: RoutineItem): string | undefined {
  const logs = Object.entries(data.routine.log[item.id] ?? {})
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 14)
    .map(([, t]) => toMin(t))
  if (!logs.length) return item.usual
  const late = item.when === "evening"
  const avg = logs.reduce((s, m) => s + (late && m < 12 * 60 ? m + 24 * 60 : m), 0) / logs.length
  return fromMin(Math.round(avg / 5) * 5)
}

/** The time to fill in: what's logged, else now for a morning moment, else your usual evening time. */
export function suggestTime(data: AppData, item: RoutineItem, day: DayKey, now: Date): string {
  const logged = data.routine.log[item.id]?.[day]
  if (logged) return logged
  if (item.when === "morning") return hhmm(now)
  return usualTime(data, item) ?? "23:00"
}

/** The routine moments on a day: the every-day ones, then the ones you added to it. */
export function routineOn(data: AppData, day: DayKey): RoutineItem[] {
  const added = data.routine.days[day] ?? []
  return [...data.routine.items.filter((i) => i.daily), ...added.flatMap((id) => data.routine.items.filter((i) => i.id === id && !i.daily))]
}

/** Every-day moments to ask about now: in their part of the day, not logged yet, not skipped today. */
export function dueItems(data: AppData, now: Date, skipped: Set<string>): RoutineItem[] {
  return data.routine.items.filter((i) => {
    if (!i.daily || !inWindow(i, now)) return false
    const day = routineDay(i, now)
    return !data.routine.log[i.id]?.[day] && !skipped.has(`${day}:${i.id}`)
  })
}
