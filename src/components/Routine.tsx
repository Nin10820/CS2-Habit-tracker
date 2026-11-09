import { Check, Clock, DotsSixVertical, Moon, PencilSimple, Plus, SunHorizon, Trash } from "@phosphor-icons/react"
import { useState } from "react"
import { formatLong, type DayKey } from "../lib/date"
import { newId } from "../lib/store"
import type { AppData, RoutineItem } from "../lib/types"
import { Sheet } from "./Sheet"
import { DashedEmpty, listRow, PillHeader, pillAction } from "./ui"

const field = "h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink outline-none placeholder:text-ink-3 focus:border-accent"
export const RoutineIcon = ({ item, size = 18 }: { item: RoutineItem; size?: number }) =>
  !item.daily ? (
    <Clock size={size} className="shrink-0 text-ink-3" />
  ) : item.when === "morning" ? (
    <SunHorizon size={size} className="shrink-0 text-[var(--h-amber)]" />
  ) : (
    <Moon size={size} className="shrink-0 text-[var(--h-violet)]" />
  )

/** Drag data type for a routine moment, so day columns only react to these. */
export const ROUTINE_DRAG = "application/x-routine"

/**
 * Your own routine moments, ready to put on days: drag a row onto a day, or tap its + to add it to
 * today (tap the tick to take it off). The + in the heading makes a new one. Every-day ones are noted below.
 */
export function RoutineCard({
  data,
  today,
  onToggleToday,
  onCreate,
  onEdit,
}: {
  data: AppData
  today: DayKey
  onToggleToday: (item: RoutineItem, on: boolean) => void
  onCreate: (name: string) => void
  onEdit: () => void
}) {
  const [open, setOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const own = data.routine.items.filter((i) => !i.daily)
  const daily = data.routine.items.filter((i) => i.daily)
  const onToday = new Set(data.routine.days[today] ?? [])
  const create = () => {
    if (name.trim()) onCreate(name)
    setName("")
    setAdding(false)
  }

  return (
    <section>
      <PillHeader label="Routine" count={String(own.length)} open={open} onToggle={() => setOpen((o) => !o)}>
        <button onClick={onEdit} aria-label="Edit routine" title="Edit routine" className={pillAction}>
          <PencilSimple size={14} weight="bold" />
        </button>
        <button
          onClick={() => {
            setOpen(true)
            setAdding(true)
          }}
          aria-label="New routine moment"
          title="New routine moment"
          className={pillAction}
        >
          <Plus size={14} weight="bold" />
        </button>
      </PillHeader>

      {open && (
        <>
          <p className="mt-1.5 px-1 text-xs text-ink-3">Drag onto a day, or tap + to add today.</p>
          <ul className="mt-2 space-y-2">
            {own.map((i) => {
              const on = onToday.has(i.id)
              return (
                <li
                  key={i.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(ROUTINE_DRAG, i.id)
                    e.dataTransfer.setData("text/plain", i.name)
                    e.dataTransfer.effectAllowed = "copy"
                  }}
                  title="Drag onto a day"
                  className={`${listRow} cursor-grab active:cursor-grabbing`}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2" aria-hidden>
                    <Clock size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{i.name}</span>
                  <DotsSixVertical size={16} className="shrink-0 text-ink-3" aria-hidden />
                  <button
                    onClick={() => onToggleToday(i, !on)}
                    aria-pressed={on}
                    aria-label={on ? `Remove ${i.name} from today` : `Add ${i.name} to today`}
                    title={on ? "On today · tap to remove" : "Add to today"}
                    className={`press grid size-7 shrink-0 place-items-center rounded-full ${on ? "bg-accent text-on-accent" : "bg-accent-soft text-accent"}`}
                  >
                    {on ? <Check size={13} weight="bold" /> : <Plus size={13} weight="bold" />}
                  </button>
                </li>
              )
            })}
            {adding && (
              <li className={listRow}>
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3" aria-hidden>
                  <Clock size={14} />
                </span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") create()
                    if (e.key === "Escape") {
                      setName("")
                      setAdding(false)
                    }
                  }}
                  onBlur={create}
                  maxLength={40}
                  placeholder="Name, then Enter"
                  aria-label="New routine moment"
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
                />
              </li>
            )}
            {own.length === 0 && !adding && (
              <li>
                <DashedEmpty text="Your own moments" onAdd={() => setAdding(true)} addLabel="New routine moment" />
              </li>
            )}
          </ul>
          {daily.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-ink-3">
              {daily.map((i) => (
                <span key={i.id} className="flex items-center gap-1">
                  <RoutineIcon item={i} size={14} /> {i.name}
                </span>
              ))}
              <span>· on every day</span>
            </p>
          )}
        </>
      )}
    </section>
  )
}

