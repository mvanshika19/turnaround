# Turnaround backend

A FastAPI service that plans North Shore hikes and finds the latest time to turn around so you are off the
trail before dark and below the snow. Until the data science models land it runs on a clearly labelled
planner behind a swappable interface (see Planner modes below).

## Run

```bash
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Interactive docs: <http://localhost:8000/api/docs>. OpenAPI: `/api/openapi.json`.

## Lint

```bash
uv run ruff check . && uv run ruff format --check .
```

## Settings

Set as environment variables or in `backend/.env` (see `.env.example`).

| Variable | Default | Meaning |
| --- | --- | --- |
| `TURNAROUND_ENVIRONMENT` | `development` | `development` or `production` |
| `TURNAROUND_LOG_LEVEL` | `INFO` | Logging level |
| `TURNAROUND_CORS_ORIGINS` | `["http://localhost:5173","http://127.0.0.1:5173"]` | Allowed CORS origins (JSON list) |
| `TURNAROUND_PLANNER` | `model` | `model` (forecast-driven) or `mock` (fixed typical light and snow, offline) |
| `TURNAROUND_OPEN_METEO_URL` | `https://api.open-meteo.com/v1/forecast` | Forecast endpoint for the model planner |
| `TURNAROUND_TIMEZONE` | `America/Vancouver` | Time zone for all trail times |
| `TURNAROUND_DATA_DIR` | `backend/data` | Directory with `trails/`, `cache/`, `gpx/` |
| `TURNAROUND_OPENAI_API_KEY` | empty | OpenAI key; the co-pilot is disabled without it |
| `TURNAROUND_OPENAI_MODEL` | `gpt-6.2-sol` | OpenAI model used by the co-pilot |
| `TURNAROUND_COPILOT_MAX_TOOL_ROUNDS` | `5` | Most tool-calling rounds per co-pilot question |

## Module map

| Path | Owner | Purpose |
| --- | --- | --- |
| `app/contracts.py` | Whole team | API contract; change only by agreement |
| `app/api/` | SWE | Routes and dependency providers under `/api` |
| `app/repositories/` | SWE | Trail catalogue (JSON files) and in-memory plan store |
| `app/planning/` | SWE | `Planner` protocol, shared engine, mock and model planners |
| `app/copilot/` | SWE | AI co-pilot: OpenAI tool calling over the planner |
| `app/pace/` | DS1 | Trails and pace model |
| `app/conditions/` | DS2 | Forecast, light and snow conditions used by `ModelPlanner` |

## Planner modes

- `model` (default): `ModelPlanner` plans on the data scientists' real District of North Vancouver trail profiles
  with a live Open-Meteo forecast (freezing level, snowfall, temperature, sunset). Last light is civil dusk minus
  20 minutes of forest margin. Forecasts are cached for 30 minutes and saved to `data/cache/forecast-<trail>-<date>.json`.
- Offline behaviour: if Open-Meteo cannot be reached, the saved forecast copy is used (reason `forecast_cached`);
  with no copy, typical fixed values for this time of year are used (reason `forecast_unavailable`, verdict at least caution).
- `mock`: fixed sunset 5:22 pm, last light 5:30 pm and snow above 800 m; never touches the network.

## Trail data

Lynn Peak and Grouse Grind are real routes from the District of North Vancouver "Trails for Public Use" dataset
(Open Government Licence - North Vancouver) with smoothed elevations, prepared by the data scientists in
`route_data/`. Regenerate them with `uv run python scripts/import_dnv_trails.py`. Quarry Rock and St. Mark's
Summit remain synthetic samples.

## Sample trails

`data/trails/*.json` holds three synthetic sample trails (`is_sample: true`). Regenerate them with
(needs network for elevations):

```bash
uv run python scripts/build_sample_trails.py
```
