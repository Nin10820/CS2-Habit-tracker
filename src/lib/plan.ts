import { ICONS, SINGLE_ICON } from "../config/groups"
import { addDays, weekdayId, type DayKey } from "./date"
import type { AppData, Group, GroupDef, GroupTask, Plan } from "./types"

/** The built-in group for one-off tasks that aren't in a group: each is a card of its own. */
export const SINGLE: GroupDef = {
  id: "",
  label: "Task",
  color: "slate",
  icon: SINGLE_ICON,
  mode: "order",
  perDay: 1,
  tasks: [],
  standalone: true,
}

export const toDef = (g: Group): GroupDef => ({ ...g, icon: ICONS[g.icon] ?? SINGLE_ICON })

/** Is this plan on this day? */
export function planOn(p: Plan, day: DayKey): boolean {
  if (day < p.from || (p.until && day > p.until) || p.skip?.includes(day)) return false
  return p.repeat ? p.repeat.includes(weekdayId(day)) : day === p.from
}

/** The plans that put a group on a day. */
export const plansOn = (data: AppData, groupId: string, day: DayKey) => data.plans.filter((p) => p.group === groupId && planOn(p, day))

// Occurrence counts are walked day by day, so they're cached per plans list (a new list after every change).
const counts = new WeakMap<Plan[], Map<string, number>>()

/** How many planned days this group had before `day`: 0 on its first day, 1 on the next, … */
function occurrence(plans: Plan[], groupId: string, day: DayKey): number {
  let cache = counts.get(plans)
  if (!cache) counts.set(plans, (cache = new Map()))
  const key = `${groupId}|${day}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  const mine = plans.filter((p) => p.group === groupId)
  let n = 0
  if (mine.length) {
    const first = mine.reduce((m, p) => (p.from < m ? p.from : m), mine[0].from)
    for (let d = first; d < day; d = addDays(d, 1)) if (mine.some((p) => planOn(p, d))) n++
  }
  cache.set(key, n)
  return n
}

/** Small seeded random number generator, so a day's random pick stays the same every time you look. */
function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

/**
 * The tasks a group shows on one of its planned days: its pinned tasks, plus the picked ones.
 * In order: day k takes tasks k·perDay … k·perDay+perDay−1, wrapping back to task 1 after the last.
 * Random: `perDay` different tasks, the same ones every time for that day.
 */
export function pickTasks(data: AppData, group: Group | GroupDef, day: DayKey): GroupTask[] {
  // Pinned tasks are always there; the pick runs over the rest.
  const list = group.tasks.filter((t) => !t.pinned)
  const n = list.length
  const picked = new Set<GroupTask>()
  if (n) {
    const count = Math.min(Math.max(1, group.perDay), n)
    if (group.mode === "random") {
      const rand = seeded(`${group.id}|${day}`)
      const idx = list.map((_, i) => i)
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[idx[i], idx[j]] = [idx[j], idx[i]]
      }
      idx.slice(0, count).forEach((i) => picked.add(list[i]))
    } else {
      const k = occurrence(data.plans, group.id, day)
      for (let j = 0; j < count; j++) picked.add(list[(k * count + j) % n])
    }
  }
  // Keep the list's own order on the card.
  return group.tasks.filter((t) => t.pinned || picked.has(t))
}

/** Id of a picked group task, as used for check-ins. */
export const groupItemId = (groupId: string, taskId: string) => `${groupId}/${taskId}`
