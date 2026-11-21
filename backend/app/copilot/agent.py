"""The co-pilot loop: the model calls planner tools until it has an answer."""

import json
import logging
import time
from datetime import date
from typing import Any

import openai

from app.contracts import CopilotRequest, CopilotResponse, PlanRequest, ToolCallSummary, VerdictLevel
from app.copilot.prompts import build_instructions
from app.copilot.tools import CopilotTools
from app.errors import CopilotDeadlineError

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_S = 30.0
TOTAL_DEADLINE_S = 45.0
EMPTY_REPLY = "I couldn't finish that answer. Try asking again."
ROUND_CAP_REPLY = "Sorry, I couldn't finish working that out. Please try asking again in a simpler way."


class CopilotAgent:
    """Answers chat requests with the OpenAI Responses API, using the planner as tools."""

    def __init__(self, client: openai.OpenAI, model: str, tools: CopilotTools, max_rounds: int) -> None:
        self._client = client
        self._model = model
        self._tools = tools
        self._max_rounds = max_rounds

    def respond(self, request: CopilotRequest, today: date) -> CopilotResponse:
        """Run the conversation to a final reply.

        Raises ``openai.APIError`` if the API call fails and ``CopilotDeadlineError`` if the whole request takes
        longer than ``TOTAL_DEADLINE_S``.
        """
        deadline = time.monotonic() + TOTAL_DEADLINE_S
        instructions = build_instructions(today, request.context)
        conversation: list[Any] = [
            {"role": message.role.value, "content": message.content} for message in request.messages
        ]
        tool_calls: list[ToolCallSummary] = []
        suggested: PlanRequest | None = None

        for round_number in range(self._max_rounds + 1):
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise CopilotDeadlineError(f"The co-pilot took longer than {TOTAL_DEADLINE_S:.0f} s")
            response = self._client.responses.create(
                model=self._model,
                instructions=instructions,
                input=conversation,
                tools=self._tools.definitions,
                timeout=min(REQUEST_TIMEOUT_S, remaining),
            )
            calls = [item for item in response.output if item.type == "function_call"]
            if not calls:
                reply = (response.output_text or "").strip()
                if response.status != "completed" or not reply:
                    logger.warning("Co-pilot got an unusable response (status %s)", response.status)
                    return CopilotResponse(reply=EMPTY_REPLY, tool_calls=tool_calls, suggested_request=None)
                return CopilotResponse(reply=reply, tool_calls=tool_calls, suggested_request=suggested)
            if round_number == self._max_rounds:
                break
            conversation += response.output
            for call in calls:
                result = self._tools.execute(call.name, call.arguments)
                if result.summary is not None:
                    tool_calls.append(result.summary)
                if result.plan_request is not None and (
                    suggested is None or result.payload.get("verdict") != VerdictLevel.NO_GO.value
                ):
                    # Show the hike the co-pilot recommends: a later no_go check must not replace a viable plan.
                    suggested = result.plan_request
                conversation.append(
                    {"type": "function_call_output", "call_id": call.call_id, "output": json.dumps(result.payload)}
                )
        logger.warning("Co-pilot hit the tool round cap of %d", self._max_rounds)
        return CopilotResponse(reply=ROUND_CAP_REPLY, tool_calls=tool_calls, suggested_request=suggested)
