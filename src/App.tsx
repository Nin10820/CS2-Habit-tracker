import { ChartBar, GearSix, Kanban, Moon, Play, Plus, SidebarSimple, Sun, Timer as TimerIcon } from "@phosphor-icons/react"
import { useEffect, useRef, useState, type ComponentType } from "react"
import { GroupCard } from "./components/GroupCard"
import { ProgressPanel } from "./components/ProgressPanel"
import { SettingsSheet } from "./components/SettingsSheet"
import { DayGroupSheet } from "./components/DayGroupSheet"
import { DocSheet } from "./components/DocSheet"
import { RoutineCard, RoutineEditSheet, RoutineLogSheet, type RoutineEntry } from "./components/Routine"
import { GroupSheet } from "./components/GroupSheet"
import { AddSheet, TaskSheet } from "./components/TaskSheet"
import { MiniPlayer, useFocusTimer, type FocusTask } from "./components/Timer"
import { WeekBoard } from "./components/WeekBoard"
import { todayKey, type DayKey } from "./lib/date"
import { dueItems, routineDay, suggestTime } from "./lib/routine"
import { groupDefs, itemsForDay } from "./lib/stats"
import { useStore } from "./lib/store"
import { useDayParts } from "./lib/prefs"
import { useTheme } from "./lib/theme"
import type { DayItem, FocusItem, Group, RoutineItem, Task } from "./lib/types"

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

