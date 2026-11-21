"""Pure helpers that derive identifiers and summaries from planner inputs."""

import hashlib

from app.contracts import DataSource, PlanRequest, Trail, TrailSummary


def make_plan_id(request: PlanRequest, source: DataSource) -> str:
    """Derive a stable plan id from the request and the planner that answered it."""
    digest = hashlib.sha256(f"{request.model_dump_json()}{source.value}".encode()).hexdigest()
    return digest[:16]


def summarize_trail(trail: Trail) -> TrailSummary:
    """Return the picker summary of ``trail`` (everything except its points)."""
    return TrailSummary.model_validate(trail.model_dump(exclude={"points"}))
