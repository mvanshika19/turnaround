# Turnaround backend

A FastAPI service that plans North Shore hikes and finds the latest time to turn around so you are off the
trail before dark and below the snow. Until the data science models land it runs on a clearly labelled
mock planner (fixed sunset and snow line), so the frontend and the models can be built in parallel.

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
| `TURNAROUND_PLANNER` | `mock` | `mock` or `model` (`model` is not implemented yet and fails at startup) |
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
| `app/planning/` | SWE | `Planner` protocol and the mock planner |
| `app/copilot/` | SWE | AI co-pilot: OpenAI tool calling over the planner |
| `app/pace/` | DS1 | Trails and pace model |
| `app/conditions/` | DS2 | Weather, light and verdict model, and the future `ModelPlanner` |

## Sample trails

`data/trails/*.json` holds three synthetic sample trails (`is_sample: true`). Regenerate them with
(needs network for elevations):

```bash
uv run python scripts/build_sample_trails.py
```
