import { Check, Pause, Play, Timer as TimerIcon, X } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import { BREAK_MINUTES, FOCUS_MINUTES } from "../config/groups"
import type { DayKey } from "../lib/date"
import { colorVar, type DayItem, type FocusItem } from "../lib/types"

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

/** The focused group: the group as one item, its items, and the item picked inside it (if any). */
export type FocusGroup = { item: FocusItem; items: DayItem[]; active?: DayItem }
export type FocusTask = { item: FocusItem; day: DayKey; today: DayKey; group?: FocusGroup }

/** Handlers for the sub-task list of a focused group. */
type SubHandlers = {
  onToggleSub: (item: DayItem) => void
  onPickSub: (item: DayItem) => void
  onPickGroup: () => void
}

/**
 * Focus / break countdown state. One runs at a time; each keeps its remaining time while paused.
 * With a task picked, the focus length is that task's duration, unless you typed another one.
 * Lives in App so the Quick timer and the mini player share one clock.
 */
export function useFocusTimer(task?: FocusTask, onFocusTime?: (seconds: number) => void) {
  const focusMs = (task?.item.minutes ?? FOCUS_MINUTES) * 60_000
  // Time the focus clock actually ran, handed out in whole seconds: every minute, and on pause,
  // reset or finish (so stats don't need a write every tick).
  const report = useRef(onFocusTime)
  report.current = onFocusTime
  const pending = useRef(0)
  const lastTick = useRef(0)
  const count = (until = Date.now()) => {
    pending.current += Math.max(0, until - lastTick.current)
    lastTick.current = until
  }
  const flush = () => {
    const s = Math.floor(pending.current / 1000)
    if (s > 0) {
      pending.current -= s * 1000
      report.current?.(s)
    }
  }
  // Lengths typed in for this task (the mini player's minutes field); cleared when the task changes.
  const [custom, setCustom] = useState<Partial<Record<Mode, number>>>({})
  const lengths = useRef<Record<Mode, number>>({ ...LENGTH, focus: focusMs, ...custom })
  lengths.current = { ...LENGTH, focus: focusMs, ...custom }
  // When the running session started (real clock time), for "Started 17:20".
  const [startedAt, setStartedAt] = useState<number | null>(null)

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
    setCustom((c) => ({ break: c.break }))
    if (runningRef.current !== "focus") {
      setLeft((l) => ({ ...l, focus: focusMs }))
      setStartedAt(null)
    }
  }, [taskKey, focusMs])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const ms = Math.max(0, endsAt.current - Date.now())
      if (running === "focus") {
        count(Math.min(Date.now(), endsAt.current))
        if (ms === 0 || pending.current >= 60_000) flush()
      }
      setLeft((l) => ({ ...l, [running]: ms }))
      document.title = `${mmss(ms)} · ${running === "focus" ? (taskName ?? "Focus") : "Break"}`
      if (ms === 0) {
        setRunning(null)
        setStartedAt(null)
        setFinished(running)
        setLeft((l) => ({ ...l, [running]: lengths.current[running] }))
        document.title = running === "focus" ? "Focus done · time for a break" : "Break over"
        chime()
      }
    }, 250)
    return () => clearInterval(id)
  }, [running, taskName])

  // Closing or leaving the page mid-session still counts the time so far.
  useEffect(() => {
    if (running !== "focus") return
    const leave = () => {
      count()
      flush()
    }
    window.addEventListener("pagehide", leave)
    return () => window.removeEventListener("pagehide", leave)
  }, [running])

  useEffect(() => {
    const t = baseTitle.current
    return () => {
      document.title = t
    }
  }, [])

  /** Start or pause a clock. `startMs` starts it fresh at that length (a length just typed in). */
  function toggle(mode: Mode, startMs?: number) {
    setFinished(null)
    if (running === "focus") {
      count()
      flush()
    }
    if (running === mode) {
      setRunning(null)
      document.title = baseTitle.current
      return
    }
    const ms = startMs ?? left[mode]
    if (startMs !== undefined) setLeft((l) => ({ ...l, [mode]: startMs }))
    endsAt.current = Date.now() + ms
    lastTick.current = Date.now()
    // A fresh start (not a resume after pause) notes the time it began.
    if (startMs !== undefined || left[mode] >= lengths.current[mode] || startedAt === null) setStartedAt(Date.now())
    setRunning(mode)
  }

  function reset(mode: Mode) {
    if (running === "focus" && mode === "focus") {
      count()
      flush()
    }
    if (running === mode) setRunning(null)
    setLeft((l) => ({ ...l, [mode]: lengths.current[mode] }))
    setStartedAt(null)
    document.title = baseTitle.current
  }

  /** Type a length for focus or break, in minutes (1–240). Takes effect now unless that clock is running. */
  function setMinutes(mode: Mode, minutes: number) {
    const ms = Math.min(240, Math.max(1, Math.round(minutes))) * 60_000
    setCustom((c) => ({ ...c, [mode]: ms }))
    if (running !== mode) setLeft((l) => ({ ...l, [mode]: ms }))
  }

  return { left, running, finished, startedAt, lengths: lengths.current, toggle, reset, setMinutes }
}

