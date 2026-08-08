# The Course — Training Tools

Interactive training tools complementing Ed Miller's *The Course*. React + Vite + TypeScript,
frontend-only, deployed to GitHub Pages at `param.me/the-course/`. All state (tally, decision
log, chart edits, settings) persists in localStorage under `the-course:`-prefixed keys.

## Commands

- `npm run dev` — dev server at `http://localhost:5173/the-course/`
- `npm test` — vitest (range parser + jsdom UI smoke tests)
- `npm run build` — typecheck + build + copy `dist/index.html` → `dist/404.html`

## Architecture

- `src/lib/` — framework-free domain logic: `cards.ts` (169 hand classes),
  `range.ts` (range-notation parser/renderer), `charts.ts` (Miller's default charts from
  `preflop-charts.txt`), `scenarios.ts` (position×context matrix, grading), `storage.ts`.
- `src/tools/preflop/` — the trainer UI (Practice / Charts / Log / Report tabs).
  New tools get their own `src/tools/<name>/` directory plus a card on the home page in `App.tsx`.
- User chart edits are stored as sparse per-chart overrides (`Record<chartId, Record<handClass,
  action>>`), not full copies — grading (`correctAction`) and the grid view both consult
  overrides first, then the compiled defaults.

## Gotchas / learnings

- **Range notation dash forms are ambiguous by shape**: `A5s-A2s` is a kicker run (high card
  fixed), `JTs-76s` is a diagonal run (both ranks step down, gap fixed). The parser
  distinguishes them by whether the high card of both endpoints matches. See `range.test.ts`
  for exact expansions of every form used in the charts.
- **Post-answer range reveal** (`parseRangeTokens`/`handFamilyMatches` in `range.ts`): after an
  answer, Practice shows the chart tokens covering the hand's *family* (e.g. 54s → the
  suited-connector token `JTs-76s`) plus a mini-grid with the cell highlighted. Families:
  pairs; kicker (same high card + suit-ness); gap (same gap, ≤ 2-gappers, **no card above a
  jack** — otherwise AKs would count as a "connector" and A6s/K5s would group as "same gap").
  Single tokens can match via either their high card or (if connector-ish) their gap. Token
  lines are hidden for user-modified charts (tokens describe the defaults); the mini-grid uses
  the effective (override-aware) chart.
- **`renderRange` prefers `+` notation**: a kicker run ending one below the high card renders
  as `KTs+`, not `KQs-KTs`. It never reconstructs diagonal notation (`JTs-76s` renders as
  separate per-high-card tokens); ranges still round-trip through `parseRange`.
- **GitHub Pages SPA fallback**: the build copies `index.html` to `404.html` so deep links like
  `/the-course/preflop-training` work. Router basename comes from `import.meta.env.BASE_URL`
  with the trailing slash stripped (react-router mismatches paths with a trailing-slash basename).
- **tsconfig needs `"types": ["vite/client"]`** in `tsconfig.app.json` or `import.meta.env`
  fails to typecheck.
- Blinds facing a loose raise use the **EP** vs-loose chart (chart line 34: "also blinds vs
  loose EP raise") — encoded in `chartIdFor`.
- **Table visualization conventions** (`Table.tsx`): 9-handed, hero always at the bottom, seat
  roles rotate so roles are `(heroRoleIndex + k) mod 9` for the seat k places clockwise after
  hero. Hero's EP seat is 2 off the button (just before CO). Situations are encoded purely by
  seat: tight raise = UTG raiser, loose raise = seat just before hero, steal = BTN raiser.
  Exception: blinds vs a loose raise show the raiser at UTG+1 (a BTN raiser would be visually
  identical to a steal, and the chart covers a loose EP raise).
- **Charts can have a non-fold default action** (`ChartDef.defaultAction`, read via
  `chartDefault`). The book only gives a *raise* range for blinds vs limpers; hands outside it
  must not grade as "fold" in an unraised pot. BB vs limpers defaults to **check**; SB vs
  limpers layers raise > complete (the book's complete-or-fold rule) > fold. Never use a bare
  `?? 'fold'` fallback when reading a compiled chart.
- The old `sb-limped` context and `blinds-vs-limpers` chart were merged into
  `sb-vs-limpers`/`bb-vs-limpers`; `state.ts` migrates stored logs/settings from those ids.
- Conditional chart lines ("add A5s-A2s… if everyone might fold", "optional trim") are shown
  as notes but deliberately excluded from grading to keep answers deterministic.
- Deploy is via `.github/workflows/deploy.yml` (actions/deploy-pages). Repo Settings → Pages →
  Source must be set to "GitHub Actions" once.
