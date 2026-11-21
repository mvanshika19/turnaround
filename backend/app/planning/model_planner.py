"""Planner driven by real trail profiles and a live Open-Meteo forecast.

Uses the data scientists' trail profiles (imported into ``data/trails``) and their freezing-level
method for snow, through the shared ``PlanningEngine``. Works offline too: see ``ForecastService``.
"""

from datetime import date
from zoneinfo import ZoneInfo

from app.conditions.service import ForecastService
from app.contracts import DataSource, Fitness, Gear, PlanRequest, PlanResponse, SweepResponse, Trail
from app.planning.engine import PlanningEngine


class ModelPlanner:
    """Plans hikes under the forecast conditions for the hike's day."""

    source = DataSource.MODEL

    def __init__(self, zone: ZoneInfo, forecast_service: ForecastService) -> None:
        self._engine = PlanningEngine(zone, self.source)
        self._forecasts = forecast_service

    def plan(self, request: PlanRequest, trail: Trail) -> PlanResponse:
        """Plan one hike on that day's forecast."""
        return self._engine.plan(request, trail, self._forecasts.conditions_for(trail, request.date))

    def sweep(self, trail: Trail, day: date, fitness: Fitness, gear: Gear, profile_id: str | None) -> SweepResponse:
        """Return verdicts for every start time from one forecast. ``profile_id`` is not used yet."""
        return self._engine.sweep(trail, day, fitness, gear, self._forecasts.conditions_for(trail, day))
