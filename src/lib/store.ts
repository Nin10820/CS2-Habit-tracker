import { useCallback, useEffect, useState } from "react"
import { DEFAULT_GROUPS, DEFAULT_ROUTINE } from "../config/defaults"
import { COLORS, ICONS, WEEK, type GroupColor, type IconName, type Weekday } from "../config/groups"
import { startOfWeek, todayKey, weekdayId, type DayKey } from "./date"
import { planOn } from "./plan"
import type { AppData, Group, GroupTask, Plan, RoutineItem, Task } from "./types"

const DATA_KEY = "habit-tracker:v3"
/** Data from before groups were made in the app: its one-off tasks, check-in start and times are kept. */
const OLD_KEY = "habit-tracker:v2"
const dayRe = /^\d{4}-\d{2}-\d{2}$/
const timeRe = /^\d{2}:\d{2}$/

/**
 * Your starting groups, each repeating every day from the Monday of the first week.
 * Starting on a Monday keeps an in-order list in step with the weekdays (Tiếng Anh: Writing on Monday …).
 */
function startingPlans(startedAt: DayKey) {
  const from = startOfWeek(startedAt)
  return DEFAULT_GROUPS.map((g) => ({ id: `start-${g.id}`, group: g.id, from, repeat: [...WEEK] }))
}

/** A fresh start: your starting groups, planned every day, nothing ticked yet. */
export const defaultData = (): AppData => {
  const startedAt = todayKey()
  return {
    version: 3,
    startedAt,
    groups: structuredClone(DEFAULT_GROUPS),
    plans: startingPlans(startedAt),
    checks: {},
    tasks: [],
    times: {},
    routine: { items: structuredClone(DEFAULT_ROUTINE), days: {}, log: {} },
  }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY) ?? localStorage.getItem(OLD_KEY)
    if (raw) return parseData(JSON.parse(raw))
  } catch {
    /* storage blocked or corrupt — start fresh */
  }
  return defaultData()
}

/** Old habit id → new "groupId/taskId", for data saved before groups moved into the app. */
function oldHabitId(id: string, day: DayKey): string | undefined {
  // Sat and Sun were one "Nhẹ" habit; now each has its own slot in the in-order list.
  if (id === "skill-nhe" && weekdayId(day) === "sun") return "tieng-anh/skill-nhe-cn"
  const g = DEFAULT_GROUPS.find((x) => x.tasks.some((t) => t.id === id))
  return g && `${g.id}/${id}`
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined)
const mins = (v: unknown) => (typeof v === "number" && v > 0 ? Math.min(600, Math.round(v)) : undefined)
const list = (v: unknown) => (Array.isArray(v) ? v : []).filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
const days = (v: unknown) => (Array.isArray(v) ? v.filter((d): d is DayKey => typeof d === "string" && dayRe.test(d)) : [])

