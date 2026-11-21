"""Service health."""

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter

from app import __version__
from app.api.dependencies import PlannerDep, SettingsDep
from app.contracts import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Report service status and today's local date")
def get_health(settings: SettingsDep, planner: PlannerDep) -> HealthResponse:
    """Return the service status along with the current date in the configured time zone."""
    return HealthResponse(
        status="ok",
        version=__version__,
        planner=planner.source,
        timezone=settings.timezone,
        copilot_enabled=settings.openai_api_key is not None,
        today=datetime.now(ZoneInfo(settings.timezone)).date(),
    )