export type FocusTimer = ReturnType<typeof useFocusTimer>

/** Three little bars that bounce while a session is running, like a "now playing" mark. */
function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className={`eq flex h-3.5 w-4 items-end justify-between ${playing ? "" : "eq-paused"}`} aria-hidden>
      <span className="hc-fill w-[3px] rounded-full" />
      <span className="hc-fill w-[3px] rounded-full" />
      <span className="hc-fill w-[3px] rounded-full" />
    </span>
  )
}

/** The focused group's tasks as an "Up Next" queue: tap a name to play it, the circle ticks it. */
function UpNext({
  group,
  future,
  playing,
  onToggleSub,
  onPickSub,
  onPickGroup,
}: SubHandlers & { group: FocusGroup; future: boolean; playing: boolean }) {
  const done = group.items.filter((i) => i.done).length
  const whole = !group.active
  return (
    <div className="max-h-[42vh] overflow-y-auto px-2 pt-3 pb-1">
      <div className="flex items-baseline justify-between px-2">
        <p className="text-[15px] font-semibold">Up Next</p>
        <p className="text-xs text-ink-3 tabular-nums">
          {done}/{group.items.length}
          {group.item.minutes ? ` · ${group.item.minutes} min` : ""}
        </p>
      </div>
      <button
        onClick={onPickGroup}
        aria-current={whole ? "true" : undefined}
        className={`mt-1.5 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm ${whole ? "hc-soft" : "hover:bg-surface-2/70"}`}
      >
        <span className="grid size-6 shrink-0 place-items-center">{whole ? <Equalizer playing={playing} /> : null}</span>
        <span className={`min-w-0 flex-1 truncate ${whole ? "font-semibold" : "text-ink-2"}`}>Whole group · {group.item.name}</span>
      </button>
      <ul>
        {group.items.map((i) => {
          const on = group.active?.kind === i.kind && group.active.id === i.id
          return (
            <li key={`${i.kind}-${i.id}`} className={`flex items-center gap-3 rounded-xl px-2 ${on ? "hc-soft" : "hover:bg-surface-2/70"}`}>
              <span className="grid size-6 shrink-0 place-items-center">
                {on ? (
                  <Equalizer playing={playing} />
                ) : (
                  <button
                    onClick={() => onToggleSub(i)}
                    disabled={future}
                    aria-pressed={i.done}
                    aria-label={i.done ? `Mark ${i.name} not done` : `Mark ${i.name} done`}
                    className={`grid size-[18px] place-items-center rounded-full border-[1.5px] disabled:opacity-35 ${i.done ? "hc-fill border-transparent text-white" : "border-ink-3"}`}
                  >
                    {i.done && <Check size={10} weight="bold" />}
                  </button>
                )}
              </span>
              <button
                onClick={() => onPickSub(i)}
                aria-current={on ? "true" : undefined}
                title="Play this"
                className={`min-w-0 flex-1 truncate py-2 text-left text-sm ${on ? "font-semibold" : i.done ? "text-ink-3 line-through" : ""}`}
              >
                {i.name}
              </button>
              {i.minutes ? <span className="shrink-0 text-xs text-ink-3 tabular-nums">{i.minutes}′</span> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Dark "now playing" palette for the mini player, the same in light and dark themes. */
const PLAYER_VARS = {
  "--surface": "#17191e",
  "--surface-2": "rgb(255 255 255 / 0.08)",
  "--border": "rgb(255 255 255 / 0.12)",
  "--text": "#ffffff",
  "--text-2": "rgb(255 255 255 / 0.72)",
  "--text-3": "rgb(255 255 255 / 0.5)",
} as Record<string, string>

const clockTime = (t: number) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

/**
 * The "now playing" card pinned to the bottom, dark like a music player: the group's artwork tile,
 * title and group, and on the right either a minutes field with Start, or (once started) the live
 * countdown with pause. The line under it has done, next task, Up Next and close, with a progress line.
 * Without a task it's a Quick focus session: same clock, no name needed. Tapping the title shows Up Next.
 */
export function MiniPlayer({
  task,
  timer,
  onToggleTask,
  onClose,
  ...sub
}: SubHandlers & {
  /** The picked task or group; none for a Quick focus session without a task. */
  task?: FocusTask
  timer: FocusTimer
  onToggleTask: () => void
  onClose: () => void
}) {
  const { left, running, finished, lengths, startedAt, toggle, setMinutes } = timer
  // The running clock, else a break right after focus ends, else focus.
  const mode: Mode = running ?? (finished === "focus" ? "break" : "focus")
  const on = running === mode
  // A session kept running across a task switch can have more left than the new task's length.
  const total = Math.max(lengths[mode], left[mode])
  const elapsed = total - left[mode]
  const progress = total ? elapsed / total : 0
  // Started (running, or paused part-way): show the live clock instead of the minutes field.
  const active = on || (startedAt !== null && elapsed > 0)
  const item = task?.item
  const Icon = item?.group.icon ?? TimerIcon
  const [queueOpen, setQueueOpen] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const minutes = Math.round(lengths[mode] / 60_000)
  const commit = () => {
    const n = Number(draft)
    if (draft !== null && n > 0) setMinutes(mode, n)
    setDraft(null)
  }

  const group = task?.group

  const where = !item ? "No task" : item.kind === "group" ? "Whole group" : item.group.label
  const sub2 = active && startedAt
    ? `${mode === "break" ? "Break" : "Started"} ${clockTime(startedAt)}${on ? "" : " · paused"}`
    : finished && !running
      ? finished === "focus"
        ? "Focus done · take a break"
        : "Break over"
      : `${where} · ${mode === "focus" ? "Focus" : "Break"}`
  const small = "press grid size-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2"

  // Mark done and the small actions: in the one row from 640px up, in a second row on phones.
  const doneBtn =
    task && item ? (
      <button
        onClick={onToggleTask}
        disabled={task.day > task.today}
        aria-pressed={item.done}
        className="press relative flex h-8 shrink-0 items-center gap-2 rounded-full px-2 text-[13px] text-ink-2 hover:bg-surface-2 disabled:opacity-35"
      >
        <span className={`grid size-[18px] place-items-center rounded-full border-[1.5px] ${item.done ? "hc-fill border-transparent text-white" : "border-ink-3"}`}>
          {item.done && <Check size={10} weight="bold" className="pop" />}
        </span>
        {item.done ? "Done" : "Mark done"}
      </button>
    ) : (
      <span className="px-2 text-[13px] text-ink-3">Tap a task to focus on it</span>
    )
  // The one action on the right: stop and close.
  const actions = (
    <button onClick={onClose} aria-label="Close mini player" title="Stop and close" className={small}>
      <X size={15} weight="bold" />
    </button>
  )
  const elapsedText = <span className="shrink-0 text-[11px] text-ink-3 tabular-nums">{active ? `${mmss(elapsed)} in` : ""}</span>

  return (
    <div
      role="region"
      aria-label="Now focusing"
      style={{ ...PLAYER_VARS, ["--hc" as string]: colorVar(item?.group.color ?? "slate") }}
      className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[460px] overflow-hidden sm:max-w-[820px] rounded-[20px] bg-surface text-ink shadow-[0_16px_40px_-10px_rgb(0_0_0/0.45)] sm:bottom-5"
    >
      {task && group && queueOpen && (
        <>
          <UpNext group={group} future={task.day > task.today} playing={on} {...sub} />
          <div className="mx-4 border-t border-line" />
        </>
      )}

      <div className="relative flex items-center gap-2.5 p-2 sm:gap-3 sm:px-2.5 sm:py-2">
        {/* Soft glow of the group's colour behind the artwork */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-44"
          style={{ background: "radial-gradient(circle at 18% 50%, color-mix(in oklab, var(--hc) 40%, transparent), transparent 70%)" }}
        />
        <span className="relative grid size-9 shrink-0 place-items-center rounded-lg hc-fill text-white sm:size-8" aria-hidden>
          <Icon size={16} weight="fill" />
          {item?.done && (
            <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border-2 border-surface bg-white text-[#17191e]">
              <Check size={8} weight="bold" />
            </span>
          )}
        </span>
        {/* Title: tap to show the group's Up Next */}
        <button
          onClick={() => group && setQueueOpen((o) => !o)}
          title={group ? "Up Next" : undefined}
          className={`relative min-w-0 flex-1 text-left ${group ? "" : "cursor-default"}`}
        >
          <p className={`truncate text-[14px] leading-5 font-semibold ${item?.done ? "text-ink-3 line-through" : ""}`}>{item?.name ?? "Quick focus"}</p>
          <p className="truncate text-[12px] leading-4 text-ink-3">{sub2}</p>
        </button>
        <span className="hidden sm:contents">
          {doneBtn}
          {elapsedText}
        </span>

        {active ? (
          <>
            <span className="relative shrink-0 font-title text-[17px] font-semibold tabular-nums" aria-live="off">
              {mmss(left[mode])}
            </span>
            <button
              onClick={() => toggle(mode)}
              aria-label={on ? `Pause ${mode} timer` : `Resume ${mode} timer`}
              className="press relative grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#17191e] sm:size-9"
            >
              {on ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
            </button>
          </>
        ) : (
          <>
            <label className="relative flex h-10 shrink-0 items-center gap-0.5 rounded-xl bg-surface-2 pr-2.5 pl-1.5 sm:h-9" title={`${mode === "focus" ? "Focus" : "Break"} length`}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={240}
                value={draft ?? String(minutes)}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                }}
                aria-label={`${mode === "focus" ? "Focus" : "Break"} minutes`}
                className="w-9 [appearance:textfield] bg-transparent text-center font-title text-[17px] font-semibold text-ink tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-xs text-ink-3">min</span>
            </label>
            <button
              onClick={() => {
                // Start at the minutes in the field, even if it hasn't been committed yet.
                const n = Number(draft ?? minutes)
                const ms = Math.min(240, Math.max(1, Math.round(n > 0 ? n : minutes))) * 60_000
                if (draft !== null) setMinutes(mode, ms / 60_000)
                setDraft(null)
                toggle(mode, ms)
              }}
              className="press relative flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[14px] font-semibold text-[#17191e] sm:h-9"
            >
              <Play size={14} weight="fill" /> {mode === "break" ? "Break" : "Start"}
            </button>
          </>
        )}
        {/* From 640px up the small actions end the row, after a thin divider. */}
        <span className="hidden sm:contents">
          <span className="relative mx-0.5 h-6 w-px shrink-0 bg-line" aria-hidden />
          <span className="relative flex shrink-0 items-center gap-0.5">{actions}</span>
        </span>
      </div>

      {/* Progress along the bottom edge */}
      <div className="h-[3px] bg-surface-2" aria-hidden>
        <div className="h-full hc-fill transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
      {/* Phones: mark done and the small actions in a second row. */}
      <div className="flex items-center gap-1 px-2 py-1 sm:hidden">
        {doneBtn}
        <span className="ml-auto">{elapsedText}</span>
        {actions}
      </div>
    </div>
  )
}
