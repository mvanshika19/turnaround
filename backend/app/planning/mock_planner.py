"""Placeholder planner with fixed light and snow values.

This is NOT a forecast. Sunset, last light and the snow line are constants and temperatures follow a
fixed lapse rate. It is the offline-friendly planner (``TURNAROUND_PLANNER=mock``) and the fallback
``ModelPlanner`` uses when no forecast is available. The algorithm itself lives in ``engine.py``.
"""

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from app.contracts import DataSource, Fitness, Gear, PlanRequest, PlanResponse, Reason, SweepResponse, Trail
from app.planning.engine import PlanningEngine

SUNSET: time = time(17, 22)
LAST_LIGHT: time = time(17, 30)
SNOW_LINE_M: int = 800
TRAILHEAD_TEMP_C: float = 6.0
LAPSE_RATE_C_PER_KM: float = -6.5


class FixedConditions:
    """Typical seasonal light and snow: fixed sunset, last light and snow line, with a lapse-rate temperature."""

    def __init__(
        self, day: date, zone: ZoneInfo, trailhead_ele_m: float, extra_reasons: list[Reason] | None = None
    ) -> None:
        self.sunset = datetime.combine(day, SUNSET, tzinfo=zone)
        self.last_light = datetime.combine(day, LAST_LIGHT, tzinfo=zone)
        self.extra_reasons: list[Reason] = extra_reasons or []
        self._trailhead_ele_m = trailhead_ele_m

    def is_snow(self, index: int, ele_m: float, at: datetime) -> bool:
        """Snow lies above the fixed snow line."""
        return ele_m > SNOW_LINE_M

    def snow_line_m_between(self, start: datetime, end: datetime) -> int | None:
        """The fixed snow line."""
        return SNOW_LINE_M

    def temperature_c(self, index: int, ele_m: float, at: datetime) -> float | None:
        """Trailhead temperature minus the lapse rate times the climb."""
        return TRAILHEAD_TEMP_C + LAPSE_RATE_C_PER_KM * (ele_m - self._trailhead_ele_m) / 1000


class MockPlanner:
    """Plans hikes with fixed light and snow values; see the module docstring."""

    source = DataSource.MOCK

    def __init__(self, zone: ZoneInfo) -> None:
        self._zone = zone
        self._engine = PlanningEngine(zone, self.source)

    def plan(self, request: PlanRequest, trail: Trail) -> PlanResponse:
        """Plan one hike on the mock conditions."""
        conditions = FixedConditions(request.date, self._zone, trail.points[0].ele_m)
        return self._engine.plan(request, trail, conditions)

    def sweep(self, trail: Trail, day: date, fitness: Fitness, gear: Gear, profile_id: str | None) -> SweepResponse:
        """Return the verdict for every start time from 07:00 to 15:00. ``profile_id`` is ignored by the mock."""
        conditions = FixedConditions(day, self._zone, trail.points[0].ele_m)
        return self._engine.sweep(trail, day, fitness, gear, conditions)
