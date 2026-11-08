import { useCallback, useEffect, useState } from "react"
import { GROUPS } from "../config/groups"
import { todayKey, type DayKey } from "./date"
import type { AppData, Task } from "./types"

const DATA_KEY = "habit-tracker:v2"
const dayRe = /^\d{4}-\d{2}-\d{2}$/
const timeRe = /^\d{2}:\d{2}$/

export const emptyData = (): AppData => ({ version: 2, startedAt: todayKey(), checks: {}, tasks: [] })

function load(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (raw) return parseData(JSON.parse(raw))
  } catch {
    /* storage blocked or corrupt — start empty */
  }
  return emptyData()
}

/** Checks an imported/stored object and keeps only valid fields. Throws on anything unusable. */
export function parseData(input: unknown): AppData {
  if (!input || typeof input !== "object") throw new Error("Not a habit tracker backup.")
  const obj = input as Record<string, unknown>
  if (obj.version !== 2) throw new Error("This backup is from an older version of the app.")

  const checks: AppData["checks"] = {}
  for (const [id, days] of Object.entries((obj.checks ?? {}) as Record<string, unknown>)) {
    if (!days || typeof days !== "object") continue
    checks[id] = {}
    for (const d of Object.keys(days)) if (dayRe.test(d)) checks[id][d] = true
  }

  const groupIds = new Set(GROUPS.map((g) => g.id))
  const tasks: Task[] = (Array.isArray(obj.tasks) ? obj.tasks : []).flatMap((t) => {
    if (!t || typeof t !== "object") return []
    const { id, day, name, time, minutes, group, done } = t as Record<string, unknown>
    if (typeof id !== "string" || typeof name !== "string" || typeof day !== "string" || !dayRe.test(day)) return []
    return [
      {
        id,
        day,
        name: name.slice(0, 60),
        time: typeof time === "string" && timeRe.test(time) ? time : undefined,
        minutes: typeof minutes === "number" && minutes > 0 ? Math.round(minutes) : undefined,
        group: typeof group === "string" && groupIds.has(group) ? group : GROUPS[0].id,
        done: done === true,
      },
    ]
  })

  const startedAt = typeof obj.startedAt === "string" && dayRe.test(obj.startedAt) ? obj.startedAt : todayKey()
  return { version: 2, startedAt, checks, tasks }
}

const newId = () =>
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

  const replaceAll = useCallback((next: AppData) => setData(next), [])

  return { data, toggleHabit, addTask, updateTask, toggleTask, deleteTask, replaceAll }
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
