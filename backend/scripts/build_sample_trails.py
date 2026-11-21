"""Generate placeholder North Shore trail files in ``data/trails/``.

The routes are smooth synthetic paths between real trailhead and summit coordinates, with real
elevations from Open-Meteo. They are marked ``is_sample`` and meant to be replaced by surveyed GPX routes.

Run from ``backend/``::

    uv run python scripts/build_sample_trails.py
"""

import itertools
import json
import logging
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.contracts import Difficulty, Trail

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "trails"
ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"
POINT_COUNT = 40
EARTH_RADIUS_KM = 6371.0088
LENGTH_TOLERANCE = 0.01
WIGGLE_CYCLES = 3
SIDEWAYS_CONTROL_FRACTION = 0.15

LatLon = tuple[float, float]

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SampleTrail:
    """Inputs for one generated trail."""

    id: str
    name: str
    area: str
    difficulty: Difficulty
    target_length_km: float
    trailhead: LatLon
    summit: LatLon


# Coordinates come from the Nominatim search API (https://nominatim.openstreetmap.org), queried once:
#   Deep Cove Park, North Vancouver                     -> 49.3252073, -122.9465805
#   Quarry Rock, North Vancouver                        -> 49.3367279, -122.9402725
#   Lynn Headwaters Regional Park (maps and information) -> 49.3616449, -123.0281383
#   Lynn Peak, North Vancouver                          -> 49.3953189, -123.0148031
#   Cypress Mountain, West Vancouver                    -> 49.3976802, -123.2011443
#   Saint Mark's Summit                                 -> 49.4281079, -123.2058112
TRAILS = [
    SampleTrail(
        "quarry-rock",
        "Quarry Rock",
        "Deep Cove, North Vancouver",
        Difficulty.EASY,
        1.9,
        (49.3252073, -122.9465805),
        (49.3367279, -122.9402725),
    ),
    SampleTrail(
        "lynn-peak",
        "Lynn Peak",
        "Lynn Headwaters, North Vancouver",
        Difficulty.MODERATE,
        4.5,
        (49.3616449, -123.0281383),
        (49.3953189, -123.0148031),
    ),
    SampleTrail(
        "st-marks-summit",
        "St. Mark's Summit",
        "Cypress Provincial Park, West Vancouver",
        Difficulty.HARD,
        5.5,
        (49.3976802, -123.2011443),
        (49.4281079, -123.2058112),
    ),
]


def haversine_km(a: LatLon, b: LatLon) -> float:
    """Great-circle distance between two (lat, lon) points in kilometres."""
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def build_path(trailhead: LatLon, summit: LatLon, wiggle_km: float) -> list[LatLon]:
    """Sample a quadratic Bezier with a sideways control point, plus a sinusoidal wiggle of ``wiggle_km``."""
    lat0 = math.radians(trailhead[0])
    km_per_deg_lat = math.pi * EARTH_RADIUS_KM / 180
    km_per_deg_lon = km_per_deg_lat * math.cos(lat0)

    def to_xy(point: LatLon) -> tuple[float, float]:
        return (point[1] - trailhead[1]) * km_per_deg_lon, (point[0] - trailhead[0]) * km_per_deg_lat

    end_x, end_y = to_xy(summit)
    chord = math.hypot(end_x, end_y)
    normal = (-end_y / chord, end_x / chord)
    control = (
        end_x / 2 + normal[0] * chord * SIDEWAYS_CONTROL_FRACTION,
        end_y / 2 + normal[1] * chord * SIDEWAYS_CONTROL_FRACTION,
    )

    path: list[LatLon] = []
    for i in range(POINT_COUNT):
        t = i / (POINT_COUNT - 1)
        x = 2 * (1 - t) * t * control[0] + t**2 * end_x
        y = 2 * (1 - t) * t * control[1] + t**2 * end_y
        tangent_x = 2 * (1 - t) * control[0] + 2 * t * (end_x - control[0])
        tangent_y = 2 * (1 - t) * control[1] + 2 * t * (end_y - control[1])
        norm = math.hypot(tangent_x, tangent_y)
        offset = wiggle_km * math.sin(2 * math.pi * WIGGLE_CYCLES * t)
        x += -tangent_y / norm * offset
        y += tangent_x / norm * offset
        path.append((trailhead[0] + y / km_per_deg_lat, trailhead[1] + x / km_per_deg_lon))
    return path


