import { CalendarBlank, Plus, Repeat } from "@phosphor-icons/react"
import { useState } from "react"
import { ICONS, WEEK, WEEKDAY_SHORT, type Weekday } from "../config/groups"
import { formatLong, weekdayId, type DayKey } from "../lib/date"
import { pickTasks, plansOn } from "../lib/plan"
import type { TaskInput } from "../lib/store"
import { colorVar, type AppData, type Group, type Task } from "../lib/types"
import { ConfirmSheet, Sheet } from "./Sheet"

const DURATIONS = [10, 15, 20, 30, 45, 60, 90]
const field = "mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-ink outline-none focus:border-accent"
const chip = (on: boolean) =>
  `press flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${on ? "hc-soft border-transparent text-ink" : "border-line text-ink-2"}`

/** Group chips: "Own card" plus your groups. */
function GroupPicker({ groups, value, onChange, none }: { groups: Group[]; value: string; onChange: (id: string) => void; none?: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {none !== undefined && (
        <button type="button" aria-pressed={value === ""} onClick={() => onChange("")} style={{ ["--hc" as string]: colorVar("slate") }} className={chip(value === "")}>
          {none}
        </button>
      )}
      {groups.map((g) => {
        const Icon = ICONS[g.icon]
        return (
          <button
            key={g.id}
            type="button"
            aria-pressed={g.id === value}
            onClick={() => onChange(g.id)}
            style={{ ["--hc" as string]: colorVar(g.color) }}
            className={chip(g.id === value)}
          >
            <Icon size={15} className="hc-text" /> {g.label}
          </button>
        )
      })}
    </div>
  )
}

/** The fields of a one-off task. */
function TaskForm({ day, task, groups, onSave, onDone }: { day: DayKey; task?: Task; groups: Group[]; onSave: (t: TaskInput) => void; onDone: () => void }) {
  const [name, setName] = useState(task?.name ?? "")
  const [group, setGroup] = useState(task?.group ?? "")
  const [time, setTime] = useState(task?.time ?? "")
  const [minutes, setMinutes] = useState<number | undefined>(task?.minutes ?? 30)
  const trimmed = name.trim()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!trimmed) return
        onSave({ day: task?.day ?? day, name: trimmed, group, time: time || undefined, minutes })
        onDone()
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
        <legend className="text-xs font-semibold text-ink-2">Put it in</legend>
        <GroupPicker groups={groups} value={group} onChange={setGroup} none="Own card" />
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
          <select id="task-min" value={minutes ?? ""} onChange={(e) => setMinutes(e.target.value ? Number(e.target.value) : undefined)} className={field}>
            <option value="">None</option>
            {DURATIONS.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" disabled={!trimmed} className="press mt-6 h-12 w-full rounded-2xl bg-accent font-semibold text-on-accent disabled:opacity-40">
        {task ? "Save changes" : "Add task"}
      </button>
    </form>
  )
}

