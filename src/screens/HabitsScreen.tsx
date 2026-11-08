import { CaretDown, CaretUp, Desktop, DownloadSimple, Moon, PencilSimple, Plus, Sun, Trash, UploadSimple } from "@phosphor-icons/react"
import { useRef, useState, type ReactNode } from "react"
import { ConfirmSheet } from "../components/Sheet"
import { Card, SectionTitle } from "../components/ui"
import { formatShort } from "../lib/date"
import { exportData, parseData, type HabitStore } from "../lib/store"
import type { ThemePref } from "../lib/theme"
import { colorVar, emptyData, type AppData, type Habit } from "../lib/types"

export function HabitsScreen({
  store,
  theme,
  setTheme,
  onAdd,
  onEdit,
}: {
  store: HabitStore
  theme: ThemePref
  setTheme: (t: ThemePref) => void
  onAdd: () => void
  onEdit: (h: Habit) => void
}) {
  const { data, moveHabit, replaceAll } = store
  const file = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<AppData | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null)

  async function onFile(f: File | undefined) {
    if (!f) return
    try {
      setPending(parseData(JSON.parse(await f.text())))
      setMsg(null)
    } catch (e) {
      setMsg({ text: e instanceof Error && !(e instanceof SyntaxError) ? e.message : "That file isn't a valid backup.", error: true })
    }
    if (file.current) file.current.value = ""
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Habits</h1>

      <Card>
        <SectionTitle right={<span className="text-xs text-ink-3">{data.habits.length} total</span>}>Your habits</SectionTitle>
        {data.habits.length === 0 ? (
          <p className="pb-2 text-ink-2">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.habits.map((h, i) => (
              <li key={h.id} className="flex items-center gap-2 py-2">
                <span className="size-3 shrink-0 rounded-full" style={{ background: colorVar(h.color) }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{h.name}</span>
                  <span className="text-xs text-ink-3">Since {formatShort(h.createdAt)}</span>
                </span>
                <IconBtn label={`Move ${h.name} up`} disabled={i === 0} onClick={() => moveHabit(h.id, -1)}>
                  <CaretUp size={16} weight="bold" />
                </IconBtn>
                <IconBtn label={`Move ${h.name} down`} disabled={i === data.habits.length - 1} onClick={() => moveHabit(h.id, 1)}>
                  <CaretDown size={16} weight="bold" />
                </IconBtn>
                <IconBtn label={`Edit ${h.name}`} onClick={() => onEdit(h)}>
                  <PencilSimple size={16} />
                </IconBtn>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={onAdd}
          className="press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-on-accent"
        >
          <Plus size={18} weight="bold" /> Add habit
        </button>
      </Card>

      <Card>
        <SectionTitle>Appearance</SectionTitle>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
          {(
            [
              ["system", "System", Desktop],
              ["light", "Light", Sun],
              ["dark", "Dark", Moon],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              role="radio"
              aria-checked={theme === v}
              onClick={() => setTheme(v)}
              className={`press flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ${
                theme === v ? "bg-surface text-ink shadow-card" : "text-ink-2"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Your data</SectionTitle>
        <p className="text-sm text-ink-2">
          Everything is saved in this browser, on this device only. There's no account and nothing is sent anywhere. Export a backup to keep it
          safe or move it to another device.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => exportData(data)}
            disabled={data.habits.length === 0}
            className="press flex h-11 items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-semibold disabled:opacity-40"
          >
            <DownloadSimple size={18} /> Export
          </button>
          <button
            onClick={() => file.current?.click()}
            className="press flex h-11 items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-semibold"
          >
            <UploadSimple size={18} /> Import
          </button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        {msg && (
          <p className={`mt-3 text-sm ${msg.error ? "text-danger" : "text-accent"}`} role="status">
            {msg.text}
          </p>
        )}
        <button
          onClick={() => setConfirmClear(true)}
          disabled={data.habits.length === 0}
          className="press mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-danger disabled:opacity-40"
        >
          <Trash size={18} /> Clear all data
        </button>
      </Card>

      <p className="pb-2 text-center text-xs text-ink-3">Habit Tracker v0.1 · Pham Nguyen Studio</p>

      {pending && (
        <ConfirmSheet
          title="Replace your data?"
          body={`The backup has ${pending.habits.length} habit${pending.habits.length === 1 ? "" : "s"}. Importing replaces everything currently on this device.`}
          confirmLabel="Replace"
          onConfirm={() => {
            replaceAll(pending)
            setMsg({ text: "Backup imported." })
          }}
          onClose={() => setPending(null)}
        />
      )}
      {confirmClear && (
        <ConfirmSheet
          title="Clear all data?"
          body="All habits and check-ins on this device will be deleted. Export a backup first if you might want them back."
          confirmLabel="Clear all"
          onConfirm={() => replaceAll(emptyData())}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </div>
  )
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="press grid size-9 shrink-0 place-items-center rounded-full text-ink-2 disabled:opacity-25"
    >
      {children}
    </button>
  )
}
