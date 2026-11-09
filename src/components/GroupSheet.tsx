import { ArrowDown, ArrowUp, ListNumbers, Plus, PushPin, Shuffle, Trash } from "@phosphor-icons/react"
import { useState } from "react"
import { COLORS, ICONS, type IconName } from "../config/groups"
import { newId } from "../lib/store"
import { colorVar, type Group, type GroupTask } from "../lib/types"
import { ConfirmSheet, Sheet } from "./Sheet"

const DURATIONS = [5, 10, 15, 20, 25, 30, 40, 45, 60, 90]

const box = "rounded-xl border border-line bg-bg px-3 text-base text-ink outline-none placeholder:text-ink-3 focus:border-accent"
const field = `h-11 w-full ${box}`
const label = "block text-xs font-semibold text-ink-2"
const iconBtn = "press grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 disabled:opacity-25"

/**
 * Make or edit a group: name, headline, context, look, start time, how it picks, and its task list (1 → n).
 * Opened from "Edit" in a group's context popup, "New group", or a day card's menu.
 */
export function GroupSheet({
  group,
  onSave,
  onDelete,
  onClose,
}: {
  group?: Group
  onSave: (g: Group) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [labelText, setLabel] = useState(group?.label ?? "")
  const [title, setTitle] = useState(group?.title ?? "")
  const [note, setNote] = useState(group?.note ?? "")
  const [doc, setDoc] = useState(group?.doc ?? "")
  const [color, setColor] = useState(group?.color ?? "green")
  const [icon, setIcon] = useState<IconName>(group?.icon ?? "star")
  const [time, setTime] = useState(group?.time ?? "")
  const [standalone, setStandalone] = useState(!!group?.standalone)
  const [mode, setMode] = useState<Group["mode"]>(group?.mode ?? "order")
  const [perDay, setPerDay] = useState(group?.perDay ?? 1)
  const [tasks, setTasks] = useState<GroupTask[]>(group?.tasks ?? [])
  const [draft, setDraft] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (confirmDelete && group && onDelete) {
    return (
      <ConfirmSheet
        title="Delete group?"
        body={`“${group.label}” and the days it's planned on will be removed. One-off tasks in it stay as cards of their own.`}
        confirmLabel="Delete"
        onConfirm={onDelete}
        onClose={onClose}
      />
    )
  }

  const name = labelText.trim()
  const setTask = (i: number, patch: Partial<GroupTask>) => setTasks((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)))
  const move = (i: number, by: number) =>
    setTasks((ts) => {
      const next = [...ts]
      const [t] = next.splice(i, 1)
      next.splice(i + by, 0, t)
      return next
    })
  const addDraft = () => {
    const n = draft.trim()
    if (!n) return
    setTasks((ts) => [...ts, { id: newId(), name: n.slice(0, 80) }])
    setDraft("")
  }
  const save = () => {
    if (!name) return
    // A task still typed in the "add" box counts too.
    const typed: GroupTask[] = draft.trim() ? [{ id: newId(), name: draft.trim().slice(0, 80) }] : []
    const clean = [...tasks, ...typed]
      .map((t) => ({ ...t, name: t.name.trim(), time: standalone ? t.time : undefined }))
      .filter((t) => t.name)
    const pickable = clean.filter((t) => !t.pinned).length
    onSave({
      id: group?.id ?? newId(),
      label: name.slice(0, 40),
      title: title.trim() || undefined,
      note: note.trim() || undefined,
      doc: doc.trim() ? doc : undefined,
      standalone: standalone || undefined,
      color,
      icon,
      time: time || undefined,
      mode,
      perDay: Math.min(Math.max(1, perDay), Math.max(1, pickable)),
      tasks: clean,
    })
    onClose()
  }

  const Icon = ICONS[icon]
  const pickable = tasks.filter((t) => !t.pinned).length
  const maxPerDay = Math.max(1, pickable)
  let num = 0

  return (
    <Sheet
      wide
      title={group ? "Edit group" : "New group"}
      onClose={onClose}
      header={
        <p style={{ ["--hc" as string]: colorVar(color) }} className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">
          <Icon size={16} className="hc-text" /> {name || "Group"}
        </p>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        className="space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div>
            <label className={label} htmlFor="g-name">
              Name
            </label>
            <input
              id="g-name"
              value={labelText}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
              placeholder="e.g. Tiếng Anh"
              autoComplete="off"
              className={`mt-2 ${field}`}
            />
          </div>
          <div>
            <label className={label} htmlFor="g-time">
              Start time <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <input id="g-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`mt-2 ${field}`} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="g-title">
              Headline <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <input id="g-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. IELTS · 7/7" className={`mt-2 ${field}`} />
          </div>
          <div>
            <label className={label} htmlFor="g-note">
              Short note <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <input id="g-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Block chính 19:30–20:30." className={`mt-2 ${field}`} />
          </div>
        </div>

        <fieldset className="min-w-0">
          <legend className={label}>Tasks, in order</legend>
          <p className="mt-1 text-xs text-ink-3">
            <PushPin size={12} weight="fill" className="inline align-[-1px]" /> Pinned tasks are there every day. The numbered ones are what the group picks from.
          </p>
          <ol className="mt-2 space-y-2">
            {tasks.map((t, i) => (
              <li key={t.id} className="rounded-2xl border border-line p-2">
                <div className="flex items-center gap-1.5">
                  <span className="grid w-6 shrink-0 place-items-center text-sm font-semibold text-ink-3 tabular-nums">
                    {t.pinned ? <PushPin size={14} weight="fill" className="text-accent" /> : `${++num}.`}
                  </span>
                  <input
                    value={t.name}
                    onChange={(e) => setTask(i, { name: e.target.value })}
                    maxLength={80}
                    aria-label={`Task ${i + 1}`}
                    className={`${box} h-10 min-w-0 flex-1`}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-7">
                  <select
                    value={t.minutes ?? ""}
                    onChange={(e) => setTask(i, { minutes: e.target.value ? Number(e.target.value) : undefined })}
                    aria-label={`Minutes for task ${i + 1}`}
                    className={`${box} h-8 w-[96px] !px-2 text-sm`}
                  >
                    <option value="">– min</option>
                    {DURATIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                  {standalone && (
                    <input
                      type="time"
                      value={t.time ?? ""}
                      onChange={(e) => setTask(i, { time: e.target.value || undefined })}
                      aria-label={`Time for task ${i + 1}`}
                      className={`${box} h-8 w-[104px] !px-2 text-sm`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setTask(i, { pinned: !t.pinned || undefined })}
                    aria-pressed={!!t.pinned}
                    title={t.pinned ? "Pinned: every day" : "Pin: every day"}
                    className={`press flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold ${t.pinned ? "bg-accent-soft text-accent" : "text-ink-3"}`}
                  >
                    <PushPin size={14} weight={t.pinned ? "fill" : "regular"} /> Every day
                  </button>
                  <span className="ml-auto flex">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move task ${i + 1} up`} className={iconBtn}>
                      <ArrowUp size={15} />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === tasks.length - 1} aria-label={`Move task ${i + 1} down`} className={iconBtn}>
                      <ArrowDown size={15} />
                    </button>
                    <button type="button" onClick={() => setTasks((ts) => ts.filter((_, j) => j !== i))} aria-label={`Remove task ${i + 1}`} className={iconBtn}>
                      <Trash size={15} />
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex items-center gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addDraft()
                }
              }}
              maxLength={80}
              placeholder="Add a task, then Enter"
              aria-label="New task"
              className={`${box} h-10 min-w-0 flex-1`}
            />
            <button
              type="button"
              onClick={addDraft}
              disabled={!draft.trim()}
              aria-label="Add task to list"
              className="press grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent disabled:opacity-40"
            >
              <Plus size={18} weight="bold" />
            </button>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="min-w-0">
            <legend className={label}>Each planned day, pick</legend>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
              {(
                [
                  ["order", "In order", ListNumbers],
                  ["random", "Random", Shuffle],
                ] as const
              ).map(([m, text, I]) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`press flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold ${mode === m ? "bg-surface text-ink shadow-card" : "text-ink-2"}`}
                >
                  <I size={16} /> {text}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-3">
              {mode === "order" ? "Moves one step down the numbered list each planned day, then starts again at 1." : "A different random set each day."}
            </p>
          </fieldset>
          <div>
            <p className={label}>Numbered tasks per day</p>
            <div className="mt-2 flex h-11 items-center gap-2">
              <button
                type="button"
                onClick={() => setPerDay((n) => Math.max(1, n - 1))}
                disabled={perDay <= 1}
                aria-label="Fewer tasks per day"
                className="press grid size-11 place-items-center rounded-xl bg-surface-2 text-lg font-semibold disabled:opacity-35"
              >
                −
              </button>
              <span className="w-10 text-center font-title text-xl font-semibold tabular-nums">{Math.min(perDay, maxPerDay)}</span>
              <button
                type="button"
                onClick={() => setPerDay((n) => Math.min(maxPerDay, n + 1))}
                disabled={perDay >= maxPerDay}
                aria-label="More tasks per day"
                className="press grid size-11 place-items-center rounded-xl bg-surface-2 text-lg font-semibold disabled:opacity-35"
              >
                +
              </button>
              <span className="text-xs text-ink-3">of {pickable}</span>
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3">
          <input type="checkbox" checked={standalone} onChange={(e) => setStandalone(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span className="text-sm">
            <span className="font-semibold">Each task is its own card</span>
            <span className="block text-ink-3">With its own time, like Dậy sớm and Planning. Otherwise the group is one card.</span>
          </span>
        </label>

        <div>
          <label className={label} htmlFor="g-doc">
            Context <span className="font-normal text-ink-3">(Markdown, shown by the expand button)</span>
          </label>
          <textarea
            id="g-doc"
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            maxLength={50_000}
            rows={8}
            placeholder={"# Title\n\nWhy this group, how you do it, links…"}
            className={`mt-2 ${field} h-auto resize-y py-2.5 font-mono text-sm`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="min-w-0">
            <legend className={label}>Color</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={c === color}
                  aria-label={c}
                  title={c}
                  onClick={() => setColor(c)}
                  style={{ background: colorVar(c) }}
                  className={`press size-8 rounded-full ${c === color ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className={label}>Icon</legend>
            <div className="mt-2 flex flex-wrap gap-1.5" style={{ ["--hc" as string]: colorVar(color) }}>
              {(Object.keys(ICONS) as IconName[]).map((n) => {
                const I = ICONS[n]
                const on = n === icon
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={on}
                    aria-label={n}
                    title={n}
                    onClick={() => setIcon(n)}
                    className={`press grid size-8 place-items-center rounded-lg ${on ? "hc-soft hc-text" : "text-ink-3"}`}
                  >
                    <I size={18} weight={on ? "fill" : "regular"} />
                  </button>
                )
              })}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
          <button type="submit" disabled={!name} className="press h-12 w-full rounded-2xl bg-accent font-semibold text-on-accent disabled:opacity-40 sm:flex-1">
            {group ? "Save group" : "Create group"}
          </button>
          {group && onDelete && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="press h-12 rounded-2xl px-5 font-semibold text-danger">
              Delete group
            </button>
          )}
        </div>
      </form>
    </Sheet>
  )
}
