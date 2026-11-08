import { useCallback, useEffect, useState } from "react"
import { addDays, todayKey, type DayKey } from "./date"
import { HABIT_COLORS, emptyData, type AppData, type Habit, type HabitColor } from "./types"

const DATA_KEY = "habit-tracker:data"

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
  if (!Array.isArray(obj.habits)) throw new Error("Backup has no habits list.")
  const dayRe = /^\d{4}-\d{2}-\d{2}$/
  const habits: Habit[] = obj.habits.flatMap((h) => {
    if (!h || typeof h !== "object") return []
    const { id, name, color, createdAt } = h as Record<string, unknown>
    if (typeof id !== "string" || typeof name !== "string") return []
    return [
      {
        id,
        name: name.slice(0, 60),
        color: HABIT_COLORS.includes(color as HabitColor) ? (color as HabitColor) : "green",
        createdAt: typeof createdAt === "string" && dayRe.test(createdAt) ? createdAt : todayKey(),
      },
    ]
  })
  const checks: AppData["checks"] = {}
  const rawChecks = (obj.checks ?? {}) as Record<string, unknown>
  for (const h of habits) {
    const days = rawChecks[h.id]
    checks[h.id] = {}
    if (days && typeof days === "object") {
      for (const d of Object.keys(days)) if (dayRe.test(d)) checks[h.id][d] = true
    }
  }
  return { version: 1, habits, checks }
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export function useHabitStore() {
  const [data, setData] = useState<AppData>(load)

  useEffect(() => {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(data))
    } catch {
      /* private mode etc. — the app still works for this visit */
    }
  }, [data])

  const addHabit = useCallback((name: string, color: HabitColor) => {
    setData((d) => {
      const h: Habit = { id: newId(), name, color, createdAt: todayKey() }
      return { ...d, habits: [...d.habits, h], checks: { ...d.checks, [h.id]: {} } }
    })
  }, [])

  const updateHabit = useCallback((id: string, patch: Partial<Pick<Habit, "name" | "color">>) => {
    setData((d) => ({ ...d, habits: d.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) }))
  }, [])

  const deleteHabit = useCallback((id: string) => {
    setData((d) => {
      const checks = { ...d.checks }
      delete checks[id]
      return { ...d, habits: d.habits.filter((h) => h.id !== id), checks }
    })
  }, [])

  const moveHabit = useCallback((id: string, dir: -1 | 1) => {
    setData((d) => {
      const i = d.habits.findIndex((h) => h.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= d.habits.length) return d
      const habits = [...d.habits]
      ;[habits[i], habits[j]] = [habits[j], habits[i]]
      return { ...d, habits }
    })
  }, [])

  const toggleCheck = useCallback((id: string, day: DayKey) => {
    setData((d) => {
      const days = { ...(d.checks[id] ?? {}) }
      if (days[day]) delete days[day]
      else days[day] = true
      // Checking a day before the habit existed moves its start back, so stats stay honest.
      const habits = d.habits.map((h) => (h.id === id && day < h.createdAt ? { ...h, createdAt: day } : h))
      return { ...d, habits, checks: { ...d.checks, [id]: days } }
    })
  }, [])

  const replaceAll = useCallback((next: AppData) => setData(next), [])

  return { data, addHabit, updateHabit, deleteHabit, moveHabit, toggleCheck, replaceAll }
}

export type HabitStore = ReturnType<typeof useHabitStore>

/** Example habits with ~6 weeks of history, so the dashboard can be tried without waiting. */
export function sampleData(): AppData {
  const today = todayKey()
  const start = addDays(today, -44)
  const defs: [string, HabitColor, number][] = [
    ["Drink 2L of water", "blue", 0.85],
    ["Read 20 pages", "violet", 0.6],
    ["Walk 30 minutes", "green", 0.7],
    ["No phone after 11pm", "orange", 0.45],
  ]
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const data = emptyData()
  for (const [name, color, p] of defs) {
    const h: Habit = { id: newId(), name, color, createdAt: start }
    data.habits.push(h)
    data.checks[h.id] = {}
    for (let k = start; k < today; k = addDays(k, 1)) if (rand() < p) data.checks[h.id][k] = true
  }
  return data
}

export function exportData(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `habits-backup-${todayKey()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
