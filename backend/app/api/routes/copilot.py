"""The AI co-pilot endpoint."""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import openai
from fastapi import APIRouter, HTTPException

from app.api.dependencies import CopilotAgentDep, SettingsDep
from app.contracts import CopilotRequest, CopilotResponse
from app.errors import CopilotDeadlineError

logger = logging.getLogger(__name__)

BAD_GATEWAY_DETAIL = "The co-pilot couldn't reach OpenAI. Try again in a moment."

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.post("", response_model=CopilotResponse, summary="Ask the co-pilot a hiking question")
def ask_copilot(request: CopilotRequest, agent: CopilotAgentDep, settings: SettingsDep) -> CopilotResponse:
    """Answer the conversation using the planner as tools; 503 without an API key, 502 if OpenAI fails."""
    if agent is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "The co-pilot needs an OpenAI API key. "
                "Add TURNAROUND_OPENAI_API_KEY to backend/.env and restart the backend."
            ),
        )
    today = datetime.now(ZoneInfo(settings.timezone)).date()
    try:
        return agent.respond(request, today)
    except openai.APIError as error:
        logger.error(
            "The co-pilot's OpenAI request failed: %s (status %s)",
            type(error).__name__,
            getattr(error, "status_code", None),
        )
        raise HTTPException(status_code=502, detail=BAD_GATEWAY_DETAIL) from None
    except CopilotDeadlineError:
        logger.error("The co-pilot's request exceeded its deadline")
        raise HTTPException(status_code=502, detail=BAD_GATEWAY_DETAIL) from None
