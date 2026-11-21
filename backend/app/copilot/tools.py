"""Planner tools exposed to the co-pilot model, with their JSON schemas and execution."""

import json
import logging
from dataclasses import dataclass
from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, ValidationError

from app.contracts import Fitness, Gear, LocalTime, PlanRequest, ToolCallSummary
from app.errors import TrailNotFoundError
from app.planning import Planner
from app.planning.timefmt import format_clock
from app.repositories.trails import TrailRepository

logger = logging.getLogger(__name__)


class _Arguments(BaseModel):
    """Base class for tool arguments: unknown fields are rejected."""

    model_config = ConfigDict(extra="forbid")


class _PlanArguments(_Arguments):
    trail_id: str
    date: date
    start: LocalTime
    fitness: Fitness
    headlamp: bool
    traction: bool


class _SweepArguments(_Arguments):
    trail_id: str
    date: date
    fitness: Fitness
    headlamp: bool
    traction: bool


class _CompareArguments(_Arguments):
    date: date
    start: LocalTime
    fitness: Fitness
    headlamp: bool
    traction: bool


@dataclass(frozen=True)
class ToolResult:
    """The outcome of one tool call."""

    payload: dict[str, Any]
    summary: ToolCallSummary | None = None
    plan_request: PlanRequest | None = None


def _schema(name: str, description: str, properties: dict[str, Any]) -> dict[str, Any]:
    """Build a strict function-tool definition in which every property is required."""
    return {
        "type": "function",
        "name": name,
        "description": description,
        "strict": True,
        "parameters": {
            "type": "object",
            "properties": properties,
            "required": list(properties),
            "additionalProperties": False,
        },
    }


_TRAIL_ID = {"type": "string", "description": "Trail id from list_trails, e.g. 'lynn-peak'."}
_DATE = {"type": "string", "description": "Hike date, YYYY-MM-DD (Vancouver)."}
_START = {"type": "string", "description": "Start time, 24-hour HH:MM (Vancouver)."}
_FITNESS = {"type": "string", "enum": [fitness.value for fitness in Fitness], "description": "Hiker pace."}
_HEADLAMP = {"type": "boolean", "description": "Whether the hiker carries a headlamp."}
_TRACTION = {"type": "boolean", "description": "Whether the hiker carries microspikes or similar traction."}

TOOL_DEFINITIONS: list[dict[str, Any]] = [
    _schema("list_trails", "List every trail with id, name, area, difficulty, distance and climb.", {}),
    _schema(
        "plan_hike",
        "Plan one hike and get its verdict, reasons and key times.",
        {
            "trail_id": _TRAIL_ID,
            "date": _DATE,
            "start": _START,
            "fitness": _FITNESS,
            "headlamp": _HEADLAMP,
            "traction": _TRACTION,
        },
    ),
    _schema(
        "sweep_start_times",
        "Get the verdict for every start time from 7:00 am to 3:00 pm on a day, and the latest start that is a go.",
        {"trail_id": _TRAIL_ID, "date": _DATE, "fitness": _FITNESS, "headlamp": _HEADLAMP, "traction": _TRACTION},
    ),
    _schema(
        "compare_trails",
        "Plan every trail for the same day, start and gear to see which ones fit.",
        {"date": _DATE, "start": _START, "fitness": _FITNESS, "headlamp": _HEADLAMP, "traction": _TRACTION},
    ),
]


