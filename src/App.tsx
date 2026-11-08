import { ListChecks, Moon, Sun, CheckCircle } from "@phosphor-icons/react"
import { useEffect, useState, type ComponentType } from "react"
import { HabitSheet } from "./components/HabitSheet"
import { todayKey } from "./lib/date"
import { sampleData, useHabitStore } from "./lib/store"
import { useTheme } from "./lib/theme"
import type { Habit } from "./lib/types"
import { HabitsScreen } from "./screens/HabitsScreen"
import { StatsPanel } from "./screens/StatsPanel"
import { TodayScreen } from "./screens/TodayScreen"

type Tab = "today" | "habits"
type IconT = ComponentType<{ size?: number; weight?: "regular" | "fill" | "bold" }>
const TABS: [Tab, string, IconT][] = [
  ["today", "Today", CheckCircle],
  ["habits", "Habits", ListChecks],
]

/** Today's key, refreshed when the tab regains focus or the clock passes midnight. */
function useToday() {
  const [today, setToday] = useState(todayKey)
  useEffect(() => {
    const tick = () => setToday(todayKey())
    const id = setInterval(tick, 60_000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [])
  return today
}

export default function App() {
  const store = useHabitStore()
  const today = useToday()
  const [theme, setTheme, isDark] = useTheme()
  const [tab, setTab] = useState<Tab>("today")
  const [sheet, setSheet] = useState<{ habit?: Habit } | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  // Today with habits is a two-column dashboard on wide screens; everything else stays a narrow column.
  const wide = tab === "today" && store.data.habits.length > 0
  const width = wide ? "max-w-2xl lg:max-w-5xl" : "max-w-2xl"

  const openAdd = () => setSheet({})
  const openEdit = (habit: Habit) => setSheet({ habit })

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className={`mx-auto flex h-14 ${width} items-center gap-3 px-4`}>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-accent text-on-accent">
              <CheckCircle size={20} weight="fill" />
            </span>
            <span className="font-title text-lg font-semibold">Habits</span>
          </div>

          <nav aria-label="Main" className="ml-auto hidden gap-1 rounded-2xl bg-surface-2 p-1 sm:flex">
            {TABS.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={`press flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ${
                  tab === id ? "bg-surface text-ink shadow-card" : "text-ink-2"
                }`}
              >
                <Icon size={18} weight={tab === id ? "fill" : "regular"} /> {label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="press ml-auto grid size-10 place-items-center rounded-full bg-surface-2 text-ink-2 sm:ml-0"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className={`mx-auto ${width} px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] sm:pt-6 sm:pb-12`}>
        {tab === "today" && (
          <div className={`grid gap-4 ${wide ? "lg:grid-cols-2 lg:items-start lg:gap-6" : ""}`}>
            <TodayScreen store={store} today={today} onAdd={openAdd} onEdit={openEdit} onSample={() => store.replaceAll(sampleData())} />
            <StatsPanel data={store.data} today={today} />
          </div>
        )}
        {tab === "habits" && <HabitsScreen store={store} theme={theme} setTheme={setTheme} onAdd={openAdd} onEdit={openEdit} />}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      >
        <div className="grid grid-cols-2">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                tab === id ? "text-accent" : "text-ink-3"
              }`}
            >
              <Icon size={24} weight={tab === id ? "fill" : "regular"} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {sheet && (
        <HabitSheet
          habit={sheet.habit}
          onClose={() => setSheet(null)}
          onSave={(name, color) => (sheet.habit ? store.updateHabit(sheet.habit.id, { name, color }) : store.addHabit(name, color))}
          onDelete={sheet.habit ? () => store.deleteHabit(sheet.habit!.id) : undefined}
        />
      )}
    </div>
  )
}
