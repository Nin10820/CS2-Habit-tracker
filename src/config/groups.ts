/*
 * App settings and the building blocks for groups.
 *
 * Groups ("big tasks") are no longer written here: you make them in the app (Focus panel → New group,
 * or the expand button on a group card) and they're saved in this browser with the rest of your data.
 */
import {
  Barbell,
  Bicycle,
  BookOpen,
  Briefcase,
  CheckCircle,
  Code,
  FilmSlate,
  Heart,
  ListChecks,
  MusicNotes,
  Star,
  SunHorizon,
  Translate,
  VideoCamera,
  type Icon,
} from "@phosphor-icons/react"

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
export const WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
export const WEEKDAY_SHORT: Record<Weekday, string> = { mon: "M", tue: "T", wed: "W", thu: "T", fri: "F", sat: "S", sun: "S" }

export type GroupColor = "green" | "blue" | "violet" | "pink" | "orange" | "amber" | "teal" | "slate"
export const COLORS: GroupColor[] = ["green", "blue", "violet", "pink", "orange", "amber", "teal", "slate"]

/** Icons a group can pick, by a stable name that is saved with the group. */
export const ICONS = {
  star: Star,
  sun: SunHorizon,
  bike: Bicycle,
  gym: Barbell,
  book: BookOpen,
  language: Translate,
  video: VideoCamera,
  film: FilmSlate,
  music: MusicNotes,
  code: Code,
  work: Briefcase,
  heart: Heart,
  list: ListChecks,
} satisfies Record<string, Icon>
export type IconName = keyof typeof ICONS
export const SINGLE_ICON: Icon = CheckCircle

/** How many tasks a day you aim to finish (Daily goal card and the dashed line on the chart). */
export const DAILY_GOAL = 8

/** Quick timer lengths, in minutes. */
export const FOCUS_MINUTES = 25
export const BREAK_MINUTES = 5
