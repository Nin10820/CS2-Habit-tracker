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
}

/** What a day column shows: config habits and one-off tasks, in one list. */
export type DayItem = {
  kind: "habit" | "task"
  id: string
  name: string
  time?: string
  minutes?: number
  group: GroupDef
  done: boolean
}

export const colorVar = (c: GroupColor) => `var(--h-${c})`
