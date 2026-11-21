"""Placeholder planner with fixed light and snow values.

This is NOT a real model. Sunset, last light and the snow line are constants, temperatures follow a
fixed lapse rate, and the pace is Tobler's hiking function scaled by simple multipliers. It exists so
the frontend and the data scientists can work against a running API; it is replaced by the data
scientists' pace and conditions models (see ``app/pace`` and ``app/conditions``).
"""

import itertools
import math
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.contracts import (
    DataSource,
    Fitness,
    Gear,
    PlanPoint,
    PlanRequest,
    PlanResponse,
    PlanSummary,
    Reason,
    SegmentStatus,
    SweepItem,
    SweepResponse,
    Trail,
    TrailPoint,
    Verdict,
    VerdictLevel,
)
from app.planning.identity import make_plan_id, summarize_trail
from app.planning.timefmt import ceil_minutes, format_clock, whole_minutes

SUNSET: time = time(17, 22)
LAST_LIGHT: time = time(17, 30)
SNOW_LINE_M: int = 800
SNOW_SPEED_MULTIPLIER: float = 0.7
DARK_SPEED_MULTIPLIER: float = 0.8
SLOW_DAY_DURATION_MULTIPLIER: float = 1.15
TOP_BREAK: timedelta = timedelta(minutes=10)
SAFETY_MARGIN: timedelta = timedelta(minutes=30)
CAUTION_WINDOW: timedelta = timedelta(minutes=30)
FITNESS_SPEED_MULTIPLIERS: dict[Fitness, float] = {Fitness.RELAXED: 0.8, Fitness.AVERAGE: 1.0, Fitness.FAST: 1.2}
SWEEP_FIRST_START: time = time(7, 0)
SWEEP_LAST_START: time = time(15, 0)
SWEEP_INTERVAL_MIN: int = 15
TRAILHEAD_TEMP_C: float = 6.0
LAPSE_RATE_C_PER_KM: float = -6.5

_LEVEL_SEVERITY: dict[VerdictLevel, int] = {VerdictLevel.GO: 0, VerdictLevel.CAUTION: 1, VerdictLevel.NO_GO: 2}


@dataclass(frozen=True)
class _Computation:
    """Everything derived for one trail, day, start time and set of preferences."""

    start: datetime
    last_light: datetime
    eta_up: list[datetime]
    eta_down: list[datetime]
    eta_down_p90: list[datetime]
    top_arrival: datetime
    finish_p50: datetime
    finish_p90: datetime
    turnaround_by: datetime
    verdict: Verdict


def _tobler_speed_kmh(slope: float) -> float:
    """Tobler's hiking function: speed on a given slope (rise over run, negative downhill)."""
    return 6 * math.exp(-3.5 * abs(slope + 0.05))


def _segment_duration(
    origin: TrailPoint, target: TrailPoint, entered_at: datetime, last_light: datetime, speed_multiplier: float
) -> timedelta:
    """Time to walk from ``origin`` to ``target``, entering the segment at ``entered_at``."""
    distance_km = abs(target.km - origin.km)
    if distance_km == 0:
        return timedelta(0)
    slope = (target.ele_m - origin.ele_m) / (distance_km * 1000)
    speed = _tobler_speed_kmh(slope) * speed_multiplier
    if target.ele_m > SNOW_LINE_M:
        speed *= SNOW_SPEED_MULTIPLIER
    if entered_at > last_light:
        speed *= DARK_SPEED_MULTIPLIER
    return timedelta(hours=distance_km / speed)


def _walk(
    points: list[TrailPoint], departure: datetime, last_light: datetime, speed_multiplier: float
) -> list[datetime]:
    """Return the arrival time at each of ``points`` in order, leaving the first at ``departure``."""
    arrivals = [departure]
    for origin, target in itertools.pairwise(points):
        arrivals.append(arrivals[-1] + _segment_duration(origin, target, arrivals[-1], last_light, speed_multiplier))
    return arrivals


