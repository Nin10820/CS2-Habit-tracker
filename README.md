# Habit Tracker — v0.1

A personal habit and task dashboard by Pham Nguyen Studio. Early v0.1, runs locally; not deployed yet.

## Layout

From 1280px wide it fills the screen as three columns, with a top bar over the middle one. The buttons at each end of the
top bar hide or show the left (Focus) and right (Progress) panels; the choice is remembered. Narrower screens show the
same three parts as tabs (Tasks · Focus · Progress).

- **Focus** (left): quick timer (focus / break, with a chime when it ends) and one card per group ("big task") with today's checklist.
  Click any habit or task (a card, or a name in a group) to put it in the timer's **Task** section: the focus clock takes that
  item's duration, and you can tick it from there. The circle or box ticks; one-off tasks have a pencil to edit.
- **My tasks** (middle): the whole week, Monday–Sunday. Each day lists that day's habits and one-off tasks as cards, sorted by time.
  Prev/next, **Today**, the current time, and a Day / Week switch. Day view is one top-down list with a "Now" line.
  On phones a week strip picks one day.
- **Your progress** (right): daily goal, tasks completed per day this week, completion-rate line, tasks done this week, streak
  (days in a row with every habit done).

## Groups and habits are set in code

Edit [`src/config/groups.ts`](src/config/groups.ts): groups, the habits in each (name, time, duration, which weekdays),
`DAILY_GOAL`, and the timer lengths. Each group links a Markdown write-up in `src/content/groups/` (`doc`), which the
⤢ button on its card opens in a popup. Edit the .md file to change what the popup shows.
Keep habit `id`s stable once you've used them: check-ins are saved by id.

On a day, each group is **one card** holding its habits (and that day's one-off tasks for the group). Habits in a
standalone group (`Routine`: Dậy sớm, Planning cho hôm sau) are single cards. Times in the config are only the
**expected** times: click a card's time to change it for that day; ↺ puts it back.

In the app, **Add task** adds a one-off task to a single day, inside a group's card or as a single card (edit with the pencil).

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
