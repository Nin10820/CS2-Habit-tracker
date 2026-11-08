import { ChartBar, CheckCircle, GearSix, Kanban, Moon, Sun, Timer as TimerIcon } from "@phosphor-icons/react"
import { useEffect, useState, type ComponentType } from "react"
import { GroupCard } from "./components/GroupCard"
import { ProgressPanel } from "./components/ProgressPanel"
import { SettingsSheet } from "./components/SettingsSheet"
import { TaskSheet } from "./components/TaskSheet"
import { QuickTimer } from "./components/Timer"
import { WeekBoard } from "./components/WeekBoard"
import { GROUPS } from "./config/groups"
import { todayKey, type DayKey } from "./lib/date"
import { itemsForDay } from "./lib/stats"
import { useStore } from "./lib/store"
import { useTheme } from "./lib/theme"
import type { DayItem, Task } from "./lib/types"

/** Below 1280px the three columns become tabs. */
type Tab = "tasks" | "focus" | "progress"
type IconT = ComponentType<{ size?: number; weight?: "regular" | "fill" | "bold" }>
const TABS: [Tab, string, IconT][] = [
  ["tasks", "Tasks", Kanban],
  ["focus", "Focus", TimerIcon],
  ["progress", "Progress", ChartBar],
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

type SheetState = { kind: "add"; day: DayKey } | { kind: "edit"; task: Task } | { kind: "settings" } | null

export default function App() {
  const store = useStore()
  const { data } = store
  const today = useToday()
  const [theme, setTheme, isDark] = useTheme()
  const [tab, setTab] = useState<Tab>("tasks")
  const [sheet, setSheet] = useState<SheetState>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  const toggle = (item: DayItem, day: DayKey) => (item.kind === "habit" ? store.toggleHabit(item.id, day) : store.toggleTask(item.id))
  const edit = (item: DayItem) => {
    const task = item.kind === "task" && data.tasks.find((t) => t.id === item.id)
    if (task) setSheet({ kind: "edit", task })
  }
  const todayItems = itemsForDay(data, today)

  // Visible on its own tab below 1280px; always visible as a column from 1280px.
  const pane = (t: Tab) => `${tab === t ? "" : "hidden"} xl:block`

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md xl:static xl:border-0 xl:bg-transparent xl:backdrop-blur-none">
        <div className="flex h-14 w-full items-center gap-3 px-4 sm:px-6 xl:h-16">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-accent text-on-accent">
              <CheckCircle size={20} weight="fill" />
            </span>
            <span className="font-title text-lg font-semibold">Habits</span>
          </div>

          <nav aria-label="Main" className="ml-auto hidden gap-1 rounded-2xl bg-surface-2 p-1 sm:flex xl:hidden">
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

          <div className="ml-auto flex gap-2 sm:ml-0 xl:ml-auto">
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className="press grid size-10 place-items-center rounded-full bg-surface-2 text-ink-2"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setSheet({ kind: "settings" })}
              aria-label="Settings"
              className="press grid size-10 place-items-center rounded-full bg-surface-2 text-ink-2"
            >
              <GearSix size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] sm:pt-6 sm:pb-12 xl:grid xl:grid-cols-[300px_minmax(0,1fr)_340px] xl:items-start xl:gap-6 xl:pt-2">
        <aside className={`${pane("focus")} space-y-4`}>
          <h2 className="text-3xl font-semibold xl:hidden">Focus</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <QuickTimer />
            {GROUPS.map((g) => (
              <GroupCard key={g.id} group={g} items={todayItems.filter((i) => i.group.id === g.id)} onToggle={(i) => toggle(i, today)} />
            ))}
          </div>
        </aside>

        <section className={`${pane("tasks")} min-w-0 xl:border-x xl:border-line xl:px-6`}>
          <WeekBoard
            data={data}
            today={today}
            onToggle={toggle}
            onAdd={(day) => setSheet({ kind: "add", day })}
            onEdit={edit}
          />
        </section>

        <aside className={pane("progress")}>
          <ProgressPanel data={data} today={today} />
        </aside>
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      >
        <div className="grid grid-cols-3">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${tab === id ? "text-accent" : "text-ink-3"}`}
            >
              <Icon size={24} weight={tab === id ? "fill" : "regular"} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {sheet?.kind === "add" && <TaskSheet day={sheet.day} onSave={store.addTask} onClose={() => setSheet(null)} />}
      {sheet?.kind === "edit" && (
        <TaskSheet
          day={sheet.task.day}
          task={sheet.task}
          onSave={(t) => store.updateTask(sheet.task.id, t)}
          onDelete={() => store.deleteTask(sheet.task.id)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === "settings" && <SettingsSheet store={store} theme={theme} setTheme={setTheme} onClose={() => setSheet(null)} />}
    </div>
  )
}
