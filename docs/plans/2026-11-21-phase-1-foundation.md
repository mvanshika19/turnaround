# Phase 1: foundation (2026-11-21)

**Goal:** a running Turnaround app on a clearly labelled mock planner, so the software engineer and both data
scientists can work in parallel from the first hour.

**Spec:** the team guideline doc (features, owners, timeline, API keys) and the shared contract in
`backend/app/contracts.py` (mirrored in `frontend/src/api/types.ts`).

## Global constraints

- Industry-standard code; no automated tests (team decision); verify by running the app.
- Times are Vancouver wall-clock `"HH:MM"` strings computed by the backend; the frontend never converts time zones.
- The contract changes only by team agreement, and both mirror files change together.
- UI follows Apple's Human Interface style under our own brand: one type scale, readable sizes, light and dark mode.
- Secrets live only in `backend/.env` (git-ignored); the browser never sees an API key.

## Tasks

| # | Task | Owner | Output |
| --- | --- | --- | --- |
| 1 | Backend foundation: FastAPI app, settings, trail repository, mock planner, plan store, sample trails | SWE (agent) | `backend/` running on port 8000 |
| 2 | Frontend foundation: design system, theme, planner page, map, elevation profile, share page | SWE (agent) | `frontend/` running on port 5173 |
| 3 | Integration and visual QA in light and dark mode | Lead | verified app |

## Later phases

- **Phase 2 (data science):** `app/pace` (DS1) and `app/conditions` + `ModelPlanner` (DS2) replace the mock
  (`TURNAROUND_PLANNER=model`).
- **Phase 3 (co-pilot):** OpenAI tool-calling chat whose tools are `list_trails`, `plan_hike`,
  `sweep_start_times`, `compare_trails`; the verdict always comes from the planner, never the model.
