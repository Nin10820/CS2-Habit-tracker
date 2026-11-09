import { ArrowCounterClockwise, Check, Pause, Play, Timer as TimerIcon, X } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import { BREAK_MINUTES, FOCUS_MINUTES } from "../config/groups"
import { formatShort, type DayKey } from "../lib/date"
import { colorVar, type DayItem } from "../lib/types"
import { Card } from "./ui"

type Mode = "focus" | "break"
const LENGTH: Record<Mode, number> = { focus: FOCUS_MINUTES * 60_000, break: BREAK_MINUTES * 60_000 }

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

/** Short chime with Web Audio, so no sound file is needed. */
function chime() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.22].forEach((t, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = i ? 880 : 660
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.5)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.55)
    })
    setTimeout(() => ctx.close(), 1200)
  } catch {
    /* no audio — the title change still tells you */
  }
}

export type FocusTask = { item: DayItem; day: DayKey; today: DayKey }

/**
 * Focus / break countdown state. One runs at a time; each keeps its remaining time while paused.
 * With a task picked, the focus length is that task's duration.
 * Lives in App so the Quick timer and the mini player share one clock.
 */
export function useFocusTimer(task?: FocusTask) {
  const focusMs = (task?.item.minutes ?? FOCUS_MINUTES) * 60_000
  const lengths = useRef<Record<Mode, number>>({ ...LENGTH, focus: focusMs })
  lengths.current = { ...LENGTH, focus: focusMs }

  const [left, setLeft] = useState<Record<Mode, number>>(() => ({ ...lengths.current }))
  const [running, setRunning] = useState<Mode | null>(null)
  const [finished, setFinished] = useState<Mode | null>(null)
  const endsAt = useRef(0)
  const baseTitle = useRef(document.title)
  const taskName = task?.item.name

  // A new task (or none) resets the focus clock to its length, unless a focus session is running.
  const taskKey = task ? `${task.day}:${task.item.kind}:${task.item.id}` : ""
  const runningRef = useRef(running)
  runningRef.current = running
  useEffect(() => {
    setFinished(null)
    if (runningRef.current !== "focus") setLeft((l) => ({ ...l, focus: lengths.current.focus }))
  }, [taskKey, focusMs])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const ms = Math.max(0, endsAt.current - Date.now())
      setLeft((l) => ({ ...l, [running]: ms }))
      document.title = `${mmss(ms)} · ${running === "focus" ? (taskName ?? "Focus") : "Break"}`
      if (ms === 0) {
        setRunning(null)
        setFinished(running)
        setLeft((l) => ({ ...l, [running]: lengths.current[running] }))
        document.title = running === "focus" ? "Focus done · time for a break" : "Break over"
        chime()
      }
    }, 250)
    return () => clearInterval(id)
  }, [running, taskName])

  useEffect(() => {
    const t = baseTitle.current
    return () => {
      document.title = t
    }
  }, [])

  function toggle(mode: Mode) {
    setFinished(null)
    if (running === mode) {
      setRunning(null)
      document.title = baseTitle.current
      return
    }
    endsAt.current = Date.now() + left[mode]
    setRunning(mode)
  }

  function reset(mode: Mode) {
    if (running === mode) setRunning(null)
    setLeft((l) => ({ ...l, [mode]: lengths.current[mode] }))
    document.title = baseTitle.current
  }

  return { left, running, finished, lengths: lengths.current, toggle, reset }
}

export type FocusTimer = ReturnType<typeof useFocusTimer>

