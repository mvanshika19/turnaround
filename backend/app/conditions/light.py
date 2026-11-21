"""Sunset and last usable light at a trailhead."""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from astral import LocationInfo
from astral.sun import dusk, sunset

FOREST_CANOPY_MARGIN = timedelta(minutes=20)
"""Subtracted from civil dusk because dense forest gets dark earlier than open sky."""


def compute_light(
    lat: float, lon: float, day: date, zone: ZoneInfo, forecast_sunset: datetime | None
) -> tuple[datetime, datetime]:
    """Return ``(sunset, last_light)`` on ``day`` at a location.

    ``last_light`` is civil dusk minus ``FOREST_CANOPY_MARGIN``. The sunset comes from the forecast when
    available, otherwise from astronomical calculation.
    """
    observer = LocationInfo(latitude=lat, longitude=lon, timezone=zone.key).observer
    last_light = _to_minute(dusk(observer, day, tzinfo=zone) - FOREST_CANOPY_MARGIN)
    return _to_minute(forecast_sunset or sunset(observer, day, tzinfo=zone)), last_light


def _to_minute(moment: datetime) -> datetime:
    """Round to the nearest minute, so compared and displayed times agree."""
    return (moment + timedelta(seconds=30)).replace(second=0, microsecond=0)
