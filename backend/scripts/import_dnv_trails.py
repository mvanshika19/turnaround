"""Import the data scientists' real District of North Vancouver trail profiles into ``data/trails/``.

Source: ``route_data/routes.json`` and the profile files it points to (repo root). Geometry comes from the
District of North Vancouver "Trails for Public Use" dataset, published under the Open Government Licence -
North Vancouver (https://geoweb.dnv.org/data/index.php); elevations are OpenTopoData (mapzen) samples that the
data scientists smoothed.

Run from ``backend/``::

    uv run python scripts/import_dnv_trails.py
"""

import json
import logging
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.contracts import Difficulty, Trail

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ROUTES_PATH = REPO_ROOT / "route_data" / "routes.json"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "trails"


@dataclass(frozen=True)
class RealTrail:
    """Display metadata for one curated route."""

    id: str
    name: str
    area: str
    difficulty: Difficulty


TRAILS = [
    RealTrail("lynn-peak", "Lynn Peak", "Lynn Headwaters, North Vancouver", Difficulty.MODERATE),
    RealTrail("grouse-grind", "Grouse Grind", "Grouse Mountain, North Vancouver", Difficulty.HARD),
]


def load_profile(route_id: str) -> dict[str, Any]:
    """Read the profile JSON that ``routes.json`` lists for ``route_id``."""
    routes = json.loads(ROUTES_PATH.read_text(encoding="utf-8"))
    profile_path = ROUTES_PATH.parent / routes[route_id]["profile"]
    return json.loads(profile_path.read_text(encoding="utf-8"))


def build_trail(meta: RealTrail) -> Trail:
    """Convert one profile into a validated ``Trail`` that climbs from trailhead to summit."""
    profile = load_profile(meta.id)
    points = profile["points"]
    total_m = float(profile["distance_m"])
    if points[-1]["smoothed_elevation_m"] < points[0]["smoothed_elevation_m"]:
        points = [{**point, "distance_m": total_m - point["distance_m"]} for point in reversed(points)]
    elevations = [point["smoothed_elevation_m"] for point in points]
    return Trail.model_validate(
        {
            "id": meta.id,
            "name": meta.name,
            "area": meta.area,
            "difficulty": meta.difficulty,
            "distance_km": round(2 * total_m / 1000, 1),
            "gain_m": round(profile["smoothed_ascent_m"]),
            "max_elevation_m": int(max(elevations)),
            "trailhead": {"lat": round(points[0]["latitude"], 6), "lon": round(points[0]["longitude"], 6)},
            "summit": {"lat": round(points[-1]["latitude"], 6), "lon": round(points[-1]["longitude"], 6)},
            "is_sample": False,
            "points": [
                {
                    "km": round(point["distance_m"] / 1000, 3),
                    "lat": round(point["latitude"], 6),
                    "lon": round(point["longitude"], 6),
                    "ele_m": round(point["smoothed_elevation_m"], 1),
                }
                for point in points
            ],
        }
    )


def main() -> None:
    """Write ``data/trails/<id>.json`` for every curated route."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    for meta in TRAILS:
        trail = build_trail(meta)
        target = OUTPUT_DIR / f"{trail.id}.json"
        target.write_text(json.dumps(trail.model_dump(mode="json"), indent=2) + "\n", encoding="utf-8")
        logger.info(
            "%s: %s km round trip, %d m gain, max %d m, %d points",
            target.name,
            trail.distance_km,
            trail.gain_m,
            trail.max_elevation_m,
            len(trail.points),
        )


if __name__ == "__main__":
    main()
