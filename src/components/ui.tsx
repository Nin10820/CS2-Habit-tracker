import { CaretDown, CaretUp, Check, Plus, X } from "@phosphor-icons/react"
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"

const pad2 = (n: number) => String(n).padStart(2, "0")

/*
 * Form controls: one look for every field, dropdown and time picker (after the Untitled UI style).
 * A light border, 8px corners, a hairline shadow, and on focus an accent border with a soft ring.
 * Two sizes: md (44px, forms) and sm (36px, inside lists and toolbars).
 */
export type ControlSize = "sm" | "md"
const SIZE: Record<ControlSize, string> = { md: "h-11 px-3.5 text-[15px]", sm: "h-9 px-3 text-sm" }
/** The frame of a control. Add a size from `controlSize` (or your own height and padding). */
export const control =
  "rounded-lg border border-line bg-surface text-ink shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent/15 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15"
export const controlSize = (s: ControlSize = "md") => SIZE[s]
/** A text field: `<input className={field()} />`. */
export const field = (s: ControlSize = "md", extra = "") => `${control} ${SIZE[s]} w-full ${extra}`

/** Buttons, same family: 44px tall, 8px corners. Add width / margin where you use them. */
const buttonBase = "press inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-semibold transition-colors disabled:opacity-40"
export const btn = {
  primary: `${buttonBase} bg-accent text-on-accent shadow-xs`,
  secondary: `${buttonBase} border border-line bg-surface text-ink shadow-xs hover:bg-surface-2`,
  danger: `${buttonBase} bg-danger text-white shadow-xs`,
  ghost: `${buttonBase} text-ink-2 hover:bg-surface-2`,
  dangerGhost: `${buttonBase} text-danger hover:bg-[color-mix(in_oklab,var(--danger)_8%,transparent)]`,
}

/** A floating menu panel (dropdown lists). */
const menuPanel =
  "fixed z-[70] max-h-72 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-[0_12px_16px_-4px_rgb(16_24_40/0.10),0_4px_6px_-2px_rgb(16_24_40/0.05)] outline-none"

export type SelectOption<T extends string | number> = { value: T; label: string }

/**
 * A dropdown: a button showing the choice, and a menu of options with a ✓ on the chosen one.
 * Keyboard: ↑/↓ (opens and moves), Enter or Space picks, Esc closes, typing a letter jumps.
 * The menu floats above everything (it can leave a scrolling dialog) and flips up near the bottom.
 */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  size = "md",
  id,
  label,
  className = "",
}: {
  value: T
  options: SelectOption<T>[]
  onChange: (v: T) => void
  size?: ControlSize
  id?: string
  /** Accessible name when there's no <label for={id}>. */
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLUListElement>(null)
  const listId = useId()
  const chosen = Math.max(0, options.findIndex((o) => o.value === value))

  const show = (at = chosen) => {
    setActive(at)
    setOpen(true)
  }
  const pick = (i: number) => {
    onChange(options[i].value)
    setOpen(false)
    button.current?.focus()
  }

  // Place the menu under the button (or above it when there's no room), and follow on scroll.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = button.current!.getBoundingClientRect()
      const below = innerHeight - r.bottom
      const up = below < 240 && r.top > below
      setPos({ left: r.left, width: r.width, ...(up ? { bottom: innerHeight - r.top + 6 } : { top: r.bottom + 6 }) })
    }
    place()
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    return () => {
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [open])

  // Click anywhere else closes it.
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      const t = e.target as Node
      if (!button.current?.contains(t) && !menu.current?.contains(t)) setOpen(false)
    }
    document.addEventListener("pointerdown", away, true)
    return () => document.removeEventListener("pointerdown", away, true)
  }, [open])

  // Keep the active option in view.
  useEffect(() => {
    if (open) menu.current?.children[active]?.scrollIntoView({ block: "nearest" })
  }, [open, active])

  const onKey = (e: KeyboardEvent) => {
    const k = e.key
    if (k === "ArrowDown" || k === "ArrowUp") {
      e.preventDefault()
      if (!open) return show()
      setActive((a) => (k === "ArrowDown" ? Math.min(options.length - 1, a + 1) : Math.max(0, a - 1)))
    } else if (k === "Home" || k === "End") {
      if (!open) return
      e.preventDefault()
      setActive(k === "Home" ? 0 : options.length - 1)
    } else if (k === "Enter" || k === " ") {
      e.preventDefault()
      if (open) pick(active)
      else show()
    } else if (k === "Escape") {
      if (open) {
        // Don't let a surrounding dialog close too.
        e.stopPropagation()
        setOpen(false)
      }
    } else if (k === "Tab") {
      setOpen(false)
    } else if (k.length === 1 && /\S/.test(k)) {
      const from = open ? active + 1 : chosen + 1
      const hit = [...options.slice(from), ...options.slice(0, from)].find((o) => o.label.toLowerCase().startsWith(k.toLowerCase()))
      if (hit) {
        const i = options.indexOf(hit)
        if (open) setActive(i)
        else onChange(hit.value)
      }
    }
  }

  return (
    <>
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
        className={`${control} ${SIZE[size]} press flex items-center justify-between gap-2 text-left font-medium ${open ? "border-accent ring-4 ring-accent/15" : "hover:bg-surface-2/60"} ${className}`}
      >
        <span className="truncate">{options[chosen]?.label}</span>
        <CaretDown size={14} weight="bold" className={`shrink-0 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            ref={menu}
            id={listId}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            className={`${menuPanel} sheet-in`}
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: Math.max(pos.width, 160) }}
          >
            {options.map((o, i) => {
              const selected = i === chosen
              return (
                <li
                  key={String(o.value)}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={selected}
                  onPointerEnter={() => setActive(i)}
                  // Keep focus on the button so the keyboard keeps working.
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => pick(i)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm text-ink ${i === active ? "bg-surface-2" : ""} ${selected ? "font-semibold" : "font-medium"}`}
                >
                  <span className="truncate">{o.label}</span>
                  {selected && <Check size={16} weight="bold" className="shrink-0 text-accent" aria-hidden />}
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </>
  )
}

