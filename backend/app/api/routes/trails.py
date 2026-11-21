"""Trail catalogue and start-time sweeps."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import PlannerDep, TrailRepositoryDep
from app.contracts import Fitness, Gear, SweepResponse, Trail, TrailSummary

router = APIRouter(prefix="/trails", tags=["trails"])


@router.get("", response_model=list[TrailSummary], summary="List trails, shortest first")
def list_trails(trails: TrailRepositoryDep) -> list[TrailSummary]:
    """Return every trail as a summary, sorted by round-trip distance."""
    return trails.list_summaries()


@router.get("/{trail_id}", response_model=Trail, summary="Get one trail with its route")
def get_trail(trail_id: str, trails: TrailRepositoryDep) -> Trail:
    """Return the full trail geometry, or 404 if the trail is unknown."""
    return trails.get(trail_id)


@router.get("/{trail_id}/sweep", response_model=SweepResponse, summary="Verdicts for every start time in a day")
def sweep_trail(
    trail_id: str,
    day: Annotated[date, Query(alias="date", description="Hike date, YYYY-MM-DD.")],
    trails: TrailRepositoryDep,
    planner: PlannerDep,
    fitness: Fitness = Fitness.AVERAGE,
    headlamp: bool = True,
    traction: bool = False,
    profile_id: Annotated[str | None, Query(max_length=64)] = None,
) -> SweepResponse:
    """Return the verdict for each candidate start time, for the start-time slider."""
    trail = trails.get(trail_id)
    gear = Gear(headlamp=headlamp, traction=traction)
    return planner.sweep(trail, day, fitness, gear, profile_id)
