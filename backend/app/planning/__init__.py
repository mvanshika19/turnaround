"""Hike planners. ``get_planner`` builds the one selected in the settings."""

from zoneinfo import ZoneInfo

from app.contracts import DataSource
from app.errors import PlannerNotImplementedError
from app.planning.base import Planner
from app.planning.mock_planner import MockPlanner

__all__ = ["Planner", "get_planner"]


def get_planner(source: DataSource, timezone: str) -> Planner:
    """Build the planner for ``source`` in ``timezone``, or raise ``PlannerNotImplementedError`` if unavailable."""
    if source is DataSource.MOCK:
        return MockPlanner(ZoneInfo(timezone))
    raise PlannerNotImplementedError("The model planner is not implemented yet; set TURNAROUND_PLANNER=mock")