/**
 * A time picker made of two number fields, hour (1–12) and minute (00–59), plus a quiet AM/PM
 * switch. `value` and `onChange` use 24-hour "HH:MM" ("" for no time). ↑/↓ step a field; typing the
 * hour moves on to the minutes. `clearable` adds an ✕ that goes back to no time.
 */
export function TimeField({
  id,
  value,
  onChange,
  label = "Time",
  size = "md",
  clearable = false,
  className = "",
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  label?: string
  size?: ControlSize
  clearable?: boolean
  className?: string
}) {
  const set = /^\d\d:\d\d$/.test(value)
  const h24 = set ? Number(value.slice(0, 2)) : 0
  const min = set ? Number(value.slice(3, 5)) : 0
  const pm = set && h24 >= 12
  const h12 = h24 % 12 || 12
  // What's typed while a field has focus; null shows the value.
  const [hText, setHText] = useState<string | null>(null)
  const [mText, setMText] = useState<string | null>(null)
  const minutes = useRef<HTMLInputElement>(null)

  const emit = (h: number, m: number, isPm: boolean) => onChange(`${pad2((h % 12) + (isPm ? 12 : 0))}:${pad2(m)}`)
  const wrap = (n: number, lo: number, hi: number) => (n < lo ? hi : n > hi ? lo : n)
  const step = (e: KeyboardEvent<HTMLInputElement>, part: "h" | "m") => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return
    e.preventDefault()
    const d = e.key === "ArrowUp" ? 1 : -1
    if (part === "h") {
      setHText(null)
      emit(wrap(h12 + d, 1, 12), min, pm)
    } else {
      setMText(null)
      emit(h12, wrap(min + d * (e.shiftKey ? 10 : 1), 0, 59), pm)
    }
  }
  const sm = size === "sm"
  const digits = `w-[2.2ch] bg-transparent text-center font-semibold text-ink tabular-nums outline-none placeholder:text-ink-3 ${sm ? "text-sm" : "font-title text-lg"}`
  const half = (isPm: boolean) =>
    `rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${pm === isPm && set ? "bg-surface text-ink-2 shadow-xs" : "text-ink-3"}`

  return (
    <div role="group" aria-label={label} className={`${control} flex shrink-0 items-center gap-0.5 pr-1 ${sm ? "h-9 pl-2" : "h-11 pl-3"} ${className}`}>
      <input
        id={id}
        inputMode="numeric"
        aria-label="Hour"
        placeholder="--"
        maxLength={2}
        value={hText ?? (set ? String(h12) : "")}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => setHText(null)}
        onKeyDown={(e) => step(e, "h")}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, "").slice(0, 2)
          setHText(t)
          const n = Number(t)
          if (t && n >= 1 && n <= 12) emit(n, min, pm)
          // "1" could still become 10–12; anything else is a whole hour, so go on to minutes.
          if (t.length === 2 || (t && n > 1)) minutes.current?.focus()
        }}
        className={digits}
      />
      <span className={`font-semibold text-ink-3 ${sm ? "text-sm" : "font-title text-lg"}`}>:</span>
      <input
        ref={minutes}
        inputMode="numeric"
        aria-label="Minute"
        placeholder="--"
        maxLength={2}
        value={mText ?? (set ? pad2(min) : "")}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => setMText(null)}
        onKeyDown={(e) => step(e, "m")}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, "").slice(0, 2)
          setMText(t)
          const n = Number(t)
          if (t && n <= 59) emit(h12, n, pm)
        }}
        className={digits}
      />
      <span className="ml-auto flex shrink-0 items-center gap-0.5 pl-1.5">
        <span className="flex rounded-md bg-surface-2 p-0.5">
          <button type="button" aria-pressed={set && !pm} onClick={() => emit(h12, min, false)} className={half(false)}>
            AM
          </button>
          <button type="button" aria-pressed={pm} onClick={() => emit(h12, min, true)} className={half(true)}>
            PM
          </button>
        </span>
        {clearable && set && (
          <button type="button" onClick={() => onChange("")} aria-label="No time" title="No time" className="press grid size-6 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink">
            <X size={12} weight="bold" />
          </button>
        )}
      </span>
    </div>
  )
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-card-line bg-surface p-4 ${className}`}>{children}</section>
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold">{children}</h2>
      {right}
    </div>
  )
}

export function Bar({ value, color = "var(--accent)" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  )
}

/** Small progress ring for a day's completion. */
export function Ring({ value, size = 28, stroke = 3 }: { value: number | null; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      {value !== null && value > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * value} ${c}`}
          className="transition-[stroke-dasharray] duration-300"
        />
      )}
    </svg>
  )
}

