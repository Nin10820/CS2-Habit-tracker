import { Clock, ListNumbers, PencilSimple, PushPin, Shuffle, SquaresFour, TextAlignLeft } from "@phosphor-icons/react"
import { Marked } from "marked"
import { useMemo, type ReactNode } from "react"
import { colorVar, type GroupDef } from "../lib/types"
import { Sheet } from "./Sheet"

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

// Notes can come from an imported backup, so raw HTML in them is shown as text, not run.
const md = new Marked({ gfm: true, async: false, renderer: { html: ({ text }) => escapeHtml(text) } })

/** One "property" line under the title, like a Notion page: grey label on the left, value on the right. */
function Prop({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-8 items-start gap-2 py-1 text-sm">
      <span className="flex w-32 shrink-0 items-center gap-1.5 pt-0.5 text-ink-3">
        {icon}
        {label}
      </span>
      <span className="min-w-0 flex-1 pt-0.5 text-ink">{children}</span>
    </div>
  )
}

const tag = "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"

/**
 * A group as a page, opened from its expand button: a soft cover, the icon and title, a few properties,
 * the task list, then the context written in Markdown. "Edit" opens the group editor.
 */
export function DocSheet({ group, onEdit, onClose }: { group: GroupDef; onEdit: () => void; onClose: () => void }) {
  const { title, html } = useMemo(() => {
    const src = group.doc ?? ""
    // The context's first "# Heading" becomes the page title instead of repeating in the body.
    const m = src.match(/^#\s+(.+)\n/)
    const body = m ? src.slice(m[0].length) : src
    const rendered = (md.parse(body) as string)
      .replace(/href="\s*javascript:[^"]*"/gi, 'href="#"')
      // Links open in a new tab.
      .replace(/<a href=/g, '<a target="_blank" rel="noreferrer" href=')
    return { title: m ? m[1].trim() : (group.title ?? group.label), html: rendered }
  }, [group])

  const Icon = group.icon
  const pickable = group.tasks.filter((t) => !t.pinned).length
  const perDay = Math.min(group.perDay, Math.max(1, pickable))
  let n = 0

  return (
    <Sheet page title={`${group.label}: ${title}`} onClose={onClose}>
      <div style={{ ["--hc" as string]: colorVar(group.color) }}>
        {/* Cover */}
        <div className="hc-soft h-24 sm:h-28" aria-hidden />

        <div className="mx-auto max-w-2xl px-5 sm:px-10">
          {/* Icon overlapping the cover, then the title */}
          <div className="-mt-8 flex items-end justify-between gap-3">
            <span className="grid size-16 place-items-center rounded-2xl border-4 border-surface bg-surface shadow-card">
              <span className="hc-soft grid size-full place-items-center rounded-xl">
                <Icon size={30} weight="duotone" className="hc-text" />
              </span>
            </span>
            <button onClick={onEdit} className="press mb-1 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2">
              <PencilSimple size={15} /> Edit
            </button>
          </div>
          <h2 className="mt-3 text-[28px] leading-tight font-semibold sm:text-[32px]">{title}</h2>
          {group.note && <p className="mt-1 text-[15px] text-ink-3">{group.note}</p>}

          {/* Properties */}
          <div className="mt-4">
            <Prop icon={<SquaresFour size={15} />} label="Group">
              <span className={`${tag} hc-soft hc-text`}>
                <Icon size={12} weight="fill" /> {group.label}
              </span>
            </Prop>
            {group.time && (
              <Prop icon={<Clock size={15} />} label="Starts">
                <span className="tabular-nums">{group.time}</span>
              </Prop>
            )}
            {pickable > 0 && (
              <Prop icon={group.mode === "random" ? <Shuffle size={15} /> : <ListNumbers size={15} />} label="Each day">
                {perDay} of {pickable} {group.mode === "random" ? "at random" : "in order"}
                {group.tasks.some((t) => t.pinned) ? ", plus the pinned ones" : ""}
              </Prop>
            )}
          </div>

          <hr className="my-5 border-line" />

          {/* Task list */}
          <section aria-label="Task list">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink-2">
              <ListNumbers size={16} /> Tasks
            </h3>
            {group.tasks.length === 0 ? (
              <p className="py-1 text-sm text-ink-3">No tasks yet. Use Edit to add them.</p>
            ) : (
              <ul>
                {group.tasks.map((t) => (
                  <li key={t.id} className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[15px] hover:bg-surface-2">
                    <span className="grid w-5 shrink-0 place-items-center text-sm text-ink-3 tabular-nums">
                      {t.pinned ? <PushPin size={14} weight="fill" className="hc-text" aria-label="Every day" /> : `${++n}.`}
                    </span>
                    <span className="min-w-0 flex-1">{t.name}</span>
                    {t.pinned && <span className={`${tag} hc-soft hc-text`}>Every day</span>}
                    {group.standalone && t.time ? <span className={`${tag} bg-surface-2 text-ink-2 tabular-nums`}>{t.time}</span> : null}
                    {t.minutes ? <span className={`${tag} bg-surface-2 text-ink-2 tabular-nums`}>{t.minutes} min</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <hr className="my-5 border-line" />

          {/* Context */}
          <section aria-label="Context" className="pb-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink-2">
              <TextAlignLeft size={16} /> Context
            </h3>
            {group.doc ? (
              <article className="doc" dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <button onClick={onEdit} className="w-full rounded-lg px-2 py-2 text-left text-[15px] text-ink-3 hover:bg-surface-2">
                Empty. Click to write why and how (Markdown works).
              </button>
            )}
          </section>
        </div>
      </div>
    </Sheet>
  )
}
