import { marked } from "marked"
import { useMemo } from "react"
import type { GroupDef } from "../config/groups"
import { colorVar } from "../lib/types"
import { Sheet } from "./Sheet"

/**
 * A group's full write-up in a popup. The Markdown comes from files in src/content/groups that are
 * bundled with the app (your own notes, not user input), so rendering it as HTML is fine.
 */
export function DocSheet({ group, onClose }: { group: GroupDef; onClose: () => void }) {
  const { title, html } = useMemo(() => {
    const src = group.doc ?? ""
    // The file's first "# Heading" becomes the popup title instead of repeating inside the body.
    const m = src.match(/^#\s+(.+)\n/)
    const body = m ? src.slice(m[0].length) : src
    const rendered = marked.parse(body, { gfm: true, async: false }) as string
    // Links open in a new tab.
    return { title: m ? m[1].trim() : group.label, html: rendered.replace(/<a href=/g, '<a target="_blank" rel="noreferrer" href=') }
  }, [group])

  const Icon = group.icon
  return (
    <Sheet
      wide
      title={title}
      onClose={onClose}
      header={
        <p
          style={{ ["--hc" as string]: colorVar(group.color) }}
          className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-2 uppercase"
        >
          <Icon size={16} className="hc-text" /> {group.label}
        </p>
      }
    >
      <article className="doc" dangerouslySetInnerHTML={{ __html: html }} />
    </Sheet>
  )
}
