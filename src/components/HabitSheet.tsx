import { Check } from "@phosphor-icons/react"
import { useState } from "react"
import { HABIT_COLORS, colorVar, type Habit, type HabitColor } from "../lib/types"
import { ConfirmSheet, Sheet } from "./Sheet"

/** Add a habit (no `habit`) or edit one. */
export function HabitSheet({
  habit,
  onSave,
  onDelete,
  onClose,
}: {
  habit?: Habit
  onSave: (name: string, color: HabitColor) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(habit?.name ?? "")
  const [color, setColor] = useState<HabitColor>(habit?.color ?? "green")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const trimmed = name.trim()

  if (confirmDelete && habit && onDelete) {
    return (
      <ConfirmSheet
        title="Delete habit?"
        body={`“${habit.name}” and all its check-ins will be removed from this device. This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={onDelete}
        onClose={onClose}
      />
    )
  }

  return (
    <Sheet title={habit ? "Edit habit" : "New habit"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!trimmed) return
          onSave(trimmed, color)
          onClose()
        }}
      >
        <label className="block text-xs font-semibold text-ink-2" htmlFor="habit-name">
          Name
        </label>
        <input
          id="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="e.g. Read 20 pages"
          autoComplete="off"
          className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        />

        <fieldset className="mt-5">
          <legend className="text-xs font-semibold text-ink-2">Colour</legend>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                aria-pressed={color === c}
                style={{ ["--hc" as string]: colorVar(c) }}
                className="press hc-fill grid size-10 place-items-center rounded-full text-white"
              >
                {color === c && <Check size={18} weight="bold" />}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!trimmed}
          className="press mt-6 h-12 w-full rounded-2xl bg-accent font-semibold text-on-accent disabled:opacity-40"
        >
          {habit ? "Save changes" : "Add habit"}
        </button>
        {habit && onDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="press mt-2 h-11 w-full rounded-2xl font-semibold text-danger"
          >
            Delete habit
          </button>
        )}
      </form>
    </Sheet>
  )
}
