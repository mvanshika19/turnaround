"""Forecast conditions with an in-memory cache, a disk copy and an offline fallback."""

import json
import logging
import threading
import time
from datetime import date, datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from app.conditions.forecast import ForecastError, OpenMeteoClient, RouteForecast, parse_forecast
from app.conditions.snow import ForecastConditions
from app.contracts import Reason, Trail, VerdictLevel
from app.planning.engine import Conditions
from app.planning.mock_planner import FixedConditions
from app.planning.timefmt import format_clock

logger = logging.getLogger(__name__)

CACHE_TTL_S = 30 * 60
RETRY_BACKOFF_S = 60


class ForecastService:
    """Builds ``Conditions`` for a trail and day.

    A forecast is fetched at most once per ``CACHE_TTL_S`` per trail and day and also saved under
    ``cache_dir``. If the network fails, the saved copy is used (any age); with no copy either, the
    fixed typical values are used. Either way the plan carries a reason saying so.
    """

    def __init__(self, client: OpenMeteoClient, cache_dir: Path, zone: ZoneInfo) -> None:
        self._client = client
        self._cache_dir = cache_dir
        self._zone = zone
        self._lock = threading.Lock()
        self._memory: dict[tuple[str, date], tuple[float, RouteForecast]] = {}
        self._failed_at: dict[tuple[str, date], float] = {}

    def conditions_for(self, trail: Trail, day: date) -> Conditions:
        """Return the conditions for ``trail`` on ``day``, falling back when no forecast can be had."""
        with self._lock:
            forecast = self._live_forecast(trail, day)
            if forecast is not None:
                return ForecastConditions(trail, forecast, day, self._zone)
            saved = self._saved_forecast(trail, day)
            if saved is not None:
                forecast, saved_at = saved
                reason = Reason(
                    code="forecast_cached",
                    level=VerdictLevel.GO,
                    message=f"Using a forecast saved at {format_clock(saved_at.time())}.",
                )
                return ForecastConditions(trail, forecast, day, self._zone, [reason])
        reason = Reason(
            code="forecast_unavailable",
            level=VerdictLevel.CAUTION,
            message="Live forecast unavailable, so this plan uses typical light and snow values for this time of year.",
        )
        return FixedConditions(day, self._zone, trail.points[0].ele_m, [reason])

    def _live_forecast(self, trail: Trail, day: date) -> RouteForecast | None:
        key = (trail.id, day)
        cached = self._memory.get(key)
        if cached is not None and time.monotonic() - cached[0] < CACHE_TTL_S:
            return cached[1]
        failed_at = self._failed_at.get(key)
        if failed_at is not None and time.monotonic() - failed_at < RETRY_BACKOFF_S:
            return None
        try:
            raw = self._client.fetch(trail.points, day, self._zone)
            forecast = parse_forecast(raw)
        except ForecastError as error:
            logger.warning("Forecast fetch failed for %s on %s: %s", trail.id, day, error)
            self._failed_at[key] = time.monotonic()
            return None
        self._failed_at.pop(key, None)
        self._memory[key] = (time.monotonic(), forecast)
        self._write_disk_copy(trail, day, raw)
        return forecast

    def _cache_path(self, trail: Trail, day: date) -> Path:
        return self._cache_dir / f"forecast-{trail.id}-{day.isoformat()}.json"

    def _write_disk_copy(self, trail: Trail, day: date, raw: dict[str, Any]) -> None:
        record = {"fetched_at": datetime.now(self._zone).isoformat(), "raw": raw}
        try:
            self._cache_dir.mkdir(parents=True, exist_ok=True)
            self._cache_path(trail, day).write_text(json.dumps(record), encoding="utf-8")
        except OSError as error:
            logger.warning("Could not save the forecast copy: %s", error)

    def _saved_forecast(self, trail: Trail, day: date) -> tuple[RouteForecast, datetime] | None:
        path = self._cache_path(trail, day)
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
            saved_at = datetime.fromisoformat(record["fetched_at"]).astimezone(self._zone)
            return parse_forecast(record["raw"]), saved_at
        except FileNotFoundError:
            return None
        except (OSError, ValueError, KeyError, TypeError, ForecastError) as error:
            logger.warning("Ignoring unreadable forecast copy %s: %s", path, error)
            return None