/** Routine moments you pressed "Later" on, as "day:id". Kept in this browser only. */
const LATER_KEY = "habit-tracker:routine-later"
function readLater(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LATER_KEY) ?? "[]") as string[])
  } catch {
    return new Set()
  }
}
function addLater(keys: string[]) {
  try {
    // Only the last few days matter.
    const all = [...readLater(), ...keys].slice(-30)
    localStorage.setItem(LATER_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
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

type FocusRef = { day: DayKey; groupId?: string; item?: { kind: DayItem["kind"]; id: string } }

type SheetState =
  | { kind: "add"; day: DayKey; group?: string }
  | { kind: "edit"; task: Task }
  | { kind: "settings" }
  /** Make or edit a group. `back` returns to that day's Add sheet afterwards. */
  | { kind: "group"; group?: Group; back?: DayKey }
  | { kind: "dayGroup"; groupId: string; day: DayKey }
  /** A group's context and task list (the expand button). */
  | { kind: "doc"; groupId: string }
  /** Log routine times. `auto` is the one that opens by itself in the morning / at night. */
  | { kind: "routineLog"; entries: RoutineEntry[]; auto?: boolean; future?: boolean }
  | { kind: "routineEdit" }
  | null

const iconBtn = "press grid size-10 shrink-0 place-items-center rounded-full text-ink-2"

export default function App() {
  const store = useStore()
  const { data } = store
  const today = useToday()
  const [theme, setTheme, isDark] = useTheme()
  const [dayParts, setDayParts] = useDayParts()
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
  const defs = groupDefs(data)

  // Routine: the form to log a moment's time, filled in with now (morning) or your usual time (evening).
  const entryFor = (item: RoutineItem, day: DayKey): RoutineEntry => ({
    item,
    day,
    suggested: suggestTime(data, item, day, new Date()),
    logged: data.routine.log[item.id]?.[day],
  })
  // A moment already logged that day is un-logged by clicking it again; otherwise the form opens.
  const logRoutine = (item: RoutineItem, day: DayKey) =>
    data.routine.log[item.id]?.[day]
      ? store.logRoutine(item.id, day, null)
      : setSheet({ kind: "routineLog", entries: [entryFor(item, day)], future: day > today })

  // In the morning (and at night) the form opens by itself for moments not logged yet, once per day unless logged.
  const latest = useRef({ data, sheet })
  latest.current = { data, sheet }
  useEffect(() => {
    const ask = () => {
      const { data: d, sheet: open } = latest.current
      if (open || document.visibilityState !== "visible") return
      const now = new Date()
      const due = dueItems(d, now, readLater())
      if (!due.length) return
      setSheet({
        kind: "routineLog",
        auto: true,
        entries: due.map((item) => {
          const day = routineDay(item, now)
          return { item, day, suggested: suggestTime(d, item, day, now) }
        }),
      })
    }
    const first = setTimeout(ask, 600)
    const id = setInterval(ask, 5 * 60_000)
    document.addEventListener("visibilitychange", ask)
    return () => {
      clearTimeout(first)
      clearInterval(id)
      document.removeEventListener("visibilitychange", ask)
    }
  }, [])

  // What the Quick timer is focused on: a group card (its items listed as sub-tasks), optionally one item in it,
  // or a standalone item. Clicking a group title picks the group; clicking an item picks that item.
  const [focus, setFocus] = useState<FocusRef | null>(null)
  const focusDayItems = focus ? itemsForDay(data, focus.day) : []
  const groupMembers = focus?.groupId ? focusDayItems.filter((i) => i.group.id === focus.groupId) : []
  const focusedItem = focus?.item ? focusDayItems.find((i) => i.kind === focus.item!.kind && i.id === focus.item!.id) : undefined
  // A whole group counts as one item: its total minutes, done when every item in it is done.
  const groupItem: FocusItem | undefined =
    focus?.groupId && groupMembers.length
      ? {
          kind: "group",
          id: focus.groupId,
          name: groupMembers[0].group.label,
          group: groupMembers[0].group,
          minutes: groupMembers.reduce((s, i) => s + (i.minutes ?? 0), 0) || undefined,
          done: groupMembers.every((i) => i.done),
        }
      : undefined
  const focused: FocusItem | undefined = focusedItem ?? groupItem
  const focusKey = focused && focus ? `${focus.day}:${focused.kind}:${focused.id}` : undefined
  // Picking only sets the task: the view stays put, and the mini player shows it if the Quick timer is off screen.
  const pickFocus = (item: DayItem, day: DayKey) =>
    setFocus({ day, groupId: item.group.standalone ? undefined : item.group.id, item: { kind: item.kind, id: item.id } })
  const pickGroup = (groupId: string, day: DayKey) => setFocus({ day, groupId })
  const backToGroup = () => setFocus((f) => (f ? { ...f, item: undefined } : f))
  // Ticking a focused group ticks all its items, or unticks them all when they're all done.
  const toggleFocused = () => {
    if (!focused || !focus) return
    if (focused.kind !== "group") return toggle(focused as DayItem, focus.day)
    groupMembers.filter((i) => i.done === focused.done).forEach((i) => toggle(i, focus.day))
  }
  const focusTask: FocusTask | undefined =
    focused && focus
      ? {
          item: focused,
          day: focus.day,
          today,
          group: groupItem && { item: groupItem, items: groupMembers, active: focusedItem },
        }
      : undefined
  const focusHandlers = {
    onToggleTask: toggleFocused,
    onToggleSub: (i: DayItem) => focus && toggle(i, focus.day),
    onPickSub: (i: DayItem) => focus && pickFocus(i, focus.day),
    onPickGroup: backToGroup,
  }
  const timer = useFocusTimer(focusTask, (s) => store.addFocus(todayKey(), s))

  // The player bar shows whenever a task is picked, or for a Quick focus session without a task.
  const [quick, setQuick] = useState(false)
  const showMini = !!focusTask || quick
  const closeMini = () => {
    if (timer.running) timer.toggle(timer.running)
    setFocus(null)
    setQuick(false)
  }
  // Clicking what's already in the player again closes the player.
  const focusOrClose = (item: DayItem, day: DayKey) => (focusKey === `${day}:${item.kind}:${item.id}` ? closeMini() : pickFocus(item, day))
  const groupOrClose = (groupId: string, day: DayKey) => (focusKey === `${day}:group:${groupId}` ? closeMini() : pickGroup(groupId, day))

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
    // Room for the player bar: below 1280px the page scrolls, so it gets bottom padding; from 1280px the
    // columns scroll on their own, so each adds --player-space inside its scroll area instead of the page
    // shrinking (which left an empty band under everything).
    <div
      style={{ ["--player-space" as string]: showMini ? "96px" : "0px" }}
      className={`min-h-dvh xl:flex xl:h-dvh xl:overflow-hidden ${showMini ? "pb-20 xl:pb-0" : ""}`}
    >
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
        className={`${show("focus")} ${pad} ${leftOpen ? "xl:block" : "xl:hidden"} xl:w-[360px] xl:shrink-0 xl:overflow-y-auto xl:border-r xl:border-line xl:px-4 xl:pt-0 xl:pb-[calc(var(--player-space)+24px)]`}
      >
        <div className="flex items-center pb-4 xl:h-16 xl:pb-0">
          <h2 className="text-2xl font-semibold">Focus</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
          {/* Quick focus: a timer without picking a task. It opens the player bar at the bottom. */}
          <button
            onClick={() => {
              setFocus(null)
              setQuick(true)
            }}
            className="press flex items-center gap-3 rounded-2xl bg-[#17191e] p-2.5 pr-3 text-left text-white"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10">
              <TimerIcon size={24} weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Quick focus</span>
              <span className="block truncate text-[13px] text-white/55">No task needed · or tap any task</span>
            </span>
            <span className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-white px-3 text-sm font-semibold text-[#17191e]">
              <Play size={14} weight="fill" /> Open
            </span>
          </button>
          {/* A line between the focus timer and your lists. */}
          <hr className="border-line md:col-span-2 xl:col-span-1" />
          <RoutineCard
            data={data}
            today={today}
            onToggleToday={(i, on) => store.setRoutineOnDay(i.id, today, on)}
            onCreate={store.createRoutine}
            onEdit={() => setSheet({ kind: "routineEdit" })}
          />
          {data.groups.map((g) => (
            <GroupCard
              key={g.id}
              group={defs.get(g.id)!}
              onOpen={() => setSheet({ kind: "doc", groupId: g.id })}
              onPlanToday={() => store.addPlan(g.id, today)}
              // "Other" (the stand-alone list) also holds today's one-off tasks that aren't in a group.
              items={todayItems.filter((i) => i.group.id === g.id || (g.standalone && i.group.id === ""))}
              onToggle={(i) => toggle(i, today)}
              onFocus={(i) => focusOrClose(i, today)}
              focusedId={focus?.day === today && focused ? `${focused.kind}:${focused.id}` : undefined}
            />
          ))}
          <button
            onClick={() => setSheet({ kind: "group" })}
            className="press flex h-11 items-center justify-center gap-2 rounded-[20px] border border-dashed border-line text-sm font-semibold text-ink-2"
          >
            <Plus size={18} weight="bold" /> New group
          </button>
        </div>
      </aside>

      <section aria-label="My tasks" className={`${show("tasks")} ${pad} min-w-0 xl:flex xl:flex-1 xl:flex-col xl:p-0`}>
        <WeekBoard
          data={data}
          today={today}
          onToggle={toggle}
          onAdd={(day) => setSheet({ kind: "add", day })}
          onEdit={edit}
          onFocus={focusOrClose}
          onFocusGroup={groupOrClose}
          onGroupMenu={(groupId, day) => setSheet({ kind: "dayGroup", groupId, day })}
          onRoutine={logRoutine}
          onDropRoutine={(id, day) => store.setRoutineOnDay(id, day, true)}
          onDropCard={(c, day) => (c.kind === "task" ? store.updateTask(c.id, { day }) : store.moveGroup(c.id, c.from, day))}
          onReorder={store.setOrder}
          dayParts={dayParts}
          focusKey={focusKey}
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
        className={`${show("progress")} ${pad} ${rightOpen ? "xl:block" : "xl:hidden"} xl:w-[360px] xl:shrink-0 xl:overflow-y-auto xl:border-l xl:border-line xl:px-4 xl:pt-0 xl:pb-[calc(var(--player-space)+24px)]`}
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

      {showMini && <MiniPlayer task={focusTask} timer={timer} {...focusHandlers} onClose={closeMini} />}

      {sheet?.kind === "add" && (
        <AddSheet
          key={`${sheet.day}:${sheet.group ?? ""}`}
          day={sheet.day}
          data={data}
          initialGroup={sheet.group}
          onAddPlan={(group, repeat) => store.addPlan(group, sheet.day, repeat)}
          onAddTask={store.addTask}
          onNewGroup={() => setSheet({ kind: "group", back: sheet.day })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === "edit" && (
        <TaskSheet
          task={sheet.task}
          groups={data.groups}
          onSave={(t) => store.updateTask(sheet.task.id, t)}
          onDelete={() => store.deleteTask(sheet.task.id)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === "group" && (
        <GroupSheet
          group={sheet.group}
          onSave={(g) => {
            store.saveGroup(g)
            // Made from a day's Add sheet: go back there with the new group picked.
            if (sheet.back) setSheet({ kind: "add", day: sheet.back, group: g.id })
          }}
          onDelete={sheet.group && (() => store.deleteGroup(sheet.group!.id))}
          onClose={() => setSheet((s) => (s?.kind === "group" ? (s.back ? { kind: "add", day: s.back } : null) : s))}
        />
      )}
      {sheet?.kind === "routineLog" && (
        <RoutineLogSheet
          entries={sheet.entries}
          auto={sheet.auto}
          future={sheet.future}
          onSave={(values) => values.forEach((v) => store.logRoutine(v.item.id, v.day, v.time))}
          onClear={(e) => store.logRoutine(e.item.id, e.day, null)}
          onRemove={(e) => {
            store.setRoutineOnDay(e.item.id, e.day, false)
            store.logRoutine(e.item.id, e.day, null)
          }}
          onLater={() => addLater(sheet.entries.map((e) => `${e.day}:${e.item.id}`))}
          onClose={() => {
            // Closing the form that opened by itself also means "not now": it won't ask again today.
            if (sheet.auto) addLater(sheet.entries.map((e) => `${e.day}:${e.item.id}`))
            setSheet(null)
          }}
        />
      )}
      {sheet?.kind === "routineEdit" && <RoutineEditSheet items={data.routine.items} onSave={store.saveRoutine} onClose={() => setSheet(null)} />}
      {sheet?.kind === "doc" &&
        (() => {
          const g = data.groups.find((x) => x.id === sheet.groupId)
          return g && <DocSheet group={defs.get(g.id)!} onEdit={() => setSheet({ kind: "group", group: g })} onClose={() => setSheet(null)} />
        })()}
      {sheet?.kind === "dayGroup" &&
        (() => {
          const g = data.groups.find((x) => x.id === sheet.groupId)
          return (
            g && (
              <DayGroupSheet
                group={g}
                day={sheet.day}
                data={data}
                onEdit={() => setSheet({ kind: "group", group: g })}
                onRemoveDay={() => store.removeFromDay(g.id, sheet.day)}
                onStopRepeat={() => store.stopRepeat(g.id, sheet.day)}
                onClose={() => setSheet(null)}
              />
            )
          )
        })()}
      {sheet?.kind === "settings" && <SettingsSheet store={store} theme={theme} setTheme={setTheme} dayParts={dayParts} setDayParts={setDayParts} onClose={() => setSheet(null)} />}
    </div>
  )
}
