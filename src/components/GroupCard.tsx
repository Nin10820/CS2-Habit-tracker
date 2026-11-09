import { ArrowsOutSimple, Check } from "@phosphor-icons/react"
import { useState } from "react"
import { colorVar, type DayItem, type GroupDef } from "../lib/types"
import { DashedEmpty, listRow, PillHeader, pillAction } from "./ui"

/**
 * A group in the side panel: a pill heading (name, done/total, folds the list) and today's picks as
 * rounded rows. The name puts an item in the Quick timer; the circle ticks it; ⤢ opens context and task list.
 */
export function GroupCard({
  group,
  items,
  onToggle,
  onFocus,
  onOpen,
  onPlanToday,
  focusedId,
}: {
  group: GroupDef
  items: DayItem[]
  onToggle: (item: DayItem) => void
  onFocus: (item: DayItem) => void
  /** Open the group's context and task list (with Edit inside). */
  onOpen: () => void
  /** Put this group on today (the + in its empty box). */
  onPlanToday?: () => void
  /** "kind:id" of today's focused item, if any. */
  focusedId?: string
}) {
  const [open, setOpen] = useState(true)
  const done = items.filter((i) => i.done).length
  const Icon = group.icon
  const subtitle = [group.title, group.note].filter(Boolean).join(" · ")

  return (
    <section style={{ ["--hc" as string]: colorVar(group.color) }}>
      <PillHeader
        label={group.label}
        count={`${done}/${items.length}`}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        tinted
        icon={<Icon size={13} weight="fill" className="hc-text shrink-0" />}
      >
        <button onClick={onOpen} aria-label={`Open ${group.label}`} title="Context and task list" className={pillAction}>
          <ArrowsOutSimple size={14} weight="bold" />
        </button>
      </PillHeader>

      {open && (
        <>
          {subtitle && <p className="mt-2 truncate px-1 text-xs text-ink-3">{subtitle}</p>}
          {items.length === 0 ? (
            <div className="mt-2">
              <DashedEmpty text="Not planned today" onAdd={onPlanToday} addLabel={`Add ${group.label} to today`} />
            </div>
          ) : (
            <ul className="mt-2.5 space-y-2.5">
              {items.map((i) => {
                const focused = focusedId === `${i.kind}:${i.id}`
                return (
                  <li key={`${i.kind}-${i.id}`} className={`${listRow} ${focused ? "ring-2 ring-accent" : ""}`}>
                    <span className="hc-soft grid size-7 shrink-0 place-items-center rounded-full" aria-hidden>
                      <Icon size={14} className="hc-text" />
                    </span>
                    <button
                      onClick={() => onFocus(i)}
                      aria-current={focused ? "true" : undefined}
                      title="Focus on this"
                      className={`min-w-0 flex-1 truncate text-left text-[13.5px] font-medium ${i.done ? "text-ink-3 line-through" : ""}`}
                    >
                      {i.name}
                    </button>
                    {i.minutes ? <span className="shrink-0 text-xs text-ink-3 tabular-nums">{i.minutes}′</span> : null}
                    <button
                      onClick={() => onToggle(i)}
                      aria-pressed={i.done}
                      aria-label={i.done ? `Mark ${i.name} not done` : `Mark ${i.name} done`}
                      className="-m-1 grid shrink-0 place-items-center p-1"
                    >
                      <span
                        className={`grid size-[22px] place-items-center rounded-full border-[1.5px] transition-colors ${
                          i.done ? "hc-fill border-transparent text-white" : "border-ink"
                        }`}
                      >
                        {i.done && <Check size={12} weight="bold" className="pop" />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
