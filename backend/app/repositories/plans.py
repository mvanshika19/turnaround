"""In-memory storage for generated plans."""

import threading
from collections import OrderedDict

from app.contracts import PlanResponse
from app.errors import PlanNotFoundError

MAX_PLANS = 1_000


class InMemoryPlanStore:
    """A thread-safe, size-bounded plan store that evicts the least recently used plan.

    Plans live only in process memory and are lost on restart.
    """

    def __init__(self, max_plans: int = MAX_PLANS) -> None:
        self._max_plans = max_plans
        self._plans: OrderedDict[str, PlanResponse] = OrderedDict()
        self._lock = threading.Lock()

    def save(self, plan: PlanResponse) -> None:
        """Store ``plan`` under its id, replacing any existing entry and evicting the oldest when full."""
        with self._lock:
            self._plans[plan.plan_id] = plan
            self._plans.move_to_end(plan.plan_id)
            while len(self._plans) > self._max_plans:
                self._plans.popitem(last=False)

    def get(self, plan_id: str) -> PlanResponse:
        """Return the plan and mark it recently used, or raise ``PlanNotFoundError``."""
        with self._lock:
            plan = self._plans.get(plan_id)
            if plan is None:
                raise PlanNotFoundError(plan_id)
            self._plans.move_to_end(plan_id)
            return plan
