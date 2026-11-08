import { useEffect, useState } from "react"

export type ThemePref = "system" | "light" | "dark"
const KEY = "habit-tracker:theme"
const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === "light" || v === "dark") return v
  } catch {
    /* ignore */
  }
  return "system"
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(read)

  useEffect(() => {
    const root = document.documentElement
    if (pref === "system") delete root.dataset.theme
    else root.dataset.theme = pref
    try {
      if (pref === "system") localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, pref)
    } catch {
      /* ignore */
    }
  }, [pref])


  const [systemDark, setSystemDark] = useState(() => !!mq?.matches)
  useEffect(() => {
    if (!mq) return
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])

  const isDark = pref === "dark" || (pref === "system" && systemDark)
  return [pref, setPref, isDark] as const
}