def _slow_day(start: datetime, moment: datetime) -> datetime:
    """Stretch the time elapsed since ``start`` to its slow-day (P90) equivalent."""
    return start + (moment - start) * SLOW_DAY_DURATION_MULTIPLIER


def _to_minute(moment: datetime) -> datetime:
    """Round ``moment`` to the nearest minute, so displayed times and durations agree."""
    return (moment + timedelta(seconds=30)).replace(second=0, microsecond=0)


def _build_verdict(trail: Trail, start: datetime, last_light: datetime, finish_p90: datetime, gear: Gear) -> Verdict:
    """Combine the daylight and snow findings into a verdict; the most severe reason sets the level."""
    reasons: list[Reason] = []
    margin_start = last_light - CAUTION_WINDOW
    if finish_p90.date() > start.date():
        reasons.append(
            Reason(
                code="past_midnight",
                level=VerdictLevel.NO_GO,
                message="This hike would run past midnight. Pick a shorter trail or an earlier start.",
            )
        )
    elif finish_p90 > last_light:
        minutes = ceil_minutes(finish_p90 - last_light)
        if gear.headlamp:
            reasons.append(
                Reason(
                    code="headlamp_needed",
                    level=VerdictLevel.CAUTION,
                    message=f"Headlamp needed: a slow-day finish is {minutes} min after last light.",
                )
            )
        else:
            reasons.append(
                Reason(
                    code="after_dark",
                    level=VerdictLevel.NO_GO,
                    message=f"You'd be on the trail {minutes} min after last light.",
                )
            )
    elif finish_p90 > margin_start:
        minutes = ceil_minutes(last_light - finish_p90)
        reasons.append(
            Reason(
                code="tight_daylight",
                level=VerdictLevel.CAUTION,
                message=f"A slow-day finish is only {minutes} min before last light.",
            )
        )
    else:
        reasons.append(
            Reason(
                code="daylight_ok",
                level=VerdictLevel.GO,
                message=f"Back by {format_clock(finish_p90.time())} even on a slow day.",
            )
        )

    if any(point.ele_m > SNOW_LINE_M for point in trail.points):
        if gear.traction:
            reasons.append(
                Reason(
                    code="snow_with_traction",
                    level=VerdictLevel.GO,
                    message=f"Snow likely above {SNOW_LINE_M} m. Your traction is packed.",
                )
            )
        else:
            reasons.append(
                Reason(
                    code="snow_no_traction",
                    level=VerdictLevel.NO_GO,
                    message=f"Snow likely above {SNOW_LINE_M} m and you have no traction.",
                )
            )

    level = max((reason.level for reason in reasons), key=_LEVEL_SEVERITY.__getitem__)
    return Verdict(level=level, reasons=reasons)