/** Put one of your groups on this day, or on some weekdays from this day on. Shows what it will pick. */
function PlanForm({
  day,
  data,
  initialGroup,
  onAdd,
  onNewGroup,
  onDone,
}: {
  day: DayKey
  data: AppData
  initialGroup?: string
  onAdd: (group: string, repeat?: Weekday[]) => void
  onNewGroup: () => void
  onDone: () => void
}) {
  const free = data.groups.filter((g) => !plansOn(data, g.id, day).length)
  const [group, setGroup] = useState(initialGroup ?? free[0]?.id ?? "")
  const [repeat, setRepeat] = useState(false)
  const [days, setDays] = useState<Weekday[]>(WEEK)
  const g = data.groups.find((x) => x.id === group)
  const planned = !!g && !free.includes(g)
  const repeatDays = WEEK.filter((d) => days.includes(d))
  // What the group would pick on this day once it's added.
  const preview = g && !planned ? pickTasks({ ...data, plans: [...data.plans, { id: "preview", group: g.id, from: day, repeat: repeat ? repeatDays : undefined }] }, g, day) : []
  const onThisDay = !repeat || repeatDays.includes(weekdayId(day))

  if (!data.groups.length) {
    return (
      <div className="text-center">
        <p className="text-ink-2">You don't have any groups yet.</p>
        <p className="mt-1 text-sm text-ink-3">Make one with its tasks numbered 1 → n, then add it to your days.</p>
        <button onClick={onNewGroup} className="press mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-5 font-semibold text-on-accent">
          <Plus size={18} weight="bold" /> New group
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!g || planned || (repeat && !repeatDays.length)) return
        onAdd(g.id, repeat ? repeatDays : undefined)
        onDone()
      }}
    >
      <fieldset>
        <legend className="text-xs font-semibold text-ink-2">Group</legend>
        <GroupPicker groups={data.groups} value={group} onChange={setGroup} />
        <button type="button" onClick={onNewGroup} className="press mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent">
          <Plus size={14} weight="bold" /> New group
        </button>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold text-ink-2">When</legend>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
          {(
            [
              [false, "Only this day", CalendarBlank],
              [true, "Repeat", Repeat],
            ] as const
          ).map(([r, text, I]) => (
            <button
              key={text}
              type="button"
              aria-pressed={repeat === r}
              onClick={() => setRepeat(r)}
              className={`press flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ${repeat === r ? "bg-surface text-ink shadow-card" : "text-ink-2"}`}
            >
              <I size={16} /> {text}
            </button>
          ))}
        </div>
        {repeat && (
          <>
            <div className="mt-3 grid grid-cols-7 gap-1.5" role="group" aria-label="Repeat on">
              {WEEK.map((d) => {
                const on = days.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    aria-label={d}
                    onClick={() => setDays((ds) => (on ? ds.filter((x) => x !== d) : [...ds, d]))}
                    className={`press h-10 rounded-xl text-sm font-semibold ${on ? "bg-accent text-on-accent" : "bg-surface-2 text-ink-3"}`}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-xs text-ink-3">From {formatLong(day)} on.</p>
          </>
        )}
      </fieldset>

      {g && (
        <div className="mt-4 rounded-2xl bg-surface-2 p-3" style={{ ["--hc" as string]: colorVar(g.color) }}>
          {planned ? (
            <p className="text-sm text-ink-2">{g.label} is already on this day.</p>
          ) : !g.tasks.length ? (
            <p className="text-sm text-ink-2">{g.label} has no tasks yet. You can add them from its card.</p>
          ) : !onThisDay ? (
            <p className="text-sm text-ink-2">Starts on the next day you picked.</p>
          ) : (
            <>
              <p className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
                {g.mode === "random" ? "Random pick" : "Next in order"} for this day
              </p>
              <ul className="mt-1.5 space-y-0.5 text-sm">
                {preview.map((t) => (
                  <li key={t.id} className="flex gap-2">
                    <span className="hc-text w-5 shrink-0 text-right font-semibold tabular-nums">
                      {t.pinned ? "•" : `${g.tasks.filter((x) => !x.pinned).indexOf(t) + 1}.`}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{t.name}</span>
                    {t.minutes ? <span className="shrink-0 text-xs text-ink-3">{t.minutes}′</span> : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!g || planned || (repeat && !repeatDays.length)}
        className="press mt-6 h-12 w-full rounded-2xl bg-accent font-semibold text-on-accent disabled:opacity-40"
      >
        {repeat ? "Add and repeat" : "Add to this day"}
      </button>
    </form>
  )
}

/** "Add" on a day: one of your groups (it picks its tasks), or a one-off task. */
export function AddSheet({
  day,
  data,
  initialGroup,
  onAddPlan,
  onAddTask,
  onNewGroup,
  onClose,
}: {
  day: DayKey
  data: AppData
  /** Group to have picked, e.g. one just made with "New group". */
  initialGroup?: string
  onAddPlan: (group: string, repeat?: Weekday[]) => void
  onAddTask: (t: TaskInput) => void
  onNewGroup: () => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<"group" | "task">("group")
  return (
    <Sheet title={`Add · ${formatLong(day)}`} onClose={onClose}>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
        {(
          [
            ["group", "Group"],
            ["task", "One-off task"],
          ] as const
        ).map(([m, text]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`press h-10 rounded-xl text-sm font-semibold ${mode === m ? "bg-surface text-ink shadow-card" : "text-ink-2"}`}
          >
            {text}
          </button>
        ))}
      </div>
      {mode === "group" ? (
        <PlanForm day={day} data={data} initialGroup={initialGroup} onAdd={onAddPlan} onNewGroup={onNewGroup} onDone={onClose} />
      ) : (
        <TaskForm day={day} groups={data.groups} onSave={onAddTask} onDone={onClose} />
      )}
    </Sheet>
  )
}

/** Edit or delete a one-off task. */
export function TaskSheet({
  task,
  groups,
  onSave,
  onDelete,
  onClose,
}: {
  task: Task
  groups: Group[]
  onSave: (t: TaskInput) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (confirmDelete) {
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
  return (
    <Sheet title="Edit task" onClose={onClose}>
      <TaskForm day={task.day} task={task} groups={groups} onSave={onSave} onDone={onClose} />
      <button type="button" onClick={() => setConfirmDelete(true)} className="press mt-2 h-11 w-full rounded-2xl font-semibold text-danger">
        Delete task
      </button>
    </Sheet>
  )
}
