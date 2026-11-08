import { Desktop, DownloadSimple, Moon, Sun, Trash, UploadSimple } from "@phosphor-icons/react"
import { useRef, useState } from "react"
import { emptyData, exportData, parseData, type Store } from "../lib/store"
import type { ThemePref } from "../lib/theme"
import type { AppData } from "../lib/types"
import { ConfirmSheet, Sheet } from "./Sheet"

/** Theme and data (backup, restore, clear). Groups and habits are edited in src/config/groups.ts. */
export function SettingsSheet({
  store,
  theme,
  setTheme,
  onClose,
}: {
  store: Store
  theme: ThemePref
  setTheme: (t: ThemePref) => void
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
        body="All check-ins and one-off tasks on this device will be deleted. Your groups and habits stay (they live in the config file)."
        confirmLabel="Clear all"
        onConfirm={() => store.replaceAll(emptyData())}
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
