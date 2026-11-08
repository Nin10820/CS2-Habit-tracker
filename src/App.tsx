import { ChartBar, GearSix, Kanban, Moon, SidebarSimple, Sun, Timer as TimerIcon } from "@phosphor-icons/react"
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

/** Open/closed state of a side panel, remembered in this browser. */
function usePanel(name: string) {
  const key = `habit-tracker:panel-${name}`
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(key) !== "closed"
    } catch {
      return true
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, open ? "open" : "closed")
    } catch {
      /* ignore */
    }
  }, [key, open])
  return [open, setOpen] as const
}

type SheetState = { kind: "add"; day: DayKey } | { kind: "edit"; task: Task } | { kind: "settings" } | null

const iconBtn = "press grid size-10 shrink-0 place-items-center rounded-full text-ink-2"

export default function App() {
  const store = useStore()
  const { data } = store
  const today = useToday()
  const [theme, setTheme, isDark] = useTheme()
  const [tab, setTab] = useState<Tab>("tasks")
  const [sheet, setSheet] = useState<SheetState>(null)
  const [leftOpen, setLeftOpen] = usePanel("left")
  const [rightOpen, setRightOpen] = usePanel("right")

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  const toggle = (item: DayItem, day: DayKey) => (item.kind === "habit" ? store.toggleHabit(item.id, day) : store.toggleTask(item.id))
  const edit = (item: DayItem) => {
    const task = item.kind === "task" && data.tasks.find((t) => t.id === item.id)
    if (task) setSheet({ kind: "edit", task })
  }
  const todayItems = itemsForDay(data, today)

  const themeBtn = (
    // Quick light / dark switch. "Follow the system" stays in Settings.
    <div role="radiogroup" aria-label="Theme" className="flex h-10 shrink-0 items-center gap-0.5 rounded-full bg-surface-2 p-1">
      {(
        [
          ["light", "Light", Sun],
          ["dark", "Dark", Moon],
        ] as const
      ).map(([value, label, Icon]) => {
        const on = value === "dark" ? isDark : !isDark
        return (
          <button
            key={value}
            role="radio"
            aria-checked={on}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={`press grid size-8 place-items-center rounded-full transition-colors ${on ? "bg-surface text-ink shadow-card" : "text-ink-3"}`}
          >
            <Icon size={18} weight={on ? "fill" : "regular"} />
          </button>
        )
      })}
    </div>
  )
  const settingsBtn = (
    <button onClick={() => setSheet({ kind: "settings" })} aria-label="Settings" className={`${iconBtn} bg-surface-2`}>
      <GearSix size={20} />
    </button>
  )

  // Below 1280px only the current tab shows. From 1280px all three show, and the side panels can be closed.
  const show = (t: Tab) => (tab === t ? "block" : "hidden")
  const pad = "px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12"

  return (
    <div className="min-h-dvh xl:flex xl:h-dvh xl:overflow-hidden">
      {/* Small screens: theme, settings and (from 640px) the tabs. No logo. */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6 xl:hidden">
        <nav aria-label="Main" className="hidden gap-1 rounded-2xl bg-surface-2 p-1 sm:flex">
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
        <div className="ml-auto flex gap-2">
          {themeBtn}
          {settingsBtn}
        </div>
      </header>

      <aside
        aria-label="Focus"
        className={`${show("focus")} ${pad} ${leftOpen ? "xl:block" : "xl:hidden"} xl:w-[320px] xl:shrink-0 xl:overflow-y-auto xl:border-r xl:border-line xl:px-4 xl:pt-0 xl:pb-6`}
      >
        <div className="flex items-center pb-4 xl:h-16 xl:pb-0">
          <h2 className="text-2xl font-semibold">Focus</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <QuickTimer />
          {GROUPS.map((g) => (
            <GroupCard key={g.id} group={g} items={todayItems.filter((i) => i.group.id === g.id)} onToggle={(i) => toggle(i, today)} />
          ))}
        </div>
      </aside>

      <section aria-label="My tasks" className={`${show("tasks")} ${pad} min-w-0 xl:flex xl:flex-1 xl:flex-col xl:p-0`}>
        <WeekBoard
          data={data}
          today={today}
          onToggle={toggle}
          onAdd={(day) => setSheet({ kind: "add", day })}
          onEdit={edit}
          leading={
            <button
              onClick={() => setLeftOpen((o) => !o)}
              aria-pressed={leftOpen}
              aria-label={leftOpen ? "Hide focus panel" : "Show focus panel"}
              title={leftOpen ? "Hide focus panel" : "Show focus panel"}
              className={`${iconBtn} hidden border border-line xl:grid`}
            >
              <SidebarSimple size={20} weight={leftOpen ? "regular" : "fill"} />
            </button>
          }
          trailing={
            <div className="hidden gap-2 xl:flex">
              {themeBtn}
              {settingsBtn}
              <button
                onClick={() => setRightOpen((o) => !o)}
                aria-pressed={rightOpen}
                aria-label={rightOpen ? "Hide progress panel" : "Show progress panel"}
                title={rightOpen ? "Hide progress panel" : "Show progress panel"}
                className={`${iconBtn} border border-line`}
              >
                <SidebarSimple size={20} weight={rightOpen ? "regular" : "fill"} className="-scale-x-100" />
              </button>
            </div>
          }
        />
      </section>

      <aside
        aria-label="Your progress"
        className={`${show("progress")} ${pad} ${rightOpen ? "xl:block" : "xl:hidden"} xl:w-[360px] xl:shrink-0 xl:overflow-y-auto xl:border-l xl:border-line xl:px-4 xl:pt-0 xl:pb-6`}
      >
        <ProgressPanel data={data} today={today} />
      </aside>

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
