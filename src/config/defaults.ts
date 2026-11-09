/*
 * Your starting groups: what the app opens with on a new device, and what older data is moved onto.
 * After that they live in the app (expand a group card → Edit) and are saved with your data.
 *
 * Ids match the old config, so earlier check-ins carry over.
 * Pinned tasks are on every planned day; the others are the numbered list the group picks from.
 */
import dapXe from "../content/groups/dap-xe.md?raw"
import actionCam from "../content/groups/script-action-cam.md?raw"
import tiengAnh from "../content/groups/tieng-anh.md?raw"
import vlogSang from "../content/groups/vlog-sang.md?raw"
import type { Group, RoutineItem } from "../lib/types"

/** On every day: the moments you log the time of. Your own ones are made in the Routine card. */
export const DEFAULT_ROUTINE: RoutineItem[] = [
  { id: "wake", name: "Thức dậy", daily: true, when: "morning" },
  { id: "sleep", name: "Đi ngủ", daily: true, when: "evening", usual: "23:00" },
]

export const DEFAULT_GROUPS: Group[] = [
  {
    // Was "Routine" with Dậy sớm too; waking up is now a Routine moment you log the time of.
    id: "routine",
    label: "Planning",
    title: "Cho hôm sau",
    icon: "work",
    color: "amber",
    standalone: true,
    mode: "order",
    perDay: 1,
    tasks: [{ id: "planning", name: "Planning cho hôm sau", time: "21:30", minutes: 10, pinned: true }],
  },
  {
    id: "dap-xe",
    label: "Đạp xe",
    title: "20km. Đi.",
    note: "5:45–6:45 · bật Action 5 từ đầu, một góc.",
    icon: "bike",
    color: "green",
    time: "05:45",
    doc: dapXe,
    mode: "order",
    perDay: 1,
    tasks: [{ id: "dap-xe-20km", name: "Đạp xe 20km", minutes: 60, pinned: true }],
  },
  {
    id: "vlog-sang",
    label: "Vlog sáng",
    title: "Mỗi ngày cố gắng hơn một chút",
    note: "8 beat · 25–30s · không lời nói.",
    icon: "video",
    color: "orange",
    time: "06:45",
    doc: vlogSang,
    mode: "order",
    perDay: 1,
    tasks: [
      { id: "tap-gym", name: "Tập gym", minutes: 45, pinned: true },
      { id: "quay-vlog", name: "Quay đủ 8 beat", minutes: 3, pinned: true },
    ],
  },
  {
    id: "tieng-anh",
    label: "Tiếng Anh",
    title: "IELTS · 7/7",
    note: "Block chính 19:30–20:30. Không bỏ.",
    icon: "language",
    color: "blue",
    time: "19:30",
    doc: tiengAnh,
    // One skill a day, in this order from Monday. Sat and Sun are both "Nhẹ", so the list is 7 long.
    mode: "order",
    perDay: 1,
    tasks: [
      { id: "5-tu-vung", name: "5 từ vựng", minutes: 10, pinned: true },
      { id: "review-loi", name: "Review note lỗi cũ", minutes: 10, pinned: true },
      { id: "skill-writing", name: "Writing Task 2", minutes: 40 },
      { id: "skill-reading", name: "Reading · 1 passage", minutes: 40 },
      { id: "skill-listening", name: "Listening · 1 bài mới", minutes: 40 },
      { id: "skill-speaking", name: "Speaking với AI", minutes: 40 },
      { id: "skill-cung-co", name: "Củng cố tuần", minutes: 40 },
      { id: "skill-nhe", name: "Nhẹ: podcast / phim / đọc", minutes: 30 },
      { id: "skill-nhe-cn", name: "Nhẹ: podcast / phim / đọc", minutes: 30 },
      // Outside the block: commute, meals, chores.
      { id: "listening-thu-dong", name: "Listening thụ động (ngoài block)", minutes: 20, pinned: true },
    ],
  },
  {
    id: "action-cam",
    label: "Action cam",
    title: "Học quay action cam",
    note: "Mở · clip · thẻ setting · một câu hỏi.",
    icon: "film",
    color: "violet",
    time: "21:00",
    doc: actionCam,
    mode: "order",
    perDay: 1,
    tasks: [{ id: "dung-tap", name: "Dựng 1 tập + ghi nhật ký setting", minutes: 25, pinned: true }],
  },
]