class CopilotTools:
    """Executes co-pilot tool calls against the trail repository and the planner."""

    def __init__(self, trails: TrailRepository, planner: Planner) -> None:
        self._trails = trails
        self._planner = planner

    @property
    def definitions(self) -> list[dict[str, Any]]:
        """The tool definitions to send to the model."""
        return TOOL_DEFINITIONS

    def execute(self, name: str, arguments_json: str) -> ToolResult:
        """Run the named tool. Bad input comes back as an ``{"error": ...}`` payload, never as an exception."""
        try:
            arguments = json.loads(arguments_json or "{}")
            if name == "list_trails":
                return self._list_trails()
            if name == "plan_hike":
                return self._plan_hike(_PlanArguments.model_validate(arguments))
            if name == "sweep_start_times":
                return self._sweep(_SweepArguments.model_validate(arguments))
            if name == "compare_trails":
                return self._compare(_CompareArguments.model_validate(arguments))
        except (ValidationError, json.JSONDecodeError, TrailNotFoundError) as error:
            logger.info("Co-pilot tool %s rejected its input: %s", name, error)
            return ToolResult({"error": self._describe_error(error)})
        except Exception:
            logger.exception("Co-pilot tool %s failed", name)
            return ToolResult({"error": "The tool failed unexpectedly. Try different arguments."})
        return ToolResult({"error": f"Unknown tool '{name}'."})

    @staticmethod
    def _describe_error(error: Exception) -> str:
        if isinstance(error, TrailNotFoundError):
            return f"{error} Call list_trails for the valid trail ids."
        if isinstance(error, ValidationError):
            problems = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in error.errors())
            return f"Invalid arguments: {problems}"
        return "The arguments were not valid JSON."

    def _list_trails(self) -> ToolResult:
        trails = [
            {
                "id": trail.id,
                "name": trail.name,
                "area": trail.area,
                "difficulty": trail.difficulty.value,
                "distance_km": trail.distance_km,
                "gain_m": trail.gain_m,
            }
            for trail in self._trails.list_summaries()
        ]
        return ToolResult({"trails": trails}, ToolCallSummary(name="list_trails", label="Listed trails"))

    def _plan_hike(self, args: _PlanArguments) -> ToolResult:
        request = PlanRequest(
            trail_id=args.trail_id,
            date=args.date,
            start=args.start,
            fitness=args.fitness,
            gear=Gear(headlamp=args.headlamp, traction=args.traction),
        )
        trail = self._trails.get(request.trail_id)
        plan = self._planner.plan(request, trail)
        summary = plan.summary
        payload = {
            "trail": plan.trail.name,
            "verdict": plan.verdict.level.value,
            "reasons": [reason.message for reason in plan.verdict.reasons],
            "start": format_clock(summary.start),
            "top_eta": format_clock(summary.top_eta),
            "finish_p50": format_clock(summary.finish_p50),
            "finish_p90": format_clock(summary.finish_p90),
            "turnaround_by": format_clock(summary.turnaround_by),
            "sunset": format_clock(summary.sunset),
            "last_light": format_clock(summary.last_light),
            "source": plan.source.value,
        }
        label = f"Planned {plan.trail.name} at {format_clock(summary.start)}"
        return ToolResult(payload, ToolCallSummary(name="plan_hike", label=label), plan_request=request)

    def _sweep(self, args: _SweepArguments) -> ToolResult:
        trail = self._trails.get(args.trail_id)
        gear = Gear(headlamp=args.headlamp, traction=args.traction)
        sweep = self._planner.sweep(trail, args.date, args.fitness, gear, None)
        latest = sweep.latest_go_start
        payload = {
            "trail": trail.name,
            "items": [{"start": format_clock(item.start), "level": item.level.value} for item in sweep.items],
            "latest_go_start": format_clock(latest) if latest else None,
            "source": sweep.source.value,
        }
        label = f"Checked start times for {trail.name}"
        return ToolResult(payload, ToolCallSummary(name="sweep_start_times", label=label))

    def _compare(self, args: _CompareArguments) -> ToolResult:
        gear = Gear(headlamp=args.headlamp, traction=args.traction)
        results = []
        for summary in self._trails.list_summaries():
            request = PlanRequest(
                trail_id=summary.id, date=args.date, start=args.start, fitness=args.fitness, gear=gear
            )
            plan = self._planner.plan(request, self._trails.get(summary.id))
            results.append(
                {
                    "name": summary.name,
                    "id": summary.id,
                    "level": plan.verdict.level.value,
                    "finish_p90": format_clock(plan.summary.finish_p90),
                }
            )
        payload = {"start": format_clock(args.start), "trails": results}
        return ToolResult(payload, ToolCallSummary(name="compare_trails", label="Compared all trails"))
