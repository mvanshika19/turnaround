# Turnaround

Turnaround tells a North Shore hiker the latest time to turn around, so they're off the trail before dark and
below the snow. Pick a trail, a day and a start time; Turnaround shows your route coloured by conditions, a
Go / Caution / Not today verdict with plain reasons, and a trip plan you can share with a friend.

Built for the OpenAI Codex hackathon in Vancouver by a team of three: one software engineer and two data scientists.

> A planning aid, not a guarantee. Check current conditions and leave a trip plan with someone
> ([AdventureSmart](https://www.adventuresmart.ca/)).

## Architecture

```
frontend/  React + TypeScript web app (Vite, Tailwind, MapLibre)      → http://localhost:5173
backend/   FastAPI service: trails, planner, plans                     → http://localhost:8000/api
```

The browser only talks to our API. The planner behind it is swappable: today a clearly labelled mock planner,
later the data scientists' pace and conditions models. The shared contract lives in
[`backend/app/contracts.py`](backend/app/contracts.py) and is mirrored in
[`frontend/src/api/types.ts`](frontend/src/api/types.ts).

## Quick start

Prerequisites: [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 for you) and Node.js 20 or newer.

```bash
# Terminal 1: backend
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

```bash
# Terminal 2: frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. API docs are at http://localhost:8000/api/docs.

## Project layout and owners

| Path | What | Owner |
| --- | --- | --- |
| `backend/app/api/`, `repositories/`, `planning/` | HTTP routes, storage, planner wiring | Software engineer |
| `backend/app/pace/` | Trails and personal pace model | Data scientist 1 |
| `backend/app/conditions/` | Weather, light, snow line, verdict | Data scientist 2 |
| `backend/data/trails/` | Trail geometry (sample routes until replaced by real GPX) | Data scientist 1 |
| `frontend/` | Web app | Software engineer |
| `docs/` | Plans and decisions | Everyone |

## Conventions

- **Times** are Vancouver wall-clock `"HH:MM"` strings computed by the backend. The frontend displays them as
  given and never converts time zones.
- **Units:** kilometres, metres, degrees Celsius.
- **Contract changes** are agreed in team chat first, then made in both mirror files in one change.
- **Secrets** live only in `backend/.env` (git-ignored). The browser never sees an API key.
- **Personal GPX tracks** in `backend/data/gpx/` are git-ignored because they contain real locations.

## Data sources

| Source | Used for | Key |
| --- | --- | --- |
| [Open-Meteo](https://open-meteo.com/) | Forecast, freezing level, sunset, elevation | None (free for non-commercial use) |
| [OpenFreeMap](https://openfreemap.org/) | Map tiles | None |
| OpenAI API | AI co-pilot (later phase) | `TURNAROUND_OPENAI_API_KEY` in `backend/.env` |
