import type { PointerEvent } from "react"

/** Things that keep their own click or drag: pressing on them never pans the board. */
const INTERACTIVE = "li, button, input, select, textarea, a, label, [role=button], [draggable=true]"

/**
 * Click-and-drag on an empty part of a scroll area to move it left / right (mouse only:
 * touch and touchpads already swipe sideways). Spread the result on the scrolling element.
 */
export function dragScroll() {
  return {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.pointerType !== "mouse" || e.button !== 0) return
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return

      const el = e.currentTarget
      const startX = e.clientX
      const startLeft = el.scrollLeft
      let moved = false

      const move = (ev: globalThis.PointerEvent) => {
        const dx = ev.clientX - startX
        if (!moved && Math.abs(dx) < 4) return
        if (!moved) {
          moved = true
          // Snapping would fight the drag; it comes back on release.
          el.style.scrollSnapType = "none"
          document.body.style.cursor = "grabbing"
          document.body.style.userSelect = "none"
        }
        el.scrollLeft = startLeft - dx
      }
      const up = () => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        window.removeEventListener("pointercancel", up)
        if (!moved) return
        el.style.scrollSnapType = ""
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        // A drag isn't a click: swallow the click that follows the release.
        const stop = (ev: MouseEvent) => {
          ev.stopPropagation()
          ev.preventDefault()
        }
        window.addEventListener("click", stop, { capture: true, once: true })
        setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0)
      }
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
      window.addEventListener("pointercancel", up)
    },
  }
}
