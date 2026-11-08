import { Check, Fire, PencilSimple, Plus, Sparkle } from "@phosphor-icons/react"
import { useState } from "react"
import { Bar, Card, Ring } from "../components/ui"
import { addDays, dayOfMonth, formatDow, formatLong, range, type DayKey } from "../lib/date"
import { completion, currentStreak } from "../lib/stats"
import type { HabitStore } from "../lib/store"
import { colorVar, type Habit } from "../lib/types"

export function TodayScreen({
  store,
  today,
  onAdd,
  onEdit,
  onSample,
}: {
  store: HabitStore
  today: DayKey
  onAdd: () => void
  onEdit: (h: Habit) => void
  onSample: () => void
}) {
  const { data, toggleCheck } = store
  const [picked, setPicked] = useState<DayKey | null>(null)
  // Only the last 7 days can be edited; fall back to today if the picked day has scrolled out.
  const week = range(addDays(today, -6), today)
  const day = picked && week.includes(picked) ? picked : today
  const isToday = day === today

  if (data.habits.length === 0) return <EmptyToday onAdd={onAdd} onSample={onSample} />

  const visible = data.habits.filter((h) => h.createdAt <= day || data.checks[h.id]?.[day])
  const doneCount = visible.filter((h) => data.checks[h.id]?.[day]).length

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Pick a day to check in" className="grid grid-cols-7 gap-1.5">
        {week.map((k) => {
          const { rate } = completion(data, data.habits, k, k, today)
          const active = k === day
          return (
            <button
              key={k}
              role="tab"
              aria-selected={active}
              aria-label={formatLong(k)}
              onClick={() => setPicked(k)}
              className={`press flex flex-col items-center gap-1 rounded-2xl py-2 ${
                active ? "bg-accent text-on-accent" : "bg-surface text-ink-2"
              }`}
            >
              <span className="text-[11px] font-medium">{k === today ? "Today" : formatDow(k)}</span>
              <span className="relative grid place-items-center">
                {!active && <Ring value={rate} size={30} />}
                <span className={`${active ? "" : "absolute"} text-sm font-semibold ${active ? "leading-[30px]" : "text-ink"}`}>
                  {dayOfMonth(k)}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{isToday ? "Today" : "Past day"}</p>
            <h1 className="mt-0.5 text-2xl font-semibold">{formatLong(day)}</h1>
          </div>
          <p className="shrink-0 text-sm text-ink-2">
            <span className="font-title text-2xl font-semibold text-ink">{doneCount}</span>/{visible.length} done
          </p>
        </div>
        <div className="mt-3">
          <Bar value={visible.length ? doneCount / visible.length : 0} />
        </div>
        {!isToday && (
          <p className="mt-3 text-xs text-ink-3">You're editing a past day. Changes update your streaks and stats.</p>
        )}
        {isToday && visible.length > 0 && doneCount === visible.length && (
          <p className="mt-3 text-sm font-medium text-accent">All done for today. Nice.</p>
        )}
      </Card>

      <ul className="space-y-2">
        {visible.map((h) => (
          <HabitRow
            key={h.id}
            habit={h}
            done={!!data.checks[h.id]?.[day]}
            streak={currentStreak(data.checks[h.id], today)}
            onToggle={() => toggleCheck(h.id, day)}
            onEdit={() => onEdit(h)}
          />
        ))}
      </ul>

      <button
        onClick={onAdd}
        className="press flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line font-semibold text-ink-2"
      >
        <Plus size={18} weight="bold" /> Add habit
      </button>
    </div>
  )
}

function HabitRow({
  habit,
  done,
  streak,
  onToggle,
  onEdit,
}: {
  habit: Habit
  done: boolean
  streak: number
  onToggle: () => void
  onEdit: () => void
}) {
  return (
    <li
      style={{ ["--hc" as string]: colorVar(habit.color) }}
      className={`flex items-center rounded-2xl border transition-colors ${done ? "hc-soft border-transparent" : "border-line bg-surface"}`}
    >
      <button
        onClick={onToggle}
        aria-pressed={done}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pl-3 text-left"
      >
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors ${
            done ? "hc-fill border-transparent text-white" : "border-line"
          }`}
          style={done ? undefined : { borderColor: "color-mix(in oklab, var(--hc) 45%, var(--border))" }}
        >
          {done && <Check key="c" size={18} weight="bold" className="pop" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold ${done ? "text-ink" : ""}`}>{habit.name}</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
            {streak > 0 ? (
              <>
                <Fire size={14} weight="fill" className="text-flame" />
                <span>{streak}-day streak</span>
              </>
            ) : (
              <span>No streak yet</span>
            )}
          </span>
        </span>
        <span className="sr-only">{done ? "Done. Tap to undo." : "Not done. Tap to mark done."}</span>
      </button>
      <button
        onClick={onEdit}
        aria-label={`Edit ${habit.name}`}
        className="press mr-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-3"
      >
        <PencilSimple size={18} />
      </button>
    </li>
  )
}

function EmptyToday({ onAdd, onSample }: { onAdd: () => void; onSample: () => void }) {
  return (
    <Card className="px-6 py-10 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Check size={28} weight="bold" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold">Start with one habit</h1>
      <p className="mx-auto mt-2 max-w-xs text-ink-2">
        Something small you want to do every day. Tick it off here, and your streaks and stats build up on their own.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          onClick={onAdd}
          className="press flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 font-semibold text-on-accent"
        >
          <Plus size={18} weight="bold" /> Add a habit
        </button>
        <button
          onClick={onSample}
          className="press flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface-2 px-5 font-semibold"
        >
          <Sparkle size={18} /> Try with sample habits
        </button>
      </div>
    </Card>
  )
}
