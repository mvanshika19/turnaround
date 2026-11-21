"""Shared API contract between the planner (data science) and the app (software engineering).

Every request and response that crosses the HTTP boundary is defined here, and the
frontend mirrors these models in ``frontend/src/api/types.ts``. Agree any change with
the team before making it, then update both files in the same change.

Conventions
-----------
* Times are local to Vancouver (``America/Vancouver``) and serialised as ``"HH:MM"``.
  The backend does all time-zone maths; the frontend displays times as given.
* Distances are kilometres, elevations metres and temperatures degrees Celsius.
* JSON field names are ``snake_case``.
"""

from datetime import date as Date
from datetime import datetime, time
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, PlainSerializer


def _normalise_local_time(value: time) -> time:
    """Reject time-zone-aware values and truncate to minute precision."""
    if value.tzinfo is not None:
        raise ValueError("Times must be Vancouver wall-clock times without a time zone")
    return value.replace(second=0, microsecond=0)


LocalTime = Annotated[
    time,
    AfterValidator(_normalise_local_time),
    PlainSerializer(lambda value: value.strftime("%H:%M"), return_type=str, when_used="json"),
]
"""A wall-clock time in Vancouver, serialised as ``"HH:MM"``."""

TrailId = Annotated[str, Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=64)]
"""A URL-safe trail slug such as ``"lynn-peak"``."""


class ContractModel(BaseModel):
    """Base model for every contract type: immutable and strict about unknown fields."""

    model_config = ConfigDict(frozen=True, extra="forbid")


class Fitness(StrEnum):
    """Preset pace levels used when no personal pace profile is supplied."""

    RELAXED = "relaxed"
    AVERAGE = "average"
    FAST = "fast"


class Difficulty(StrEnum):
    """How demanding a trail is for a typical hiker."""

    EASY = "easy"
    MODERATE = "moderate"
    HARD = "hard"


class VerdictLevel(StrEnum):
    """Overall recommendation, ordered from safest to least safe."""

    GO = "go"
    CAUTION = "caution"
    NO_GO = "no_go"


class SegmentStatus(StrEnum):
    """Worst condition a hiker meets at a trail point (dark beats snow beats daylight)."""

    DAYLIGHT = "daylight"
    SNOW = "snow"
    DARK = "dark"


class DataSource(StrEnum):
    """Which planner produced a result: placeholder logic or the data science models."""

    MOCK = "mock"
    MODEL = "model"


class Coordinate(ContractModel):
    """A WGS84 latitude and longitude."""

    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class TrailPoint(ContractModel):
    """One point on the outbound route, from trailhead to top."""

    km: float = Field(ge=0, description="Distance from the trailhead along the route.")
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    ele_m: float = Field(description="Elevation in metres above sea level.")


class TrailSummary(ContractModel):
    """A trail as shown in the trail picker."""

    id: TrailId
    name: str = Field(min_length=1, max_length=80)
    area: str = Field(min_length=1, max_length=80, description="Where the trail is, e.g. 'North Vancouver'.")
    difficulty: Difficulty
    distance_km: float = Field(gt=0, description="Round-trip distance (out and back).")
    gain_m: int = Field(ge=0, description="Total climb on the way up.")
    max_elevation_m: int
    trailhead: Coordinate
    summit: Coordinate
    is_sample: bool = Field(description="True when the route geometry is a placeholder, not a surveyed path.")


class Trail(TrailSummary):
    """A trail with its full outbound geometry. Every trail is hiked out and back."""

    points: list[TrailPoint] = Field(min_length=2)


class Gear(ContractModel):
    """Safety gear the hiker is carrying."""

    headlamp: bool = True
    traction: bool = Field(default=False, description="Microspikes or similar traction for snow and ice.")


class PlanRequest(ContractModel):
    """Everything the planner needs to plan one hike."""

    trail_id: TrailId
    date: Date
    start: LocalTime
    fitness: Fitness = Fitness.AVERAGE
    profile_id: str | None = Field(default=None, max_length=64, description="Personal pace profile from a GPX upload.")
    gear: Gear = Field(default_factory=Gear)


