/*
 * ─── Edit this file to set up your groups and habits ────────────────────────────────
 *
 * Groups ("big tasks") and the habits inside them are fixed here, not in the app.
 * Add, remove or rename them, then save — the dev server reloads.
 *
 * - On a day, each group is ONE card holding its habits. A group with `standalone: true` is the exception:
 *   each of its habits is a card of its own (used for "Dậy sớm" and "Planning cho hôm sau").
 * - `time` is the EXPECTED start (a group's time, or a standalone habit's). You can change it for one day
 *   by clicking the time on the card; this file stays the default.
 * - `id`s must stay unique and should not change once you've used them: check-ins are saved by id.
 * - `days` limits a habit to some weekdays. Leave it out to repeat every day.
 * - `color` is one of: green, blue, violet, pink, orange, amber, teal, slate.
 * - `icon` is any icon from https://phosphoricons.com (import it at the top).
 * - `doc` is the group's full write-up (a Markdown file in src/content/groups), shown by the expand button.
 */
import { Bicycle, FilmSlate, SunHorizon, Translate, VideoCamera, type Icon } from "@phosphor-icons/react"
import dapXe from "../content/groups/dap-xe.md?raw"
import actionCam from "../content/groups/script-action-cam.md?raw"
import tiengAnh from "../content/groups/tieng-anh.md?raw"
import vlogSang from "../content/groups/vlog-sang.md?raw"

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
export type GroupColor = "green" | "blue" | "violet" | "pink" | "orange" | "amber" | "teal" | "slate"

export type HabitDef = {
  id: string
  name: string
  /** Expected "HH:MM". Only used for standalone habits; habits inside a group follow the group's time. */
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
  /** Expected start "HH:MM" of the group's card. */
  time?: string
  /** Each habit is its own card instead of one card for the group. Not shown in the Focus panel. */
  standalone?: boolean
  /** Markdown shown in the expand popup. */
  doc?: string
  habits: HabitDef[]
}

export const GROUPS: GroupDef[] = [
  {
    id: "routine",
    label: "Routine",
    title: "Single cards",
    icon: SunHorizon,
    color: "amber",
    standalone: true,
    habits: [
      { id: "day-som", name: "Dậy sớm", time: "05:30" },
      { id: "planning", name: "Planning cho hôm sau", time: "21:30", minutes: 10 },
    ],
  },
  {
    id: "dap-xe",
    label: "Đạp xe",
    title: "20km. Đi.",
    note: "5:45–6:45 · bật Action 5 từ đầu, một góc.",
    icon: Bicycle,
    color: "green",
    time: "05:45",
    doc: dapXe,
    habits: [{ id: "dap-xe-20km", name: "Đạp xe 20km", minutes: 60 }],
  },
  {
    id: "vlog-sang",
    label: "Vlog sáng",
    title: "Mỗi ngày cố gắng hơn một chút",
    note: "8 beat · 25–30s · không lời nói.",
    icon: VideoCamera,
    color: "orange",
    time: "06:45",
    doc: vlogSang,
    habits: [
      // Beat 6 of the vlog ticks this in the app.
      { id: "tap-gym", name: "Tập gym", minutes: 45 },
      { id: "quay-vlog", name: "Quay đủ 8 beat", minutes: 3 },
    ],
  },
  {
    id: "tieng-anh",
    label: "Tiếng Anh",
    title: "IELTS · 7/7",
    note: "Block chính 19:30–20:30. Không bỏ.",
    icon: Translate,
    color: "blue",
    time: "19:30",
    doc: tiengAnh,
    habits: [
      { id: "5-tu-vung", name: "5 từ vựng", minutes: 10 },
      { id: "review-loi", name: "Review note lỗi cũ", minutes: 10 },
      // One skill a day, ~40 min. Missed days aren't made up: Thursday is still Speaking.
      { id: "skill-writing", name: "Writing Task 2", minutes: 40, days: ["mon"] },
      { id: "skill-reading", name: "Reading · 1 passage", minutes: 40, days: ["tue"] },
      { id: "skill-listening", name: "Listening · 1 bài mới", minutes: 40, days: ["wed"] },
      { id: "skill-speaking", name: "Speaking với AI", minutes: 40, days: ["thu"] },
      { id: "skill-cung-co", name: "Củng cố tuần", minutes: 40, days: ["fri"] },
      { id: "skill-nhe", name: "Nhẹ: podcast / phim / đọc", minutes: 30, days: ["sat", "sun"] },
      // Outside the block: commute, meals, chores.
      { id: "listening-thu-dong", name: "Listening thụ động (ngoài block)", minutes: 20 },
    ],
  },
  {
    id: "action-cam",
    label: "Action cam",
    title: "Học quay action cam",
    note: "Mở · clip · thẻ setting · một câu hỏi.",
    icon: FilmSlate,
    color: "violet",
    time: "21:00",
    doc: actionCam,
    habits: [{ id: "dung-tap", name: "Dựng 1 tập + ghi nhật ký setting", minutes: 25 }],
  },
]

/** How many tasks a day you aim to finish (Daily goal card and the dashed line on the chart). */
export const DAILY_GOAL = 8

/** Quick timer lengths, in minutes. */
export const FOCUS_MINUTES = 25
export const BREAK_MINUTES = 5
