import { CaretDown, Check } from "@phosphor-icons/react"
import { useState } from "react"
import type { GroupDef } from "../config/groups"
import { colorVar, type DayItem } from "../lib/types"
import { Card } from "./ui"

/** A "big task": its title from config and today's checklist for that group. */
export function GroupCard({ group, items, onToggle }: { group: GroupDef; items: DayItem[]; onToggle: (item: DayItem) => void }) {
  const [open, setOpen] = useState(true)
  const done = items.filter((i) => i.done).length
  const Icon = group.icon

  return (
    <Card className="!p-0">
      <div style={{ ["--hc" as string]: colorVar(group.color) }}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-start gap-3 px-4 pt-4 pb-3 text-left sm:px-5"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">
              <Icon size={16} className="hc-text" /> {group.label}
            </span>
            <span className="mt-1 block font-title text-lg leading-snug font-semibold">{group.title}</span>
            {group.note && <span className="mt-0.5 block text-sm text-ink-3">{group.note}</span>}
          </span>
          <span className={`grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2 transition-transform ${open ? "" : "-rotate-90"}`}>
            <CaretDown size={14} weight="bold" />
          </span>
        </button>

        {open && (
          <div className="px-2 pb-3 sm:px-3">
            {items.length === 0 ? (
              <p className="px-2 py-1 text-sm text-ink-3">Nothing scheduled today.</p>
            ) : (
              <ul>
                {items.map((i) => (
                  <li key={i.id}>
                    <button
                      onClick={() => onToggle(i)}
                      aria-pressed={i.done}
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors ${i.done ? "hc-soft" : ""}`}
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${i.done ? "hc-fill border-transparent text-white" : "border-line"}`}
                      >
                        {i.done && <Check size={12} weight="bold" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{i.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mx-2 mt-2 border-t border-line pt-2 text-xs text-ink-3">
              {done} of {items.length} completed today
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
