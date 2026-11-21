"""Open-Meteo forecast retrieval for the points of a trail.

Adapted from ``weather_extract/weather_data.py`` (Min): same variables and batching of at most 100
coordinates per request, using ``httpx`` and local (Vancouver) timestamps.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from math import isfinite
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from app.contracts import TrailPoint

MAX_COORDINATES_PER_REQUEST = 100
REQUEST_TIMEOUT_S = 10.0
HOURLY_VARIABLES = "temperature_2m,freezing_level_height"


class ForecastError(RuntimeError):
    """The forecast could not be retrieved or read."""


@dataclass(frozen=True)
class PointForecast:
    """Hourly forecast at one location, keyed by the local hour (naive datetime)."""

    temperature_c: dict[datetime, float | None]
    freezing_level_m: dict[datetime, float | None]


@dataclass(frozen=True)
class RouteForecast:
    """The forecast along a trail: one ``PointForecast`` per sampled point and the sunset at the trailhead."""

    sampled: tuple[PointForecast, ...]
    sample_for_point: tuple[int, ...]
    sunset: datetime | None

    def at_point(self, index: int) -> PointForecast:
        """The forecast of the sampled location nearest to trail point ``index``."""
        return self.sampled[self.sample_for_point[index]]


def sample_indices(count: int, limit: int = MAX_COORDINATES_PER_REQUEST) -> tuple[list[int], list[int]]:
    """Pick at most ``limit`` evenly spaced point indices and map every point to its nearest pick."""
    if count <= limit:
        return list(range(count)), list(range(count))
    picks = sorted({round(i * (count - 1) / (limit - 1)) for i in range(limit)})
    mapping = [min(range(len(picks)), key=lambda p: abs(picks[p] - index)) for index in range(count)]
    return picks, mapping


class OpenMeteoClient:
    """Fetches the raw Open-Meteo forecast for a trail and day."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url

    def fetch(self, points: list[TrailPoint], day: date, zone: ZoneInfo) -> dict[str, Any]:
        """Fetch the forecast for ``day`` and the next day. Returns a JSON-serialisable raw record.

        Raises ``ForecastError`` on network failure or an unusable response.
        """
        picks, mapping = sample_indices(len(points))
        sampled = [points[index] for index in picks]
        responses: list[dict[str, Any]] = []
        try:
            for start in range(0, len(sampled), MAX_COORDINATES_PER_REQUEST):
                batch = sampled[start : start + MAX_COORDINATES_PER_REQUEST]
                responses.extend(self._fetch_batch(batch, day, zone))
        except httpx.HTTPError as error:
            raise ForecastError(f"Open-Meteo request failed ({type(error).__name__}).") from error
        except ValueError as error:
            raise ForecastError("Open-Meteo returned an unreadable response.") from error
        raw = {"day": day.isoformat(), "timezone": zone.key, "sample_for_point": mapping, "responses": responses}
        parse_forecast(raw)
        return raw

    def _fetch_batch(self, batch: list[TrailPoint], day: date, zone: ZoneInfo) -> list[dict[str, Any]]:
        response = httpx.get(
            self._base_url,
            params={
                "latitude": ",".join(str(point.lat) for point in batch),
                "longitude": ",".join(str(point.lon) for point in batch),
                "hourly": HOURLY_VARIABLES,
                "daily": "sunset",
                "timezone": zone.key,
                "start_date": day.isoformat(),
                "end_date": (day + timedelta(days=1)).isoformat(),
            },
            timeout=REQUEST_TIMEOUT_S,
        )
        response.raise_for_status()
        data = response.json()
        locations = data if isinstance(data, list) else [data]
        if len(locations) != len(batch):
            raise ValueError("Missing forecast locations")
        return locations


def parse_forecast(raw: dict[str, Any]) -> RouteForecast:
    """Turn a raw record from ``OpenMeteoClient.fetch`` into a ``RouteForecast``.

    Raises ``ForecastError`` if the record is incomplete or malformed.
    """
    try:
        zone = ZoneInfo(raw["timezone"])
        day = date.fromisoformat(raw["day"])
        sampled = tuple(_parse_point(location) for location in raw["responses"])
        sunset = _parse_sunset(raw["responses"][0], day, zone)
        mapping = tuple(int(i) for i in raw["sample_for_point"])
        if not sampled or any(not 0 <= i < len(sampled) for i in mapping):
            raise ValueError("Inconsistent sampling")
    except (KeyError, TypeError, ValueError, IndexError) as error:
        raise ForecastError("The forecast is incomplete or invalid.") from error
    return RouteForecast(sampled, mapping, sunset)


def _parse_point(location: dict[str, Any]) -> PointForecast:
    hourly = location["hourly"]
    times = [datetime.fromisoformat(value) for value in hourly["time"]]
    if not times:
        raise ValueError("No hourly times")

    def series(name: str) -> dict[datetime, float | None]:
        values = hourly[name]
        if len(values) != len(times):
            raise ValueError(f"Mismatched {name} length")
        return dict(zip(times, (_number(value) for value in values), strict=True))

    return PointForecast(series("temperature_2m"), series("freezing_level_height"))


def _parse_sunset(location: dict[str, Any], day: date, zone: ZoneInfo) -> datetime | None:
    daily = location["daily"]
    for label, sunset in zip(daily["time"], daily["sunset"], strict=True):
        if date.fromisoformat(label) == day and sunset:
            return datetime.fromisoformat(sunset).replace(tzinfo=zone)
    return None


def _number(value: float | None) -> float | None:
    if value is None:
        return None
    if type(value) not in (int, float) or not isfinite(value):
        raise ValueError("Invalid forecast value")
    return float(value)
