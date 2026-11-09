import { CalendarX, PencilSimple, StopCircle } from "@phosphor-icons/react"
import { ICONS, WEEK } from "../config/groups"
import { formatLong, formatShort, type DayKey } from "../lib/date"
import { plansOn } from "../lib/plan"
import { colorVar, type AppData, type Group } from "../lib/types"
import { Sheet } from "./Sheet"

const DAY_NAME = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" } as const

/** A group's card on one day: how it got there, and ways to change that. */
export function DayGroupSheet({
  group,
  day,
  data,
  onEdit,
  onRemoveDay,
  onStopRepeat,
  onClose,
}: {
  group: Group
  day: DayKey
  data: AppData
  onEdit: () => void
  onRemoveDay: () => void
  onStopRepeat: () => void
  onClose: () => void
}) {
  const plans = plansOn(data, group.id, day)
  const repeating = plans.filter((p) => p.repeat && p.until !== day)
  const Icon = ICONS[group.icon]
  const row = "press flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left font-semibold"

  return (
    <Sheet
      title={formatLong(day)}
      onClose={onClose}
      header={
        <p style={{ ["--hc" as string]: colorVar(group.color) }} className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">
          <Icon size={16} className="hc-text" /> {group.label}
        </p>
      }
    >
      <ul className="mb-4 space-y-1 text-sm text-ink-2">
        {plans.length === 0 && <li>Only here through its one-off tasks.</li>}
        {plans.map((p) => (
          <li key={p.id}>
            {p.repeat
              ? `Repeats ${p.repeat.length === 7 ? "every day" : WEEK.filter((d) => p.repeat!.includes(d)).map((d) => DAY_NAME[d]).join(", ")} from ${formatShort(p.from)}${p.until ? ` until ${formatShort(p.until)}` : ""}.`
              : "Added to this day only."}
          </li>
        ))}
        <li className="text-ink-3">
          Picks {group.mode === "random" ? "at random" : "in order"}, {Math.min(group.perDay, Math.max(1, group.tasks.length))} of {group.tasks.length} a day.
        </li>
      </ul>

      <div className="space-y-2">
        <button
          onClick={() => {
            onClose()
            onEdit()
          }}
          className={`${row} bg-surface-2`}
        >
          <PencilSimple size={18} /> Edit group and its tasks
        </button>
        {plans.length > 0 && (
          <button
            onClick={() => {
              onRemoveDay()
              onClose()
            }}
            className={`${row} bg-surface-2`}
          >
            <CalendarX size={18} /> Remove from this day
          </button>
        )}
        {repeating.length > 0 && (
          <button
            onClick={() => {
              onStopRepeat()
              onClose()
            }}
            className={`${row} bg-surface-2 text-danger`}
          >
            <StopCircle size={18} /> Stop repeating after this day
          </button>
        )}
      </div>
    </Sheet>
  )
}
