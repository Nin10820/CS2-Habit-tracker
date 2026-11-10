import { ArrowUpRight, Check } from "@phosphor-icons/react"
import { useState, type MouseEvent } from "react"
import { celebrate } from "../lib/celebrate"
import { colorVar, type DayItem, type GroupDef } from "../lib/types"
import { DashedEmpty, listRow } from "./ui"

type Props = {
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
}

/**
 * A list in the side panel, like a page of notes for today.
 * - Your stand-alone list (Actions): a plain heading, then every action as its own small card.
 * - A group: a heading with its done count and ↗, its note under it, then its tasks as a checklist.
 * The name puts an item in the Quick timer; the circle ticks it.
 */
export function GroupCard(props: Props) {
  return props.group.standalone ? <ActionsList {...props} /> : <GroupNote {...props} />
}

/** The tick circle, with the little celebration when ticking. */
function Tick({ item, onToggle }: { item: DayItem; onToggle: () => void }) {
  const tick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!item.done) celebrate(e.currentTarget, colorVar(item.group.color))
    onToggle()
  }
  return (
    <button onClick={tick} aria-pressed={item.done} aria-label={item.done ? `Mark ${item.name} not done` : `Mark ${item.name} done`} className="-m-1 grid shrink-0 place-items-center p-1">
      <span className={`grid size-5 place-items-center rounded-full border transition-colors ${item.done ? "hc-fill border-transparent text-white" : "border-ink-2 hover:border-ink"}`}>
        {item.done && <Check size={11} weight="bold" className="pop" />}
      </span>
    </button>
  )
}

const nameClass = (i: DayItem) => `min-w-0 flex-1 truncate text-left text-[13.5px] font-[550] ${i.done ? "text-ink-3 line-through" : ""}`
const minutes = (i: DayItem) => (i.minutes ? <span className="shrink-0 text-xs text-ink-3 tabular-nums">{i.minutes}′</span> : null)

function Heading({ group, count, onOpen }: { group: GroupDef; count?: string; onOpen: () => void }) {
  const Icon = group.icon
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} weight="fill" className="hc-text shrink-0" aria-hidden />
      <h3 className="min-w-0 truncate text-[15px] font-semibold">{group.label}</h3>
      {count && <span className="shrink-0 text-xs text-ink-3 tabular-nums">{count}</span>}
      <button onClick={onOpen} aria-label={`Open ${group.label}`} title="Context and task list" className="press ml-auto grid size-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
        <ArrowUpRight size={15} weight="bold" />
      </button>
    </div>
  )
}

/** Actions: one card per action. */
function ActionsList({ group, items, onToggle, onFocus, onOpen, onPlanToday, focusedId }: Props) {
  const Icon = group.icon
  return (
    <section style={{ ["--hc" as string]: colorVar(group.color) }}>
      <Heading group={group} onOpen={onOpen} />
      {items.length === 0 ? (
        <div className="mt-2.5">
          <DashedEmpty text="Nothing for today" onAdd={onPlanToday} addLabel={`Add ${group.label} to today`} />
        </div>
      ) : (
        <ul className="mt-2.5 space-y-2">
          {items.map((i) => {
            const focused = focusedId === `${i.kind}:${i.id}`
            return (
              <li key={`${i.kind}-${i.id}`} className={`${listRow} ${focused ? "ring-2 ring-accent" : ""}`}>
                <span className="hc-soft grid size-7 shrink-0 place-items-center rounded-full" aria-hidden>
                  <Icon size={14} className="hc-text" />
                </span>
                <button onClick={() => onFocus(i)} aria-current={focused ? "true" : undefined} title="Focus on this" className={nameClass(i)}>
                  {i.name}
                </button>
                {minutes(i)}
                <Tick item={i} onToggle={() => onToggle(i)} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** A group: heading, note, then a checklist in one soft block. Folds when you click the count. */
function GroupNote({ group, items, onToggle, onFocus, onOpen, onPlanToday, focusedId }: Props) {
  const [open, setOpen] = useState(true)
  const done = items.filter((i) => i.done).length
  const subtitle = [group.title, group.note].filter(Boolean).join(" · ")

  return (
    <section style={{ ["--hc" as string]: colorVar(group.color) }}>
      <Heading group={group} count={items.length ? `${done}/${items.length}` : undefined} onOpen={onOpen} />
      {subtitle && (
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-0.5 block w-full truncate pl-6 text-left text-xs text-ink-3">
          {subtitle}
        </button>
      )}
      {open &&
        (items.length === 0 ? (
          <div className="mt-2.5">
            <DashedEmpty text="Not planned today" onAdd={onPlanToday} addLabel={`Add ${group.label} to today`} />
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-2xl bg-surface px-3 shadow-card">
            {items.map((i) => {
              const focused = focusedId === `${i.kind}:${i.id}`
              return (
                <li key={`${i.kind}-${i.id}`} className={`flex min-h-11 items-center gap-3 py-2 ${focused ? "-mx-3 px-3 shadow-[inset_3px_0_0_var(--accent)]" : ""}`}>
                  <Tick item={i} onToggle={() => onToggle(i)} />
                  <button onClick={() => onFocus(i)} aria-current={focused ? "true" : undefined} title="Focus on this" className={nameClass(i)}>
                    {i.name}
                  </button>
                  {minutes(i)}
                </li>
              )
            })}
          </ul>
        ))}
    </section>
  )
}
