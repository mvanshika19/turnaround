"""The planner interface."""

from datetime import date
from typing import Protocol

from app.contracts import DataSource, Fitness, Gear, PlanRequest, PlanResponse, SweepResponse, Trail


class Planner(Protocol):
    """Produces hike plans and start-time sweeps for a trail."""

    source: DataSource

    def plan(self, request: PlanRequest, trail: Trail) -> PlanResponse:
        """Plan one hike."""
        ...

    def sweep(self, trail: Trail, day: date, fitness: Fitness, gear: Gear, profile_id: str | None) -> SweepResponse:
        """Return a verdict for every candidate start time on ``day``."""
        ...
