import type { Icon } from "@phosphor-icons/react"
import type { GroupColor, IconName, Weekday } from "../config/groups"
import type { DayKey } from "./date"

/**
 * One entry in a group's numbered list (1 → n).
 * `pinned` tasks are on every planned day and don't take part in the in-order / random pick.
 * `time` is only used in a `standalone` group, where each task is a card of its own.
 */
export type GroupTask = { id: string; name: string; minutes?: number; pinned?: boolean; time?: string }

/**
 * A group you made in the app. Each day it's planned on, it picks `perDay` tasks from its list:
 * the next ones in order (moving on every planned day, done or not), or a random set for that day.
 */
export type Group = {
  id: string
  label: string
  /** Headline on the group card, e.g. "IELTS · 7/7". */
  title?: string
  note?: string
  /** The group's full context in Markdown, shown by the expand button. */
  doc?: string
  /** Each task is its own card with its own time, instead of one card for the group. */
  standalone?: boolean
  color: GroupColor
  icon: IconName
  /** Expected start "HH:MM" of the group's card. */
  time?: string
  mode: "order" | "random"
  perDay: number
  tasks: GroupTask[]
}

/**
 * Puts a group on days. Without `repeat` it's only `from`; with `repeat` it's those weekdays from `from`
 * on (until `until`, if set). `skip` takes single days back out.
 */
export type Plan = {
  id: string
  group: string
  from: DayKey
  repeat?: Weekday[]
  until?: DayKey
  skip?: DayKey[]
}

/** A one-off task added to a single day. `group` is a group id, or "" for a card of its own. */
export type Task = {
  id: string
  day: DayKey
  name: string
  time?: string
  minutes?: number
  group: string
  done: boolean
}

/**
 * A routine moment you log the real time of. `daily` ones (wake up, sleep) are on every day and are
 * asked about by themselves; the others sit in the Routine card until you drag or tap them onto a day.
 * `when` is the part of the day a daily one is asked about; `usual` is the first guess for evening ones.
 */
export type RoutineItem = { id: string; name: string; daily?: boolean; when: "morning" | "evening"; usual?: string }

export type AppData = {
  version: 3
  /** First day the app was used: tasks only count from here, so earlier days aren't "missed". */
  startedAt: DayKey
  groups: Group[]
  plans: Plan[]
  /** "groupId/taskId" → days it was done. */
  checks: Record<string, Record<DayKey, true>>
  tasks: Task[]
  /** Times changed on one day: day → card key → "HH:MM". The group's time is only the expected one. */
  times: Record<DayKey, Record<string, string>>
  /** Routine moments, the days the non-daily ones were added to, and the time each was logged (id → day → "HH:MM"). */
  routine: { items: RoutineItem[]; days: Record<DayKey, string[]>; log: Record<string, Record<DayKey, string>> }
}

/** A group as the views use it: its icon resolved. `standalone` is the built-in "own card" group for one-off tasks. */
export type GroupDef = Omit<Group, "icon"> & { icon: Icon }

/** One picked group task or one-off task on a day (flat; used for stats, focus and checklists). */
export type DayItem = {
  kind: "habit" | "task"
  id: string
  name: string
  time?: string
  minutes?: number
  group: GroupDef
  done: boolean
}

/** What the Quick timer / mini player can focus on: one item, or a whole group card for a day. */
export type FocusItem = Omit<DayItem, "kind"> & { kind: DayItem["kind"] | "group" }

/**
 * What a day column shows: one card per group holding its items, or a single card for standalone items.
 * `key` identifies the card for time changes; `expected` is the group/task time, `time` what's shown.
 */
export type DayBlock =
  | { kind: "group"; key: string; group: GroupDef; items: DayItem[]; time?: string; expected?: string }
  | { kind: "single"; key: string; item: DayItem; time?: string; expected?: string }

export const colorVar = (c: GroupColor) => `var(--h-${c})`
