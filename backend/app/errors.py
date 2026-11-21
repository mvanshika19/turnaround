"""Domain exceptions. The HTTP layer maps these to responses in ``app.main``."""


class TurnaroundError(Exception):
    """Base class for all domain errors."""


class TrailNotFoundError(TurnaroundError):
    """Raised when a trail id does not match any known trail."""

    def __init__(self, trail_id: str) -> None:
        super().__init__(f"Trail '{trail_id}' was not found.")
        self.trail_id = trail_id


class PlanNotFoundError(TurnaroundError):
    """Raised when a plan id is unknown or has been evicted from the store."""

    def __init__(self, plan_id: str) -> None:
        super().__init__(f"Plan '{plan_id}' was not found.")
        self.plan_id = plan_id


class CopilotDeadlineError(TurnaroundError):
    """Raised when one co-pilot request exceeds its overall time budget."""


class PlannerNotImplementedError(TurnaroundError):
    """Raised when the configured planner has no implementation yet."""
