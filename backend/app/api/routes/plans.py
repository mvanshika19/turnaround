"""Creating and retrieving hike plans."""

from fastapi import APIRouter

from app.api.dependencies import PlannerDep, PlanStoreDep, TrailRepositoryDep
from app.contracts import PlanRequest, PlanResponse

router = APIRouter(prefix="/plans", tags=["plans"])


@router.post("", response_model=PlanResponse, status_code=200, summary="Plan a hike and store the result")
def create_plan(
    request: PlanRequest, trails: TrailRepositoryDep, planner: PlannerDep, store: PlanStoreDep
) -> PlanResponse:
    """Plan the hike, keep the plan for later retrieval and return it. Identical requests share one id."""
    trail = trails.get(request.trail_id)
    plan = planner.plan(request, trail)
    store.save(plan)
    return plan


@router.get("/{plan_id}", response_model=PlanResponse, summary="Get a stored plan")
def get_plan(plan_id: str, store: PlanStoreDep) -> PlanResponse:
    """Return a previously created plan, or 404 if it is unknown or has been evicted."""
    return store.get(plan_id)
