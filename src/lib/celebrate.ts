/**
 * A small "well done" when you tick something: a burst of paper confetti from the tick and a short
 * two-note chime. No library and no sound file: a throwaway canvas and Web Audio.
 * With "reduce motion" on there's no confetti, just the chime.
 */

let audio: AudioContext | null = null

/** Two quick soft notes going up. Quiet on purpose. */
function ding() {
  try {
    audio ??= new AudioContext()
    const ctx = audio
    if (ctx.state === "suspended") void ctx.resume()
    const now = ctx.currentTime
    ;[
      [880, 0],
      [1318.5, 0.08],
    ].forEach(([freq, at]) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = "sine"
      o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, now + at)
      g.gain.exponentialRampToValueAtTime(0.09, now + at + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.32)
      o.connect(g).connect(ctx.destination)
      o.start(now + at)
      o.stop(now + at + 0.35)
    })
  } catch {
    /* no audio: the confetti still says it */
  }
}

type Bit = { x: number; y: number; vx: number; vy: number; w: number; h: number; r: number; vr: number; color: string }

/** Confetti from a point (page coordinates), in the given colours. */
function burst(x: number, y: number, colors: string[], count: number) {
  const canvas = document.createElement("canvas")
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "60" })
  canvas.setAttribute("aria-hidden", "true")
  document.body.appendChild(canvas)
  const ctx = canvas.getContext("2d")
  if (!ctx) return canvas.remove()
  ctx.scale(dpr, dpr)

  const bits: Bit[] = Array.from({ length: count }, () => {
    // Mostly upward, fanned out.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9
    const speed = 4 + Math.random() * 6
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 4 + Math.random() * 4,
      h: 6 + Math.random() * 6,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: colors[Math.floor(Math.random() * colors.length)],
    }
  })

  const LIFE = 1400
  const start = performance.now()
  const frame = (t: number) => {
    const age = t - start
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - LIFE * 0.55) / (LIFE * 0.45))
    for (const b of bits) {
      b.vy += 0.22 // gravity
      b.vx *= 0.985 // air
      b.vy *= 0.985
      b.x += b.vx
      b.y += b.vy
      b.r += b.vr
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(b.r)
      // Flip like paper: the width wobbles with the spin.
      ctx.scale(Math.cos(b.r * 2), 1)
      ctx.fillStyle = b.color
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h)
      ctx.restore()
    }
    if (age < LIFE) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}

/**
 * Celebrate a tick at an element (the tick circle). `color` is the item's group colour; the
 * accent and a warm yellow join it. `big` is for finishing everything planned that day.
 */
export function celebrate(from: Element, color?: string, big = false) {
  ding()
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const r = from.getBoundingClientRect()
  const css = getComputedStyle(document.documentElement)
  const accent = css.getPropertyValue("--accent").trim() || "#2f7d5b"
  const own = color && color.startsWith("var(") ? css.getPropertyValue(color.slice(4, -1)).trim() : color
  burst(r.left + r.width / 2, r.top + r.height / 2, [own || accent, accent, "#f5b83d", "#ef7d5a"], big ? 90 : 36)
}
