import { ArrowCounterClockwise, Pause, Play, Timer as TimerIcon } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import { BREAK_MINUTES, FOCUS_MINUTES } from "../config/groups"
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

/** Focus / break countdown. One runs at a time; each keeps its remaining time while paused. */
export function QuickTimer() {
  const [left, setLeft] = useState<Record<Mode, number>>({ ...LENGTH })
  const [running, setRunning] = useState<Mode | null>(null)
  const [finished, setFinished] = useState<Mode | null>(null)
  const endsAt = useRef(0)
  const baseTitle = useRef(document.title)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const ms = Math.max(0, endsAt.current - Date.now())
      setLeft((l) => ({ ...l, [running]: ms }))
      document.title = `${mmss(ms)} · ${running === "focus" ? "Focus" : "Break"}`
      if (ms === 0) {
        setRunning(null)
        setFinished(running)
        setLeft((l) => ({ ...l, [running]: LENGTH[running] }))
        document.title = running === "focus" ? "Focus done · time for a break" : "Break over"
        chime()
      }
    }, 250)
    return () => clearInterval(id)
  }, [running])

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
    setLeft((l) => ({ ...l, [mode]: LENGTH[mode] }))
    document.title = baseTitle.current
  }

  return (
    <Card>
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">
        <TimerIcon size={16} /> Quick timer
      </p>
      {(["focus", "break"] as const).map((mode) => {
        const on = running === mode
        const touched = left[mode] !== LENGTH[mode]
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
