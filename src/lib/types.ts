import type { DayKey } from "./date"

export const HABIT_COLORS = ["green", "blue", "violet", "pink", "orange", "amber", "teal", "slate"] as const
export type HabitColor = (typeof HABIT_COLORS)[number]

export type Habit = {
  id: string
  name: string
  color: HabitColor
  /** First day the habit counts towards stats. */
  createdAt: DayKey
}

export type AppData = {
  version: 1
  habits: Habit[]
  /** habitId → set of days it was done. */
  checks: Record<string, Record<DayKey, true>>
}

export const emptyData = (): AppData => ({ version: 1, habits: [], checks: {} })

export const colorVar = (c: HabitColor) => `var(--h-${c})`
