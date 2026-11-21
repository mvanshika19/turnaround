"""Open-Meteo forecast retrieval for trail locations."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime
from math import isfinite

import requests


class ForecastError(RuntimeError):
    """The forecast could not be retrieved or read."""


@dataclass(frozen=True)
class ForecastHour:
    local_time: datetime
    freezing_level_m: float | None
    snowfall_cm: float | None


@dataclass(frozen=True)
class Forecast:
    timezone: str
    hours: tuple[ForecastHour, ...]
    sunsets: dict[date, datetime | None]


def fetch_forecast(latitude: float, longitude: float) -> Forecast:
    """Fetch today's local forecast. Snowfall is for the preceding hour."""
    return _fetch_forecasts([(latitude, longitude)], "auto", {"forecast_days": 1})[0]


def fetch_route_forecasts(
    coordinates: Sequence[tuple[float, float]], start_date: date, end_date: date
) -> tuple[Forecast, ...]:
    """Fetch hourly forecasts in route order, with UTC timestamps."""
    time_params = {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()}
    batch_size = 100
    return tuple(
        forecast
        for start in range(0, len(coordinates), batch_size)
        for forecast in _fetch_forecasts(coordinates[start:start + batch_size], "GMT", time_params)
    )


def _fetch_forecasts(
    coordinates: Sequence[tuple[float, float]], timezone: str, time_params: dict[str, str | int]
) -> tuple[Forecast, ...]:
    if not coordinates:
        return ()
    latitudes, longitudes = zip(*coordinates)
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": ",".join(map(str, latitudes)),
                "longitude": ",".join(map(str, longitudes)),
                "hourly": "freezing_level_height,snowfall",
                "daily": "sunset",
                "timezone": timezone,
                **time_params,
            },
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise ForecastError(f"Open-Meteo request failed ({exc}).") from exc

    try:
        data = response.json()
        locations = data if isinstance(data, list) else [data]
        if len(locations) != len(coordinates):
            raise ValueError("Missing forecast locations")
        return tuple(_parse_forecast(location) for location in locations)
    except (KeyError, TypeError, ValueError) as exc:
        raise ForecastError("Open-Meteo returned an incomplete or invalid forecast.") from exc


def _parse_forecast(data: dict) -> Forecast:
    hourly = data["hourly"]
    daily = data["daily"]
    hours = tuple(
        ForecastHour(datetime.fromisoformat(time), _number(level), _number(snow))
        for time, level, snow in zip(
            hourly["time"], hourly["freezing_level_height"], hourly["snowfall"],
            strict=True,
        )
    )
    sunsets = {
        date.fromisoformat(day): datetime.fromisoformat(sunset) if sunset else None
        for day, sunset in zip(daily["time"], daily["sunset"], strict=True)
    }
    if not hours or not isinstance(data["timezone"], str) or not data["timezone"]:
        raise ValueError("Missing forecast times or timezone")
    return Forecast(data["timezone"], hours, sunsets)


def _number(value: float | None) -> float | None:
    if value is None:
        return None
    if type(value) not in (int, float) or not isfinite(value):
        raise ValueError("Invalid forecast value")
    return float(value)