export type RoutineEntry = { item: RoutineItem; day: DayKey; suggested: string; logged?: string }

/**
 * Log the time of one or more routine moments. Each time starts filled in (now, or your usual time).
 * `auto` is the version that opens by itself: it says hello and has "Later" to skip it for today.
 */
export function RoutineLogSheet({
  entries,
  auto = false,
  onSave,
  onClear,
  onRemove,
  onLater,
  onClose,
  future = false,
}: {
  entries: RoutineEntry[]
  auto?: boolean
  /** A day that hasn't come yet: nothing to log, only taking an added moment off. */
  future?: boolean
  onSave: (values: { item: RoutineItem; day: DayKey; time: string }[]) => void
  onClear?: (e: RoutineEntry) => void
  /** Take a moment you added off this day (not for every-day ones). */
  onRemove?: (e: RoutineEntry) => void
  onLater?: () => void
  onClose: () => void
}) {
  const [times, setTimes] = useState(() => entries.map((e) => e.logged ?? e.suggested))
  const morning = entries.every((e) => e.item.when === "morning")
  const evening = entries.every((e) => e.item.when === "evening")
  const title = auto ? (morning ? "Good morning" : evening ? "Time for bed?" : "Routine") : entries.length === 1 ? entries[0].item.name : "Routine"

  return (
    <Sheet title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(entries.map((en, i) => ({ item: en.item, day: en.day, time: times[i] })).filter((v) => v.time))
          onClose()
        }}
      >
        {auto && <p className="-mt-2 mb-4 text-sm text-ink-3">{morning ? "What time did you get up?" : evening ? "Roughly when are you going to sleep?" : "Log your times."}</p>}
        <div className="space-y-3">
          {entries.map((en, i) => (
            <div key={en.item.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
              <RoutineIcon item={en.item} size={22} />
              <label className="min-w-0 flex-1" htmlFor={`rt-${en.item.id}`}>
                <span className="block font-semibold">{en.item.name}</span>
                <span className="block text-xs text-ink-3">
                  {formatLong(en.day)}
                  {!future && !en.logged && en.item.daily && en.item.when === "evening" ? " · usual time filled in" : ""}
                  {!future && !en.logged && (!en.item.daily || en.item.when === "morning") ? " · now filled in" : ""}
                </span>
              </label>
              {!future && (
              <input
                id={`rt-${en.item.id}`}
                type="time"
                value={times[i]}
                onChange={(e) => setTimes((ts) => ts.map((t, j) => (j === i ? e.target.value : t)))}
                className="h-11 w-[116px] shrink-0 rounded-xl border border-line bg-bg px-2 text-center font-title text-lg font-semibold text-ink tabular-nums outline-none focus:border-accent"
              />
              )}
            </div>
          ))}
        </div>
        {future ? (
          <p className="mt-4 text-sm text-ink-3">You can log the time on the day itself.</p>
        ) : (
          <button type="submit" className="press mt-5 h-12 w-full rounded-2xl bg-accent font-semibold text-on-accent">
            {entries.some((e) => e.logged) ? "Save" : "Log"}
          </button>
        )}
        {auto && onLater && (
          <button
            type="button"
            onClick={() => {
              onLater()
              onClose()
            }}
            className="press mt-2 h-11 w-full rounded-2xl font-semibold text-ink-2"
          >
            Later
          </button>
        )}
        {!auto && onClear && entries.length === 1 && entries[0].logged && (
          <button
            type="button"
            onClick={() => {
              onClear(entries[0])
              onClose()
            }}
            className="press mt-2 h-11 w-full rounded-2xl font-semibold text-danger"
          >
            Clear this time
          </button>
        )}
        {!auto && onRemove && entries.length === 1 && !entries[0].item.daily && (
          <button
            type="button"
            onClick={() => {
              onRemove(entries[0])
              onClose()
            }}
            className="press mt-2 h-11 w-full rounded-2xl font-semibold text-ink-2"
          >
            Remove from this day
          </button>
        )}
      </form>
    </Sheet>
  )
}

