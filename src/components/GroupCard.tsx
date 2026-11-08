import { ArrowsOutSimple, CaretDown, Check } from "@phosphor-icons/react"
import { useState } from "react"
import type { GroupDef } from "../config/groups"
import { colorVar, type DayItem } from "../lib/types"
import { DocSheet } from "./DocSheet"
import { Card } from "./ui"

/** A "big task": its title from config and today's checklist. Box ticks; the name puts the item in the Quick timer. */
export function GroupCard({
  group,
  items,
  onToggle,
  onFocus,
  focusedId,
}: {
  group: GroupDef
  items: DayItem[]
  onToggle: (item: DayItem) => void
  onFocus: (item: DayItem) => void
  /** "kind:id" of today's focused item, if any. */
  focusedId?: string
}) {
  const [open, setOpen] = useState(true)
  const [reading, setReading] = useState(false)
  const done = items.filter((i) => i.done).length
  const Icon = group.icon

  return (
    <Card className="!p-0">
      <div style={{ ["--hc" as string]: colorVar(group.color) }}>
        <div className="flex items-start gap-1.5 px-4 pt-4 pb-3 sm:px-5">
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">
              <Icon size={16} className="hc-text" /> {group.label}
            </span>
            <span className="mt-1 block font-title text-lg leading-snug font-semibold">{group.title}</span>
            {group.note && <span className="mt-0.5 block text-sm text-ink-3">{group.note}</span>}
          </button>
          {group.doc && (
            <button
              onClick={() => setReading(true)}
              aria-label={`Open ${group.label} notes`}
              title="Open notes"
              className="press grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2"
            >
              <ArrowsOutSimple size={14} weight="bold" />
            </button>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? `Collapse ${group.label}` : `Expand ${group.label}`}
            className={`press grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2 transition-transform ${open ? "" : "-rotate-90"}`}
          >
            <CaretDown size={14} weight="bold" />
          </button>
        </div>

        {open && (
          <div className="px-2 pb-3 sm:px-3">
            {items.length === 0 ? (
              <p className="px-2 py-1 text-sm text-ink-3">Nothing scheduled today.</p>
            ) : (
              <ul>
                {items.map((i) => {
                  const focused = focusedId === `${i.kind}:${i.id}`
                  return (
                    <li
                      key={`${i.kind}-${i.id}`}
                      className={`flex items-center rounded-xl transition-colors ${focused ? "ring-2 ring-accent ring-inset" : ""} ${i.done ? "hc-soft" : ""}`}
                    >
                      <button
                        onClick={() => onToggle(i)}
                        aria-pressed={i.done}
                        aria-label={i.done ? `Mark ${i.name} not done` : `Mark ${i.name} done`}
                        className="grid shrink-0 place-items-center py-2 pr-1.5 pl-2"
                      >
                        <span
                          className={`grid size-5 place-items-center rounded-md border-2 ${i.done ? "hc-fill border-transparent text-white" : "border-line"}`}
                        >
                          {i.done && <Check size={12} weight="bold" />}
                        </span>
                      </button>
                      <button
                        onClick={() => onFocus(i)}
                        aria-current={focused ? "true" : undefined}
                        title="Focus on this"
                        className="min-w-0 flex-1 truncate py-2 pr-2 pl-1.5 text-left text-sm"
                      >
                        {i.name}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mx-2 mt-2 border-t border-line pt-2 text-xs text-ink-3">
              {done} of {items.length} completed today
            </p>
          </div>
        )}
      </div>
      {reading && <DocSheet group={group} onClose={() => setReading(false)} />}
    </Card>
  )
}
