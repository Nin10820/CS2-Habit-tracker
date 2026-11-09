import { addDays, type DayKey } from "./date"
import { groupItemId, pickTasks, plansOn, SINGLE, toDef } from "./plan"
import type { AppData, DayBlock, DayItem, GroupDef } from "./types"

/** Your groups, ready for the views, by id. "" is the built-in single-card group. */
export function groupDefs(data: AppData): Map<string, GroupDef> {
  return new Map<string, GroupDef>([["", SINGLE], ...data.groups.map((g) => [g.id, toDef(g)] as const)])
}

/** Tasks picked by the groups planned on this day, plus the day's one-off tasks, sorted by time. */
export function itemsForDay(data: AppData, day: DayKey): DayItem[] {
  const defs = groupDefs(data)
  const items: DayItem[] = []
  for (const g of data.groups) {
    if (!plansOn(data, g.id, day).length) continue
    const def = defs.get(g.id)!
    for (const t of pickTasks(data, g, day)) {
      const id = groupItemId(g.id, t.id)
      // Tasks in a group follow the group's time; in a standalone group each has its own.
      const time = g.standalone ? t.time : g.time
      items.push({ kind: "habit", id, name: t.name, time, minutes: t.minutes, group: def, done: !!data.checks[id]?.[day] })
    }
  }
  for (const t of data.tasks) {
    if (t.day !== day) continue
    const g = defs.get(t.group) ?? SINGLE
    // A one-off task in a group follows the group's card time unless it has its own.
    items.push({ kind: "task", id: t.id, name: t.name, time: t.time ?? (g.standalone ? undefined : g.time), minutes: t.minutes, group: g, done: t.done })
  }
  return items.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"))
}

/** Card key for a time change: one per group card, one per standalone item. */
export const singleKey = (i: DayItem) => `${i.kind}:${i.id}`
export const groupKey = (groupId: string) => `group:${groupId}`

/**
 * The day as cards: one per group (its habits and one-off tasks inside), and one per standalone
 * item. Sorted by time, using the day's changed time where there is one.
 */
export function blocksForDay(data: AppData, day: DayKey): DayBlock[] {
  const items = itemsForDay(data, day)
  const changed = data.times[day] ?? {}
  const blocks: DayBlock[] = []
  for (const g of groupDefs(data).values()) {
    const mine = items.filter((i) => i.group.id === g.id)
    // A planned group with an empty list still gets its card, so you can see it and fill it in.
    if (!mine.length && (g.standalone || !plansOn(data, g.id, day).length)) continue
    if (g.standalone) {
      for (const item of mine) {
        const key = singleKey(item)
        blocks.push({ kind: "single", key, item, expected: item.time, time: changed[key] ?? item.time })
      }
    } else {
      const key = groupKey(g.id)
      blocks.push({ kind: "group", key, group: g, items: mine, expected: g.time, time: changed[key] ?? g.time })
    }
  }
  const byTime = blocks.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"))
  return applyOrder(byTime, data.order?.[day])
}

/**
 * Put cards in the order you dragged them into. Cards the saved order doesn't know yet (added
 * later) slot in by time: just before the first ordered card with a later time.
 */
function applyOrder(byTime: DayBlock[], keys: string[] | undefined): DayBlock[] {
  if (!keys?.length) return byTime
  const rank = new Map(keys.map((k, i) => [k, i]))
  const out = byTime.filter((b) => rank.has(b.key)).sort((a, b) => rank.get(a.key)! - rank.get(b.key)!)
  for (const b of byTime) {
    if (rank.has(b.key)) continue
    const t = b.time ?? "99:99"
    const at = out.findIndex((o) => (o.time ?? "99:99") > t)
    out.splice(at === -1 ? out.length : at, 0, b)
  }
  return out
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
