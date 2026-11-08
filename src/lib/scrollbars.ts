/**
 * Shows scrollbars only while they're useful (the look lives in styles/index.css):
 * - [data-scrolling] on an area while it scrolls, and for a short moment after
 * - html.scroll-intro for a moment after the page opens, so you can see what scrolls
 */
const HIDE_AFTER = 900
const INTRO = 1500

export function setupScrollbars() {
  const timers = new WeakMap<Element, number>()

  const onScroll = (e: Event) => {
    const el = e.target === document ? document.documentElement : e.target
    if (!(el instanceof Element)) return
    el.setAttribute("data-scrolling", "")
    clearTimeout(timers.get(el))
    timers.set(
      el,
      window.setTimeout(() => el.removeAttribute("data-scrolling"), HIDE_AFTER),
    )
  }
  // Scroll events don't bubble; capture catches every scrolling area.
  document.addEventListener("scroll", onScroll, { capture: true, passive: true })

  const root = document.documentElement
  root.classList.add("scroll-intro")
  window.setTimeout(() => root.classList.remove("scroll-intro"), INTRO)
}
