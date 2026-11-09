import { useSyncExternalStore } from "react"
import type { DayKey } from "./date"

/**
 * The card being dragged, shared by every day column: which card, the day it came from, its
 * height (the drop slot takes the same space) and where it would land now.
 * `lifted` turns on just after the drag starts (after the browser took its drag picture),
 * which is when the card leaves its list and the other cards dim.
 */
export type CardDragState = {
  key: string
  from: DayKey
  height: number
  lifted: boolean
  over?: { day: DayKey; index: number }
} | null

let state: CardDragState = null
const listeners = new Set<() => void>()

export const getCardDrag = () => state

export function setCardDrag(next: CardDragState | ((s: CardDragState) => CardDragState)) {
  const value = typeof next === "function" ? next(state) : next
  if (value === state) return
  state = value
  listeners.forEach((l) => l())
}

/** Move the drop slot; does nothing (no re-render) when it's already there. */
export function setDropSlot(day: DayKey | undefined, index = 0) {
  setCardDrag((s) => {
    if (!s) return s
    if (!day) return s.over ? { ...s, over: undefined } : s
    return s.over?.day === day && s.over.index === index ? s : { ...s, over: { day, index } }
  })
}

export const useCardDrag = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getCardDrag,
  )
