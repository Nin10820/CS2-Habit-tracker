# Habit Tracker — v0.1

A personal habit and task dashboard by Pham Nguyen Studio. Early v0.1, runs locally; not deployed yet.

## Layout

From 1280px wide it fills the screen as three columns, with a top bar over the middle one. The buttons at each end of the
top bar hide or show the left (Focus) and right (Progress) panels; the choice is remembered. Narrower screens show the
same three parts as tabs (Tasks · Focus · Progress).

- **Focus** (left): quick timer (focus / break, with a chime when it ends) and one card per group ("big task") with today's checklist.
- **My tasks** (middle): the whole week, Monday–Sunday. Each day lists that day's habits and one-off tasks as cards, sorted by time.
  Prev/next week, **Today**, and **Filter** by group. On phones a week strip picks one day.
- **Your progress** (right): daily goal, tasks completed per day this week, completion-rate line, tasks done this week, streak
  (days in a row with every habit done).

## Groups and habits are set in code

Edit [`src/config/groups.ts`](src/config/groups.ts): groups, the habits in each (name, time, duration, which weekdays),
`DAILY_GOAL`, and the timer lengths. The habits in there now are placeholders.
Keep habit `id`s stable once you've used them: check-ins are saved by id.

In the app, **Add task** adds a one-off task to a single day (tap its card to edit or delete).

## Data

Saved in `localStorage` on this device: no login, no server. Settings (gear icon) has theme, export/import JSON backup,
and clear all. Habits only count in stats from the first day you used the app.

## Run

```bash
pnpm install
pnpm dev      # http://localhost:5191
pnpm build    # type-check + production build into dist/
```

## Structure

- `src/config/groups.ts`: groups, habits, goal, timer lengths
- `src/lib/`: dates (local `YYYY-MM-DD` keys), store (localStorage + backup), day items and stats, theme
- `src/components/`: `WeekBoard` / `DayColumn` (middle), `Timer` + `GroupCard` (left), `ProgressPanel` (right), sheets
- `src/styles/tokens.css`: all colours (light + dark). Fonts: Bricolage Grotesque (headings), Montserrat (UI)