/**
 * Section heading of the side panel: a pill with the name and count that folds the list,
 * plus small actions on the right.
 */
export function PillHeader({
  label,
  count,
  open,
  onToggle,
  icon,
  tinted = false,
  children,
}: {
  label: ReactNode
  count?: string
  open: boolean
  onToggle: () => void
  /** Small icon before the name. */
  icon?: ReactNode
  /** Fill with the group's soft color (needs --hc set on a parent) instead of plain grey. */
  tinted?: boolean
  /** Actions on the right (add, edit, open…). */
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`press flex min-w-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium tracking-[0.5px] text-ink uppercase ${tinted ? "hc-soft" : "bg-surface-2"}`}
      >
        {icon}
        <span className="truncate">{label}</span>
        {count && <span className="shrink-0 tabular-nums">({count})</span>}
        <CaretUp size={12} weight="bold" className={`shrink-0 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
      {children && <div className="flex shrink-0 items-center gap-1">{children}</div>}
    </div>
  )
}

/** Small round action next to a PillHeader. */
export const pillAction = "press grid size-7 place-items-center rounded-full bg-surface-2 text-ink-2"

/** Empty state under a side panel heading: a dashed box with a hint and a + on the right. */
export function DashedEmpty({ text, onAdd, addLabel }: { text: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="flex h-10 items-center justify-between rounded-2xl border-2 border-dashed border-line pr-2 pl-3 text-sm text-ink-3">
      <span className="truncate">{text}</span>
      {onAdd && (
        <button onClick={onAdd} aria-label={addLabel ?? "Add"} title={addLabel} className="press grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3">
          <Plus size={13} weight="bold" />
        </button>
      )}
    </div>
  )
}

/** A rounded row in the side panel lists: round icon on the left, then the content. */
export const listRow = "flex min-h-[50px] items-center gap-3 rounded-2xl bg-surface py-2.5 pr-3.5 pl-2 shadow-card"
