"""Forecast-driven snow, temperature and light for one trail on one day."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.conditions.forecast import RouteForecast
from app.conditions.light import compute_light
from app.contracts import Reason, Trail

SNOW_LINE_ROUNDING_M = 10


def _hour(moment: datetime) -> datetime:
    """The naive local hour containing ``moment``, the key of the forecast tables."""
    return moment.replace(minute=0, second=0, microsecond=0, tzinfo=None)


class ForecastConditions:
    """``Conditions`` backed by an Open-Meteo forecast along the trail."""

    def __init__(
        self,
        trail: Trail,
        forecast: RouteForecast,
        day: date,
        zone: ZoneInfo,
        extra_reasons: list[Reason] | None = None,
    ) -> None:
        self._forecast = forecast
        self.sunset, self.last_light = compute_light(
            trail.trailhead.lat, trail.trailhead.lon, day, zone, forecast.sunset
        )
        self.extra_reasons: list[Reason] = extra_reasons or []

    def is_snow(self, index: int, ele_m: float, at: datetime) -> bool:
        """Snow when the point is above the forecast freezing level at that point for that hour."""
        freezing_level = self._forecast.at_point(index).freezing_level_m.get(_hour(at))
        return freezing_level is not None and ele_m > freezing_level

    def temperature_c(self, index: int, ele_m: float, at: datetime) -> float | None:
        """The forecast 2 m temperature at the point for that hour."""
        return self._forecast.at_point(index).temperature_c.get(_hour(at))

    def snow_line_m_between(self, start: datetime, end: datetime) -> int | None:
        """Lowest forecast freezing level on the trail from ``start`` to ``end``, rounded to 10 m (None if unknown)."""
        first, last = _hour(start), _hour(end)
        levels = [
            level
            for forecast in self._forecast.sampled
            for hour, level in forecast.freezing_level_m.items()
            if first <= hour <= last and level is not None
        ]
        if not levels:
            return None
        return round(min(levels) / SNOW_LINE_ROUNDING_M) * SNOW_LINE_ROUNDING_M