/** Checks an imported/stored object and keeps only valid fields. Throws on anything unusable. */
export function parseData(input: unknown): AppData {
  if (!input || typeof input !== "object") throw new Error("Not a habit tracker backup.")
  const obj = input as Record<string, unknown>
  if (obj.version !== 2 && obj.version !== 3) throw new Error("This backup is from an older version of the app.")
  // Version 2 had its groups in the code: it moves onto your starting groups, with its check-ins.
  const v3 = obj.version === 3
  const startedAt = typeof obj.startedAt === "string" && dayRe.test(obj.startedAt) ? obj.startedAt : todayKey()

  const groups: Group[] = (v3 ? list(obj.groups) : list(structuredClone(DEFAULT_GROUPS))).flatMap((g) => {
    const id = str(g.id, 80)
    const label = str(g.label, 40)
    if (!id || !label) return []
    const tasks: GroupTask[] = list(g.tasks).flatMap((t) => {
      const tid = str(t.id, 80)
      const name = str(t.name, 80)
      if (!tid || !name) return []
      return [
        {
          id: tid,
          name,
          minutes: mins(t.minutes),
          pinned: t.pinned === true || undefined,
          time: typeof t.time === "string" && timeRe.test(t.time) ? t.time : undefined,
        },
      ]
    })
    return [
      {
        id,
        label,
        title: str(g.title, 80),
        note: str(g.note, 300),
        doc: str(g.doc, 50_000),
        standalone: g.standalone === true || undefined,
        color: COLORS.includes(g.color as GroupColor) ? (g.color as GroupColor) : "green",
        icon: typeof g.icon === "string" && g.icon in ICONS ? (g.icon as IconName) : "star",
        time: typeof g.time === "string" && timeRe.test(g.time) ? g.time : undefined,
        mode: g.mode === "random" ? "random" : "order",
        perDay: typeof g.perDay === "number" && g.perDay >= 1 ? Math.min(20, Math.round(g.perDay)) : 1,
        tasks,
      },
    ]
  })
  const groupIds = new Set(groups.map((g) => g.id))

  const plans: Plan[] = (v3 ? list(obj.plans) : list(startingPlans(startedAt))).flatMap((p) => {
    const id = str(p.id, 80)
    const group = str(p.group, 80)
    if (!id || !group || !groupIds.has(group) || typeof p.from !== "string" || !dayRe.test(p.from)) return []
    const repeat = Array.isArray(p.repeat) ? WEEK.filter((d) => (p.repeat as unknown[]).includes(d)) : undefined
    return [
      {
        id,
        group,
        from: p.from,
        repeat: repeat?.length ? repeat : undefined,
        until: typeof p.until === "string" && dayRe.test(p.until) ? p.until : undefined,
        skip: days(p.skip).length ? days(p.skip) : undefined,
      },
    ]
  })

  const checks: AppData["checks"] = {}
  for (const [id, ds] of Object.entries((obj.checks ?? {}) as Record<string, unknown>)) {
    if (!ds || typeof ds !== "object") continue
    for (const d of Object.keys(ds)) {
      if (!dayRe.test(d)) continue
      const key = v3 ? id : oldHabitId(id, d)
      if (key) (checks[key] ??= {})[d] = true
    }
  }

  const tasks: Task[] = list(obj.tasks).flatMap((t) => {
    const id = str(t.id, 80)
    const name = str(t.name, 60)
    if (!id || !name || typeof t.day !== "string" || !dayRe.test(t.day)) return []
    return [
      {
        id,
        day: t.day,
        name,
        time: typeof t.time === "string" && timeRe.test(t.time) ? t.time : undefined,
        minutes: mins(t.minutes),
        group: typeof t.group === "string" && groupIds.has(t.group) ? t.group : "",
        done: t.done === true,
      },
    ]
  })

  const times: AppData["times"] = {}
  for (const [day, cards] of Object.entries((obj.times ?? {}) as Record<string, unknown>)) {
    if (!dayRe.test(day) || !cards || typeof cards !== "object") continue
    for (const [key, t] of Object.entries(cards as Record<string, unknown>)) {
      if (typeof t !== "string" || !timeRe.test(t)) continue
      // Old single cards were "habit:<id>"; now they're "habit:<group>/<id>".
      const k = !v3 && key.startsWith("habit:") ? `habit:${oldHabitId(key.slice(6), day) ?? key.slice(6)}` : key
      ;(times[day] ??= {})[k] = t
    }
  }

  // Routine moments. Data from before them gets the defaults, and "Dậy sớm" leaves the old Routine
  // group (waking up is logged as a Routine moment now); that group keeps Planning.
  const r = obj.routine && typeof obj.routine === "object" ? (obj.routine as Record<string, unknown>) : undefined
  const items: RoutineItem[] = r
    ? list(r.items).flatMap((i) => {
        const id = str(i.id, 80)
        const name = str(i.name, 40)
        if (!id || !name) return []
        return [
          {
            id,
            name,
            // Moments saved before this field existed were all every-day ones.
            daily: i.daily === undefined ? true : i.daily === true || undefined,
            when: i.when === "evening" ? "evening" : "morning",
            usual: typeof i.usual === "string" && timeRe.test(i.usual) ? i.usual : undefined,
          },
        ]
      })
    : structuredClone(DEFAULT_ROUTINE)
  const log: AppData["routine"]["log"] = {}
  for (const [id, ds] of Object.entries((r?.log ?? {}) as Record<string, unknown>)) {
    if (!ds || typeof ds !== "object") continue
    for (const [d, t] of Object.entries(ds as Record<string, unknown>)) if (dayRe.test(d) && typeof t === "string" && timeRe.test(t)) (log[id] ??= {})[d] = t
  }
  const known = new Set(items.map((i) => i.id))
  const routineDays: AppData["routine"]["days"] = {}
  for (const [d, ids] of Object.entries((r?.days ?? {}) as Record<string, unknown>)) {
    if (!dayRe.test(d) || !Array.isArray(ids)) continue
    const ok = [...new Set(ids.filter((x): x is string => typeof x === "string" && known.has(x)))]
    if (ok.length) routineDays[d] = ok
  }
  if (!r) {
    const old = groups.find((g) => g.id === "routine")
    if (old) {
      old.tasks = old.tasks.filter((t) => t.id !== "day-som")
      if (old.label === "Routine") Object.assign(old, { label: "Planning", title: "Cho hôm sau", icon: "work" })
    }
  }

  return { version: 3, startedAt, groups, plans, checks, tasks, times, routine: { items, days: routineDays, log } }
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export type TaskInput = Omit<Task, "id" | "done">

export function useStore() {
  const [data, setData] = useState<AppData>(load)

  useEffect(() => {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(data))
    } catch {
      /* private mode etc. — the app still works for this visit */
    }
  }, [data])

  const toggleHabit = useCallback((id: string, day: DayKey) => {
    setData((d) => {
      const days = { ...(d.checks[id] ?? {}) }
      if (days[day]) delete days[day]
      else days[day] = true
      // Ticking a day before first use moves the start back, so that day counts in stats.
      return { ...d, startedAt: day < d.startedAt ? day : d.startedAt, checks: { ...d.checks, [id]: days } }
    })
  }, [])

  const addTask = useCallback((t: TaskInput) => {
    setData((d) => ({ ...d, tasks: [...d.tasks, { ...t, id: newId(), done: false }] }))
  }, [])

  const updateTask = useCallback((id: string, patch: Partial<TaskInput>) => {
    setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
  }, [])

  const toggleTask = useCallback((id: string) => {
    setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }))
  }, [])

  /** Change a card's time for one day; null goes back to the expected time. */
  const setTime = useCallback((day: DayKey, key: string, time: string | null) => {
    setData((d) => {
      const dayTimes = { ...(d.times[day] ?? {}) }
      if (time) dayTimes[key] = time
      else delete dayTimes[key]
      const times = { ...d.times, [day]: dayTimes }
      if (!Object.keys(dayTimes).length) delete times[day]
      return { ...d, times }
    })
  }, [])

  const replaceAll = useCallback((next: AppData) => setData(next), [])

  /** Add a group, or replace the one with the same id. */
  const saveGroup = useCallback((g: Group) => {
    setData((d) => ({
      ...d,
      groups: d.groups.some((x) => x.id === g.id) ? d.groups.map((x) => (x.id === g.id ? g : x)) : [...d.groups, g],
    }))
  }, [])

  /** Delete a group with its plans. Its one-off tasks stay, as cards of their own. */
  const deleteGroup = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      groups: d.groups.filter((g) => g.id !== id),
      plans: d.plans.filter((p) => p.group !== id),
      tasks: d.tasks.map((t) => (t.group === id ? { ...t, group: "" } : t)),
    }))
  }, [])

  /** Put a group on one day, or on some weekdays from that day on. */
  const addPlan = useCallback((group: string, from: DayKey, repeat?: Weekday[]) => {
    setData((d) => ({ ...d, plans: [...d.plans, { id: newId(), group, from, repeat: repeat?.length ? repeat : undefined }] }))
  }, [])

  /** Take a group off one day. One-day plans are deleted; repeating ones skip that day. */
  const removeFromDay = useCallback((group: string, day: DayKey) => {
    setData((d) => ({
      ...d,
      plans: d.plans.flatMap((p) => {
        if (p.group !== group || !planOn(p, day)) return [p]
        if (!p.repeat) return []
        return [{ ...p, skip: [...(p.skip ?? []), day] }]
      }),
    }))
  }, [])

  /** Stop a group's repeating plans after this day (the day itself stays). */
  const stopRepeat = useCallback((group: string, day: DayKey) => {
    setData((d) => ({
      ...d,
      plans: d.plans.map((p) => (p.group === group && p.repeat && p.from <= day && (!p.until || p.until > day) ? { ...p, until: day } : p)),
    }))
  }, [])

  /** Log the time of a routine moment on a day; null clears it. */
  const logRoutine = useCallback((id: string, day: DayKey, time: string | null) => {
    setData((d) => {
      const days = { ...(d.routine.log[id] ?? {}) }
      if (time) days[day] = time
      else delete days[day]
      return { ...d, startedAt: day < d.startedAt ? day : d.startedAt, routine: { ...d.routine, log: { ...d.routine.log, [id]: days } } }
    })
  }, [])

  /** Replace the list of routine moments (their logs stay, keyed by id; removed ones leave the days). */
  const saveRoutine = useCallback((items: RoutineItem[]) => {
    setData((d) => {
      const ids = new Set(items.map((i) => i.id))
      const days = Object.fromEntries(
        Object.entries(d.routine.days)
          .map(([day, list]) => [day, list.filter((id) => ids.has(id))] as const)
          .filter(([, list]) => list.length),
      )
      return { ...d, routine: { ...d.routine, items, days } }
    })
  }, [])

  /** Make a new routine moment for the Routine card (not on any day yet). */
  const createRoutine = useCallback((name: string) => {
    const item: RoutineItem = { id: newId(), name: name.trim().slice(0, 40), when: "morning" }
    setData((d) => ({ ...d, routine: { ...d.routine, items: [...d.routine.items, item] } }))
  }, [])

  /** Put a routine moment on a day, or take it off. Every-day ones are always there. */
  const setRoutineOnDay = useCallback((id: string, day: DayKey, on: boolean) => {
    setData((d) => {
      const list = d.routine.days[day] ?? []
      const next = on ? (list.includes(id) ? list : [...list, id]) : list.filter((x) => x !== id)
      const days = { ...d.routine.days, [day]: next }
      if (!next.length) delete days[day]
      return { ...d, routine: { ...d.routine, days } }
    })
  }, [])

  return {
    data,
    logRoutine,
    saveRoutine,
    createRoutine,
    setRoutineOnDay,
    toggleHabit,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    setTime,
    replaceAll,
    saveGroup,
    deleteGroup,
    addPlan,
    removeFromDay,
    stopRepeat,
  }
}

export type Store = ReturnType<typeof useStore>

export function exportData(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `habits-backup-${todayKey()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
