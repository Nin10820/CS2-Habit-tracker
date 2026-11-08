# Habit Tracker — v0.1

A small daily habit tracker by Pham Nguyen Studio. Early v0.1, runs locally; not deployed yet.

## Features

- Add, edit, reorder and delete habits (name + colour)
- **Today**: tick habits off; the 7-day strip lets you fix the last week
- Streaks: current and best per habit
- **Progress** (on Today, beside the list on wide screens): this week / this month completion, longest current streak, 30-day bar chart, per-habit breakdown
- Data lives in `localStorage` on the device: no login, no server. Export and import a JSON backup from the **Habits** tab
- Light, dark or follow the system; works from 375px phones up

## Run

```bash
pnpm install
pnpm dev      # http://localhost:5191
pnpm build    # type-check + production build into dist/
```

## Structure

- `src/lib/` — dates (local `YYYY-MM-DD` keys), store (localStorage + backup), streak/completion maths, theme
- `src/screens/` — Today, StatsPanel (shown on Today), Habits
- `src/components/` — sheet/dialog, habit editor, small UI pieces
- `src/styles/tokens.css` — all colours (light + dark). Fonts: Bricolage Grotesque (headings), Montserrat (UI)

A day counts toward stats from the day a habit was created. Ticking an earlier day moves the start date back.
