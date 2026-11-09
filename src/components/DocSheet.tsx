import { PencilSimple, PushPin } from "@phosphor-icons/react"
import { Marked } from "marked"
import { useMemo } from "react"
import { colorVar, type GroupDef } from "../lib/types"
import { Sheet } from "./Sheet"

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

// Notes can come from an imported backup, so raw HTML in them is shown as text, not run.
const md = new Marked({ gfm: true, async: false, renderer: { html: ({ text }) => escapeHtml(text) } })

/**
 * A group opened from its expand button: its context (Markdown) and its numbered task list.
 * "Edit" opens the group editor; reading needs no editing.
 */
export function DocSheet({ group, onEdit, onClose }: { group: GroupDef; onEdit: () => void; onClose: () => void }) {
  const { title, html } = useMemo(() => {
    const src = group.doc ?? ""
    // The context's first "# Heading" becomes the popup title instead of repeating inside the body.
    const m = src.match(/^#\s+(.+)\n/)
    const body = m ? src.slice(m[0].length) : src
    const rendered = (md.parse(body) as string)
      .replace(/href="\s*javascript:[^"]*"/gi, 'href="#"')
      // Links open in a new tab.
      .replace(/<a href=/g, '<a target="_blank" rel="noreferrer" href=')
    return { title: m ? m[1].trim() : (group.title ?? group.label), html: rendered }
  }, [group])

  const Icon = group.icon
  const picked = group.tasks.filter((t) => !t.pinned).length
  let n = 0

  return (
    <Sheet
      wide
      title={title}
      onClose={onClose}
      header={
        <p style={{ ["--hc" as string]: colorVar(group.color) }} className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">
          <Icon size={16} className="hc-text" /> {group.label}
        </p>
      }
    >
      <section aria-label="Task list" style={{ ["--hc" as string]: colorVar(group.color) }} className="mb-6 rounded-2xl bg-surface-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold">Task list</h3>
          <button onClick={onEdit} className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-sm font-semibold text-ink-2 shadow-card">
            <PencilSimple size={15} /> Edit
          </button>
        </div>
        {picked > 0 && (
          <p className="mt-1 text-xs text-ink-3">
            Each day: pinned tasks, plus {Math.min(group.perDay, picked)} of the numbered ones {group.mode === "random" ? "at random" : "in order"}.
          </p>
        )}
        {group.tasks.length === 0 ? (
          <p className="mt-2 text-sm text-ink-3">No tasks yet. Use Edit to add them.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {group.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="hc-text grid w-6 shrink-0 place-items-center font-semibold tabular-nums">
                  {t.pinned ? <PushPin size={14} weight="fill" aria-label="Every day" /> : `${++n}.`}
                </span>
                <span className="min-w-0 flex-1">{t.name}</span>
                {group.standalone && t.time ? <span className="shrink-0 text-xs text-ink-3 tabular-nums">{t.time}</span> : null}
                {t.minutes ? <span className="shrink-0 text-xs text-ink-3 tabular-nums">{t.minutes}′</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {group.doc ? (
        <article className="doc" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-sm text-ink-3">No context yet. Use Edit to write one (Markdown works).</p>
      )}
    </Sheet>
  )
}
