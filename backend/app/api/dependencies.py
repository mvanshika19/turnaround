"""FastAPI dependency providers. Each returns a process-wide singleton built from the settings."""

from functools import lru_cache
from typing import Annotated

import openai
from fastapi import Depends

from app.config import Settings, get_settings
from app.copilot import CopilotAgent, CopilotTools
from app.planning import Planner
from app.planning import get_planner as build_planner
from app.repositories.plans import InMemoryPlanStore
from app.repositories.trails import TrailRepository


@lru_cache
def get_trail_repository() -> TrailRepository:
    """Return the trail catalogue loaded from ``<data_dir>/trails``."""
    return TrailRepository(get_settings().data_dir / "trails")


@lru_cache
def get_planner() -> Planner:
    """Return the planner selected by ``TURNAROUND_PLANNER``."""
    return build_planner(get_settings())


@lru_cache
def get_plan_store() -> InMemoryPlanStore:
    """Return the shared in-memory plan store."""
    return InMemoryPlanStore()


@lru_cache
def get_copilot_agent() -> CopilotAgent | None:
    """Return the co-pilot agent, or ``None`` when no OpenAI API key is configured."""
    settings = get_settings()
    if settings.openai_api_key is None:
        return None
    client = openai.OpenAI(api_key=settings.openai_api_key.get_secret_value(), max_retries=1)
    tools = CopilotTools(get_trail_repository(), get_planner())
    return CopilotAgent(client, settings.openai_model, tools, settings.copilot_max_tool_rounds)


SettingsDep = Annotated[Settings, Depends(get_settings)]
TrailRepositoryDep = Annotated[TrailRepository, Depends(get_trail_repository)]
PlannerDep = Annotated[Planner, Depends(get_planner)]
PlanStoreDep = Annotated[InMemoryPlanStore, Depends(get_plan_store)]
CopilotAgentDep = Annotated[CopilotAgent | None, Depends(get_copilot_agent)]
