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
 * - `doc` is the group's full write-up (a Markdown file in src/content/groups), shown by the expand button.
 *
 * The habits below were pulled from those write-ups. Change times and durations to fit your day.
 */
import { Bicycle, FilmSlate, Translate, VideoCamera, type Icon } from "@phosphor-icons/react"
import dapXe from "../content/groups/dap-xe.md?raw"
import actionCam from "../content/groups/script-action-cam.md?raw"
import tiengAnh from "../content/groups/tieng-anh.md?raw"
import vlogSang from "../content/groups/vlog-sang.md?raw"

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
  /** Markdown shown in the expand popup. */
  doc?: string
  habits: HabitDef[]
}

export const GROUPS: GroupDef[] = [
  {
    id: "dap-xe",
    label: "Đạp xe",
    title: "20km. Đi.",
    note: "5:45–6:45 · bật Action 5 từ đầu, một góc.",
    icon: Bicycle,
    color: "green",
    doc: dapXe,
    habits: [{ id: "dap-xe-20km", name: "Đạp xe 20km", time: "05:45", minutes: 60 }],
  },
  {
    id: "vlog-sang",
    label: "Vlog sáng",
    title: "Mỗi ngày cố gắng hơn một chút",
    note: "8 beat · 25–30s · không lời nói.",
    icon: VideoCamera,
    color: "orange",
    doc: vlogSang,
    habits: [
      // Beats 3 and 6 of the vlog tick these two in the app.
      { id: "day-som", name: "Dậy sớm", time: "05:30" },
      { id: "tap-gym", name: "Tập gym", time: "06:45", minutes: 45 },
      { id: "quay-vlog", name: "Quay đủ 8 beat", minutes: 3 },
    ],
  },
  {
    id: "action-cam",
    label: "Action cam",
    title: "Học quay action cam",
    note: "Mở · clip · thẻ setting · một câu hỏi.",
    icon: FilmSlate,
    color: "violet",
    doc: actionCam,
    habits: [{ id: "dung-tap", name: "Dựng 1 tập + ghi nhật ký setting", time: "21:00", minutes: 25 }],
  },
  {
    id: "tieng-anh",
    label: "Tiếng Anh",
    title: "IELTS · 7/7",
    note: "Block chính 19:30–20:30. Không bỏ.",
    icon: Translate,
    color: "blue",
    doc: tiengAnh,
    habits: [
      { id: "listening-thu-dong", name: "Listening thụ động", minutes: 20 },
      { id: "5-tu-vung", name: "5 từ vựng", time: "19:30", minutes: 10 },
      { id: "review-loi", name: "Review note lỗi cũ", time: "19:40", minutes: 10 },
      // One skill a day, ~40 min. Missed days aren't made up: Thursday is still Speaking.
      { id: "skill-writing", name: "Writing Task 2", time: "19:50", minutes: 40, days: ["mon"] },
      { id: "skill-reading", name: "Reading · 1 passage", time: "19:50", minutes: 40, days: ["tue"] },
      { id: "skill-listening", name: "Listening · 1 bài mới", time: "19:50", minutes: 40, days: ["wed"] },
      { id: "skill-speaking", name: "Speaking với AI", time: "19:50", minutes: 40, days: ["thu"] },
      { id: "skill-cung-co", name: "Củng cố tuần", time: "19:50", minutes: 40, days: ["fri"] },
      { id: "skill-nhe", name: "Nhẹ: podcast / phim / đọc", time: "19:50", minutes: 30, days: ["sat", "sun"] },
    ],
  },
]

/** How many tasks a day you aim to finish (Daily goal card and the dashed line on the chart). */
export const DAILY_GOAL = 8

/** Quick timer lengths, in minutes. */
export const FOCUS_MINUTES = 25
export const BREAK_MINUTES = 5
