import type { GroupColor, GroupDef } from "../config/groups"
import type { DayKey } from "./date"

/** A one-off task added to a single day with "Add task". */
export type Task = {
  id: string
  day: DayKey
  name: string
  time?: string
  minutes?: number
  group: string
  done: boolean
}

export type AppData = {
  version: 2
  /** First day the app was used: habits only count from here, so earlier days aren't "missed". */
  startedAt: DayKey
  /** habitId → days it was done. */
  checks: Record<string, Record<DayKey, true>>
  tasks: Task[]
  /** Times changed on one day: day → card key → "HH:MM". The config time is only the expected one. */
  times: Record<DayKey, Record<string, string>>
}

/** One habit or one-off task on a day (flat; used for stats, focus and checklists). */
/** What the Quick timer / mini player can focus on: one item, or a whole group card for a day. */
export type FocusItem = Omit<DayItem, "kind"> & { kind: DayItem["kind"] | "group" }

export type DayItem = {
  kind: "habit" | "task"
  id: string
  name: string
  time?: string
  minutes?: number
  group: GroupDef
  done: boolean
}

/**
 * What a day column shows: one card per group holding its items, or a single card for standalone items.
 * `key` identifies the card for time changes; `expected` is the config/task time, `time` what's shown.
 */
export type DayBlock =
  | { kind: "group"; key: string; group: GroupDef; items: DayItem[]; time?: string; expected?: string }
  | { kind: "single"; key: string; item: DayItem; time?: string; expected?: string }

export const colorVar =(c: GroupColor) => `var(--h-${c})`
