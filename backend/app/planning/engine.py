"""The planning algorithm shared by every planner.

The engine walks a trail up and back with Tobler's hiking function, stretches the times for a slow day
(P90), finds the latest turnaround time and builds the verdict. Everything that depends on the day's
light, snow and temperature comes from a ``Conditions`` object, so the same algorithm runs on fixed
placeholder values (``MockPlanner``) or on a live forecast (``ModelPlanner``).
"""

import itertools
import math
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import Protocol
from zoneinfo import ZoneInfo

from app.contracts import (
    DataSource,
    Fitness,
    Gear,
    OpeningCheck,
    OpeningStatus,
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
from app.planning.opening_hours import check_opening_window
from app.planning.timefmt import ceil_minutes, format_clock, whole_minutes

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

_LEVEL_SEVERITY: dict[VerdictLevel, int] = {VerdictLevel.GO: 0, VerdictLevel.CAUTION: 1, VerdictLevel.NO_GO: 2}


class Conditions(Protocol):
    """The light, snow and temperature of one trail on one day."""

    sunset: datetime
    last_light: datetime
    extra_reasons: list[Reason]

    def is_snow(self, index: int, ele_m: float, at: datetime) -> bool:
        """Whether there is snow at trail point ``index`` (at ``ele_m``) at time ``at``."""
        ...

    def temperature_c(self, index: int, ele_m: float, at: datetime) -> float | None:
        """The temperature at trail point ``index`` at time ``at``, if known."""
        ...

    def snow_line_m_between(self, start: datetime, end: datetime) -> int | None:
        """The lowest snow line (freezing level) on the trail while the hiker is out, if known."""
        ...


@dataclass(frozen=True)
class _Computation:
    """Everything derived for one trail, day, start time and set of preferences."""

    start: datetime
    eta_up: list[datetime]
    eta_down: list[datetime]
    eta_down_p90: list[datetime]
    top_arrival: datetime
    finish_p50: datetime
    finish_p90: datetime
    turnaround_by: datetime
    snow_line_m: int | None
    opening_check: OpeningCheck
    verdict: Verdict


def _tobler_speed_kmh(slope: float) -> float:
    """Tobler's hiking function: speed on a given slope (rise over run, negative downhill)."""
    return 6 * math.exp(-3.5 * abs(slope + 0.05))


def _slow_day(start: datetime, moment: datetime) -> datetime:
    """Stretch the time elapsed since ``start`` to its slow-day (P90) equivalent."""
    return start + (moment - start) * SLOW_DAY_DURATION_MULTIPLIER


def _to_minute(moment: datetime) -> datetime:
    """Round ``moment`` to the nearest minute, so displayed times and durations agree."""
    return (moment + timedelta(seconds=30)).replace(second=0, microsecond=0)


def _walk(
    points: list[TrailPoint], order: list[int], departure: datetime, conditions: Conditions, speed_multiplier: float
) -> list[datetime]:
    """Return the arrival time at each index in ``order`` (trail point indices), leaving the first at ``departure``."""
    arrivals = [departure]
    for origin_index, target_index in itertools.pairwise(order):
        origin, target = points[origin_index], points[target_index]
        entered_at = arrivals[-1]
        distance_km = abs(target.km - origin.km)
        if distance_km == 0:
            arrivals.append(entered_at)
            continue
        slope = (target.ele_m - origin.ele_m) / (distance_km * 1000)
        speed = _tobler_speed_kmh(slope) * speed_multiplier
        if conditions.is_snow(target_index, target.ele_m, entered_at):
            speed *= SNOW_SPEED_MULTIPLIER
        if entered_at > conditions.last_light:
            speed *= DARK_SPEED_MULTIPLIER
        arrivals.append(entered_at + timedelta(hours=distance_km / speed))
    return arrivals


def _snow_message(snow_line_m: int | None, traction: bool) -> tuple[str, str, VerdictLevel]:
    """Return the reason code, message and level for snow on the route."""
    where = f"above {snow_line_m} m" if snow_line_m is not None else "on the upper trail"
    if traction:
        return "snow_with_traction", f"Snow likely {where}. Your traction is packed.", VerdictLevel.GO
    return "snow_no_traction", f"Snow likely {where} and you have no traction.", VerdictLevel.NO_GO


def _build_verdict(
    start: datetime, conditions: Conditions, finish_p90: datetime, gear: Gear, has_snow: bool, snow_line_m: int | None
) -> Verdict:
    """Combine the daylight and snow findings into a verdict; the most severe reason sets the level."""
    last_light = conditions.last_light
    reasons: list[Reason] = []
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
    elif finish_p90 > last_light - CAUTION_WINDOW:
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

    if has_snow:
        code, message, level = _snow_message(snow_line_m, gear.traction)
        reasons.append(Reason(code=code, level=level, message=message))
    reasons.extend(conditions.extra_reasons)

    level = max((reason.level for reason in reasons), key=_LEVEL_SEVERITY.__getitem__)
    return Verdict(level=level, reasons=reasons)


def _utc_offset(moment: datetime) -> str:
    """Format the UTC offset in effect at ``moment`` as ``"-07:00"``."""
    offset = moment.utcoffset() or timedelta(0)
    minutes = int(offset.total_seconds() // 60)
    sign = "-" if minutes < 0 else "+"
    hours, remainder = divmod(abs(minutes), 60)
    return f"{sign}{hours:02d}:{remainder:02d}"


class PlanningEngine:
    """Plans hikes and sweeps start times for one planner source, given the day's ``Conditions``."""

    def __init__(self, zone: ZoneInfo, source: DataSource) -> None:
        self._zone = zone
        self._source = source

    def plan(self, request: PlanRequest, trail: Trail, conditions: Conditions) -> PlanResponse:
        """Plan one hike."""
        start = datetime.combine(request.date, request.start, tzinfo=self._zone)
        result = self._compute(trail, start, request.fitness, request.gear, conditions)
        points = [
            PlanPoint(
                km=point.km,
                lat=point.lat,
                lon=point.lon,
                ele_m=point.ele_m,
                eta_up=result.eta_up[index].time(),
                eta_down=result.eta_down[index].time(),
                eta_down_p90=result.eta_down_p90[index].time(),
                temp_c=self._temperature(index, point, result, conditions),
                status=self._status(index, point, result, conditions),
            )
            for index, point in enumerate(trail.points)
        ]
        summary = PlanSummary(
            start=request.start,
            top_eta=result.top_arrival.time(),
            finish_p50=result.finish_p50.time(),
            finish_p90=result.finish_p90.time(),
            sunset=conditions.sunset.time(),
            last_light=conditions.last_light.time(),
            turnaround_by=result.turnaround_by.time(),
            duration_p50_min=whole_minutes(result.finish_p50 - start),
            duration_p90_min=whole_minutes(result.finish_p90 - start),
            snow_line_m=result.snow_line_m,
        )
        return PlanResponse(
            plan_id=make_plan_id(request, self._source),
            created_at=datetime.now(UTC),
            source=self._source,
            request=request,
            trail=summarize_trail(trail),
            utc_offset=_utc_offset(start),
            summary=summary,
            verdict=result.verdict,
            opening_check=result.opening_check,
            points=points,
        )

    def sweep(self, trail: Trail, day: date, fitness: Fitness, gear: Gear, conditions: Conditions) -> SweepResponse:
        """Return the verdict for every start time from 07:00 to 15:00 under the same ``conditions``."""
        start = datetime.combine(day, SWEEP_FIRST_START, tzinfo=self._zone)
        last = datetime.combine(day, SWEEP_LAST_START, tzinfo=self._zone)
        step = timedelta(minutes=SWEEP_INTERVAL_MIN)
        items: list[SweepItem] = []
        while start <= last:
            result = self._compute(trail, start, fitness, gear, conditions)
            items.append(SweepItem(start=start.time(), level=result.verdict.level, finish_p90=result.finish_p90.time()))
            start += step
        go_starts = [item.start for item in items if item.level is VerdictLevel.GO]
        return SweepResponse(
            trail_id=trail.id,
            date=day,
            source=self._source,
            interval_min=SWEEP_INTERVAL_MIN,
            items=items,
            latest_go_start=max(go_starts, default=None),
        )

    def _compute(
        self, trail: Trail, start: datetime, fitness: Fitness, gear: Gear, conditions: Conditions
    ) -> _Computation:
        """Walk the trail up and back from ``start`` and derive times and the verdict."""
        multiplier = FITNESS_SPEED_MULTIPLIERS[fitness]
        points = trail.points
        indices = list(range(len(points)))

        eta_up = _walk(points, indices, start, conditions, multiplier)
        top_departure = eta_up[-1] + TOP_BREAK
        eta_down = list(reversed(_walk(points, indices[::-1], top_departure, conditions, multiplier)))
        eta_down_p90 = [_slow_day(start, moment) for moment in eta_down]

        top_departure_p90 = _slow_day(start, top_departure)
        turnaround_by = _to_minute(conditions.last_light - SAFETY_MARGIN - (eta_down_p90[0] - top_departure_p90))
        eta_up = [_to_minute(moment) for moment in eta_up]
        eta_down = [_to_minute(moment) for moment in eta_down]
        eta_down_p90 = [_to_minute(moment) for moment in eta_down_p90]
        has_snow = any(
            conditions.is_snow(index, point.ele_m, eta_up[index])
            or conditions.is_snow(index, point.ele_m, eta_down[index])
            for index, point in enumerate(points)
        )
        snow_line_m = conditions.snow_line_m_between(start, eta_down_p90[0])
        opening_check = check_opening_window(trail, start, eta_down_p90[0])
        verdict = _build_verdict(start, conditions, eta_down_p90[0], gear, has_snow, snow_line_m)
        if opening_check.status is OpeningStatus.OUTSIDE_HOURS:
            verdict = Verdict(
                level=VerdictLevel.NO_GO,
                reasons=[
                    *verdict.reasons,
                    Reason(code="outside_opening_hours", level=VerdictLevel.NO_GO, message=opening_check.message),
                ],
            )
        return _Computation(
            start=start,
            eta_up=eta_up,
            eta_down=eta_down,
            eta_down_p90=eta_down_p90,
            top_arrival=eta_up[-1],
            finish_p50=eta_down[0],
            finish_p90=eta_down_p90[0],
            turnaround_by=turnaround_by,
            snow_line_m=snow_line_m,
            opening_check=opening_check,
            verdict=verdict,
        )

    @staticmethod
    def _temperature(index: int, point: TrailPoint, result: _Computation, conditions: Conditions) -> float | None:
        """The temperature at ``point`` when the hiker passes on the way up, rounded to 0.1 degrees."""
        value = conditions.temperature_c(index, point.ele_m, result.eta_up[index])
        return None if value is None else round(value, 1)

    @staticmethod
    def _status(index: int, point: TrailPoint, result: _Computation, conditions: Conditions) -> SegmentStatus:
        """Worst condition at ``point``: dark beats snow beats daylight."""
        if result.eta_down_p90[index] > conditions.last_light:
            return SegmentStatus.DARK
        up, down = result.eta_up[index], result.eta_down[index]
        if conditions.is_snow(index, point.ele_m, up) or conditions.is_snow(index, point.ele_m, down):
            return SegmentStatus.SNOW
        return SegmentStatus.DAYLIGHT