/** Rename or remove routine moments, and choose which are on every day (those are asked about by themselves). */
export function RoutineEditSheet({ items, onSave, onClose }: { items: RoutineItem[]; onSave: (items: RoutineItem[]) => void; onClose: () => void }) {
  const [list, setList] = useState<RoutineItem[]>(items)
  const set = (i: number, patch: Partial<RoutineItem>) => setList((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  return (
    <Sheet title="Edit routine" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(list.map((x) => ({ ...x, name: x.name.trim() })).filter((x) => x.name))
          onClose()
        }}
      >
        <p className="-mt-2 mb-4 text-sm text-ink-3">
          Every-day moments are on all days and asked about by themselves (morning ones in the morning, evening ones at night). The others you drag or tap onto days.
        </p>
        <ul className="space-y-2">
          {list.map((x, i) => (
            <li key={x.id} className="rounded-2xl border border-line p-2">
              <div className="flex items-center gap-1.5">
                <input value={x.name} onChange={(e) => set(i, { name: e.target.value })} maxLength={40} aria-label={`Name ${i + 1}`} className={`${field} h-10 min-w-0 flex-1`} />
                <button type="button" onClick={() => setList((l) => l.filter((_, j) => j !== i))} aria-label={`Remove ${x.name}`} className="press grid size-9 shrink-0 place-items-center rounded-lg text-ink-3">
                  <Trash size={16} />
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={!!x.daily}
                  onClick={() => set(i, { daily: !x.daily || undefined })}
                  className={`press flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold ${x.daily ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink-3"}`}
                >
                  {x.daily ? <Check size={13} weight="bold" /> : null} Every day
                </button>
                {x.daily && (
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
                  {(
                    [
                      ["morning", "Morning", SunHorizon],
                      ["evening", "Evening", Moon],
                    ] as const
                  ).map(([w, text, I]) => (
                    <button
                      key={w}
                      type="button"
                      aria-pressed={x.when === w}
                      onClick={() => set(i, { when: w })}
                      className={`press flex h-8 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold ${x.when === w ? "bg-surface text-ink shadow-card" : "text-ink-2"}`}
                    >
                      <I size={14} /> {text}
                    </button>
                  ))}
                </div>
                )}
                {x.daily && x.when === "evening" && (
                  <label className="flex items-center gap-1.5 text-xs text-ink-3">
                    Guess until you have logs
                    <input
                      type="time"
                      value={x.usual ?? "23:00"}
                      onChange={(e) => set(i, { usual: e.target.value || undefined })}
                      className="h-8 rounded-lg border border-line bg-bg px-1.5 text-sm text-ink outline-none focus:border-accent"
                    />
                  </label>
                )}
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setList((l) => [...l, { id: newId(), name: "", when: "morning" }])}
          className="press mt-2 inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-accent"
        >
          <Plus size={16} weight="bold" /> Add a moment
        </button>
        <button type="submit" className="press mt-4 h-12 w-full rounded-2xl bg-accent font-semibold text-on-accent">
          Save routine
        </button>
      </form>
    </Sheet>
  )
}
