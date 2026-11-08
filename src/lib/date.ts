/** Days are stored as local "YYYY-MM-DD" keys, so they sort and compare as plain strings. */
export type DayKey = string

export function toKey(d: Date): DayKey {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

export function fromKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function todayKey(): DayKey {
  return toKey(new Date())
}

/** Inclusive list of keys from `from` to `to`. */
export function range(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

/** Monday of the week containing `key`. */
export function startOfWeek(key: DayKey): DayKey {
  const dow = (fromKey(key).getDay() + 6) % 7 // Mon = 0
  return addDays(key, -dow)
}

export function startOfMonth(key: DayKey): DayKey {
  return key.slice(0, 8) + "01"
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", opts)
const longFmt = fmt({ weekday: "long", day: "numeric", month: "long" })
const shortFmt = fmt({ day: "numeric", month: "short" })
const dowFmt = fmt({ weekday: "short" })
const monthFmt = fmt({ month: "long" })

export const formatLong = (k: DayKey) => longFmt.format(fromKey(k))
export const formatShort = (k: DayKey) => shortFmt.format(fromKey(k))
export const formatDow = (k: DayKey) => dowFmt.format(fromKey(k))
export const formatMonth = (k: DayKey) => monthFmt.format(fromKey(k))
export const dayOfMonth = (k: DayKey) => fromKey(k).getDate()

const monthYearFmt = fmt({ month: "long", year: "numeric" })
export const formatMonthYear = (k: DayKey) => monthYearFmt.format(fromKey(k))

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
export const weekdayId = (k: DayKey) => WEEKDAYS[fromKey(k).getDay()]

/** ISO week number (weeks start Monday; week 1 holds the year's first Thursday). */
export function isoWeek(key: DayKey): number {
  const thu = fromKey(addDays(startOfWeek(key), 3))
  const jan1 = new Date(thu.getFullYear(), 0, 1)
  // Round to whole days first so a daylight-saving hour can't shift the result.
  const days = Math.round((thu.getTime() - jan1.getTime()) / 86_400_000)
  return Math.floor(days / 7) + 1
}

/** Monday..Sunday of the week containing `key`. */
export const weekOf = (key: DayKey) => range(startOfWeek(key), addDays(startOfWeek(key), 6))