/** The full Quick timer card in the Focus panel. */
export function QuickTimer({
  task,
  timer,
  onToggleTask,
  onClearTask,
}: {
  task?: FocusTask
  timer: FocusTimer
  onToggleTask: () => void
  onClearTask: () => void
}) {
  const { left, running, finished, lengths, toggle, reset } = timer

  return (
    <Card>
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">
        <TimerIcon size={16} /> Quick timer
      </p>

      {/* Task: what this focus session is for. Picked by clicking a habit or task anywhere. */}
      <section aria-label="Task" className="mt-3 rounded-2xl bg-surface-2 p-3">
        <p className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Task</p>
        {task ? (
          <div className="mt-1.5 flex items-start gap-2.5" style={{ ["--hc" as string]: colorVar(task.item.group.color) }}>
            <button
              onClick={onToggleTask}
              disabled={task.day > task.today}
              aria-pressed={task.item.done}
              aria-label={task.item.done ? `Mark ${task.item.name} not done` : `Mark ${task.item.name} done`}
              className="-m-1 grid shrink-0 place-items-center p-1 disabled:opacity-35"
            >
              <span
                className={`grid size-6 place-items-center rounded-full border-2 ${
                  task.item.done ? "hc-fill border-transparent text-white" : "border-line text-ink-3"
                }`}
              >
                <Check size={12} weight="bold" className={task.item.done ? "pop" : "opacity-60"} />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold leading-snug break-words ${task.item.done ? "text-ink-3" : ""}`}>{task.item.name}</p>
              <p className="mt-0.5 truncate text-xs text-ink-3">
                <span className="hc-text font-semibold">#</span>
                {task.item.group.label}
                {task.item.minutes ? ` · ${task.item.minutes} min` : ""}
                {task.day === task.today ? "" : ` · ${formatShort(task.day)}`}
              </p>
            </div>
            <button onClick={onClearTask} aria-label="Stop focusing on this task" className="press -m-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-3">
              <X size={14} weight="bold" />
            </button>
          </div>
        ) : (
          <p className="mt-1 text-sm text-ink-3">Click a habit or task to focus on it.</p>
        )}
      </section>

      {(["focus", "break"] as const).map((mode) => {
        const on = running === mode
        const touched = left[mode] !== lengths[mode]
        return (
          <div key={mode} className="mt-3">
            <p className="text-xs font-medium text-ink-3">{mode === "focus" ? "Focus time" : "Break time"}</p>
            <div className="mt-1 flex items-center gap-2">
              <div
                className={`flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl border font-title text-2xl font-semibold tabular-nums ${
                  on ? "border-accent text-accent" : "border-line"
                }`}
                aria-live="off"
              >
                {mmss(left[mode])}
              </div>
              {touched && !on && (
                <button
                  onClick={() => reset(mode)}
                  aria-label={`Reset ${mode} timer`}
                  className="press grid size-11 shrink-0 place-items-center rounded-xl text-ink-3"
                >
                  <ArrowCounterClockwise size={18} />
                </button>
              )}
              <button
                onClick={() => toggle(mode)}
                aria-label={on ? `Pause ${mode} timer` : `Start ${mode} timer`}
                className={`press grid h-11 w-16 shrink-0 place-items-center rounded-xl ${
                  on ? "bg-accent text-on-accent" : "bg-accent-soft text-accent"
                }`}
              >
                {on ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
              </button>
            </div>
          </div>
        )
      })}
      {finished && (
        <p className="mt-3 text-sm font-medium text-accent" role="status">
          {finished === "focus" ? "Focus done. Take a break." : "Break over. Back to it."}
        </p>
      )}
    </Card>
  )
}

/**
 * Small "now playing" bar pinned to the bottom of the screen, like a music player.
 * Shows the picked task and its countdown without leaving the current view.
 * Tapping the name opens the full Quick timer.
 */
export function MiniPlayer({
  task,
  timer,
  onToggleTask,
  onClose,
  onExpand,
}: {
  task: FocusTask
  timer: FocusTimer
  onToggleTask: () => void
  onClose: () => void
  onExpand: () => void
}) {
  const { left, running, finished, lengths, toggle } = timer
  // The running clock, else a break right after focus ends, else focus.
  const mode: Mode = running ?? (finished === "focus" ? "break" : "focus")
  const on = running === mode
  const progress = 1 - left[mode] / lengths[mode]
  const { item } = task

  return (
    <div
      role="region"
      aria-label="Now focusing"
      style={{ ["--hc" as string]: colorVar(item.group.color) }}
      className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-lg backdrop-blur-md sm:bottom-4"
    >
      <div className="h-1 bg-surface-2" aria-hidden>
        <div className={`h-full transition-[width] duration-300 ${mode === "focus" ? "bg-accent" : "hc-fill"}`} style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex items-center gap-2 py-2 pr-2 pl-3">
        <button
          onClick={onToggleTask}
          disabled={task.day > task.today}
          aria-pressed={item.done}
          aria-label={item.done ? `Mark ${item.name} not done` : `Mark ${item.name} done`}
          className="-m-1 grid shrink-0 place-items-center p-1 disabled:opacity-35"
        >
          <span className={`grid size-6 place-items-center rounded-full border-2 ${item.done ? "hc-fill border-transparent text-white" : "border-line text-ink-3"}`}>
            <Check size={12} weight="bold" className={item.done ? "pop" : "opacity-60"} />
          </span>
        </button>
        <button onClick={onExpand} title="Open Quick timer" className="min-w-0 flex-1 text-left">
          <p className={`truncate text-sm font-semibold ${item.done ? "text-ink-3" : ""}`}>{item.name}</p>
          <p className="truncate text-xs text-ink-3">
            <span className="hc-text font-semibold">#</span>
            {item.group.label} · {finished && !running ? (finished === "focus" ? "Focus done, take a break" : "Break over") : mode === "focus" ? "Focus" : "Break"}
          </p>
        </button>
        <span className={`shrink-0 font-title text-lg font-semibold tabular-nums ${on ? "text-accent" : "text-ink-2"}`}>{mmss(left[mode])}</span>
        <button
          onClick={() => toggle(mode)}
          aria-label={on ? `Pause ${mode} timer` : `Start ${mode} timer`}
          className={`press grid size-10 shrink-0 place-items-center rounded-full ${on ? "bg-accent text-on-accent" : "bg-accent-soft text-accent"}`}
        >
          {on ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
        </button>
        <button onClick={onClose} aria-label="Close mini player" className="press grid size-8 shrink-0 place-items-center rounded-full text-ink-3">
          <X size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}