def path_length_km(path: list[LatLon]) -> float:
    """Total length of a path in kilometres."""
    return sum(haversine_km(a, b) for a, b in itertools.pairwise(path))


def fit_path(sample: SampleTrail) -> list[LatLon]:
    """Choose the wiggle amplitude by bisection so the path length is close to the target."""
    low, high = 0.0, 2.0
    path = build_path(sample.trailhead, sample.summit, 0.0)
    for _ in range(60):
        wiggle = (low + high) / 2
        path = build_path(sample.trailhead, sample.summit, wiggle)
        length = path_length_km(path)
        if abs(length - sample.target_length_km) / sample.target_length_km < LENGTH_TOLERANCE / 10:
            break
        if length < sample.target_length_km:
            low = wiggle
        else:
            high = wiggle
    length = path_length_km(path)
    if abs(length - sample.target_length_km) / sample.target_length_km > LENGTH_TOLERANCE:
        raise RuntimeError(f"{sample.id}: could not fit a path near {sample.target_length_km} km (got {length:.2f})")
    return path


def fetch_elevations(path: list[LatLon]) -> list[float]:
    """Fetch elevations (metres) for every point from the Open-Meteo Elevation API."""
    params = {
        "latitude": ",".join(f"{lat:.6f}" for lat, _ in path),
        "longitude": ",".join(f"{lon:.6f}" for _, lon in path),
    }
    response = httpx.get(ELEVATION_URL, params=params, timeout=30)
    response.raise_for_status()
    return [float(value) for value in response.json()["elevation"]]


def smooth(values: list[float]) -> list[float]:
    """3-point moving average that keeps the first and last values."""
    inner = [sum(values[i - 1 : i + 2]) / 3 for i in range(1, len(values) - 1)]
    return [values[0], *inner, values[-1]]


def build_trail(sample: SampleTrail) -> Trail:
    """Build and validate one trail."""
    path = fit_path(sample)
    elevations = smooth(fetch_elevations(path))
    kms = [0.0]
    for a, b in itertools.pairwise(path):
        kms.append(kms[-1] + haversine_km(a, b))
    gain = sum(max(0.0, b - a) for a, b in itertools.pairwise(elevations))
    return Trail.model_validate(
        {
            "id": sample.id,
            "name": sample.name,
            "area": sample.area,
            "difficulty": sample.difficulty,
            "distance_km": round(2 * kms[-1], 1),
            "gain_m": int(gain),
            "max_elevation_m": int(max(elevations)),
            "trailhead": {"lat": round(path[0][0], 6), "lon": round(path[0][1], 6)},
            "summit": {"lat": round(path[-1][0], 6), "lon": round(path[-1][1], 6)},
            "is_sample": True,
            "points": [
                {"km": round(km, 3), "lat": round(lat, 6), "lon": round(lon, 6), "ele_m": round(ele, 1)}
                for km, (lat, lon), ele in zip(kms, path, elevations, strict=True)
            ],
        }
    )


def main() -> None:
    """Write every sample trail to ``data/trails/<id>.json``."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for sample in TRAILS:
        trail = build_trail(sample)
        target = OUTPUT_DIR / f"{trail.id}.json"
        target.write_text(json.dumps(trail.model_dump(mode="json"), indent=2) + "\n", encoding="utf-8")
        logger.info(
            "%s: %s km round trip, %d m gain, max %d m",
            target.name,
            trail.distance_km,
            trail.gain_m,
            trail.max_elevation_m,
        )


if __name__ == "__main__":
    main()
