"""Hike planners. ``get_planner`` builds the one selected in the settings."""

from zoneinfo import ZoneInfo

from app.conditions.forecast import OpenMeteoClient
from app.conditions.service import ForecastService
from app.config import Settings
from app.contracts import DataSource
from app.planning.base import Planner
from app.planning.mock_planner import MockPlanner
from app.planning.model_planner import ModelPlanner

__all__ = ["Planner", "get_planner"]


def get_planner(settings: Settings) -> Planner:
    """Build the planner selected by ``settings.planner``."""
    zone = ZoneInfo(settings.timezone)
    if settings.planner is DataSource.MOCK:
        return MockPlanner(zone)
    service = ForecastService(OpenMeteoClient(settings.open_meteo_url), settings.data_dir / "cache", zone)
    return ModelPlanner(zone, service)