class MockPlanner:
    """Plans hikes with fixed light and snow values; see the module docstring."""

    source = DataSource.MOCK

    def __init__(self, zone: ZoneInfo) -> None:
        self._zone = zone

    def plan(self, request: PlanRequest, trail: Trail) -> PlanResponse:
        """Plan one hike on the mock model."""
        start = datetime.combine(request.date, request.start, tzinfo=self._zone)
        result = self._compute(trail, start, request.fitness, request.gear)
        points = [
            PlanPoint(
                km=point.km,
                lat=point.lat,
                lon=point.lon,
                ele_m=point.ele_m,
                eta_up=eta_up.time(),
                eta_down=eta_down.time(),
                eta_down_p90=eta_down_p90.time(),
                temp_c=round(TRAILHEAD_TEMP_C + LAPSE_RATE_C_PER_KM * (point.ele_m - trail.points[0].ele_m) / 1000, 1),
                status=self._status(point, eta_down_p90, result.last_light),
            )
            for point, eta_up, eta_down, eta_down_p90 in zip(
                trail.points, result.eta_up, result.eta_down, result.eta_down_p90, strict=True
            )
        ]
        summary = PlanSummary(
            start=request.start,
            top_eta=result.top_arrival.time(),
            finish_p50=result.finish_p50.time(),
            finish_p90=result.finish_p90.time(),
            sunset=SUNSET,
            last_light=LAST_LIGHT,
            turnaround_by=result.turnaround_by.time(),
            duration_p50_min=whole_minutes(result.finish_p50 - start),
            duration_p90_min=whole_minutes(result.finish_p90 - start),
            snow_line_m=SNOW_LINE_M,
        )
        return PlanResponse(
            plan_id=make_plan_id(request, self.source),
            created_at=datetime.now(UTC),
            source=self.source,
            request=request,
            trail=summarize_trail(trail),
            utc_offset=self._utc_offset(start),
            summary=summary,
            verdict=result.verdict,
            points=points,
        )

    def sweep(self, trail: Trail, day: date, fitness: Fitness, gear: Gear, profile_id: str | None) -> SweepResponse:
        """Return the verdict for every start time from 07:00 to 15:00. ``profile_id`` is ignored by the mock."""
        first = datetime.combine(day, SWEEP_FIRST_START, tzinfo=self._zone)
        last = datetime.combine(day, SWEEP_LAST_START, tzinfo=self._zone)
        step = timedelta(minutes=SWEEP_INTERVAL_MIN)
        items: list[SweepItem] = []
        start = first
        while start <= last:
            result = self._compute(trail, start, fitness, gear)
            items.append(SweepItem(start=start.time(), level=result.verdict.level, finish_p90=result.finish_p90.time()))
            start += step
        go_starts = [item.start for item in items if item.level is VerdictLevel.GO]
        return SweepResponse(
            trail_id=trail.id,
            date=day,
            source=self.source,
            interval_min=SWEEP_INTERVAL_MIN,
            items=items,
            latest_go_start=max(go_starts, default=None),
        )

    def _compute(self, trail: Trail, start: datetime, fitness: Fitness, gear: Gear) -> _Computation:
        """Walk the trail up and back from ``start`` and derive times and the verdict."""
        last_light = datetime.combine(start.date(), LAST_LIGHT, tzinfo=self._zone)
        multiplier = FITNESS_SPEED_MULTIPLIERS[fitness]
        points = trail.points

        eta_up = _walk(points, start, last_light, multiplier)
        top_arrival = eta_up[-1]
        top_departure = top_arrival + TOP_BREAK
        eta_down = list(reversed(_walk(points[::-1], top_departure, last_light, multiplier)))
        eta_down_p90 = [_slow_day(start, moment) for moment in eta_down]

        top_departure_p90 = _slow_day(start, top_departure)
        turnaround_by = _to_minute(last_light - SAFETY_MARGIN - (eta_down_p90[0] - top_departure_p90))
        eta_up = [_to_minute(moment) for moment in eta_up]
        eta_down = [_to_minute(moment) for moment in eta_down]
        eta_down_p90 = [_to_minute(moment) for moment in eta_down_p90]
        top_arrival = eta_up[-1]
        finish_p90 = eta_down_p90[0]
        return _Computation(
            start=start,
            last_light=last_light,
            eta_up=eta_up,
            eta_down=eta_down,
            eta_down_p90=eta_down_p90,
            top_arrival=top_arrival,
            finish_p50=eta_down[0],
            finish_p90=finish_p90,
            turnaround_by=turnaround_by,
            verdict=_build_verdict(trail, start, last_light, finish_p90, gear),
        )

    @staticmethod
    def _status(point: TrailPoint, eta_down_p90: datetime, last_light: datetime) -> SegmentStatus:
        """Worst condition at ``point``: dark beats snow beats daylight."""
        if eta_down_p90 > last_light:
            return SegmentStatus.DARK
        if point.ele_m > SNOW_LINE_M:
            return SegmentStatus.SNOW
        return SegmentStatus.DAYLIGHT

    @staticmethod
    def _utc_offset(moment: datetime) -> str:
        """Format the UTC offset in effect at ``moment`` as ``"-07:00"``."""
        offset = moment.utcoffset() or timedelta(0)
        minutes = int(offset.total_seconds() // 60)
        sign = "-" if minutes < 0 else "+"
        hours, remainder = divmod(abs(minutes), 60)
        return f"{sign}{hours:02d}:{remainder:02d}"
