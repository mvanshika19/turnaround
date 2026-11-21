"""Read-only trail catalogue backed by JSON files."""

import logging
from pathlib import Path

from pydantic import ValidationError

from app.contracts import Trail, TrailSummary
from app.errors import TrailNotFoundError
from app.planning.identity import summarize_trail

logger = logging.getLogger(__name__)


class TrailRepository:
    """Loads and validates every ``*.json`` trail in a directory once, at construction.

    Raises ``ValueError`` naming the problem if the directory is missing or has no trail files, a file is
    unreadable or invalid, a file name differs from its trail id, or two files share an id.
    """

    def __init__(self, trails_dir: Path) -> None:
        if not trails_dir.is_dir():
            raise ValueError(f"Trails directory {trails_dir} does not exist; check TURNAROUND_DATA_DIR")
        paths = sorted(trails_dir.glob("*.json"))
        if not paths:
            raise ValueError(f"Trails directory {trails_dir} contains no *.json trail files")
        self._trails: dict[str, Trail] = {}
        for path in paths:
            try:
                trail = Trail.model_validate_json(path.read_text(encoding="utf-8"))
            except (ValidationError, OSError, UnicodeDecodeError) as error:
                raise ValueError(f"Invalid trail file {path}: {error}") from error
            if path.stem != trail.id:
                raise ValueError(f"Trail file {path} must be named {trail.id}.json to match its id")
            if trail.id in self._trails:
                raise ValueError(f"Duplicate trail id '{trail.id}' in {path}")
            self._trails[trail.id] = trail
        logger.info("Loaded %d trails from %s", len(self._trails), trails_dir)

    def list_summaries(self) -> list[TrailSummary]:
        """Return all trail summaries, shortest round trip first."""
        summaries = (summarize_trail(trail) for trail in self._trails.values())
        return sorted(summaries, key=lambda summary: summary.distance_km)

    def get(self, trail_id: str) -> Trail:
        """Return the full trail, or raise ``TrailNotFoundError``."""
        try:
            return self._trails[trail_id]
        except KeyError:
            raise TrailNotFoundError(trail_id) from None
