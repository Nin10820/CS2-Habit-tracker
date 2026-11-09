import { Desktop, DownloadSimple, Moon, Sun, Trash, UploadSimple } from "@phosphor-icons/react"
import { useRef, useState } from "react"
import { defaultData, exportData, parseData, type Store } from "../lib/store"
import type { ThemePref } from "../lib/theme"
import type { AppData } from "../lib/types"
import { ConfirmSheet, Sheet } from "./Sheet"

/** Theme and data (backup, restore, clear). Groups are made in the app and are part of this data. */
export function SettingsSheet({
  store,
  theme,
  setTheme,
  dayParts,
  setDayParts,
  onClose,
}: {
  store: Store
  theme: ThemePref
  setTheme: (t: ThemePref) => void
  /** Split each day into Morning / Afternoon / Evening / Anytime. */
  dayParts: boolean
  setDayParts: (on: boolean) => void
  onClose: () => void
}) {
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

  if (pending) {
    return (
      <ConfirmSheet
        title="Replace your data?"
        body="Importing replaces every check-in and task currently on this device."
        confirmLabel="Replace"
        onConfirm={() => store.replaceAll(pending)}
        onClose={onClose}
      />
    )
  }
  if (confirmClear) {
    return (
      <ConfirmSheet
        title="Clear all data?"
        body="All check-ins, one-off tasks and changes to your groups on this device will be deleted. The app goes back to your starting groups."
        confirmLabel="Clear all"
        onConfirm={() => store.replaceAll(defaultData())}
        onClose={onClose}
      />
    )
  }

  const btn = "press flex h-11 items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-semibold disabled:opacity-40"

  return (
    <Sheet title="Settings" onClose={onClose}>
      <p className="text-xs font-semibold text-ink-2">Theme</p>
      <div role="radiogroup" aria-label="Theme" className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
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

      <p className="mt-6 text-xs font-semibold text-ink-2">Days</p>
      <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <span className="min-w-0 flex-1 text-sm">
          <span className="block font-semibold">Split by part of day</span>
          <span className="block text-ink-3">A line for Morning, Afternoon, Evening and Anytime between the cards.</span>
        </span>
        <input type="checkbox" role="switch" checked={dayParts} onChange={(e) => setDayParts(e.target.checked)} className="peer sr-only" />
        <span
          aria-hidden
          className="relative h-6 w-10 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-surface after:shadow-card after:transition-transform peer-checked:after:translate-x-4"
        />
      </label>

      <p className="mt-6 text-xs font-semibold text-ink-2">Your data</p>
      <p className="mt-1 text-sm text-ink-3">Saved in this browser on this device only. No account, nothing is sent anywhere.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => exportData(store.data)} className={btn}>
          <DownloadSimple size={18} /> Export
        </button>
        <button onClick={() => file.current?.click()} className={btn}>
          <UploadSimple size={18} /> Import
        </button>
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {msg && (
        <p className={`mt-3 text-sm ${msg.error ? "text-danger" : "text-accent"}`} role="status">
          {msg.text}
        </p>
      )}
      <button onClick={() => setConfirmClear(true)} className="press mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-danger">
        <Trash size={18} /> Clear all data
      </button>
      <p className="mt-4 text-center text-xs text-ink-3">Habit Tracker v0.1 · Pham Nguyen Studio</p>
    </Sheet>
  )
}
