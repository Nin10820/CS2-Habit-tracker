import { useState } from "react"
import { GROUPS } from "../config/groups"
import { formatLong, type DayKey } from "../lib/date"
import type { TaskInput } from "../lib/store"
import { colorVar, type Task } from "../lib/types"
import { ConfirmSheet, Sheet } from "./Sheet"

const DURATIONS = [10, 15, 20, 30, 45, 60, 90]

/** Add a one-off task to a day, or edit one. Habits live in src/config/groups.ts, not here. */
export function TaskSheet({
  day,
  task,
  onSave,
  onDelete,
  onClose,
}: {
  day: DayKey
  task?: Task
  onSave: (t: TaskInput) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(task?.name ?? "")
  const [group, setGroup] = useState(task?.group ?? GROUPS[0].id)
  const [time, setTime] = useState(task?.time ?? "")
  const [minutes, setMinutes] = useState<number | undefined>(task?.minutes ?? 30)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const trimmed = name.trim()

  if (confirmDelete && task && onDelete) {
    return (
      <ConfirmSheet
        title="Delete task?"
        body={`“${task.name}” will be removed from ${formatLong(task.day)}.`}
        confirmLabel="Delete"
        onConfirm={onDelete}
        onClose={onClose}
      />
    )
  }

  const field = "mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-ink outline-none focus:border-accent"

  return (
    <Sheet title={task ? "Edit task" : `Add task · ${formatLong(day)}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!trimmed) return
          onSave({ day: task?.day ?? day, name: trimmed, group, time: time || undefined, minutes })
          onClose()
        }}
      >
        <label className="block text-xs font-semibold text-ink-2" htmlFor="task-name">
          Task
        </label>
        <input
          id="task-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="e.g. Reply to client email"
          autoComplete="off"
          className={`${field} placeholder:text-ink-3`}
        />

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold text-ink-2">Group</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {GROUPS.map((g) => {
              const Icon = g.icon
              const on = g.id === group
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setGroup(g.id)}
                  style={{ ["--hc" as string]: colorVar(g.color) }}
                  className={`press flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${
                    on ? "hc-soft border-transparent text-ink" : "border-line text-ink-2"
                  }`}
                >
                  <Icon size={15} className="hc-text" /> {g.standalone ? "Single card" : g.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink-2" htmlFor="task-time">
              Time <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <input id="task-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-2" htmlFor="task-min">
              Duration
            </label>
            <select
              id="task-min"
              value={minutes ?? ""}
              onChange={(e) => setMinutes(e.target.value ? Number(e.target.value) : undefined)}
              className={field}
            >
              <option value="">None</option>
              {DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!trimmed}
          className="press mt-6 h-12 w-full rounded-2xl bg-accent font-semibold text-on-accent disabled:opacity-40"
        >
          {task ? "Save changes" : "Add task"}
        </button>
        {task && onDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="press mt-2 h-11 w-full rounded-2xl font-semibold text-danger">
            Delete task
          </button>
        )}
      </form>
    </Sheet>
  )
}
