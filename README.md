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

## Data science tools: route weather forecast

With Python 3.10 or later, install the dependencies and run the route forecast.

```sh
python -m pip install -r weather_extract/requirements.txt
python -m weather_extract.route_forecast --route lynn-peak --start 09:30
```

`--date YYYY-MM-DD` and `--start HH:MM` specify the departure in the route's
local time. Omit the date to use today. Use `--hour 12` for a noon departure.
The command gets the profile path and time zone from `route_data/routes.json` using
the route ID. Use `--route lynn-peak` (the default), `--route grouse-grind`, or
any DNV route ID listed in that file.
The command adds the
estimated segment walking times and matches each point to its location's
forecast for the hour of arrival.
Open `elevation_profile.html` and hover over a point to see the estimated arrival,
freezing level, and forecast snowfall for the preceding hour. The walking estimate
uses terrain alone, and the forecast does not establish snow cover on the trail.

The route profiles contain information licensed under the Open Government Licence - North Vancouver.

All profiles live in `route_data/processed/dnv/` and use lowercase, underscore-separated
names such as `lynn_peak_profile.json`. Profiles with matching trail names use
the source asset ID to distinguish them. Connected
lines with the same name are joined at matching endpoints and split at junctions.
Disconnected lines get separate profiles; unnamed lines use their source asset IDs.
These generated routes follow the stored line direction. Each profile lists its
source assets and uses [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
for elevation. To rebuild them with the original DNV ZIP and the project dependencies:

```sh
python scripts/build_route_profiles.py path/to/dnv_trails_for_public_use.zip
```


For Streamlit, call `weather_extract.weather_data.fetch_forecast(latitude, longitude)` and
select a forecast hour from `forecast.hours`. Pass the trail's ordered
`(distance_km, elevation_m)` points and the hour's `freezing_level_m` to
`weather_extract.trail_profile.elevation_figure`, then pass the figure to `st.plotly_chart`.
Pass `None` when the freezing level is unavailable to show the profile
without classification. Local sunset is available in `forecast.sunsets` by date.
