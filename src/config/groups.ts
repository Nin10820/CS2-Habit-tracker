/*
 * ─── Edit this file to set up your groups and habits ────────────────────────────────
 *
 * Groups ("big tasks") and the habits inside them are fixed here, not in the app.
 * Add, remove or rename them, then save — the dev server reloads.
 *
 * - `id`s must stay unique and should not change once you've used them: check-ins are saved by id.
 * - `days` limits a habit to some weekdays. Leave it out to repeat every day.
 * - `color` is one of: green, blue, violet, pink, orange, amber, teal, slate.
 * - `icon` is any icon from https://phosphoricons.com (import it at the top).
 *
 * The habits below are placeholders — replace them with your own.
 */
import { House, Laptop, Plant, type Icon } from "@phosphor-icons/react"

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
export type GroupColor = "green" | "blue" | "violet" | "pink" | "orange" | "amber" | "teal" | "slate"

export type HabitDef = {
  id: string
  name: string
  /** "HH:MM", used to sort the day. */
  time?: string
  minutes?: number
  days?: Weekday[]
}

export type GroupDef = {
  id: string
  label: string
  title: string
  note?: string
  icon: Icon
  color: GroupColor
  habits: HabitDef[]
}

export const GROUPS: GroupDef[] = [
  {
    id: "design",
    label: "Design project",
    title: "Portfolio refresh",
    note: "Refine the case study experience.",
    icon: Laptop,
    color: "violet",
    habits: [
      { id: "audit-pages", name: "Audit current pages", time: "09:00", minutes: 30, days: ["mon", "wed", "fri"] },
      { id: "sketch-layout", name: "Sketch new layout", time: "10:00", minutes: 30, days: ["tue", "thu"] },
      { id: "update-case-study", name: "Update case study", time: "14:00", minutes: 45 },
    ],
  },
  {
    id: "growth",
    label: "Personal growth",
    title: "Learn something new",
    note: "Make room for a little practice.",
    icon: Plant,
    color: "green",
    habits: [
      { id: "read-10", name: "Read 10 pages", time: "11:00", minutes: 20 },
      { id: "practice-20", name: "Practice for 20 min", time: "13:00", minutes: 20 },
      { id: "takeaway", name: "Write one takeaway", time: "21:00", minutes: 10 },
    ],
  },
  {
    id: "life",
    label: "Life",
    title: "Evening reset",
    note: "A calmer start for tomorrow.",
    icon: House,
    color: "orange",
    habits: [
      { id: "clear-desk", name: "Clear the desk", time: "17:00", minutes: 10 },
      { id: "plan-tomorrow", name: "Plan tomorrow", time: "21:30", minutes: 10 },
      { id: "short-walk", name: "Take a short walk", time: "18:00", minutes: 15 },
    ],
  },
]

/** How many tasks a day you aim to finish (Daily goal card and the dashed line on the chart). */
export const DAILY_GOAL = 6

/** Quick timer lengths, in minutes. */
export const FOCUS_MINUTES = 25
export const BREAK_MINUTES = 5