class PlanPoint(ContractModel):
    """A trail point with the hiker's expected times and conditions there."""

    km: float = Field(ge=0)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    ele_m: float
    eta_up: LocalTime = Field(description="Likely (P50) time passing this point on the way up.")
    eta_down: LocalTime = Field(description="Likely (P50) time passing this point on the way back.")
    eta_down_p90: LocalTime = Field(description="Slow-day (P90) time passing this point on the way back.")
    temp_c: float | None = None
    status: SegmentStatus


class PlanSummary(ContractModel):
    """The headline numbers of a plan."""

    start: LocalTime
    top_eta: LocalTime = Field(description="Likely (P50) time reaching the top.")
    finish_p50: LocalTime
    finish_p90: LocalTime
    sunset: LocalTime
    last_light: LocalTime = Field(description="Last usable light on the trail.")
    turnaround_by: LocalTime = Field(description="Latest time to turn back from the top and still finish safely.")
    duration_p50_min: int = Field(ge=0)
    duration_p90_min: int = Field(ge=0)
    snow_line_m: int | None = None


class Reason(ContractModel):
    """One plain-language reason behind a verdict."""

    code: str = Field(pattern=r"^[a-z_]+$", description="Stable machine-readable identifier, e.g. 'after_dark'.")
    level: VerdictLevel
    message: str = Field(min_length=1)


class Verdict(ContractModel):
    """The overall recommendation and the reasons for it."""

    level: VerdictLevel
    reasons: list[Reason]


class PlanResponse(ContractModel):
    """A complete hike plan."""

    plan_id: str
    created_at: datetime
    source: DataSource
    request: PlanRequest
    trail: TrailSummary
    utc_offset: str = Field(pattern=r"^[+-]\d{2}:\d{2}$", description="Vancouver's UTC offset on the plan date.")
    summary: PlanSummary
    verdict: Verdict
    points: list[PlanPoint]


class SweepItem(ContractModel):
    """The verdict for one possible start time."""

    start: LocalTime
    level: VerdictLevel
    finish_p90: LocalTime


class SweepResponse(ContractModel):
    """Verdicts for every start time in the planning window, used by the start-time slider."""

    trail_id: TrailId
    date: Date
    source: DataSource
    interval_min: int = Field(gt=0)
    items: list[SweepItem]
    latest_go_start: LocalTime | None = Field(description="Latest start time whose verdict is 'go', if any.")


class HealthResponse(ContractModel):
    """Service status, plus Vancouver's current date so clients never rely on their own clock."""

    status: Literal["ok"]
    version: str
    planner: DataSource
    timezone: str
    today: Date
    copilot_enabled: bool = Field(description="True when an OpenAI API key is configured on the server.")


class ChatRole(StrEnum):
    """Who wrote a co-pilot chat message."""

    USER = "user"
    ASSISTANT = "assistant"


class ChatMessage(ContractModel):
    """One message in the co-pilot conversation."""

    role: ChatRole
    content: str = Field(min_length=1, max_length=4000)


class CopilotRequest(ContractModel):
    """The conversation so far, plus what the planner currently shows."""

    messages: list[ChatMessage] = Field(min_length=1, max_length=30)
    context: PlanRequest | None = Field(default=None, description="The plan currently on screen, if any.")


class ToolCallSummary(ContractModel):
    """A plain-language record of one tool the co-pilot used."""

    name: str
    label: str = Field(description="What the tool did, e.g. 'Checked start times for Lynn Peak'.")


class CopilotResponse(ContractModel):
    """The co-pilot's answer. Every number in it comes from the planner's tools, never the model."""

    reply: str
    tool_calls: list[ToolCallSummary]
    suggested_request: PlanRequest | None = Field(
        default=None, description="A plan the co-pilot recommends; the app applies it to the planner."
    )
