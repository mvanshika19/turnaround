# Agent brief: Turnaround

Read this before changing anything. It applies to every coding agent (Codex, Claude) working in this repo.

## What we're building

Turnaround tells a North Shore (Vancouver) hiker the latest time to turn around so they finish before dark and
below the snow. A FastAPI backend plans the hike; a React web app shows the map, the verdict and the turnaround
time. See `README.md` for setup and `docs/plans/` for the current plan.

## Ownership: edit only your own area

| Area | Owner |
| --- | --- |
| `backend/app/api/`, `backend/app/repositories/`, `backend/app/planning/`, `frontend/` | Software engineer |
| `backend/app/pace/`, `backend/data/trails/` | Data scientist 1 |
| `backend/app/conditions/`, the future `ModelPlanner` in `backend/app/planning/` | Data scientist 2 |

If a change needs another owner's area, stop and describe it instead of making it.

## The contract

`backend/app/contracts.py` is the single source of truth for every request and response, mirrored in
`frontend/src/api/types.ts`. Never change one without the other, and never change either without team agreement.

## Rules

- Industry-standard code: type hints / strict TypeScript, docstrings on public functions, small modules, no dead
  or commented-out code, `logging` not `print`.
- No automated tests (team decision for the hackathon). Verify by running the app and calling the API.
- Backend checks: `cd backend && uv run ruff check . && uv run ruff format --check .`
- Frontend checks: `cd frontend && npm run lint && npm run typecheck && npm run build`
- Times: the backend computes Vancouver wall-clock `"HH:MM"` strings; the frontend never converts time zones.
- Secrets: only in `backend/.env`. Never in code, the frontend, logs or commits.
- Safety: the verdict (go / caution / no_go) always comes from the planner's rules, never from a language model.
- UI: Apple Human Interface style under our own brand. Use only the type scale and colour tokens in
  `frontend/src/styles/tokens.css`; support light and dark mode; sentence-case copy.
