import { useEffect, useState } from "react"

/** Show the day split into Morning / Afternoon / Evening / Anytime (Settings). Kept in this browser. */
const DAY_PARTS_KEY = "habit-tracker:day-parts"

function read(): boolean {
  try {
    return localStorage.getItem(DAY_PARTS_KEY) === "on"
  } catch {
    return false
  }
}

export function useDayParts() {
  const [on, setOn] = useState(read)
  useEffect(() => {
    try {
      if (on) localStorage.setItem(DAY_PARTS_KEY, "on")
      else localStorage.removeItem(DAY_PARTS_KEY)
    } catch {
      /* ignore */
    }
  }, [on])
  return [on, setOn] as const
}

export type DayPart = "morning" | "afternoon" | "evening" | "anytime"

/** Which part of the day a card time falls in: before 12:00, before 17:00, later, or no time. */
export function dayPart(time?: string): DayPart {
  if (!time) return "anytime"
  const h = Number(time.slice(0, 2))
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"
}
