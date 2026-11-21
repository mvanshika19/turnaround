"""Terrain-based pace estimates for the Turnaround planner."""

import itertools
import math
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.contracts import Fitness, Trail, TrailPoint

FITNESS_SPEED_MULTIPLIERS: dict[Fitness, float] = {
    Fitness.RELAXED: 0.8,
    Fitness.AVERAGE: 1.0,
    Fitness.FAST: 1.2,
}
"""Speed factors applied to Tobler's baseline for the selected fitness preset."""

TOP_BREAK = timedelta(minutes=10)
SLOW_DAY_DURATION_MULTIPLIER = 1.15


@dataclass(frozen=True)
class PointETA:
    """Predicted arrival times at one outbound trail point."""

    eta_up: datetime
    eta_down: datetime
    eta_down_p90: datetime


def predict_pace(
    trail: Trail,
    start: datetime,
    fitness: Fitness = Fitness.AVERAGE,
    multipliers: Sequence[float] | None = None,
) -> list[PointETA]:
    """Predict P50 outbound/return and P90 return arrival times for each trail point.

    ``multipliers`` optionally supplies one positive speed factor per outbound segment. Each factor
    also applies to the corresponding segment on the return walk, in reverse order. The P90 estimate
    stretches elapsed P50 time by 15%, matching the mock planner's slow-day assumption. ``start``
    must be timezone-aware; its timezone is retained in all returned datetimes.

    Fitness presets scale Tobler speed (relaxed 0.8x, average 1.0x, fast 1.2x). This planning app
    uses the hiker's selected preset; GPX-based personal fitting is not part of this model.
    """
    if start.tzinfo is None or start.utcoffset() is None:
        raise ValueError("start must be a timezone-aware datetime")

    points = trail.points
    if len(points) < 2:
        raise ValueError("trail must have at least two points")

    if multipliers is None:
        segment_multipliers = [1.0] * (len(points) - 1)
    else:
        segment_multipliers = list(multipliers)
        if len(segment_multipliers) != len(points) - 1:
            raise ValueError("multipliers must contain one value per trail segment")
        if any(not math.isfinite(value) or value <= 0 for value in segment_multipliers):
            raise ValueError("segment speed multipliers must be finite positive numbers")

    speed_factor = FITNESS_SPEED_MULTIPLIERS[fitness]
    eta_up = _walk(points, start, speed_factor, segment_multipliers)
    top_departure = eta_up[-1] + TOP_BREAK
    eta_down_reversed = _walk(list(reversed(points)), top_departure, speed_factor, list(reversed(segment_multipliers)))
    eta_down = list(reversed(eta_down_reversed))
    eta_down_p90 = [_slow_day(start, moment) for moment in eta_down]

    return [
        PointETA(
            eta_up=_to_minute(up),
            eta_down=_to_minute(down),
            eta_down_p90=_to_minute(down_p90),
        )
        for up, down, down_p90 in zip(eta_up, eta_down, eta_down_p90, strict=True)
    ]


def _walk(
    points: Sequence[TrailPoint],
    departure: datetime,
    fitness_speed_factor: float,
    segment_speed_factors: Sequence[float],
) -> list[datetime]:
    """Return arrival times in route order, including the departure at the first point."""
    arrivals = [departure]
    for index, (origin, target) in enumerate(itertools.pairwise(points)):
        distance_km = abs(target.km - origin.km)
        if distance_km == 0:
            arrivals.append(arrivals[-1])
            continue
        slope = (target.ele_m - origin.ele_m) / (distance_km * 1000)
        speed_kmh = _tobler_speed_kmh(slope) * fitness_speed_factor * segment_speed_factors[index]
        arrivals.append(arrivals[-1] + timedelta(hours=distance_km / speed_kmh))
    return arrivals


def _tobler_speed_kmh(slope: float) -> float:
    """Return Tobler's hiking speed in km/h for rise-over-run slope."""
    return 6 * math.exp(-3.5 * abs(slope + 0.05))


def _slow_day(start: datetime, moment: datetime) -> datetime:
    """Stretch the elapsed time from the hike start to the P90 slow-day estimate."""
    return start + (moment - start) * SLOW_DAY_DURATION_MULTIPLIER


def _to_minute(moment: datetime) -> datetime:
    """Round a predicted time to the nearest minute for the API's wall-clock output."""
    return (moment + timedelta(seconds=30)).replace(second=0, microsecond=0)
