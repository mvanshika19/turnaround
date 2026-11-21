# Turnaround web app

The planner UI for Turnaround: pick a North Shore trail, a day, a start time, your fitness and gear,
and see the latest time to turn around so you're off the trail before dark and below the snow.

## Run it

```sh
npm install
npm run dev        # http://127.0.0.1:5173, proxies /api to the backend on http://127.0.0.1:8000
```

Start the backend first (from `../backend`): `uv run uvicorn app.main:app --port 8000`. Without it the
planner shows "Can't reach the planner".

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Vite dev server with the `/api` proxy           |
| `npm run build`     | Type-check, then build to `dist/`               |
| `npm run preview`   | Serve the production build                      |
| `npm run lint`      | ESLint (type-aware, React hooks), zero warnings |
| `npm run typecheck` | `tsc -b`                                        |
| `npm run format`    | Prettier                                        |

`VITE_API_BASE_URL` overrides the API location (default `/api`); see `.env.example`.

## Layout

```
src/
  api/          types.ts (contract mirror of backend/app/contracts.py), fetch client, TanStack Query hooks
  app/          providers, query client, router
  theme/        light / dark / system preference, applied as data-theme on <html>
  styles/       tokens.css (every colour), index.css (type scale, materials, slider, map overlays)
  lib/          pure helpers: time maths on "HH:MM" strings, formatting, status and tone maps
  hooks/        media queries, element size, document title
  components/   ui primitives, layout (header, logo, theme toggle), map, plan read-outs
  features/
    planner/    PlannerPage, its panels and controls, usePlannerState, usePlannerData
    share/      SharePage (/plan/:planId)
    errors/     NotFoundPage, RouteErrorPage
```

## Design rules

- Text uses only the seven scale sizes (`text-display` … `text-caption`); Tailwind's default sizes
  are removed. Numbers are tabular.
- Colours come only from `src/styles/tokens.css`. Status text tokens meet WCAG AA on their surface and
  on their 14% pill tint in both themes.
- Times are Vancouver wall-clock strings from the API and are displayed as given; "today" comes from
  `GET /api/health`, never the browser clock.
- Motion uses one spring and short cross-fades, and honours reduced motion.
- The map (MapLibre GL, ~1.1 MB) loads lazily in its own chunk.
